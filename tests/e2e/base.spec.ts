import { expect, test, type Page } from "@playwright/test";
import { addDays, today } from "../../src/shared/values";
const date = today();
const dialog = (page: Page) => page.getByRole("dialog");
async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name, exact: true })
    .click();
}
async function save(page: Page) {
  await dialog(page)
    .getByRole("button", { name: "Guardar", exact: true })
    .click();
  await expect(dialog(page)).not.toBeVisible();
}
async function period(page: Page, initial = "40000", saving = "12000") {
  await nav(page, "Finanzas");
  await page
    .getByRole("button", { name: "Configurar presupuesto", exact: true })
    .click();
  await dialog(page)
    .getByLabel(/Saldo inicial/)
    .fill(initial);
  await dialog(page)
    .getByLabel(/Ahorro a reservar/)
    .fill(saving);
  await dialog(page).getByLabel("Fecha de inicio", { exact: true }).fill(date);
  await dialog(page)
    .getByLabel("Próximo cobro", { exact: true })
    .fill(addDays(date, 14));
  await save(page);
}
async function ingredient(page: Page, name = "Pollo", price = "350") {
  await nav(page, "Cocina");
  await page.getByRole("link", { name: "Ingredientes", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo ingrediente" }).click();
  await dialog(page).getByLabel("Nombre del ingrediente").fill(name);
  await dialog(page).getByLabel("Cantidad del envase").fill("1");
  await dialog(page).getByLabel("Unidad", { exact: true }).selectOption("kg");
  await dialog(page)
    .getByLabel(/Precio del envase/)
    .fill(price);
  await save(page);
}
async function recipe(page: Page) {
  await nav(page, "Cocina");
  await page.getByRole("link", { name: "Recetas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva receta" }).click();
  await dialog(page).getByLabel("Nombre de la receta").fill("Pollo al horno");
  await dialog(page).getByLabel("Porciones de la receta").fill("4");
  await dialog(page)
    .getByLabel("Ingrediente", { exact: true })
    .selectOption({ label: "Pollo" });
  await dialog(page).getByLabel("Cantidad", { exact: true }).fill("400");
  await dialog(page).getByLabel("Unidad", { exact: true }).selectOption("g");
  await expect(dialog(page).locator("#cost-preview")).toContainText(
    "Total $ 140",
  );
  await expect(dialog(page).locator("#cost-preview")).toContainText(
    "$ 35 por porción",
  );
  await save(page);
}
async function name(page: Page, value: string) {
  await nav(page, "Ajustes y respaldos");
  await page.getByLabel("¿Cómo querés que te llamemos?").fill(value);
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(page.getByRole("status")).toContainText("Nombre guardado");
}
async function expense(
  page: Page,
  type = "expense",
  cents = "350",
  description = "Prueba ficticia",
) {
  await page.getByRole("button", { name: "Movimiento", exact: true }).click();
  await dialog(page).getByLabel("Tipo", { exact: true }).selectOption(type);
  await dialog(page).getByLabel(/Monto/).fill(cents);
  await dialog(page)
    .getByLabel("Descripción", { exact: true })
    .fill(description);
  await save(page);
}
function metric(page: Page, label: string) {
  return page
    .locator(".stat")
    .filter({ has: page.getByText(label, { exact: true }) });
}

test("presupuesto, ingresos, gastos, edición, eliminación, búsqueda y semanas", async ({
  page,
}) => {
  await page.goto("");
  await period(page);
  await expect(metric(page, "Saldo real")).toContainText("$ 40.000");
  await expect(metric(page, "Disponible")).toContainText("$ 28.000");
  await expect(page.locator(".week")).toHaveCount(2);
  await expense(page);
  await expect(metric(page, "Saldo real")).toContainText("$ 39.650");
  await expect(metric(page, "Disponible")).toContainText("$ 27.650");
  await expense(page, "income", "1000", "Ingreso ficticio");
  await expect(metric(page, "Saldo real")).toContainText("$ 40.650");
  await page
    .getByRole("button", { name: "Editar Prueba ficticia", exact: true })
    .click();
  await dialog(page).getByLabel(/Monto/).fill("700");
  await save(page);
  await expect(metric(page, "Saldo real")).toContainText("$ 40.300");
  await page.getByLabel("Buscar", { exact: true }).fill("Ingreso");
  await expect(page.locator("#movement-list .movement")).toHaveCount(1);
  await page.getByLabel("Buscar", { exact: true }).fill("");
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("income");
  await expect(page.locator("#movement-list .movement")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("all");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar Prueba ficticia", exact: true })
    .click();
  await expect(metric(page, "Saldo real")).toContainText("$ 41.000");
  await page.reload();
  await expect(metric(page, "Disponible")).toContainText("$ 29.000");
  await nav(page, "Inicio");
  await expect(page.locator(".available-block")).toContainText("$ 29.000");
  await expect(page.locator(".payday-block>strong")).toHaveText("14");
});

test("ingredientes y receta verificables, edición y eliminación sin generar gastos", async ({
  page,
}) => {
  await page.goto("");
  await period(page);
  await ingredient(page);
  await recipe(page);
  const card = page.locator(".recipe-card");
  await expect(card.locator(".recipe-price")).toContainText("$ 35");
  await expect(card.locator(".recipe-total")).toContainText("$ 140");
  await card.getByText("Ver cantidades y costos").click();
  await expect(card.locator(".cost-line")).toContainText("$ 140");
  await nav(page, "Finanzas");
  await expect(page.locator("#movement-list .movement")).toHaveCount(0);
  await expect(metric(page, "Saldo real")).toContainText("$ 40.000");
  await nav(page, "Cocina");
  await page.getByRole("link", { name: "Ingredientes", exact: true }).click();
  await page.getByRole("button", { name: "Editar Pollo", exact: true }).click();
  await dialog(page)
    .getByLabel(/Precio del envase/)
    .fill("400");
  await save(page);
  await page.getByRole("link", { name: "Recetas", exact: true }).click();
  await expect(page.locator(".recipe-price")).toContainText("$ 40");
  await page
    .getByRole("button", { name: "Editar Pollo al horno", exact: true })
    .click();
  await dialog(page).getByLabel("Porciones de la receta").fill("2");
  await save(page);
  await expect(page.locator(".recipe-price")).toContainText("$ 80");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar Pollo al horno", exact: true })
    .click();
  await expect(page.locator(".recipe-card")).toHaveCount(0);
  await page.getByRole("link", { name: "Ingredientes", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar Pollo", exact: true })
    .click();
  await expect(page.locator(".ingredient-row")).toHaveCount(0);
});

test("compra vinculada genera un solo gasto, editar lo reemplaza y borrar revierte el saldo", async ({
  page,
}) => {
  await page.goto("");
  await period(page);
  await ingredient(page);
  await recipe(page);
  await page.getByRole("link", { name: "Compras", exact: true }).click();
  await page
    .getByRole("button", { name: "Anotar compra", exact: true })
    .click();
  await dialog(page)
    .getByLabel("Ingrediente", { exact: true })
    .selectOption({ label: "Pollo" });
  await dialog(page)
    .getByLabel("Descripción de la compra")
    .fill("Compra de pollo ficticia");
  await expect(dialog(page).locator("#cost-preview")).toContainText("$ 350");
  await save(page);
  await expect(page.locator(".purchase-row")).toHaveCount(1);
  await nav(page, "Finanzas");
  await expect(page.locator("#movement-list .movement")).toHaveCount(1);
  await expect(metric(page, "Saldo real")).toContainText("$ 39.650");
  await page
    .getByRole("button", {
      name: "Editar Compra de pollo ficticia",
      exact: true,
    })
    .click();
  await dialog(page).getByLabel("Cantidad", { exact: true }).fill("2");
  await dialog(page).getByLabel("Precio pagado ($)").fill("700");
  await save(page);
  await expect(page.locator("#movement-list .movement")).toHaveCount(1);
  await expect(metric(page, "Saldo real")).toContainText("$ 39.300");
  await nav(page, "Cocina");
  await expect(page.locator(".recipe-price")).toContainText("$ 35");
  await page.getByRole("link", { name: "Compras", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Eliminar compra Compra de pollo ficticia",
      exact: true,
    })
    .click();
  await expect(page.locator(".purchase-row")).toHaveCount(0);
  await nav(page, "Finanzas");
  await expect(page.locator("#movement-list .movement")).toHaveCount(0);
  await expect(metric(page, "Saldo real")).toContainText("$ 40.000");
});

test("preparaciones, consumo, edición, eliminación e historial de costo", async ({
  page,
}) => {
  await page.goto("");
  await ingredient(page);
  await recipe(page);
  await page.getByRole("button", { name: "Preparar", exact: true }).click();
  await save(page);
  await page.getByRole("link", { name: "Preparaciones", exact: true }).click();
  await expect(page.locator(".prep-end>strong")).toContainText("4");
  await page
    .getByRole("button", { name: "Consumir una porción de Pollo al horno" })
    .click();
  await expect(page.locator(".prep-end>strong")).toContainText("3");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await dialog(page).getByLabel("Porciones disponibles").fill("2");
  await save(page);
  await page.reload();
  await expect(page.locator(".prep-end>strong")).toContainText("2");
  await page.getByRole("link", { name: "Ingredientes", exact: true }).click();
  await page.getByRole("button", { name: "Editar Pollo", exact: true }).click();
  await dialog(page)
    .getByLabel(/Precio del envase/)
    .fill("700");
  await save(page);
  await page.getByRole("link", { name: "Preparaciones", exact: true }).click();
  await expect(page.locator(".prep-row")).toContainText("$ 35");
  await page.getByRole("link", { name: "Recetas", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar Pollo al horno", exact: true })
    .click();
  await nav(page, "Inicio");
  await expect(page.locator(".prep-row")).toContainText("Pollo al horno");
  await expect(metric(page, "Porciones disponibles")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Cocina", exact: true })
    .click();
  await page.getByRole("link", { name: "Preparaciones", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.locator(".prep-row")).toHaveCount(0);
});

test("respaldo completo, confirmación, cancelación, restauración y copia previa", async ({
  page,
}) => {
  await page.goto("");
  await period(page);
  await ingredient(page);
  await recipe(page);
  await page.getByRole("button", { name: "Preparar", exact: true }).click();
  await save(page);
  await nav(page, "Finanzas");
  await expense(page, "expense", "300", "Gasto del respaldo");
  await nav(page, "Cocina");
  await page.getByRole("link", { name: "Compras", exact: true }).click();
  await page
    .getByRole("button", { name: "Anotar compra", exact: true })
    .click();
  await dialog(page)
    .getByLabel("Ingrediente", { exact: true })
    .selectOption({ label: "Pollo" });
  await save(page);
  await name(page, "Nombre ficticio");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar respaldo" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^field-personal-/);
  const path = (await download.path())!;
  await name(page, "Antes de importar");
  await page.getByLabel("Importar un respaldo JSON").setInputFiles(path);
  await expect(dialog(page)).toContainText("Movimientos");
  await expect(dialog(page)).toContainText("Preparaciones");
  await dialog(page)
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Antes de importar",
  );
  await page.getByLabel("Importar un respaldo JSON").setInputFiles(path);
  await dialog(page)
    .getByRole("button", { name: "Confirmar reemplazo" })
    .click();
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Nombre ficticio",
  );
  await page.reload();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Nombre ficticio",
  );
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await dialog(page)
    .getByRole("button", { name: "Confirmar reemplazo" })
    .click();
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Antes de importar",
  );
  await nav(page, "Finanzas");
  await expect(page.locator("#movement-list .movement")).toHaveCount(2);
  await expect(metric(page, "Saldo real")).toContainText("$ 39.350");
  await nav(page, "Cocina");
  await expect(page.locator(".recipe-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Preparaciones", exact: true }).click();
  await expect(page.locator(".prep-row")).toHaveCount(1);
});

test("demo completa, físicamente separada, y tema claro/oscuro/sistema persistente", async ({
  page,
}) => {
  await page.goto("");
  await period(page, "10000", "1000");
  await name(page, "Personal ficticio");
  await page.getByRole("button", { name: "Explorar demo" }).click();
  await expect(page.locator(".demo-banner")).toContainText("Demo ficticia");
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Alex · ejemplo",
  );
  await page.getByLabel("Apariencia", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Apariencia", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByLabel("Apariencia", { exact: true }).selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await nav(page, "Inicio");
  await expect(page.locator(".movement")).not.toHaveCount(0);
  await expect(page.locator(".prep-row")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Volver a mis datos" }).click();
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  await expect(page.locator(".available-block")).toContainText("$ 9.000");
  await nav(page, "Ajustes y respaldos");
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Personal ficticio",
  );
});

test("rechaza unidades incompatibles y respaldos inválidos sin modificar el estado", async ({
  page,
}) => {
  await page.goto("");
  await ingredient(page);
  await page.getByRole("link", { name: "Recetas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva receta" }).click();
  await dialog(page)
    .getByLabel("Nombre de la receta")
    .fill("Incompatible ficticia");
  await dialog(page)
    .getByLabel("Ingrediente", { exact: true })
    .selectOption({ label: "Pollo" });
  await dialog(page).getByLabel("Cantidad", { exact: true }).fill("400");
  await dialog(page).getByLabel("Unidad", { exact: true }).selectOption("ml");
  await dialog(page)
    .getByRole("button", { name: "Guardar", exact: true })
    .click();
  await expect(dialog(page).getByRole("alert")).toContainText("convertir");
  await dialog(page)
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(page.locator(".recipe-card")).toHaveCount(0);
  await name(page, "Conservar ficticio");
  for (const [file, content, error] of [
    ["invalid", "{", "JSON válido"],
    [
      "future",
      JSON.stringify({
        app: "field",
        formatVersion: 1,
        space: "personal",
        exportedAt: new Date().toISOString(),
        data: { schemaVersion: 3 },
      }),
      "más nueva",
    ],
    [
      "demo",
      JSON.stringify({
        app: "field",
        formatVersion: 1,
        space: "demo",
        exportedAt: new Date().toISOString(),
        data: { schemaVersion: 2 },
      }),
      "otro espacio",
    ],
  ]) {
    await page.getByLabel("Importar un respaldo JSON").setInputFiles({
      name: file + ".json",
      mimeType: "application/json",
      buffer: Buffer.from(content),
    });
    await expect(page.getByRole("alert")).toContainText(error);
    await expect(dialog(page)).not.toBeVisible();
  }
  await page.reload();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Conservar ficticio",
  );
});

test("migra datos de la versión publicada y conserva una copia previa", async ({
  page,
}) => {
  await page.goto("");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resumen");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("field-personal", 1);
      req.onsuccess = () => resolve(req.result);
    });
    const date = new Date().toISOString();
    await new Promise<void>((resolve) => {
      const tx = db.transaction("document", "readwrite");
      tx.objectStore("document").put(
        {
          revision: 4,
          data: {
            schemaVersion: 1,
            id: "legacy-personal",
            createdAt: date,
            updatedAt: date,
            profile: { displayName: "Perfil previo ficticio" },
            settings: {
              theme: "dark",
              currency: "UYU",
              timeZone: "America/Montevideo",
            },
          },
        },
        "main",
      );
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await nav(page, "Ajustes y respaldos");
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Perfil previo ficticio",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".snapshot")).toContainText(
    "Antes de actualizar el formato",
  );
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await dialog(page)
    .getByRole("button", { name: "Confirmar reemplazo" })
    .click();
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Perfil previo ficticio",
  );
});

test("navegación, formularios y composición a 390/400 px sin errores JavaScript", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("");
  await page.getByRole("button", { name: "Explorar demo" }).click();
  for (const width of [390, 400, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "Inicio",
      "Finanzas",
      "Cocina",
      "Ajustes y respaldos",
    ]) {
      await nav(page, route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await nav(page, "Cocina");
    for (const tab of ["Recetas", "Ingredientes", "Compras", "Preparaciones"]) {
      await page.getByRole("link", { name: tab, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.getByRole("link", { name: "Compras", exact: true }).click();
    await page
      .getByRole("button", { name: "Anotar compra", exact: true })
      .click();
    await dialog(page)
      .getByLabel("Ingrediente", { exact: true })
      .selectOption({ label: "Pollo" });
    await dialog(page).getByLabel("Cantidad", { exact: true }).focus();
    expect(
      await dialog(page).evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    await dialog(page)
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
  }
  expect(errors).toEqual([]);
});

test("nuevo período conserva movimientos previos y permite volver al historial", async ({
  page,
}) => {
  await page.goto("");
  await period(page);
  await expense(page, "expense", "500", "Histórico ficticio");
  await page
    .getByRole("button", { name: "Nuevo período", exact: true })
    .click();
  await dialog(page)
    .getByLabel(/Saldo inicial/)
    .fill("20000");
  await dialog(page).getByLabel("Fecha de inicio", { exact: true }).fill(date);
  await dialog(page)
    .getByLabel("Próximo cobro", { exact: true })
    .fill(addDays(date, 20));
  await save(page);
  await expect(metric(page, "Saldo real")).toContainText("$ 20.000");
  await expect(page.locator("#movement-list .movement")).toHaveCount(0);
  await page.locator(".history .button").first().click();
  await expect(metric(page, "Saldo real")).toContainText("$ 39.500");
  await expect(page.locator("#movement-list")).toContainText(
    "Histórico ficticio",
  );
});

test("receta y compra con varias líneas, quitar una línea y vínculo financiero único", async ({
  page,
}) => {
  await page.goto("");
  await period(page);
  await ingredient(page);
  await ingredient(page, "Arroz", "100");
  await page.getByRole("link", { name: "Recetas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva receta" }).click();
  await dialog(page)
    .getByLabel("Nombre de la receta")
    .fill("Pollo con arroz ficticio");
  await dialog(page)
    .getByLabel("Ingrediente", { exact: true })
    .selectOption({ label: "Pollo" });
  await dialog(page).getByLabel("Cantidad", { exact: true }).fill("400");
  await dialog(page).getByLabel("Unidad", { exact: true }).selectOption("g");
  await dialog(page).getByRole("button", { name: "Agregar línea" }).click();
  const second = dialog(page).locator("[data-line]").nth(1);
  await second
    .getByLabel("Ingrediente", { exact: true })
    .selectOption({ label: "Arroz" });
  await second.getByLabel("Cantidad", { exact: true }).fill("200");
  await second.getByLabel("Unidad", { exact: true }).selectOption("g");
  await expect(dialog(page).locator("#cost-preview")).toContainText(
    "Total $ 160",
  );
  await expect(dialog(page).locator("#cost-preview")).toContainText(
    "$ 40 por porción",
  );
  await save(page);
  await page
    .getByRole("button", {
      name: "Editar Pollo con arroz ficticio",
      exact: true,
    })
    .click();
  await dialog(page)
    .locator("[data-line]")
    .nth(1)
    .getByRole("button", { name: "Quitar ingrediente" })
    .click();
  await expect(dialog(page).locator("#cost-preview")).toContainText(
    "Total $ 140",
  );
  await save(page);
  await page.getByRole("link", { name: "Compras", exact: true }).click();
  await page
    .getByRole("button", { name: "Anotar compra", exact: true })
    .click();
  await dialog(page)
    .getByLabel("Ingrediente", { exact: true })
    .selectOption({ label: "Pollo" });
  await dialog(page).getByRole("button", { name: "Agregar línea" }).click();
  await dialog(page)
    .locator("[data-line]")
    .nth(1)
    .getByLabel("Ingrediente", { exact: true })
    .selectOption({ label: "Arroz" });
  await expect(dialog(page).locator("#cost-preview")).toContainText("$ 450");
  await save(page);
  await nav(page, "Finanzas");
  await expect(page.locator("#movement-list .movement")).toHaveCount(1);
  await expect(metric(page, "Saldo real")).toContainText("$ 39.550");
});
