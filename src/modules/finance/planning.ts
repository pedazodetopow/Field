import type { Data, FixedExpense, Period } from "../../storage/model";
import { addDays, daysBetween, uid } from "../../shared/values";
import { activePeriod, budget } from "./logic";

export function occurrences(fixed: FixedExpense[], start: string, end: string) {
  const result: { fixed: FixedExpense; date: string }[] = [];
  for (const f of fixed) {
    let [year, month] = start.split("-").map(Number);
    for (let i = 0; i < 38; i++) {
      const first = `${year}-${String(month).padStart(2, "0")}-01`;
      if (first >= end) break;
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const date = `${year}-${String(month).padStart(2, "0")}-${String(Math.min(f.day, last)).padStart(2, "0")}`;
      if (
        date >= start &&
        date < end &&
        date >= f.start &&
        (!f.end || date <= f.end)
      )
        result.push({ fixed: f, date });
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
export function financialSummary(data: Data, period: Period, date: string) {
  const payments = data.finance.payments.filter((p) =>
    data.movements.some(
      (m) =>
        m.id === p.movementId && m.periodId === period.id && m.date <= date,
    ),
  );
  const due = occurrences(data.finance.fixed, period.start, period.payday).map(
    (o) => ({
      ...o,
      payment: payments.find(
        (p) => p.fixedId === o.fixed.id && p.dueDate === o.date,
      ),
      // A payment in a different (overlapping) period is already settled, too.
      settledElsewhere: data.finance.payments.some(
        (p) =>
          p.fixedId === o.fixed.id &&
          p.dueDate === o.date &&
          !payments.includes(p) &&
          data.movements.some((m) => m.id === p.movementId && m.date <= date),
      ),
    }),
  );
  const pending = due
    .filter((o) => !o.payment && !o.settledElsewhere)
    .reduce((s, o) => s + o.fixed.cents, 0);
  const paidIds = new Set(payments.map((p) => p.movementId));
  const paid = data.movements
    .filter((m) => paidIds.has(m.id))
    .reduce((s, m) => s + m.cents, 0);
  const calc = budget(period, data.movements, date, pending + paid, paidIds);
  const variableToday = data.movements
    .filter(
      (m) =>
        m.periodId === period.id &&
        m.type === "expense" &&
        m.date === date &&
        !paidIds.has(m.id),
    )
    .reduce((s, m) => s + m.cents, 0);
  const todayAllowance = calc.current
    ? Math.floor(
        (calc.current.remaining + variableToday) /
          (daysBetween(date, calc.current.end) + 1),
      )
    : null;
  const todayAvailable =
    todayAllowance === null ? null : todayAllowance - variableToday;
  const elapsed = Math.max(
    1,
    Math.min(
      daysBetween(period.start, date) + 1,
      daysBetween(period.start, period.payday),
    ),
  );
  const futureDays = Math.max(
    0,
    Math.min(
      daysBetween(date, period.payday) - 1,
      daysBetween(period.start, period.payday),
    ),
  );
  const variableSpent = calc.spent - paid;
  const projectedSpending = Math.round((variableSpent / elapsed) * futureDays);
  const closing = calc.balance - pending - projectedSpending;
  const forecast = data.finance.forecasts.find((f) => f.periodId === period.id);
  const futureFixed = forecast
    ? occurrences(data.finance.fixed, period.payday, forecast.payday).reduce(
        (s, o) => s + o.fixed.cents,
        0,
      )
    : 0;
  const nextAvailable = forecast
    ? closing -
      period.savingsCents +
      forecast.incomeCents -
      futureFixed -
      forecast.savingsCents
    : null;
  const check = data.finance.checks
    .filter((c) => c.periodId === period.id)
    .at(-1);
  return {
    ...calc,
    due,
    pending,
    paid,
    variableToday,
    todayAllowance,
    todayAvailable,
    variableSpent,
    projectedSpending,
    closing,
    forecast,
    futureFixed,
    nextAvailable,
    check,
    savingPercent: period.initialCents
      ? (period.savingsCents / period.initialCents) * 100
      : 0,
  };
}
export function payFixed(
  data: Data,
  fixedId: string,
  dueDate: string,
  date: string,
) {
  const period = activePeriod(data);
  if (!period || date < period.start || date >= period.payday)
    throw new Error("Elegí un período que incluya la fecha del pago.");
  const occurrence = occurrences(
    data.finance.fixed,
    period.start,
    period.payday,
  ).find((o) => o.fixed.id === fixedId && o.date === dueDate);
  if (!occurrence)
    throw new Error("El vencimiento ya no existe en este período.");
  if (
    data.finance.payments.some(
      (p) => p.fixedId === fixedId && p.dueDate === dueDate,
    )
  )
    throw new Error("Este vencimiento ya está pagado.");
  const movementId = uid();
  data.movements.push({
    id: movementId,
    periodId: period.id,
    type: "expense",
    date,
    cents: occurrence.fixed.cents,
    category: occurrence.fixed.category,
    description: occurrence.fixed.name,
    purchaseId: null,
  });
  data.finance.payments.push({ id: uid(), fixedId, dueDate, movementId });
}
export function removeFinancialMovement(data: Data, id: string) {
  data.movements = data.movements.filter((m) => m.id !== id);
  data.finance.payments = data.finance.payments.filter(
    (p) => p.movementId !== id,
  );
}
export function savingsFromPercent(initial: number, percent: string) {
  if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(percent.trim()))
    throw new Error(
      "Ingresá un porcentaje entre 0 y 100, con hasta dos decimales.",
    );
  const bp = Math.round(Number(percent.replace(",", ".")) * 100);
  if (bp > 10000) throw new Error("El porcentaje debe ser entre 0 y 100.");
  // Avoid multiplying large cent integers before dividing.
  return (
    Math.floor(initial / 10000) * bp +
    Math.round(((initial % 10000) * bp) / 10000)
  );
}
export function nextMonth(date: string) {
  const [y, m, d] = date.split("-").map(Number),
    year = m === 12 ? y + 1 : y,
    month = m === 12 ? 1 : m + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, new Date(Date.UTC(year, month, 0)).getUTCDate())).padStart(2, "0")}`;
}
export function defaultForecastDate(period: Period) {
  return nextMonth(period.payday) || addDays(period.payday, 30);
}
