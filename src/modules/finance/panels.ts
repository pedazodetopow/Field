import type { Data, Period } from "../../storage/model";
import { financialSummary } from "./planning";
import { amount, button, input, select } from "../../shared/ui";
import { dateLabel, daysBetween, esc, money, today } from "../../shared/values";
import { categories } from "./forms";
export type Summary = ReturnType<typeof financialSummary>;
export function quickExpense() {
  return `<section class="quick-entry"><div class="section-title"><h2>Anotá un gasto de hoy</h2><span class="subtle">${dateLabel(today())}</span></div><form id="quick-expense"><div class="quick-fields">${input("¿Cuánto gastaste? ($)", "cents", "", "text", 'required inputmode="decimal" placeholder="0,00" autocomplete="off"')}${select(
    "Categoría del gasto",
    "category",
    categories
      .filter((c) => c !== "Ingreso")
      .map((c) => `<option ${c === "Otros" ? "selected" : ""}>${c}</option>`)
      .join(""),
  )}${input("¿En qué?", "description", "", "text", 'maxlength="180" placeholder="Ej.: almuerzo, boleto, súper"')}${button("Anotar gasto", "quick-save", "primary", 'type="submit"')}</div></form></section>`;
}
export function receipt(calc: Summary, period: Period) {
  return `<section class="finance-panel receipt"><div class="section-title"><h2>Hasta que cobres</h2><span class="subtle">${dateLabel(period.payday)}</span></div><dl><div><dt>Saldo calculado</dt><dd>${amount(calc.balance)}</dd></div><div><dt>Fijos pendientes</dt><dd>− ${money(calc.pending)}</dd></div><div><dt>Ahorro reservado <small>${calc.savingPercent.toLocaleString("es-UY", { maximumFractionDigits: 1 })}% del inicial</small></dt><dd>− ${money(calc.savings)}</dd></div><div class="receipt-total"><dt>Disponible para gastar</dt><dd>${amount(calc.available)}</dd></div></dl>${calc.available < 0 ? '<p class="negative">Los compromisos superan el saldo. Revisá los fijos y el ahorro reservado.</p>' : ""}<div class="receipt-actions">${button("Ajustar presupuesto", "period", "text", `data-id="${period.id}"`)}${button("Comprobar saldo", "balance-check", "text")}</div></section>`;
}
export function fixedRows(data: Data, calc: Summary, compact = false) {
  const due = compact
    ? calc.due.filter((o) => !o.payment && !o.settledElsewhere).slice(0, 4)
    : calc.due;
  return due.length
    ? due
        .map(
          (o) =>
            `<div class="fixed-row"><div class="due-date ${o.date < today() && !o.payment ? "late" : ""}"><b>${Number(o.date.slice(8))}</b><span>${new Intl.DateTimeFormat("es-UY", { month: "short", timeZone: "UTC" }).format(new Date(o.date + "T12:00:00Z"))}</span></div><div class="fixed-name"><strong>${esc(o.fixed.name)}</strong><small>${o.payment || o.settledElsewhere ? "Pagado" : o.date < today() ? "Pendiente vencido" : o.date === today() ? "Vence hoy" : esc(o.fixed.category)}</small></div><div class="fixed-end">${amount(o.payment ? data.movements.find((m) => m.id === o.payment!.movementId)!.cents : o.fixed.cents)}${o.payment ? button("Ver pago", "show-payment", "text", `data-id="${o.payment.movementId}"`) : o.settledElsewhere ? "<small>En otro período</small>" : button("Registrar pago", "pay-fixed", "text", `data-id="${o.fixed.id}" data-date="${o.date}"`)}</div></div>`,
        )
        .join("")
    : `<div class="finance-empty"><p>No tenés vencimientos pendientes en este período.</p>${button("Agregar gasto fijo", "fixed", "secondary")}</div>`;
}
export function fixedPanel(data: Data, calc: Summary) {
  return `<div class="finance-two"><section class="finance-panel"><div class="section-title"><h2>Vencimientos del período</h2><strong>${money(calc.pending)} pendientes</strong></div>${fixedRows(data, calc)}<p class="footnote">El pago registra un único gasto y libera la reserva. Podés adelantarlo; no se cobra automáticamente.</p></section><section class="finance-panel"><div class="section-title"><h2>Gastos mensuales</h2>${button("Nuevo fijo", "fixed", "secondary")}</div>${data.finance.fixed.map((f) => `<div class="rule-row"><div><strong>${esc(f.name)}</strong><small>Día ${f.day} · ${esc(f.category)} · ${money(f.cents)}${f.end ? " · Hasta " + dateLabel(f.end) : ""}</small></div><div class="row-actions">${button("Editar", "fixed", "text", `data-id="${f.id}" aria-label="Editar fijo ${esc(f.name)}"`)}${button("Eliminar", "delete-fixed", "text danger", `data-id="${f.id}" aria-label="Eliminar fijo ${esc(f.name)}"`)}</div></div>`).join("") || '<p class="empty-message">Agregá alquiler, servicios o suscripciones. Se repiten por mes desde la fecha que indiques.</p>'}</section></div>`;
}
export function goalsPanel(data: Data) {
  return `<section class="finance-panel"><div class="section-title"><h2>Metas de ahorro</h2>${button("Nueva meta", "goal")}</div><p class="panel-note">Registro del ahorro ya separado. Las metas son independientes del período y no crean gastos.</p><div class="goals-grid">${
    data.finance.goals
      .map((g) => {
        const remaining = Math.max(0, g.targetCents - g.savedCents),
          days = g.targetDate ? daysBetween(today(), g.targetDate) : null;
        return `<article class="goal-row"><div class="section-title"><h3>${esc(g.name)}</h3><span class="badge">${Math.round((g.savedCents / g.targetCents) * 100)}%</span></div><div class="goal-value">${amount(g.savedCents)}<small>de ${money(g.targetCents)}</small></div><div class="meter"><i style="width:${Math.min(100, (g.savedCents / g.targetCents) * 100)}%"></i></div><p>${remaining ? `Faltan ${money(remaining)}` : "Objetivo alcanzado"}${g.targetDate ? ` · ${dateLabel(g.targetDate)}` : ""}</p>${days !== null && remaining ? `<small>${days > 0 ? money(Math.ceil(remaining / days)) + " por día para llegar" : "Fecha objetivo alcanzada; revisá tu meta"}</small>` : ""}<div class="row-actions">${button("Sumar ahorro", "contribution", "secondary", `data-id="${g.id}"`)}${button("Editar", "goal", "text", `data-id="${g.id}" aria-label="Editar meta ${esc(g.name)}"`)}${button("Eliminar", "delete-goal", "text danger", `data-id="${g.id}" aria-label="Eliminar meta ${esc(g.name)}"`)}</div></article>`;
      })
      .join("") ||
    '<div class="finance-empty"><p>Creá una meta con su objetivo y el importe que ya tenés separado.</p></div>'
  }</div></section>`;
}
export function projectionPanel(calc: Summary, period: Period) {
  return `<div class="finance-two"><section class="finance-panel"><div class="section-title"><h2>Al próximo cobro</h2><span class="badge">Estimación</span></div><div class="projected-value">${amount(calc.closing)}</div><p>Saldo previsto antes de cobrar el ${dateLabel(period.payday)}.</p><dl class="equation"><div><dt>Saldo de hoy</dt><dd>${money(calc.balance)}</dd></div><div><dt>Fijos pendientes</dt><dd>− ${money(calc.pending)}</dd></div><div><dt>Gastos variables proyectados</dt><dd>− ${money(calc.projectedSpending)}</dd></div></dl><p class="footnote">Ritmo promedio de gastos variables desde el inicio hasta hoy, aplicado desde mañana hasta el día anterior al cobro. Incluye el ahorro reservado. No supone nuevos ingresos.</p></section><section class="finance-panel"><div class="section-title"><h2>Cuando cobres</h2>${button(calc.forecast ? "Editar escenario" : "Configurar escenario", "forecast", "secondary")}</div>${calc.forecast ? `<div class="projected-value">${amount(calc.nextAvailable!)}</div><p>Disponible estimado del ${dateLabel(period.payday)} al ${dateLabel(calc.forecast.payday)}.</p><dl class="equation"><div><dt>Saldo proyectado, sin ahorro actual</dt><dd>${money(calc.closing - period.savingsCents)}</dd></div><div><dt>Ingreso esperado</dt><dd>+ ${money(calc.forecast.incomeCents)}</dd></div><div><dt>Próximos fijos</dt><dd>− ${money(calc.futureFixed)}</dd></div><div><dt>Nuevo ahorro a reservar</dt><dd>− ${money(calc.forecast.savingsCents)}</dd></div></dl>` : '<p class="empty-message">Indicá cuánto esperás cobrar, cuánto querés guardar y la siguiente fecha de cobro.</p>'}<p class="footnote">Es un escenario editable. No modifica el saldo ni registra movimientos.</p></section></div>`;
}
