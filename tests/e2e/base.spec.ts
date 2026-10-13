import { expect, test, type Page } from "@playwright/test";

async function saveName(page: Page, name: string) {
  await page
    .getByRole("textbox", { name: "¿Cómo querés que te llamemos?" })
    .fill(name);
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(page.getByRole("status")).toContainText("Nombre guardado");
}

test("navegación bajo /Field/, tema persistente y ancho sin desborde", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Un poco de orden",
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Finanzas", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Finanzas");
  await expect(
    page.getByText("Próxima etapa · aún no disponible"),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Alimentación", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Alimentación",
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Ajustes y respaldos" })
    .click();
  await saveName(page, "Persona ficticia");
  await page.getByLabel("Apariencia", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Persona ficticia",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Apariencia", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByLabel("Apariencia", { exact: true }).selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  expect(await noOverflow()).toBe(true);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Inicio", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hola, Persona ficticia.",
  );
  expect(await noOverflow()).toBe(true);
  expect(errors).toEqual([]);
});

test("demo separada: edición, recarga y vuelta a datos personales", async ({
  page,
}) => {
  await page.goto("#ajustes");
  await saveName(page, "Personal ficticio");
  await page.getByRole("button", { name: "Explorar demo" }).click();
  await expect(page.getByRole("note")).toContainText("Datos ficticios");
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Alex · ejemplo",
  );
  await saveName(page, "Demo editada");
  await page.reload();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Demo editada",
  );
  await page.getByRole("button", { name: "Volver a mis datos" }).click();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Personal ficticio",
  );
  await expect(page.getByRole("note")).toHaveCount(0);
});

test("exporta un archivo real, importa tras confirmar y recupera la copia anterior", async ({
  page,
}) => {
  await page.goto("#ajustes");
  await saveName(page, "Respaldo ficticio");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar respaldo" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^field-personal-.*\.json$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  await saveName(page, "Antes de importar");
  await page.getByLabel("Importar un respaldo JSON").setInputFiles(path!);
  await expect(
    page.getByRole("heading", { name: "Revisá antes de importar" }),
  ).toBeVisible();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Antes de importar",
  );
  await page.getByRole("button", { name: "Confirmar reemplazo" }).click();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Respaldo ficticio",
  );
  await page.reload();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Respaldo ficticio",
  );
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar reemplazo" }).click();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Antes de importar",
  );
  await expect(
    page.getByRole("button", { name: "Restaurar", exact: true }),
  ).toHaveCount(2);
});

test("rechaza JSON inválido, versión futura y respaldo de demo sin modificar personal", async ({
  page,
}) => {
  await page.goto("#ajustes");
  await saveName(page, "Conservar ficticio");
  await page
    .getByLabel("Importar un respaldo JSON")
    .setInputFiles({
      name: "invalido.json",
      mimeType: "application/json",
      buffer: Buffer.from("{"),
    });
  await expect(page.getByRole("alert")).toContainText("JSON válido");
  const data = { schemaVersion: 2 };
  const envelope = {
    app: "field",
    formatVersion: 1,
    space: "personal",
    exportedAt: new Date().toISOString(),
    data,
  };
  await page
    .getByLabel("Importar un respaldo JSON")
    .setInputFiles({
      name: "futuro.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(envelope)),
    });
  await expect(page.getByRole("alert")).toContainText("más nueva");
  await page
    .getByLabel("Importar un respaldo JSON")
    .setInputFiles({
      name: "demo.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...envelope, space: "demo" })),
    });
  await expect(page.getByRole("alert")).toContainText("otro espacio");
  await expect(
    page.getByRole("button", { name: "Confirmar reemplazo" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("¿Cómo querés que te llamemos?")).toHaveValue(
    "Conservar ficticio",
  );
  await expect(
    page.getByRole("button", { name: "Restaurar", exact: true }),
  ).toHaveCount(0);
});

test("cancelación de importación y texto tratado como datos", async ({
  page,
}) => {
  await page.goto("#ajustes");
  const name = "<img src=x onerror=alert(1)>";
  await saveName(page, name);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar respaldo" }).click();
  const download = await downloadEvent;
  await page
    .getByLabel("Importar un respaldo JSON")
    .setInputFiles((await download.path())!);
  await expect(page.locator("#import-preview img")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar reemplazo" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Inicio", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Hola, ${name}.`,
  );
  await expect(page.locator("main img")).toHaveCount(0);
});
