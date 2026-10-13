import { test, expect, type Page } from "@playwright/test";
import { addDays, today } from "../../src/shared/values";
const date = today();
const dialog = (page: Page) => page.getByRole("dialog");
async function save(page: Page) {
  await dialog(page)
    .getByRole("button", { name: "Guardar", exact: true })
    .click();
  await expect(dialog(page)).not.toBeVisible();
}
async function setup(page: Page) {
  await page.goto("");
  await page
    .getByRole("button", { name: "Configurar presupuesto", exact: true })
    .click();
  await dialog(page).getByLabel("Saldo inicial", { exact: true }).fill("40000");
  await dialog(page)
    .getByLabel("Ahorro a reservar", { exact: true })
    .fill("12000");
  await dialog(page).getByLabel("Fecha de inicio", { exact: true }).fill(date);
  await dialog(page)
    .getByLabel("Próximo cobro", { exact: true })
    .fill(addDays(date, 14));
  await save(page);
}
async function tab(page: Page, key: string) {
  await page.goto(`#finanzas/${key}`);
  await expect(page.locator(".finance-tabs a[aria-current]")).toHaveAttribute(
    "href",
    `#finanzas/${key}`,
  );
}
async function fixed(page: Page) {
  await tab(page, "fijos");
  await page.getByRole("button", { name: "Nuevo fijo", exact: true }).click();
  await dialog(page)
    .getByLabel("Nombre del gasto fijo")
    .fill("Internet ficticio");
  await dialog(page)
    .getByLabel("Importe mensual", { exact: true })
    .fill("1500");
  await dialog(page).getByLabel("Día de vencimiento").fill(date.slice(8));
  await save(page);
}
async function downloadData(page: Page) {
  await page.goto("#ajustes");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar respaldo" }).click();
  const file = await downloaded;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
const metric = (page: Page, label: string) =>
  page.locator(".stat").filter({ has: page.getByText(label, { exact: true }) });
test("gasto rápido, edición, eliminación y deshacer con resultado inmediato", async ({
  page,
}) => {
  await setup(page);
  await expect(page.locator(".today-amount")).toHaveText("$ 2.000");
  await page.getByLabel("¿Cuánto gastaste? ($)", { exact: true }).fill("350");
  await page.getByLabel("¿En qué?", { exact: true }).fill("Boleto ficticio");
  await page.getByRole("button", { name: "Anotar gasto", exact: true }).click();
  await expect(page.locator(".today-amount")).toHaveText("$ 1.650");
  await expect(
    page.getByLabel("¿Cuánto gastaste? ($)", { exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator(".today-amount")).toHaveText("$ 2.000");
  await expect(page.locator(".movement")).toHaveCount(0);
  await page.getByLabel("¿Cuánto gastaste? ($)", { exact: true }).fill("400");
  await page.getByLabel("¿En qué?", { exact: true }).fill("Boleto ficticio");
  await page.getByRole("button", { name: "Anotar gasto", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar Boleto ficticio", exact: true })
    .click();
  await dialog(page).getByLabel("Monto", { exact: true }).fill("800");
  await save(page);
  await expect(page.locator(".today-amount")).toHaveText("$ 1.200");
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator(".today-amount")).toHaveText("$ 1.600");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar Boleto ficticio", exact: true })
    .click();
  await expect(page.locator(".movement")).toHaveCount(0);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Cambio deshecho.");
  await page.reload();
  await expect(page.locator(".movement")).toHaveCount(1);
  await expect(page.locator(".today-amount")).toHaveText("$ 1.600");
});
test("fijo pendiente, pago único, edición, eliminar y deshacer sin doble descuento", async ({
  page,
}) => {
  await setup(page);
  await fixed(page);
  await tab(page, "plan");
  await expect(metric(page, "Disponible")).toContainText("$ 26.500");
  const week = await page.locator(".week-value").first().textContent();
  await tab(page, "fijos");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Registrar pago", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Registrar pago", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".fixed-row")).toContainText("Pagado");
  await tab(page, "plan");
  await expect(metric(page, "Saldo calculado")).toContainText("$ 38.500");
  await expect(metric(page, "Disponible")).toContainText("$ 26.500");
  await expect(page.locator(".week-value").first()).toHaveText(week);
  await expect(page.locator("#movement-list .movement")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Editar Internet ficticio", exact: true })
    .click();
  await dialog(page).getByLabel("Monto", { exact: true }).fill("1600");
  await save(page);
  await expect(metric(page, "Disponible")).toContainText("$ 26.400");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar Internet ficticio", exact: true })
    .click();
  await expect(metric(page, "Disponible")).toContainText("$ 26.500");
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(metric(page, "Disponible")).toContainText("$ 26.400");
  await tab(page, "fijos");
  await page
    .getByRole("button", { name: "Editar fijo Internet ficticio", exact: true })
    .click();
  await dialog(page)
    .getByLabel("Importe mensual", { exact: true })
    .fill("2000");
  await save(page);
  await expect(page.locator(".fixed-row")).toContainText("$ 1.600");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Eliminar fijo Internet ficticio",
      exact: true,
    })
    .click();
  await tab(page, "plan");
  await expect(metric(page, "Disponible")).toContainText("$ 26.400");
  await expect(page.locator("#movement-list .movement")).toHaveCount(1);
});
test("ahorro por porcentaje y metas independientes con edición, aporte y deshacer", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Ajustar presupuesto", exact: true })
    .click();
  await dialog(page).getByLabel("Calcular ahorro por porcentaje").fill("25");
  await expect(
    dialog(page).getByLabel("Ahorro a reservar", { exact: true }),
  ).toHaveValue("10000.00");
  await save(page);
  await expect(page.locator(".receipt-total")).toContainText("$ 30.000");
  await tab(page, "metas");
  await page.getByRole("button", { name: "Nueva meta", exact: true }).click();
  await dialog(page).getByLabel("Nombre de la meta").fill("Fondo ficticio");
  await dialog(page).getByLabel("Objetivo", { exact: true }).fill("50000");
  await dialog(page).getByLabel("Ya separado para esta meta").fill("10000");
  await save(page);
  await expect(page.locator(".goal-row")).toContainText("20%");
  await page.getByRole("button", { name: "Sumar ahorro", exact: true }).click();
  await dialog(page).getByLabel("Ahorro ya separado a sumar").fill("5000");
  await save(page);
  await expect(page.locator(".goal-row")).toContainText("30%");
  await page
    .getByRole("button", { name: "Editar meta Fondo ficticio", exact: true })
    .click();
  await dialog(page).getByLabel("Nombre de la meta").fill("Fondo de reserva");
  await save(page);
  await page.reload();
  await expect(page.locator(".goal-row")).toContainText("Fondo de reserva");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Eliminar meta Fondo de reserva",
      exact: true,
    })
    .click();
  await expect(page.locator(".goal-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator(".goal-row")).toContainText("$ 15.000");
  await tab(page, "plan");
  await expect(metric(page, "Disponible")).toContainText("$ 30.000");
  await expect(page.locator("#movement-list .movement")).toHaveCount(0);
});
test("saldo observado no cambia movimientos, ajuste explícito sí y puede deshacerse", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Comprobar saldo", exact: true })
    .click();
  await dialog(page).getByLabel("Saldo real observado ($)").fill("39500");
  await save(page);
  await tab(page, "plan");
  await expect(metric(page, "Saldo calculado")).toContainText("$ 40.000");
  await expect(page.locator(".balance-check")).toContainText(
    "Diferencia: $ -500",
  );
  await page
    .getByRole("button", { name: "Comprobar de nuevo", exact: true })
    .click();
  await dialog(page).getByLabel("Saldo real observado ($)").fill("39500");
  await dialog(page)
    .getByLabel("Registrar la diferencia como ajuste de saldo")
    .check();
  await save(page);
  await expect(metric(page, "Saldo calculado")).toContainText("$ 39.500");
  await expect(page.locator("#movement-list .movement")).toContainText(
    "Ajuste de saldo comprobado",
  );
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(metric(page, "Saldo calculado")).toContainText("$ 40.000");
  await expect(page.locator("#movement-list .movement")).toHaveCount(0);
});
test("escenario futuro guarda supuestos y exporta todas las fuentes financieras", async ({
  page,
}) => {
  await setup(page);
  await fixed(page);
  await tab(page, "proyeccion");
  await page
    .getByRole("button", { name: "Configurar escenario", exact: true })
    .click();
  await dialog(page)
    .getByLabel("Ingreso esperado", { exact: true })
    .fill("45000");
  await dialog(page)
    .getByLabel("Ahorro nuevo a reservar", { exact: true })
    .fill("10000");
  await dialog(page).getByLabel("Cobro siguiente").fill(addDays(date, 45));
  await save(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Editar escenario", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".equation").last()).toContainText("$ 45.000");
  const backup = await downloadData(page);
  expect(backup.data.schemaVersion).toBe(3);
  expect(backup.data.finance.fixed).toHaveLength(1);
  expect(backup.data.finance.forecasts[0].incomeCents).toBe(4500000);
  expect(backup.data.movements).toHaveLength(0);
  await page
    .getByLabel("Importar un respaldo JSON")
    .setInputFiles({
      name: "finanzas.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await dialog(page)
    .getByRole("button", { name: "Confirmar reemplazo" })
    .click();
  await expect(dialog(page)).not.toBeVisible();
  await tab(page, "fijos");
  await expect(page.locator(".fixed-row")).toContainText("Internet ficticio");
  await tab(page, "proyeccion");
  await expect(page.locator(".equation").last()).toContainText("$ 45.000");
});
test("deshacer respeta cambios de otra pestaña y conserva ambos datos", async ({
  page,
  context,
}) => {
  await setup(page);
  const other = await context.newPage();
  await other.goto("");
  await page.getByLabel("¿Cuánto gastaste? ($)", { exact: true }).fill("100");
  await page.getByLabel("¿En qué?", { exact: true }).fill("Primer gasto");
  await page.getByRole("button", { name: "Anotar gasto", exact: true }).click();
  await expect(page.locator(".movement")).toHaveCount(1);
  await other.reload();
  await other.getByLabel("¿Cuánto gastaste? ($)", { exact: true }).fill("200");
  await other.getByLabel("¿En qué?", { exact: true }).fill("Segundo gasto");
  await other
    .getByRole("button", { name: "Anotar gasto", exact: true })
    .click();
  await expect(other.locator(".movement")).toHaveCount(2);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("otra pestaña");
  await page.reload();
  await expect(page.locator(".movement")).toHaveCount(2);
  await other.close();
});
test("migración v2 preserva compras, recetas y movimientos con copia anterior", async ({
  page,
}) => {
  await page.goto("");
  await page
    .getByRole("button", { name: "Explorar demo", exact: true })
    .click();
  const backup = await downloadData(page);
  delete backup.data.finance;
  backup.data.schemaVersion = 2;
  const old = backup.data;
  await page.evaluate(async (data) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("field-demo", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("document", "readwrite");
      tx.objectStore("document").put({ revision: 10, data }, "main");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, old);
  await page.reload();
  const migrated = await downloadData(page);
  expect(migrated.data.movements).toEqual(old.movements);
  expect(migrated.data.purchases).toEqual(old.purchases);
  expect(migrated.data.recipes).toEqual(old.recipes);
  expect(migrated.data.preparations).toEqual(old.preparations);
  expect(migrated.data.finance.fixed).toHaveLength(0);
  await expect(page.locator(".snapshot")).not.toHaveCount(0);
});
test("pantallas financieras y formularios en claro/oscuro a 390 y 1440 sin overflow ni errores", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("");
  await page
    .getByRole("button", { name: "Explorar demo", exact: true })
    .click();
  for (const width of [390, 1440])
    for (const colorScheme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      for (const route of [
        "inicio",
        "finanzas/plan",
        "finanzas/movimientos",
        "finanzas/fijos",
        "finanzas/metas",
        "finanzas/proyeccion",
      ]) {
        await page.goto(`#${route}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect
          .poll(
            () =>
              page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            { message: `Overflow ${route} ${width} ${colorScheme}` },
          )
          .toBe(true);
        await expect(page.locator("vite-error-overlay")).toHaveCount(0);
      }
      await tab(page, "fijos");
      await page
        .getByRole("button", { name: "Nuevo fijo", exact: true })
        .click();
      await expect(
        dialog(page).getByLabel("Nombre del gasto fijo"),
      ).toBeFocused();
      await expect
        .poll(
          () => dialog(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
          { message: `Dialog overflow ${width} ${colorScheme}` },
        )
        .toBe(true);
      await dialog(page)
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
    }
  expect(errors).toEqual([]);
});
