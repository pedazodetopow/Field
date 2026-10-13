import { createData } from "../storage/model";
import { today, addDays, uid } from "../shared/values";
import { recipeCost, savePurchase } from "../modules/food/logic";
export function createDemo() {
  const data = createData("Alex · ejemplo"),
    date = today(),
    periodId = uid();
  data.periods = [
    {
      id: periodId,
      start: addDays(date, -9),
      payday: addDays(date, 18),
      initialCents: 4000000,
      savingsCents: 1200000,
    },
  ];
  data.activePeriodId = periodId;
  data.ingredients = [
    {
      id: "demo-pollo",
      name: "Pollo",
      quantity: 1,
      unit: "kg",
      priceCents: 35000,
    },
    {
      id: "demo-arroz",
      name: "Arroz",
      quantity: 1,
      unit: "kg",
      priceCents: 6500,
    },
    {
      id: "demo-verduras",
      name: "Verduras",
      quantity: 1,
      unit: "kg",
      priceCents: 12000,
    },
    {
      id: "demo-aceite",
      name: "Aceite",
      quantity: 900,
      unit: "ml",
      priceCents: 11000,
    },
    {
      id: "demo-lentejas",
      name: "Lentejas",
      quantity: 500,
      unit: "g",
      priceCents: 8900,
    },
  ];
  data.recipes = [
    {
      id: uid(),
      name: "Pollo con arroz y verduras",
      portions: 4,
      lines: [
        { ingredientId: "demo-pollo", quantity: 400, unit: "g" },
        { ingredientId: "demo-arroz", quantity: 240, unit: "g" },
        { ingredientId: "demo-verduras", quantity: 500, unit: "g" },
        { ingredientId: "demo-aceite", quantity: 20, unit: "ml" },
      ],
    },
    {
      id: uid(),
      name: "Guiso de lentejas",
      portions: 6,
      lines: [
        { ingredientId: "demo-lentejas", quantity: 500, unit: "g" },
        { ingredientId: "demo-verduras", quantity: 600, unit: "g" },
        { ingredientId: "demo-arroz", quantity: 200, unit: "g" },
      ],
    },
  ];
  data.movements = [
    {
      id: uid(),
      periodId,
      type: "expense",
      date: addDays(date, -7),
      cents: 180000,
      category: "Servicios",
      description: "Electricidad · ejemplo",
      purchaseId: null,
    },
    {
      id: uid(),
      periodId,
      type: "expense",
      date: addDays(date, -2),
      cents: 24000,
      category: "Transporte",
      description: "Boletos · ejemplo",
      purchaseId: null,
    },
    {
      id: uid(),
      periodId,
      type: "expense",
      date: date,
      cents: 48000,
      category: "Otros",
      description: "Farmacia · ejemplo",
      purchaseId: null,
    },
    {
      id: uid(),
      periodId,
      type: "income",
      date: addDays(date, -1),
      cents: 150000,
      category: "Ingreso",
      description: "Trabajo extra · ejemplo",
      purchaseId: null,
    },
  ];
  savePurchase(
    data,
    {
      id: uid(),
      movementId: uid(),
      lines: [
        {
          ingredientId: "demo-pollo",
          quantity: 1,
          unit: "kg",
          totalCents: 35000,
        },
        {
          ingredientId: "demo-arroz",
          quantity: 1,
          unit: "kg",
          totalCents: 6500,
        },
      ],
    },
    periodId,
    addDays(date, -1),
    "Supermercado · ejemplo",
  );
  data.preparations = [
    {
      id: uid(),
      recipeId: data.recipes[0].id,
      recipeName: data.recipes[0].name,
      date: addDays(date, -1),
      portions: 4,
      remaining: 3,
      costPerPortionCents: recipeCost(data.recipes[0], data.ingredients)
        .perPortion,
    },
    {
      id: uid(),
      recipeId: data.recipes[1].id,
      recipeName: data.recipes[1].name,
      date: date,
      portions: 6,
      remaining: 6,
      costPerPortionCents: recipeCost(data.recipes[1], data.ingredients)
        .perPortion,
    },
  ];
  data.finance.fixed = [
    {
      id: "demo-internet",
      name: "Internet · ejemplo",
      cents: 165000,
      category: "Servicios",
      day: Number(addDays(date, 3).slice(8)),
      start: date,
      end: null,
    },
    {
      id: "demo-alquiler",
      name: "Alquiler · ejemplo",
      cents: 750000,
      category: "Vivienda",
      day: Number(addDays(date, 8).slice(8)),
      start: date,
      end: null,
    },
  ];
  data.finance.goals = [
    {
      id: "demo-fondo",
      name: "Fondo de emergencia",
      targetCents: 9000000,
      savedCents: 3600000,
      targetDate: addDays(date, 180),
    },
    {
      id: "demo-viaje",
      name: "Vacaciones",
      targetCents: 4500000,
      savedCents: 1200000,
      targetDate: addDays(date, 120),
    },
  ];
  data.finance.forecasts = [
    {
      id: "demo-proyeccion",
      periodId,
      incomeCents: 4500000,
      payday: addDays(date, 48),
      savingsCents: 1200000,
    },
  ];
  return data;
}
