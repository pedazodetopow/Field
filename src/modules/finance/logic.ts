import { addDays, daysBetween } from "../../shared/values";
import type { Data, Movement, Period } from "../../storage/model";
export interface Week {
  start: string;
  end: string;
  days: number;
  base: number;
  income: number;
  spent: number;
  carry: number;
  remaining: number;
}
// Reparto exacto: los centésimos sobrantes se asignan a los primeros días.
export function distribute(cents: number, days: number): number[] {
  if (
    !Number.isSafeInteger(cents) ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 1096
  )
    throw new Error("Reparto inválido.");
  const each = Math.trunc(cents / days),
    rest = cents - each * days;
  return Array.from(
    { length: days },
    (_, i) => each + (i < Math.abs(rest) ? Math.sign(rest) : 0),
  );
}
export function budget(period: Period, movements: Movement[], date: string) {
  const relevant = movements.filter(
    (m) => m.periodId === period.id && m.date <= date,
  );
  const income = relevant
    .filter((m) => m.type === "income")
    .reduce((s, m) => s + m.cents, 0);
  const spent = relevant
    .filter((m) => m.type === "expense")
    .reduce((s, m) => s + m.cents, 0);
  const balance = period.initialCents + income - spent,
    available = balance - period.savingsCents;
  const allocation = distribute(
    period.initialCents - period.savingsCents,
    daysBetween(period.start, period.payday),
  );
  const weeks: Week[] = [];
  let carry = 0;
  for (let offset = 0; offset < allocation.length; offset += 7) {
    const start = addDays(period.start, offset),
      days = Math.min(7, allocation.length - offset),
      end = addDays(start, days - 1);
    const rows = relevant.filter((m) => m.date >= start && m.date <= end);
    const base = allocation
      .slice(offset, offset + days)
      .reduce((s, c) => s + c, 0);
    const weeklyIncome = rows
        .filter((m) => m.type === "income")
        .reduce((s, m) => s + m.cents, 0),
      weeklySpent = rows
        .filter((m) => m.type === "expense")
        .reduce((s, m) => s + m.cents, 0);
    const remaining = base + carry + weeklyIncome - weeklySpent;
    weeks.push({
      start,
      end,
      days,
      base,
      income: weeklyIncome,
      spent: weeklySpent,
      carry,
      remaining,
    });
    carry = remaining;
  }
  const current = weeks.find((w) => date >= w.start && date <= w.end);
  const daysLeft = Math.max(0, daysBetween(date, period.payday));
  const active = date >= period.start && date < period.payday;
  const daily = current
    ? Math.floor(current.remaining / (daysBetween(date, current.end) + 1))
    : null;
  return {
    balance,
    available,
    income,
    spent,
    savings: period.savingsCents,
    daysLeft,
    active,
    weeks,
    current,
    daily,
    periodDaily: active ? Math.floor(available / daysLeft) : null,
  };
}
export function activePeriod(data: Data): Period | undefined {
  return data.periods.find((p) => p.id === data.activePeriodId);
}
export function periodMovements(data: Data): Movement[] {
  return data.movements
    .filter((m) => m.periodId === data.activePeriodId)
    .sort((a, b) => b.date.localeCompare(a.date));
}
