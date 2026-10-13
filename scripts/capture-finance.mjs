// Isolated demo only. Captures the built app with actual browser rendering.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
const output = resolve(
  process.env.FIELD_SCREENSHOT_DIR || "/tmp/field-finance-captures",
);
await mkdir(output, { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4175",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
const base = "http://127.0.0.1:4175/Field/";
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw new Error("El servidor de capturas no pudo iniciar.");
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error("El servidor de capturas no respondió.");
  browser = await chromium.launch({
    executablePath: process.env.FIELD_CHROMIUM_PATH,
  });
  const results = [];
  for (const [device, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      colorScheme: "light",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(base);
    await page
      .getByRole("button", { name: "Explorar demo", exact: true })
      .click();
    await page.locator(".demo-banner").waitFor();
    for (const theme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: theme });
      for (const [name, route] of [
        ["inicio", "inicio"],
        ["presupuesto", "finanzas/plan"],
        ["movimientos", "finanzas/movimientos"],
        ["fijos", "finanzas/fijos"],
        ["metas", "finanzas/metas"],
        ["proyeccion", "finanzas/proyeccion"],
      ]) {
        await page.goto(base + "#" + route);
        if (route.includes("/"))
          await page
            .locator(`.finance-tabs a[href="#${route}"][aria-current]`)
            .waitFor();
        else
          await page
            .getByRole("heading", { name: "Tu dinero, hoy", exact: true })
            .waitFor();
        await page.evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            ),
        );
        const size = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        if (size.scroll > size.width)
          throw new Error(`Overflow: ${name} ${device} ${theme}`);
        const file = `${name}-${device}-${theme}.png`;
        await page.screenshot({ path: resolve(output, file), fullPage: true });
        if (name === "inicio")
          await page.screenshot({
            path: resolve(output, `portada-${device}-${theme}.png`),
          });
        results.push({
          file,
          viewport: { width, height },
          theme,
          route,
          title: await page.title(),
          noOverflow: true,
        });
      }
      await page.goto(base + "#finanzas/fijos");
      await page
        .getByRole("button", { name: "Nuevo fijo", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      if (!(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)))
        throw new Error("Overflow en formulario");
      await page.screenshot({
        path: resolve(output, `formulario-${device}-${theme}.png`),
      });
      await dialog
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
    }
    if (errors.length) throw new Error(errors.join("\n"));
    await context.close();
  }
  await writeFile(
    resolve(output, "capturas.json"),
    JSON.stringify(
      { source: "Build local, demo ficticia aislada", results },
      null,
      2,
    ),
  );
  console.log(
    `Capturas: ${output} (24 pantallas, 4 portadas y 4 formularios; consola y overflow verificados).`,
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
