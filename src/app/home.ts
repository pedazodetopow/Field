import type { Data } from "../storage/model";
import {
  activePeriod,
  budget,
  periodMovements,
} from "../modules/finance/logic";
import { movementRows } from "../modules/finance/view";
import { preparationsView } from "../modules/food/view";
import { amount, button, icon, stat } from "../shared/ui";
import { dateLabel, today } from "../shared/values";
export function homeView(data: Data) {
  const period = activePeriod(data),
    date = today(),
    calc = period ? budget(period, data.movements, date) : null;
  const rows = periodMovements(data),
    portions = data.preparations.reduce((s, p) => s + p.remaining, 0);
  return `<div class="page-heading"><div><span class="eyebrow">${new Intl.DateTimeFormat("es-UY", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Montevideo" }).format(new Date())}</span><h1>Resumen</h1></div><span class="local-status"><i></i> Guardado local</span></div>
 ${
   calc && period
     ? `<section class="budget-overview"><div class="available-block"><span>Disponible hasta el próximo cobro</span><strong>${amount(calc.available)}</strong><div class="balance-breakdown"><span>Saldo real ${amount(calc.balance)}</span><span>Ahorro reservado ${amount(calc.savings)}</span></div></div><div class="payday-block"><strong>${calc.daysLeft}</strong><span>días hasta cobrar</span><small>${dateLabel(period.payday)}${!calc.active ? " · " + (date < period.start ? "Período futuro" : "Período terminado") : ""}</small>${button("Ajustar presupuesto", "period", "on-dark", `data-id="${period.id}"`)}</div></section>
 <div class="daily-grid">${stat("Resto de esta semana", calc.current ? amount(calc.current.remaining) : "—", calc.current ? `${dateLabel(calc.current.start)} — ${dateLabel(calc.current.end)}` : "Fuera del período")}${stat("Referencia diaria de la semana", calc.daily === null ? "—" : amount(calc.daily), "Resto semanal ÷ días que quedan")}${stat("Porciones disponibles", String(portions), data.preparations.filter((p) => p.remaining).length + " preparaciones")}</div>`
     : `<section class="setup-banner"><div><h2>Configurá tu presupuesto</h2><p>Saldo inicial, ahorro a reservar y fecha de cobro.</p></div>${button("Configurar presupuesto", "period")}</section>`
 }
 <div class="quick-actions" aria-label="Accesos rápidos">${button(icon("plus") + " Anotar movimiento", "movement", "secondary")}${button(icon("bag") + " Anotar compra", "purchase", "secondary")}${button(icon("food") + " Registrar preparación", "preparation", "secondary")}</div>
 <div class="home-columns"><section class="panel"><div class="section-title"><h2>Últimos movimientos</h2><a href="#finanzas">Ver todos ${icon("arrow")}</a></div>${rows.length ? movementRows(rows, 5) : `<div class="empty-message">${button("Registrar el primer gasto", "movement", "secondary")}</div>`}</section>
 <section class="panel"><div class="section-title"><h2>Comidas disponibles</h2><a href="#cocina/preparaciones">Ver cocina ${icon("arrow")}</a></div>${portions ? preparationsView(data, true) : `<div class="empty-message"><p>No hay porciones registradas.</p>${button(data.recipes.length ? "Registrar preparación" : data.ingredients.length ? "Crear receta" : "Agregar ingrediente", data.recipes.length ? "preparation" : data.ingredients.length ? "recipe" : "ingredient", "secondary")}</div>`}</section></div>`;
}
