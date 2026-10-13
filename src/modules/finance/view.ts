import { activePeriod, budget, periodMovements, type Week } from "./logic";
import { amount, button, icon, stat } from "../../shared/ui";
import { dateLabel, esc, money, today } from "../../shared/values";
import type { Data, Movement } from "../../storage/model";
export function movementRows(rows: Movement[], limit = Infinity) {
  return rows
    .slice(0, limit)
    .map(
      (m) =>
        `<div class="movement"><span class="movement-icon ${m.type}">${icon("arrow")}</span><div class="movement-label"><strong>${esc(m.description || m.category)}</strong><small>${dateLabel(m.date)} · ${esc(m.category)}${m.purchaseId ? " · Compra" : ""}</small></div><div class="movement-end">${amount(m.type === "income" ? m.cents : -m.cents, m.type === "income" ? "positive" : "expense-amount")}<div class="row-actions">${button("Editar", m.purchaseId ? "purchase" : "movement", "text", `data-id="${m.purchaseId ?? m.id}" aria-label="Editar ${esc(m.description || m.category)}"`)}${button("Eliminar", m.purchaseId ? "delete-purchase" : "delete-movement", "text danger", `data-id="${m.purchaseId ?? m.id}" aria-label="Eliminar ${esc(m.description || m.category)}"`)}</div></div></div>`,
    )
    .join("");
}
export function weekRows(weeks: Week[], date: string) {
  return weeks
    .map(
      (w, i) =>
        `<div class="week ${date >= w.start && date <= w.end ? "current" : ""}"><div class="week-label"><strong>Semana ${i + 1}${date >= w.start && date <= w.end ? '<span class="badge">Actual</span>' : w.start > date ? '<span class="badge projection">Proyección</span>' : ""}</strong><small>${dateLabel(w.start)} — ${dateLabel(w.end)}</small></div><div class="week-value">${amount(w.remaining)}<small>Base ${money(w.base)}${w.carry ? " · Arrastre " + money(w.carry) : ""}${w.income ? " · Ingreso " + money(w.income) : ""} · Gastos ${money(w.spent)}</small></div><div class="meter"><i class="${w.remaining < 0 ? "over" : ""}" style="width:${Math.max(0, Math.min(100, w.base + w.carry + w.income > 0 ? (w.remaining / (w.base + w.carry + w.income)) * 100 : 0))}%"></i></div></div>`,
    )
    .join("");
}
export function financeView(data: Data) {
  const period = activePeriod(data),
    date = today();
  const header = `<div class="page-heading"><div><span class="eyebrow">PRESUPUESTO PERSONAL</span><h1>Finanzas</h1></div>${button(icon("plus") + " Movimiento", "movement")}</div>`;
  if (!period)
    return (
      header +
      `<section class="empty-setup"><h2>Configurá tu primer período</h2><p>Indicá cuánto tenés hoy, cuánto querés reservar y la fecha del próximo cobro.</p>${button("Configurar presupuesto", "period")}</section>`
    );
  const calc = budget(period, data.movements, date),
    rows = periodMovements(data);
  const categories = new Map<string, number>();
  rows
    .filter((m) => m.type === "expense" && m.date <= date)
    .forEach((m) =>
      categories.set(m.category, (categories.get(m.category) || 0) + m.cents),
    );
  return (
    header +
    `<div class="period-bar"><span>${dateLabel(period.start)} → ${dateLabel(period.payday)} <b>${calc.active ? calc.daysLeft + " días hasta cobrar" : date < period.start ? "Todavía no empezó" : "Período terminado"}</b></span><div>${button("Ajustar", "period", "text", `data-id="${period.id}"`)}${button("Nuevo período", "period", "text")}</div></div>
 <div class="metrics">${stat("Saldo real", amount(calc.balance), "Inicial + ingresos − gastos")}${stat("Disponible", amount(calc.available), "Saldo − ahorro reservado")}${stat("Ahorro reservado", amount(calc.savings), "Objetivo de este período")}${stat("Referencia por día", calc.periodDaily === null ? "—" : amount(calc.periodDaily), "Disponible ÷ días hasta cobrar")}</div>
 <div class="finance-columns"><section class="panel"><div class="section-title"><h2>Presupuesto por semanas</h2><span class="subtle">${calc.weeks.length} semanas</span></div>${weekRows(calc.weeks, date)}<details class="calculation"><summary>Cómo se calcula</summary><p>El saldo inicial menos el ahorro se reparte por los días del período. Los centésimos sobrantes van a los primeros días. Cada semana recibe su parte, el arrastre de la anterior y los ingresos registrados en esa semana; se restan sus gastos. El cobro no se incluye. Los saldos negativos se conservan. Las semanas futuras son proyecciones con los movimientos registrados hasta hoy; su arrastre cambia cuando anotás nuevos movimientos.</p><p>Disponible hoy: ${money(period.initialCents)} + ${money(calc.income)} − ${money(calc.spent)} − ${money(calc.savings)} = <strong>${money(calc.available)}</strong>.</p></details></section>
 <section class="panel"><div class="section-title"><h2>Gastos por categoría</h2><span class="subtle">${money(calc.spent)}</span></div>${
   categories.size
     ? [...categories]
         .sort((a, b) => b[1] - a[1])
         .map(
           ([name, total]) =>
             `<div class="category-row"><span>${esc(name)}</span>${amount(total)}<div class="meter"><i style="width:${calc.spent ? (total / calc.spent) * 100 : 0}%"></i></div></div>`,
         )
         .join("")
     : `<p class="empty-message">No hay gastos en este período.</p>${button("Anotar gasto", "movement", "secondary")}`
 }<div class="total-row"><span>Ingresos adicionales</span>${amount(calc.income, "positive")}</div></section></div>
 <section class="panel"><div class="section-title"><h2>Movimientos</h2><span class="subtle">${rows.length} registros</span></div><div class="filter-row"><label>Buscar<input id="movement-search" type="search" placeholder="Descripción o categoría"></label><label>Tipo<select id="movement-type"><option value="all">Todos</option><option value="expense">Gastos</option><option value="income">Ingresos</option></select></label></div><div id="movement-list">${rows.length ? movementRows(rows) : '<p class="empty-message">Anotá tu primer movimiento.</p>'}</div></section>
 ${data.periods.length > 1 ? `<section class="panel history"><div class="section-title"><h2>Períodos guardados</h2></div>${data.periods.map((p) => button(`${dateLabel(p.start)} — ${dateLabel(p.payday)}`, "switch-period", p.id === period.id ? "secondary selected" : "secondary", `data-id="${p.id}"`)).join("")}</section>` : ""}`
  );
}
