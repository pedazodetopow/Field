import type { Data } from "../storage/model";
import { activePeriod, periodMovements } from "../modules/finance/logic";
import { financialSummary } from "../modules/finance/planning";
import { movementRows } from "../modules/finance/view";
import { fixedRows, quickExpense, receipt } from "../modules/finance/panels";
import { amount, button, icon } from "../shared/ui";
import { dateLabel, today } from "../shared/values";
export function homeView(data: Data) {
  const period = activePeriod(data),
    date = today();
  const heading = `<div class="page-heading"><div><h1>Tu dinero, hoy</h1><p>${new Intl.DateTimeFormat("es-UY", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Montevideo" }).format(new Date())}</p></div><a class="button secondary" href="#finanzas">Ver presupuesto ${icon("arrow")}</a></div>`;
  if (!period)
    return `<div class="finance-workspace">${heading}<section class="finance-panel first-budget"><h2>¿Con cuánto contás hasta cobrar?</h2><p>Ingresá tu saldo actual, cuánto querés guardar y tu fecha de cobro para calcular lo que podés gastar.</p>${button("Configurar presupuesto", "period")}</section></div>`;
  const calc = financialSummary(data, period, date),
    rows = periodMovements(data);
  return `<div class="finance-workspace">${heading}<div class="overview-grid"><section class="today-panel"><div class="today-top"><span>${calc.todayAvailable !== null && calc.todayAvailable < 0 ? "Hoy te pasaste del presupuesto" : "Hoy podés gastar"}</span><div class="countdown"><b>${calc.active ? calc.daysLeft : date < period.start ? "Aún no" : "0"}</b><span>${calc.active ? "días para cobrar" : date < period.start ? "empezó el período" : "período terminado"}</span></div></div><div class="today-amount">${calc.todayAvailable === null ? "—" : amount(calc.todayAvailable)}</div><p>${calc.current ? `${amount(calc.current.remaining)} disponibles esta semana · hasta el ${dateLabel(calc.current.end)}` : "Configurá un período que incluya hoy para ver tu presupuesto diario."}</p><div class="today-meter"><i style="width:${calc.current ? Math.max(0, Math.min(100, (calc.current.remaining / Math.max(1, calc.current.base + calc.current.carry + calc.current.income)) * 100)) : 0}%"></i></div><div class="today-foot"><div><span>Gastaste hoy</span><strong>${amount(calc.variableToday)}</strong></div><div><span>Ahorro reservado</span><strong>${amount(calc.savings)}</strong></div></div></section>${receipt(calc, period)}${calc.active ? quickExpense() : `<div class="period-ended">${button("Nuevo período", "period", "primary")}<p>El cobro no se registra automáticamente. Conservamos el historial.</p></div>`}</div><div class="finance-two"><section class="finance-panel"><div class="section-title"><h2>Últimos movimientos</h2><a href="#finanzas/movimientos">Ver todos ${icon("arrow")}</a></div>${rows.length ? movementRows(rows, 4) : '<p class="empty-message">Todavía no hay movimientos en este período.</p>'}</section><section class="finance-panel"><div class="section-title"><h2>Próximos gastos fijos</h2><a href="#finanzas/fijos">Ver fijos ${icon("arrow")}</a></div>${fixedRows(data, calc, true)}</section></div><div class="financial-bottom"><span>Saldo calculado ${amount(calc.balance)} · Disponible ${amount(calc.available)}</span>${button("Comprobar saldo real", "balance-check", "text")}</div></div>`;
}
