import { financialSummary } from "./planning";
import { receipt, fixedPanel, goalsPanel, projectionPanel } from "./panels";
import { activePeriod, periodMovements, type Week } from "./logic";
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
export function financeView(data: Data, tab = "plan") {
  const period = activePeriod(data),
    date = today();
  const header = `<div class="page-heading"><div><h1>Finanzas</h1><p>Presupuesto, movimientos y ahorro.</p></div>${button(icon("plus") + " Movimiento", "movement")}</div>`;
  const tabs = `<nav class="finance-tabs" aria-label="Secciones de finanzas">${[
    ["plan", "Presupuesto"],
    ["movimientos", "Movimientos"],
    ["fijos", "Fijos"],
    ["metas", "Metas"],
    ["proyeccion", "Proyección"],
  ]
    .map(
      ([key, label]) =>
        `<a href="#finanzas/${key}" ${key === tab ? 'aria-current="page"' : ""}>${label}</a>`,
    )
    .join("")}</nav>`;
  if (!period && tab !== "metas")
    return `<div class="finance-workspace">${header}${tabs}<section class="finance-panel first-budget"><h2>Configurá tu primer período</h2><p>Indicá cuánto tenés, cuánto querés reservar y cuándo cobrás.</p>${button("Configurar presupuesto", "period")}</section></div>`;
  if (tab === "metas")
    return `<div class="finance-workspace">${header}${tabs}${goalsPanel(data)}</div>`;
  const p = period!,
    calc = financialSummary(data, p, date),
    rows = periodMovements(data);
  const top = `<div class="period-bar"><span>${dateLabel(p.start)} → ${dateLabel(p.payday)} <b>${calc.active ? calc.daysLeft + " días hasta cobrar" : date < p.start ? "Todavía no empezó" : "Período terminado"}</b></span><div>${button("Ajustar", "period", "text", `data-id="${p.id}"`)}${button("Nuevo período", "period", "text")}</div></div>`;
  const stats = `<div class="metrics">${stat("Saldo calculado", amount(calc.balance), "Inicial + ingresos − gastos")}${stat("Disponible", amount(calc.available), "Sin ahorro ni fijos pendientes")}${stat("Esta semana", calc.current ? amount(calc.current.remaining) : "—", "Con arrastre de la anterior")}${stat("Hoy podés gastar", calc.todayAvailable === null ? "—" : amount(calc.todayAvailable), "Cuota diaria menos gastos de hoy")}</div>`;
  const movements = `<section class="finance-panel"><div class="section-title"><h2>Movimientos</h2><span class="subtle">${rows.length} registros</span></div><div class="filter-row"><label>Buscar<input id="movement-search" type="search" placeholder="Descripción o categoría"></label><label>Tipo<select id="movement-type"><option value="all">Todos</option><option value="expense">Gastos</option><option value="income">Ingresos</option></select></label></div><div id="movement-list">${rows.length ? movementRows(rows) : '<p class="empty-message">Anotá tu primer movimiento.</p>'}</div></section>`;
  const cats = new Map<string, number>();
  rows
    .filter((m) => m.type === "expense" && m.date <= date)
    .forEach((m) =>
      cats.set(m.category, (cats.get(m.category) || 0) + m.cents),
    );
  const categoryPanel = `<section class="finance-panel"><div class="section-title"><h2>En qué gastaste</h2><span class="subtle">${money(calc.spent)}</span></div>${
    [...cats]
      .sort((a, b) => b[1] - a[1])
      .map(
        ([name, total]) =>
          `<div class="category-row"><span>${esc(name)}</span>${amount(total)}<div class="meter"><i style="width:${(total / calc.spent) * 100}%"></i></div></div>`,
      )
      .join("") ||
    '<p class="empty-message">Las categorías aparecen al registrar tus gastos.</p>'
  }<div class="total-row"><span>Ingresos adicionales</span>${amount(calc.income, "positive")}</div></section>`;
  const check = calc.check
    ? `<section class="finance-panel balance-check"><div class="section-title"><h2>Último saldo real comprobado</h2>${button("Comprobar de nuevo", "balance-check", "text")}</div><strong>${amount(calc.check.actualCents)}</strong><p>${dateLabel(calc.check.date)} · Calculado al comprobar: ${money(calc.check.calculatedCents)} · Diferencia: ${money(calc.check.actualCents - calc.check.calculatedCents)}.</p><small>Foto del momento de la comprobación. Los movimientos posteriores actualizan el saldo calculado.</small></section>`
    : "";
  const weeks = `<section class="finance-panel"><div class="section-title"><h2>Semana por semana</h2><span class="subtle">${calc.weeks.length} semanas</span></div>${weekRows(calc.weeks, date)}<details class="calculation"><summary>Cómo se calcula</summary><p>El saldo inicial, menos ahorro y fijos (pagados o pendientes), se reparte en días exactos. Cada semana suma arrastre e ingresos y resta gastos variables. Pagar un fijo ya reservado no lo descuenta otra vez. Los centésimos sobrantes van a los primeros días. Las semanas futuras son proyecciones. El día de cobro queda fuera.</p><p>Hoy: cuota de lo que queda de semana antes de los gastos de hoy, menos lo gastado hoy. Los saldos negativos se muestran completos.</p></details></section>`;
  const content =
    tab === "fijos"
      ? fixedPanel(data, calc)
      : tab === "proyeccion"
        ? projectionPanel(calc, p)
        : tab === "movimientos"
          ? `<div class="finance-ledger">${movements}<div>${categoryPanel}${check}</div></div>`
          : `${stats}<div class="finance-two">${weeks}<div>${receipt(calc, p)}${categoryPanel}${check}</div></div>${movements}`;
  const history =
    data.periods.length > 1
      ? `<section class="finance-panel history"><h2>Períodos guardados</h2>${data.periods.map((old) => button(`${dateLabel(old.start)} — ${dateLabel(old.payday)}`, "switch-period", old.id === p.id ? "secondary selected" : "secondary", `data-id="${old.id}"`)).join("")}</section>`
      : "";
  return `<div class="finance-workspace">${header}${top}${tabs}${content}${history}</div>`;
}
