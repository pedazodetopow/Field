import { financialForm } from "../modules/finance/forms";
import { removeFinancialMovement } from "../modules/finance/planning";
import type {
  Data,
  Ingredient,
  Movement,
  Period,
  Preparation,
  Purchase,
  Recipe,
  RecipeLine,
} from "../storage/model";
import { activePeriod } from "../modules/finance/logic";
import {
  recipeCost,
  removeIngredient,
  removePurchase,
  removeRecipe,
  savePurchase,
} from "../modules/food/logic";
import {
  addDays,
  esc,
  moneyInput,
  parseMoney,
  today,
  uid,
  type Unit,
} from "../shared/values";
import {
  input,
  moneyField,
  select,
  unitOptions,
  button,
  icon,
} from "../shared/ui";
export type EditorKind =
  | "fixed"
  | "goal"
  | "contribution"
  | "balance-check"
  | "forecast"
  | "period"
  | "movement"
  | "ingredient"
  | "recipe"
  | "purchase"
  | "preparation";
export interface FormSpec {
  title: string;
  html: string;
  submit(data: Data, form: FormData): void;
}
const value = (form: FormData, name: string) => String(form.get(name) ?? "");
function number(form: FormData, name: string) {
  const result = Number(value(form, name).replace(",", "."));
  if (!Number.isFinite(result)) throw new Error("Ingresá una cantidad válida.");
  return result;
}
function upsert<T extends { id: string }>(rows: T[], next: T) {
  const index = rows.findIndex((row) => row.id === next.id);
  if (index < 0) rows.push(next);
  else rows[index] = next;
}
function dated(date: string) {
  if (date > today())
    throw new Error(
      "Registrá los movimientos y preparaciones en una fecha de hoy o anterior.",
    );
}
export function lineRow(
  data: Data,
  line?: RecipeLine & { totalCents?: number },
  purchase = false,
): string {
  return `<div class="builder-line" data-line><label class="line-ingredient"><span>Ingrediente</span><select name="ingredientId" aria-label="Ingrediente" required><option value="">Elegí un ingrediente</option>${data.ingredients.map((i) => `<option value="${i.id}" ${i.id === line?.ingredientId ? "selected" : ""}>${esc(i.name)}</option>`).join("")}</select></label><label><span>Cantidad</span><input name="quantity" aria-label="Cantidad" type="number" min="0.001" max="1000000" step="any" value="${line?.quantity ?? ""}" required inputmode="decimal"></label><label><span>Unidad</span><select name="unit" aria-label="Unidad">${unitOptions(line?.unit ?? "g")}</select></label>${purchase ? `<label class="line-price"><span>Precio pagado ($)</span><input name="totalCents" aria-label="Precio pagado ($)" inputmode="decimal" value="${line?.totalCents === undefined ? "" : moneyInput(line.totalCents)}" required></label>` : ""}<button type="button" class="icon-button danger remove-line" aria-label="Quitar ingrediente">${icon("close")}</button></div>`;
}
function lines(form: FormData, purchase = false) {
  const ids = form.getAll("ingredientId"),
    qty = form.getAll("quantity"),
    unit = form.getAll("unit"),
    prices = form.getAll("totalCents");
  return ids.map((id, i) => ({
    ingredientId: String(id),
    quantity: Number(String(qty[i]).replace(",", ".")),
    unit: String(unit[i]) as Unit,
    ...(purchase ? { totalCents: parseMoney(String(prices[i])) } : {}),
  }));
}
function builder(data: Data, rows: RecipeLine[], purchase = false) {
  return `<fieldset class="line-builder"><legend>${purchase ? "Qué compraste" : "Ingredientes de la receta"}</legend><div id="builder-lines">${(rows.length ? rows : [undefined]).map((l) => lineRow(data, l, purchase)).join("")}</div>${button(icon("plus") + " Agregar línea", "add-line", "secondary small", 'type="button"')}<output id="cost-preview" class="cost-preview" aria-live="polite"></output></fieldset>`;
}
export function formSpec(
  kind: EditorKind,
  data: Data,
  id?: string,
  recipeId?: string,
): FormSpec {
  const finance = financialForm(kind, data, id);
  if (finance) return finance;
  if (kind === "period") {
    const old = data.periods.find((p) => p.id === id);
    return {
      title: old ? "Ajustar presupuesto" : "Configurar un período",
      html: `<p class="form-note">Saldo al inicio del período, antes de sus movimientos. Reservar ahorro reduce el presupuesto disponible, sin crear un gasto.</p><div class="form-grid">${moneyField("Saldo inicial", "initialCents", old?.initialCents ?? 0)}${moneyField("Ahorro a reservar", "savingsCents", old?.savingsCents ?? 0)}${input("Calcular ahorro por porcentaje", "savingsPercent", "", "text", 'inputmode="decimal" placeholder="Ej.: 20"')}<p class="form-note">Opcional: el porcentaje se aplica al saldo inicial y completa el monto a reservar.</p>${input("Fecha de inicio", "start", old?.start ?? today(), "date", "required")}${input("Próximo cobro", "payday", old?.payday ?? addDays(today(), 30), "date", "required")}</div>${old ? "" : '<p class="form-note">Los períodos anteriores y sus movimientos se conservan. El nuevo saldo se confirma manualmente; no se supone un ingreso al cobrar.</p>'}`,
      submit(next, form) {
        const period: Period = {
          id: old?.id ?? uid(),
          start: value(form, "start"),
          payday: value(form, "payday"),
          initialCents: parseMoney(value(form, "initialCents")),
          savingsCents: parseMoney(value(form, "savingsCents")),
        };
        upsert(next.periods, period);
        next.activePeriodId = period.id;
      },
    };
  }
  if (kind === "movement") {
    const old = data.movements.find((m) => m.id === id),
      period = old
        ? data.periods.find((p) => p.id === old.periodId)!
        : activePeriod(data)!;
    const cats = [
      "Alimentación",
      "Transporte",
      "Vivienda",
      "Servicios",
      "Salud",
      "Ocio",
      "Otros",
      "Ingreso",
    ];
    if (old && !cats.includes(old.category)) cats.push(old.category);
    return {
      title: old ? "Editar movimiento" : "Anotar movimiento",
      html: `<div class="form-grid">${select("Tipo", "type", `<option value="expense" ${old?.type !== "income" ? "selected" : ""}>Gasto</option><option value="income" ${old?.type === "income" ? "selected" : ""}>Ingreso</option>`)}${moneyField("Monto", "cents", old?.cents ?? 0)}${input("Fecha", "date", old?.date ?? today(), "date", `required min="${period.start}" max="${today() < period.payday ? today() : addDays(period.payday, -1)}"`)}${select("Categoría", "category", cats.map((c) => `<option ${c === (old?.category ?? "Otros") ? "selected" : ""}>${esc(c)}</option>`).join(""))}</div>${input("Descripción", "description", old?.description ?? "", "text", 'maxlength="180" placeholder="Ej.: boleto, sueldo, farmacia"')}`,
      submit(next, form) {
        const date = value(form, "date");
        dated(date);
        const movement: Movement = {
          id: old?.id ?? uid(),
          periodId: period.id,
          type: value(form, "type") as Movement["type"],
          date,
          cents: parseMoney(value(form, "cents")),
          category: value(form, "category"),
          description: value(form, "description").trim(),
          purchaseId: null,
        };
        if (
          next.finance.payments.some((p) => p.movementId === movement.id) &&
          movement.type !== "expense"
        )
          throw new Error(
            "Un pago fijo debe seguir siendo un gasto. Eliminá el pago para volver a dejar el vencimiento pendiente.",
          );
        upsert(next.movements, movement);
      },
    };
  }
  if (kind === "ingredient") {
    const old = data.ingredients.find((i) => i.id === id);
    return {
      title: old ? "Editar ingrediente" : "Agregar ingrediente",
      html: `${input("Nombre del ingrediente", "name", old?.name ?? "", "text", 'required maxlength="120" placeholder="Ej.: pollo"')}<div class="form-grid">${input("Cantidad del envase", "quantity", old?.quantity ?? 1, "number", 'required min="0.001" max="1000000" step="any"')}${select("Unidad", "unit", unitOptions(old?.unit ?? "kg"))}</div>${moneyField("Precio del envase", "priceCents", old?.priceCents ?? 0)}<p class="form-note">Ejemplo: 1 kg de pollo a $ 350. Registrar el precio no registra una compra ni un gasto.</p>`,
      submit(next, form) {
        const ingredient: Ingredient = {
          id: old?.id ?? uid(),
          name: value(form, "name").trim(),
          quantity: number(form, "quantity"),
          unit: value(form, "unit") as Unit,
          priceCents: parseMoney(value(form, "priceCents")),
        };
        upsert(next.ingredients, ingredient);
        next.recipes.forEach((r) => recipeCost(r, next.ingredients));
      },
    };
  }
  if (kind === "recipe") {
    const old = data.recipes.find((r) => r.id === id);
    return {
      title: old ? "Editar receta" : "Crear receta",
      html: `${input("Nombre de la receta", "name", old?.name ?? "", "text", 'required maxlength="120" placeholder="Ej.: pollo con arroz"')}${input("Porciones de la receta", "portions", old?.portions ?? 4, "number", 'required min="1" max="1000000" step="1"')}${builder(data, old?.lines ?? [])}<p class="form-note">Los precios vienen de los ingredientes. El costo de cocinar no vuelve a descontarse de Finanzas.</p>`,
      submit(next, form) {
        const recipe: Recipe = {
          id: old?.id ?? uid(),
          name: value(form, "name").trim(),
          portions: number(form, "portions"),
          lines: lines(form),
        };
        recipeCost(recipe, next.ingredients);
        upsert(next.recipes, recipe);
      },
    };
  }
  if (kind === "purchase") {
    const old = data.purchases.find((p) => p.id === id),
      movement = data.movements.find((m) => m.id === old?.movementId),
      period = movement
        ? data.periods.find((p) => p.id === movement.periodId)!
        : activePeriod(data)!;
    return {
      title: old ? "Editar compra" : "Anotar compra de alimentos",
      html: `<div class="form-grid">${input("Fecha de compra", "date", movement?.date ?? today(), "date", `required min="${period.start}" max="${today() < period.payday ? today() : addDays(period.payday, -1)}"`)}${input("Descripción de la compra", "description", movement?.description ?? "Compra de alimentos", "text", 'required maxlength="180"')}</div>${builder(data, old?.lines ?? [], true)}<p class="form-note">Se guarda un único gasto de Alimentación y se actualiza el precio de los envases comprados. Editar modifica ese mismo gasto.</p>`,
      submit(next, form) {
        dated(value(form, "date"));
        const purchase: Purchase = {
          id: old?.id ?? uid(),
          movementId: old?.movementId ?? uid(),
          lines: lines(form, true) as Purchase["lines"],
        };
        savePurchase(
          next,
          purchase,
          period.id,
          value(form, "date"),
          value(form, "description").trim(),
        );
        next.recipes.forEach((r) => recipeCost(r, next.ingredients));
      },
    };
  }
  const old = data.preparations.find((p) => p.id === id),
    recipe =
      data.recipes.find((r) => r.id === (recipeId ?? old?.recipeId)) ??
      data.recipes[0];
  return {
    title: old ? "Editar preparación" : "Registrar preparación",
    html: `${select("Receta preparada", "recipeId", `${old && !old.recipeId ? `<option value="" selected>${esc(old.recipeName)} · receta eliminada</option>` : ""}${data.recipes.map((r) => `<option value="${r.id}" ${old && !old.recipeId ? "" : r.id === recipe?.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}`)}<div class="form-grid">${input("Fecha de preparación", "date", old?.date ?? today(), "date", `required max="${today()}"`)}${input("Porciones preparadas", "portions", old?.portions ?? recipe?.portions ?? 1, "number", 'required min="1" max="1000000" step="1"')}${input("Porciones disponibles", "remaining", old?.remaining ?? recipe?.portions ?? 1, "number", 'required min="0" max="1000000" step="1"')}</div><p class="form-note">Las porciones se registran manualmente. Se conserva el costo calculado al registrar la preparación, incluso si cambiás los precios después.</p>`,
    submit(next, form) {
      dated(value(form, "date"));
      const chosen = next.recipes.find((r) => r.id === value(form, "recipeId"));
      const same = old && old.recipeId === (chosen?.id ?? null);
      if (!chosen && !old) throw new Error("Elegí una receta.");
      const preparation: Preparation = {
        id: old?.id ?? uid(),
        recipeId: chosen?.id ?? null,
        recipeName: same ? old.recipeName : chosen!.name,
        date: value(form, "date"),
        portions: number(form, "portions"),
        remaining: number(form, "remaining"),
        costPerPortionCents: same
          ? old.costPerPortionCents
          : recipeCost(chosen!, next.ingredients).perPortion,
      };
      upsert(next.preparations, preparation);
    },
  };
}
export function deleteEntity(data: Data, kind: string, id: string) {
  if (kind === "movement") {
    const m = data.movements.find((m) => m.id === id);
    if (m?.purchaseId) removePurchase(data, m.purchaseId);
    else removeFinancialMovement(data, id);
  }
  if (kind === "fixed")
    data.finance.fixed = data.finance.fixed.filter((f) => f.id !== id);
  if (kind === "goal")
    data.finance.goals = data.finance.goals.filter((g) => g.id !== id);
  if (kind === "purchase") removePurchase(data, id);
  if (kind === "ingredient") removeIngredient(data, id);
  if (kind === "recipe") removeRecipe(data, id);
  if (kind === "preparation")
    data.preparations = data.preparations.filter((p) => p.id !== id);
}
