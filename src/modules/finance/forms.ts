import type { Data } from "../../storage/model";
import type { FormSpec } from "../../app/forms";
import { input, moneyField, select } from "../../shared/ui";
import { esc, money, parseMoney, today, uid } from "../../shared/values";
import { activePeriod, budget } from "./logic";
import { defaultForecastDate } from "./planning";
export const categories = [
  "Alimentación",
  "Transporte",
  "Vivienda",
  "Servicios",
  "Salud",
  "Ocio",
  "Suscripciones",
  "Otros",
  "Ingreso",
];
const value = (f: FormData, name: string) => String(f.get(name) ?? "");
function put<T extends { id: string }>(rows: T[], row: T) {
  const index = rows.findIndex((x) => x.id === row.id);
  if (index < 0) rows.push(row);
  else rows[index] = row;
}
export function financialForm(
  kind: string,
  data: Data,
  id?: string,
): FormSpec | undefined {
  if (kind === "fixed") {
    const old = data.finance.fixed.find((f) => f.id === id);
    return {
      title: old ? "Editar gasto fijo" : "Nuevo gasto fijo",
      html: `${input("Nombre del gasto fijo", "name", old?.name ?? "", "text", 'required maxlength="120" placeholder="Ej.: alquiler, internet"')}<div class="form-grid">${moneyField("Importe mensual", "cents", old?.cents ?? 0)}${input("Día de vencimiento", "day", old?.day ?? 1, "number", 'required min="1" max="31" step="1"')}${select(
        "Categoría",
        "category",
        categories
          .filter((c) => c !== "Ingreso")
          .map(
            (c) =>
              `<option ${c === (old?.category ?? "Servicios") ? "selected" : ""}>${esc(c)}</option>`,
          )
          .join(""),
      )}${input("Vigente desde", "start", old?.start ?? today(), "date", "required")}${input("Último día de vigencia (opcional)", "end", old?.end ?? "", "date")}</div><p class="form-note">Se repite cada mes. Si el día no existe, vence el último del mes. Reservamos el importe hasta que registres el pago. Eliminar el fijo conserva sus pagos anteriores.</p>`,
      submit(next, form) {
        put(next.finance.fixed, {
          id: old?.id ?? uid(),
          name: value(form, "name").trim(),
          cents: parseMoney(value(form, "cents")),
          category: value(form, "category"),
          day: Number(value(form, "day")),
          start: value(form, "start"),
          end: value(form, "end") || null,
        });
      },
    };
  }
  if (kind === "goal") {
    const old = data.finance.goals.find((g) => g.id === id);
    return {
      title: old ? "Editar meta" : "Nueva meta de ahorro",
      html: `${input("Nombre de la meta", "name", old?.name ?? "", "text", 'required maxlength="120" placeholder="Ej.: fondo de emergencia"')}<div class="form-grid">${moneyField("Objetivo", "targetCents", old?.targetCents ?? 0)}${moneyField("Ya separado para esta meta", "savedCents", old?.savedCents ?? 0)}${input("Fecha objetivo (opcional)", "targetDate", old?.targetDate ?? "", "date")}</div><p class="form-note">Llevá el registro del ahorro que ya separaste. La meta no mueve dinero ni vuelve a descontarlo de tu presupuesto. Si el saldo inicial incluye ese dinero, incluilo también en el ahorro a reservar.</p>`,
      submit(next, form) {
        put(next.finance.goals, {
          id: old?.id ?? uid(),
          name: value(form, "name").trim(),
          targetCents: parseMoney(value(form, "targetCents")),
          savedCents: parseMoney(value(form, "savedCents")),
          targetDate: value(form, "targetDate") || null,
        });
      },
    };
  }
  if (kind === "contribution") {
    const goal = data.finance.goals.find((g) => g.id === id)!;
    return {
      title: `Sumar a ${esc(goal.name)}`,
      html: `${moneyField("Ahorro ya separado a sumar", "cents", 0)}<p class="form-note">Actualiza el registro de esta meta. No crea un gasto ni transfiere dinero.</p>`,
      submit(next, form) {
        const cents = parseMoney(value(form, "cents"));
        if (!cents) throw new Error("Ingresá un importe mayor que cero.");
        next.finance.goals.find((g) => g.id === id)!.savedCents += cents;
      },
    };
  }
  if (kind === "balance-check") {
    const p = activePeriod(data)!,
      calculated = budget(p, data.movements, today()).balance;
    return {
      title: "Comprobar saldo real",
      html: `<p class="form-note">Según tus movimientos tenés <strong>${money(calculated)}</strong>. Sumá tus cuentas y efectivo incluidos en este presupuesto.</p>${input("Saldo real observado ($)", "actualCents", "", "text", 'required inputmode="decimal" placeholder="Ej.: 28500,50 o -150"')}<label class="check-field"><input type="checkbox" name="adjust">Registrar la diferencia como ajuste de saldo</label><p class="form-note">Sin marcar la casilla, solo guardamos una comprobación. Con ajuste, agregamos un ingreso o gasto identificado; tus movimientos anteriores se conservan.</p>`,
      submit(next, form) {
        const raw = value(form, "actualCents").trim();
        const actual =
          (raw.startsWith("-") ? -1 : 1) * parseMoney(raw.replace(/^-/, ""));
        next.finance.checks.push({
          id: uid(),
          periodId: p.id,
          date: today(),
          actualCents: actual,
          calculatedCents: calculated,
        });
        const difference = actual - calculated;
        if (form.has("adjust") && difference)
          next.movements.push({
            id: uid(),
            periodId: p.id,
            type: difference > 0 ? "income" : "expense",
            date: today(),
            cents: Math.abs(difference),
            description: "Ajuste de saldo comprobado",
            category: "Ajuste",
            purchaseId: null,
          });
      },
    };
  }
  if (kind === "forecast") {
    const p = activePeriod(data)!,
      old = data.finance.forecasts.find((f) => f.periodId === p.id);
    return {
      title: "Proyectar el próximo cobro",
      html: `<p class="form-note">Escenario desde el ${p.payday}. El ingreso es una estimación: no se agrega a tus movimientos.</p><div class="form-grid">${moneyField("Ingreso esperado", "incomeCents", old?.incomeCents ?? 0)}${moneyField("Ahorro nuevo a reservar", "savingsCents", old?.savingsCents ?? p.savingsCents)}${input("Cobro siguiente", "payday", old?.payday ?? defaultForecastDate(p), "date", "required")}</div>`,
      submit(next, form) {
        put(next.finance.forecasts, {
          id: old?.id ?? uid(),
          periodId: p.id,
          incomeCents: parseMoney(value(form, "incomeCents")),
          savingsCents: parseMoney(value(form, "savingsCents")),
          payday: value(form, "payday"),
        });
      },
    };
  }
}
