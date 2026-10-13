import { describe, expect, it } from "vitest";
import { budget, distribute } from "../src/modules/finance/logic";
import {
  convert,
  recipeCost,
  savePurchase,
  removePurchase,
  removeIngredient,
  removeRecipe,
} from "../src/modules/food/logic";
import {
  createData,
  migrateData,
  parseBackup,
  exportBackup,
  validateData,
  type Period,
  type Movement,
  type Recipe,
} from "../src/storage/model";
import { parseMoney, daysBetween, today } from "../src/shared/values";
const period: Period = {
  id: "p",
  start: "2026-10-01",
  payday: "2026-10-16",
  initialCents: 150000,
  savingsCents: 30000,
};
const move = (
  id: string,
  date: string,
  cents: number,
  type: "income" | "expense" = "expense",
): Movement => ({
  id,
  periodId: "p",
  type,
  date,
  cents,
  category: "Otros",
  description: "Ficticio",
  purchaseId: null,
});
function foodData() {
  const data = createData();
  data.periods = [period];
  data.activePeriodId = "p";
  data.ingredients = [
    {
      id: "pollo",
      name: "Pollo ficticio",
      quantity: 1,
      unit: "kg",
      priceCents: 35000,
    },
  ];
  data.recipes = [
    {
      id: "r",
      name: "Receta ficticia",
      portions: 4,
      lines: [{ ingredientId: "pollo", quantity: 400, unit: "g" }],
    },
  ];
  return data;
}
describe("presupuesto y dinero", () => {
  it("reparte exactamente los centésimos, incluidos presupuestos negativos", () => {
    for (const cents of [0, 1, 10, 10001, -1, -10001]) {
      const days = distribute(cents, 15);
      expect(days.reduce((a, b) => a + b, 0)).toBe(cents);
      expect(Math.max(...days) - Math.min(...days)).toBeLessThanOrEqual(1);
    }
    expect(distribute(10, 3)).toEqual([4, 3, 3]);
  });
  it("distingue saldo, ahorro y disponible con ingresos y gastos", () => {
    const calc = budget(
      period,
      [
        move("e", "2026-10-02", 10000),
        move("i", "2026-10-03", 20000, "income"),
      ],
      "2026-10-05",
    );
    expect(calc.balance).toBe(160000);
    expect(calc.savings).toBe(30000);
    expect(calc.available).toBe(130000);
    expect(calc.periodDaily).toBe(Math.floor(130000 / 11));
  });
  it("prorratea una semana parcial y arrastra sobrantes", () => {
    const calc = budget(period, [move("e", "2026-10-02", 10000)], "2026-10-09");
    expect(calc.weeks.map((w) => w.days)).toEqual([7, 7, 1]);
    expect(calc.weeks.map((w) => w.base)).toEqual([56000, 56000, 8000]);
    expect(calc.weeks[1].carry).toBe(46000);
    expect(calc.current?.remaining).toBe(102000);
    expect(calc.weeks.at(-1)?.remaining).toBe(calc.available);
  });
  it("arrastra déficit sin ocultarlo ni descontar dos veces", () => {
    const calc = budget(period, [move("e", "2026-10-02", 80000)], "2026-10-09");
    expect(calc.weeks[0].remaining).toBe(-24000);
    expect(calc.weeks[1].carry).toBe(-24000);
    expect(calc.current?.remaining).toBe(32000);
    expect(calc.available).toBe(40000);
  });
  it("suma un ingreso en la semana de recepción sin alterar semanas anteriores", () => {
    const calc = budget(
      period,
      [move("i", "2026-10-10", 20000, "income")],
      "2026-10-12",
    );
    expect(calc.weeks[0].income).toBe(0);
    expect(calc.weeks[1].income).toBe(20000);
    expect(calc.weeks.at(-1)?.remaining).toBe(140000);
  });
  it("excluye movimientos de otro período y futuros del saldo actual", () => {
    const other = { ...move("other", "2026-10-02", 99900), periodId: "other" };
    const calc = budget(
      period,
      [other, move("future", "2026-10-15", 10000)],
      "2026-10-05",
    );
    expect(calc.balance).toBe(period.initialCents);
  });
  it("maneja el día de cobro, períodos futuros y saldo negativo", () => {
    const ended = budget(period, [], "2026-10-16");
    expect(ended.daysLeft).toBe(0);
    expect(ended.daily).toBeNull();
    expect(ended.periodDaily).toBeNull();
    expect(budget(period, [], "2026-09-30").active).toBe(false);
    expect(
      budget(period, [move("e", "2026-10-01", 200000)], "2026-10-02").available,
    ).toBe(-80000);
  });
  it("rechaza movimientos fuera del período y copias con movimientos duplicados", () => {
    const d = foodData();
    d.movements = [move("e", "2026-10-16", 100)];
    expect(() => validateData(d)).toThrow("fecha");
    d.movements = [move("e", "2026-10-02", 100), move("e", "2026-10-02", 100)];
    expect(() => validateData(d)).toThrow("duplicados");
  });
  it("convierte dinero escrito sin usar floats para centésimos", () => {
    expect(parseMoney("350,05")).toBe(35005);
    expect(parseMoney("0.1")).toBe(10);
    for (const value of ["-1", "40.000", "1e3", "NaN", "0.001", ""])
      expect(() => parseMoney(value)).toThrow();
  });
  it("cuenta fechas civiles entre meses, años y febrero bisiesto", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(today(new Date("2026-10-14T01:00:00Z"))).toBe("2026-10-13");
  });
});
describe("costos, compras y preparaciones", () => {
  it("calcula 400 g de pollo a $350 por kg como $140 y cuatro porciones de $35", () => {
    const d = foodData();
    const cost = recipeCost(d.recipes[0], d.ingredients);
    expect(cost.lines[0].cents).toBe(14000);
    expect(cost.total).toBe(14000);
    expect(cost.perPortion).toBe(3500);
  });
  it("convierte masa y volumen, pero nunca ml a g o unidades a kg", () => {
    expect(convert(400, "g", "kg")).toBe(0.4);
    expect(convert(1, "l", "ml")).toBe(1000);
    expect(convert(2, "unidad", "unidad")).toBe(2);
    expect(() => convert(100, "ml", "g")).toThrow();
    expect(() => convert(1, "unidad", "kg")).toThrow();
    expect(() => convert(0, "kg", "g")).toThrow();
    expect(() => convert(1, "paquete" as never, "unidad")).toThrow();
  });
  it("redondea al final y valida cantidades y porciones", () => {
    const d = foodData();
    d.ingredients[0].quantity = 3;
    d.ingredients[0].unit = "g";
    d.ingredients[0].priceCents = 100;
    const recipe: Recipe = {
      id: "test",
      name: "Ficticio",
      portions: 3,
      lines: [{ ingredientId: "pollo", quantity: 1, unit: "g" }],
    };
    expect(recipeCost(recipe, d.ingredients).total).toBe(33);
    expect(recipeCost(recipe, d.ingredients).perPortion).toBe(11);
    expect(() =>
      recipeCost({ ...recipe, portions: 0 }, d.ingredients),
    ).toThrow();
    expect(() => recipeCost({ ...recipe, lines: [] }, d.ingredients)).toThrow();
  });
  it("guarda compra y gasto únicos; editar reemplaza el mismo gasto y borrar revierte el saldo", () => {
    const d = foodData();
    const purchase = {
      id: "buy",
      movementId: "movement",
      lines: [
        {
          ingredientId: "pollo",
          quantity: 1,
          unit: "kg" as const,
          totalCents: 35000,
        },
      ],
    };
    savePurchase(d, purchase, "p", "2026-10-02", "Pollo ficticio");
    validateData(d);
    expect(d.movements).toHaveLength(1);
    expect(budget(period, d.movements, "2026-10-03").spent).toBe(35000);
    recipeCost(d.recipes[0], d.ingredients);
    expect(d.movements).toHaveLength(1);
    savePurchase(
      d,
      {
        ...purchase,
        lines: [{ ...purchase.lines[0], quantity: 2, totalCents: 70000 }],
      },
      "p",
      "2026-10-02",
      "Edición",
    );
    validateData(d);
    expect(d.movements).toHaveLength(1);
    expect(d.purchases).toHaveLength(1);
    expect(d.movements[0].cents).toBe(70000);
    removePurchase(d, "buy");
    expect(d.movements).toHaveLength(0);
    expect(budget(period, d.movements, "2026-10-03").balance).toBe(
      period.initialCents,
    );
  });
  it("rechaza una compra duplicada, un vínculo roto y totales inconsistentes", () => {
    const d = foodData();
    savePurchase(
      d,
      {
        id: "buy",
        movementId: "movement",
        lines: [
          { ingredientId: "pollo", quantity: 1, unit: "kg", totalCents: 35000 },
        ],
      },
      "p",
      "2026-10-02",
      "Compra",
    );
    d.movements[0].cents = 30000;
    expect(() => validateData(d)).toThrow("único gasto");
    d.movements[0].cents = 35000;
    d.movements.push({ ...d.movements[0], id: "duplicate" });
    expect(() => validateData(d)).toThrow("único gasto");
  });
  it("conserva preparaciones al eliminar una receta y bloquea ingredientes usados", () => {
    const d = foodData();
    d.preparations = [
      {
        id: "prep",
        recipeId: "r",
        recipeName: "Receta ficticia",
        date: "2026-10-02",
        portions: 4,
        remaining: 3,
        costPerPortionCents: 3500,
      },
    ];
    expect(() => removeIngredient(d, "pollo")).toThrow();
    removeRecipe(d, "r");
    expect(d.preparations[0].recipeId).toBeNull();
    expect(d.preparations[0].recipeName).toBe("Receta ficticia");
    expect(d.preparations[0].remaining).toBe(3);
    validateData(d);
    removeIngredient(d, "pollo");
    expect(d.ingredients).toHaveLength(0);
  });
  it("exporta/restaura todas las entidades integradas sin perder relaciones", () => {
    const d = foodData();
    savePurchase(
      d,
      {
        id: "buy",
        movementId: "movement",
        lines: [
          { ingredientId: "pollo", quantity: 1, unit: "kg", totalCents: 35000 },
        ],
      },
      "p",
      "2026-10-02",
      "Compra",
    );
    d.preparations = [
      {
        id: "prep",
        recipeId: "r",
        recipeName: "Receta",
        date: "2026-10-03",
        portions: 4,
        remaining: 4,
        costPerPortionCents: 3500,
      },
    ];
    expect(parseBackup(exportBackup("personal", d), "personal")).toEqual(d);
  });
  it("migra la versión publicada conservando perfil, tema, fechas e identidad", () => {
    const current = createData("Nombre ficticio");
    const legacy = {
      schemaVersion: 1,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      profile: current.profile,
      settings: { ...current.settings, theme: "dark" },
    };
    const migrated = migrateData(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.profile).toEqual(legacy.profile);
    expect(migrated.settings).toEqual(legacy.settings);
    expect(migrated.id).toBe(legacy.id);
    expect(migrated.movements).toEqual([]);
    expect(legacy.schemaVersion).toBe(1);
  });
});
