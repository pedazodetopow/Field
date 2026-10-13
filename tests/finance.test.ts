import { describe, expect, it } from "vitest";
import {
  createData,
  exportBackup,
  migrateData,
  parseBackup,
  validateData,
  type FixedExpense,
} from "../src/storage/model";
import {
  financialSummary,
  nextMonth,
  occurrences,
  payFixed,
  removeFinancialMovement,
  savingsFromPercent,
} from "../src/modules/finance/planning";
import { financialForm } from "../src/modules/finance/forms";
import { createDemo } from "../src/demo/data";
function fixture() {
  const d = createData();
  d.periods = [
    {
      id: "p",
      start: "2026-10-01",
      payday: "2026-10-16",
      initialCents: 150000,
      savingsCents: 30000,
    },
  ];
  d.activePeriodId = "p";
  d.finance.fixed = [
    {
      id: "rent",
      name: "Alquiler",
      cents: 30000,
      category: "Vivienda",
      day: 10,
      start: "2026-01-01",
      end: null,
    },
  ];
  return d;
}
const date = "2026-10-05";
const calc = (d = fixture()) => financialSummary(d, d.periods[0], date);
function expense(d: ReturnType<typeof fixture>, cents = 10000) {
  d.movements.push({
    id: "variable",
    periodId: "p",
    type: "expense",
    date,
    cents,
    category: "Otros",
    description: "Ficticio",
    purchaseId: null,
  });
}
describe("fijos sin doble gasto y presupuesto diario", () => {
  it("reserva pendientes antes de repartir días y semanas", () => {
    const c = calc();
    expect(c.balance).toBe(150000);
    expect(c.pending).toBe(30000);
    expect(c.available).toBe(90000);
    expect(c.weeks.map((w) => w.base)).toEqual([42000, 42000, 6000]);
    expect(c.weeks.at(-1)!.remaining).toBe(c.available);
  });
  it("pagar conserva disponible y semana, baja saldo y elimina pendiente", () => {
    const d = fixture(),
      before = calc(d);
    payFixed(d, "rent", "2026-10-10", date);
    const after = calc(d);
    expect(after.balance).toBe(120000);
    expect(after.pending).toBe(0);
    expect(after.paid).toBe(30000);
    expect(after.available).toBe(before.available);
    expect(after.weeks).toEqual(before.weeks);
    expect(after.variableToday).toBe(0);
    expect(d.movements).toHaveLength(1);
    expect(() => payFixed(d, "rent", "2026-10-10", date)).toThrow(
      "ya está pagado",
    );
    expect(validateData(d)).toEqual(d);
  });
  it("editar el pago recalcula su reserva histórica, borrar vuelve a pendiente", () => {
    const d = fixture();
    payFixed(d, "rent", "2026-10-10", date);
    d.movements[0].cents = 35000;
    expect(calc(d).available).toBe(85000);
    expect(calc(d).weeks.at(-1)!.remaining).toBe(85000);
    removeFinancialMovement(d, d.movements[0].id);
    expect(calc(d).pending).toBe(30000);
    expect(calc(d).available).toBe(90000);
    expect(d.finance.payments).toHaveLength(0);
  });
  it("borrar la regla conserva su pago, no lo descuenta dos veces", () => {
    const d = fixture();
    payFixed(d, "rent", "2026-10-10", date);
    d.finance.fixed = [];
    expect(validateData(d)).toEqual(d);
    expect(calc(d).available).toBe(90000);
    expect(calc(d).weeks.at(-1)!.remaining).toBe(90000);
  });
  it("hoy resta todo lo gastado hoy después de fijar su cuota", () => {
    const d = fixture();
    expense(d, 10000);
    const c = calc(d);
    expect(c.current!.remaining).toBe(32000);
    expect(c.todayAllowance).toBe(14000);
    expect(c.todayAvailable).toBe(4000);
    expect(c.available).toBe(80000);
  });
  it("conserva sobregasto diario, déficit y arrastre negativo", () => {
    const d = fixture();
    expense(d, 160000);
    const c = calc(d);
    expect(c.balance).toBe(-10000);
    expect(c.available).toBe(-70000);
    expect(c.todayAvailable).toBe(-146000);
    expect(c.weeks[1].carry).toBe(-118000);
  });
  it("el día de cobro no tiene cuota diaria; no inventa un ingreso", () => {
    const d = fixture();
    const c = financialSummary(d, d.periods[0], "2026-10-16");
    expect(c.todayAvailable).toBeNull();
    expect(c.daysLeft).toBe(0);
    expect(c.balance).toBe(150000);
  });
  it("meses cortos, inicio incluido, fin exclusivo y vigencia", () => {
    const fixed: FixedExpense = {
      id: "a",
      name: "Servicio",
      cents: 10000,
      category: "Servicios",
      day: 31,
      start: "2024-01-31",
      end: "2024-03-31",
    };
    expect(
      occurrences([fixed], "2024-01-31", "2024-04-01").map((o) => o.date),
    ).toEqual(["2024-01-31", "2024-02-29", "2024-03-31"]);
    expect(occurrences([fixed], "2024-02-01", "2024-02-29")).toHaveLength(0);
    expect(
      occurrences(
        [{ ...fixed, start: "2025-01-01", end: null }],
        "2025-02-01",
        "2025-03-01",
      )[0].date,
    ).toBe("2025-02-28");
    expect(nextMonth("2026-12-31")).toBe("2027-01-31");
    expect(nextMonth("2024-01-31")).toBe("2024-02-29");
  });
  it("varios vencimientos del mismo fijo se pagan por separado", () => {
    const d = fixture();
    d.periods[0].payday = "2026-12-01";
    payFixed(d, "rent", "2026-10-10", date);
    expect(calc(d).pending).toBe(30000);
    expect(calc(d).due).toHaveLength(2);
    expect(calc(d).due[1].payment).toBeUndefined();
  });
  it("validación rechaza pagos huérfanos, duplicados o vinculados a ingresos", () => {
    const d = fixture();
    payFixed(d, "rent", "2026-10-10", date);
    d.finance.payments.push({ ...d.finance.payments[0], id: "duplicate" });
    expect(() => validateData(d)).toThrow("único");
    d.finance.payments.pop();
    d.movements[0].type = "income";
    expect(() => validateData(d)).toThrow("único");
    d.movements = [];
    expect(() => validateData(d)).toThrow("único");
  });
});
describe("ahorro, proyección y migraciones", () => {
  it("porcentaje redondea una vez, mantiene centésimos y limita entradas", () => {
    expect(savingsFromPercent(10001, "33,33")).toBe(3333);
    expect(savingsFromPercent(4000000, "30")).toBe(1200000);
    expect(savingsFromPercent(1000000000000, "99.99")).toBe(999900000000);
    for (const value of ["-1", "101", "1e2", "3.333"])
      expect(() => savingsFromPercent(10000, value)).toThrow();
  });
  it("proyección usa gasto variable y excluye pagos ya reservados", () => {
    const d = fixture();
    expense(d, 10000);
    payFixed(d, "rent", "2026-10-10", date);
    const c = calc(d);
    expect(c.projectedSpending).toBe(20000);
    expect(c.closing).toBe(90000);
    d.finance.forecasts = [
      {
        id: "f",
        periodId: "p",
        incomeCents: 200000,
        payday: "2026-11-16",
        savingsCents: 40000,
      },
    ];
    expect(calc(d).nextAvailable).toBe(190000);
    expect(d.movements).toHaveLength(2);
  });
  it("metas independientes no alteran saldo ni disponible", () => {
    const d = fixture(),
      before = calc(d);
    d.finance.goals = [
      {
        id: "g",
        name: "Fondo",
        targetCents: 50000,
        savedCents: 20000,
        targetDate: null,
      },
    ];
    const f = financialForm("contribution", d, "g")!,
      form = new FormData();
    form.set("cents", "100");
    f.submit(d, form);
    expect(d.finance.goals[0].savedCents).toBe(30000);
    expect(calc(d).available).toBe(before.available);
    expect(d.movements).toHaveLength(0);
  });
  it("migración v2 mantiene todas las entidades y rechaza datos desconocidos", () => {
    const d = createDemo();
    const { finance, ...previous } = d;
    const v2 = { ...previous, schemaVersion: 2 };
    const migrated = migrateData(v2);
    expect(migrated).toEqual({
      ...d,
      finance: {
        fixed: [],
        payments: [],
        goals: [],
        checks: [],
        forecasts: [],
      },
    });
    expect(v2.schemaVersion).toBe(2);
    expect(() => migrateData({ ...v2, unexpected: 42 })).toThrow("campos");
    expect(finance.fixed.length).toBeGreaterThan(0);
  });
  it("exportación incluye fijos, pagos, metas, conciliaciones y escenarios", () => {
    const d = fixture();
    payFixed(d, "rent", "2026-10-10", date);
    d.finance.goals = [
      {
        id: "g",
        name: "Fondo",
        targetCents: 100000,
        savedCents: 10000,
        targetDate: null,
      },
    ];
    d.finance.checks = [
      {
        id: "c",
        periodId: "p",
        date,
        actualCents: -1000,
        calculatedCents: 120000,
      },
    ];
    d.finance.forecasts = [
      {
        id: "f",
        periodId: "p",
        incomeCents: 200000,
        payday: "2026-11-16",
        savingsCents: 40000,
      },
    ];
    expect(parseBackup(exportBackup("personal", d), "personal")).toEqual(d);
  });
});
