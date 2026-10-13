import { recipeCost, purchaseTotal } from "./logic";
import { amount, button, icon, stat } from "../../shared/ui";
import { esc, dateLabel } from "../../shared/values";
import type { Data } from "../../storage/model";
export type KitchenTab =
  | "recetas"
  | "ingredientes"
  | "compras"
  | "preparaciones";
export function preparationsView(data: Data, compact = false) {
  return [...data.preparations]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((p) => !compact || p.remaining > 0)
    .map(
      (p) =>
        `<div class="prep-row"><div><strong>${esc(p.recipeName)}</strong><small>${dateLabel(p.date)} · ${amount(p.costPerPortionCents)} / porción</small></div><div class="prep-end"><strong>${p.remaining}<small> / ${p.portions} porciones</small></strong><div class="row-actions">${p.remaining ? button("Consumir 1", "consume", "small secondary", `data-id="${p.id}" aria-label="Consumir una porción de ${esc(p.recipeName)}"`) : ""}${!compact ? button("Editar", "preparation", "text", `data-id="${p.id}"`) + button("Eliminar", "delete-preparation", "text danger", `data-id="${p.id}"`) : ""}</div></div></div>`,
    )
    .join("");
}
export function kitchenView(data: Data, tab: KitchenTab) {
  const portions = data.preparations.reduce((s, p) => s + p.remaining, 0);
  const labels = {
    recetas: "Recetas",
    ingredientes: "Ingredientes",
    compras: "Compras",
    preparaciones: "Preparaciones",
  };
  const actions = {
    recetas: ["Nueva receta", "recipe"],
    ingredientes: ["Nuevo ingrediente", "ingredient"],
    compras: ["Anotar compra", "purchase"],
    preparaciones: ["Registrar preparación", "preparation"],
  };
  const stats = `<div class="kitchen-summary">${stat("Porciones disponibles", String(portions), data.preparations.filter((p) => p.remaining).length + " preparaciones")}${stat("Recetas guardadas", String(data.recipes.length))}${stat("Ingredientes", String(data.ingredients.length))}</div>`;
  let content = "";
  if (tab === "ingredientes")
    content = `<section class="panel"><div class="section-title"><h2>Precios de referencia</h2><span class="subtle">Por envase comprado</span></div>${data.ingredients.length ? data.ingredients.map((i) => `<div class="ingredient-row"><div><strong>${esc(i.name)}</strong><small>${i.quantity} ${i.unit}</small></div><div>${amount(i.priceCents)}<div class="row-actions">${button("Editar", "ingredient", "text", `data-id="${i.id}" aria-label="Editar ${esc(i.name)}"`)}${button("Eliminar", "delete-ingredient", "text danger", `data-id="${i.id}" aria-label="Eliminar ${esc(i.name)}"`)}</div></div></div>`).join("") : '<p class="empty-message">Cargá un ingrediente con el precio y la cantidad del envase.</p>'}<p class="footnote">Cambiar un precio no registra un gasto. Los costos de las recetas usan estos precios actuales.</p></section>`;
  if (tab === "recetas")
    content = data.recipes.length
      ? `<div class="recipe-grid">${data.recipes
          .map((r) => {
            const cost = recipeCost(r, data.ingredients);
            return `<article class="recipe-card"><div class="recipe-heading"><span class="recipe-initial">${esc(r.name.slice(0, 1).toUpperCase())}</span><div><h2>${esc(r.name)}</h2><small>${r.portions} porciones · ${r.lines.length} ingredientes</small></div></div><div class="recipe-price">${amount(cost.perPortion)}<span>por porción</span></div><div class="recipe-total">Costo total ${amount(cost.total)}</div><details><summary>Ver cantidades y costos</summary>${cost.lines.map((l) => `<div class="cost-line"><span>${esc(l.ingredient.name)}<small>${l.quantity} ${l.unit}</small></span>${amount(Math.round(l.cents))}</div>`).join("")}<p class="footnote">Cantidad usada ÷ contenido del envase × precio. Se redondea al final del cálculo.</p></details><div class="recipe-actions">${button("Preparar", "preparation", "primary", `data-recipe="${r.id}"`)}${button("Editar", "recipe", "text", `data-id="${r.id}" aria-label="Editar ${esc(r.name)}"`)}${button("Eliminar", "delete-recipe", "text danger", `data-id="${r.id}" aria-label="Eliminar ${esc(r.name)}"`)}</div></article>`;
          })
          .join("")}</div>`
      : `<section class="empty-setup"><h2>Armá tu primera receta</h2><p>${data.ingredients.length ? "Elegí ingredientes, cantidades y porciones." : "Primero cargá ingredientes con sus precios."}</p>${button(data.ingredients.length ? "Crear receta" : "Agregar ingrediente", data.ingredients.length ? "recipe" : "ingredient")}</section>`;
  if (tab === "compras")
    content = `<section class="panel"><div class="section-title"><h2>Compras de alimentos</h2><span class="subtle">Un gasto por compra</span></div>${
      data.purchases.length
        ? data.purchases
            .map((p) => {
              const m = data.movements.find((m) => m.id === p.movementId)!;
              return `<div class="purchase-row"><div><strong>${esc(m.description || "Compra de alimentos")}</strong><small>${dateLabel(m.date)} · ${p.lines.map((l) => esc(data.ingredients.find((i) => i.id === l.ingredientId)!.name)).join(", ")}</small><span class="linked-label">${icon("check")} Registrada en Finanzas</span></div><div>${amount(purchaseTotal(p.lines))}<div class="row-actions">${button("Editar", "purchase", "text", `data-id="${p.id}" aria-label="Editar compra ${esc(m.description)}"`)}${button("Eliminar", "delete-purchase", "text danger", `data-id="${p.id}" aria-label="Eliminar compra ${esc(m.description)}"`)}</div></div></div>`;
            })
            .join("")
        : '<p class="empty-message">Anotá una compra para actualizar precios y registrar su gasto una sola vez.</p>'
    }<p class="footnote">Usar ingredientes en una receta o registrar una preparación no genera otro gasto financiero.</p></section>`;
  if (tab === "preparaciones")
    content = `<section class="panel"><div class="section-title"><h2>Preparaciones y porciones</h2><span class="subtle">${portions} disponibles</span></div>${data.preparations.length ? preparationsView(data) : '<p class="empty-message">Registrá una receta preparada y descontá porciones a medida que las comés.</p>'}<p class="footnote">El costo por porción conserva los precios usados al registrar la preparación. Las porciones son un registro manual, no un control de vencimientos.</p></section>`;
  return `<div class="page-heading"><div><span class="eyebrow">MEAL PREP Y COMPRAS</span><h1>Cocina</h1></div>${button(icon("plus") + " " + actions[tab][0], actions[tab][1])}</div>${stats}<nav class="kitchen-tabs" aria-label="Secciones de cocina">${Object.entries(
    labels,
  )
    .map(
      ([key, label]) =>
        `<a href="#cocina/${key}" ${key === tab ? 'aria-current="page"' : ""}>${label}</a>`,
    )
    .join("")}</nav>${content}`;
}
