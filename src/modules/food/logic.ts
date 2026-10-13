import { units, type Unit } from "../../shared/values";
import type {
  Ingredient,
  Recipe,
  PurchaseLine,
  Data,
  Purchase,
} from "../../storage/model";
export function convert(quantity: number, from: Unit, to: Unit): number {
  const group = (unit: Unit) =>
    unit === "g" || unit === "kg"
      ? "mass"
      : unit === "ml" || unit === "l"
        ? "volume"
        : "unit";
  if (
    !units.includes(from) ||
    !units.includes(to) ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    group(from) !== group(to)
  )
    throw new Error(
      "No se pueden convertir unidades de masa, volumen y cantidad entre sí.",
    );
  const factor = (unit: Unit) => (unit === "kg" || unit === "l" ? 1000 : 1);
  return (quantity * factor(from)) / factor(to);
}
export function recipeCost(recipe: Recipe, ingredients: Ingredient[]) {
  if (!recipe.lines.length)
    throw new Error("Agregá al menos un ingrediente a la receta.");
  const lines = recipe.lines.map((line) => {
    const ingredient = ingredients.find((i) => i.id === line.ingredientId);
    if (!ingredient) throw new Error("Falta un ingrediente de la receta.");
    return {
      ingredient,
      quantity: line.quantity,
      unit: line.unit,
      cents:
        (ingredient.priceCents *
          convert(line.quantity, line.unit, ingredient.unit)) /
        ingredient.quantity,
    };
  });
  if (!Number.isInteger(recipe.portions) || recipe.portions < 1)
    throw new Error("La receta necesita porciones enteras mayores que cero.");
  const preciseTotal = lines.reduce((sum, l) => sum + l.cents, 0);
  if (!Number.isFinite(preciseTotal) || preciseTotal > 1_000_000_000_000)
    throw new Error("El costo de la receta supera el límite permitido.");
  return {
    lines,
    total: Math.round(preciseTotal),
    perPortion: Math.round(preciseTotal / recipe.portions),
  };
}
export function purchaseTotal(lines: PurchaseLine[]): number {
  return lines.reduce((s, l) => s + l.totalCents, 0);
}
// Único caso de uso: compra, actualización de precios y gasto cambian juntos.
export function savePurchase(
  data: Data,
  purchase: Purchase,
  periodId: string,
  date: string,
  description: string,
) {
  const cents = purchaseTotal(purchase.lines);
  if (!cents) throw new Error("La compra necesita un importe mayor que cero.");
  data.purchases = data.purchases.filter((p) => p.id !== purchase.id);
  data.purchases.push(purchase);
  data.movements = data.movements.filter((m) => m.id !== purchase.movementId);
  data.movements.push({
    id: purchase.movementId,
    periodId,
    type: "expense",
    date,
    cents,
    category: "Alimentación",
    description,
    purchaseId: purchase.id,
  });
  for (const line of purchase.lines) {
    const ingredient = data.ingredients.find((i) => i.id === line.ingredientId);
    if (!ingredient) throw new Error("El ingrediente no existe.");
    convert(line.quantity, line.unit, ingredient.unit);
    ingredient.priceCents = line.totalCents;
    ingredient.quantity = line.quantity;
    ingredient.unit = line.unit;
  }
}
export function removePurchase(data: Data, id: string) {
  const purchase = data.purchases.find((p) => p.id === id);
  if (!purchase) throw new Error("La compra no existe.");
  data.movements = data.movements.filter((m) => m.id !== purchase.movementId);
  data.purchases = data.purchases.filter((p) => p.id !== id);
}
export function removeIngredient(data: Data, id: string) {
  if (
    data.recipes.some((r) => r.lines.some((l) => l.ingredientId === id)) ||
    data.purchases.some((p) => p.lines.some((l) => l.ingredientId === id))
  )
    throw new Error(
      "Este ingrediente está usado en recetas o compras. Resolvé esas referencias antes de eliminarlo.",
    );
  data.ingredients = data.ingredients.filter((i) => i.id !== id);
}
export function removeRecipe(data: Data, id: string) {
  data.recipes = data.recipes.filter((r) => r.id !== id);
  data.preparations.forEach((p) => {
    if (p.recipeId === id) p.recipeId = null;
  });
}
