import "../styles/app.css";
import { createRepository, type Repository } from "../storage/repository";
import {
  exportBackup,
  migrateData,
  parseBackup,
  type Data,
  type Document,
  type Space,
  type Theme,
} from "../storage/model";

type Route = "inicio" | "finanzas" | "alimentacion" | "ajustes";
const routes: Route[] = ["inicio", "finanzas", "alimentacion", "ajustes"];
const app = window.document.querySelector<HTMLDivElement>("#app")!;
let space: Space = "personal";
let repository: Repository;
let stateDoc: Document;
let busy = false;
let pending: Data | null = null;
let pendingReason = "";
let notice = "";
let noticeError = false;

const icons = {
  inicio:
    '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  finanzas:
    '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-6 5h3M6 5V3h12"/>',
  alimentacion:
    '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18m13-18c-4 2-5 7-5 10h5m0-10v18"/>',
  ajustes:
    '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  shield:
    '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  leaf: '<path d="M20 3C8 3 3 7 4 14c1 6 8 7 12 2 3-4 4-9 4-13ZM4 21 16 8"/>',
};
function icon(name: keyof typeof icons) {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}
function escape(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
function route(): Route {
  const value = location.hash.slice(1);
  return routes.includes(value as Route) ? (value as Route) : "inicio";
}
function label(value: Route) {
  return {
    inicio: "Inicio",
    finanzas: "Finanzas",
    alimentacion: "Alimentación",
    ajustes: "Ajustes y respaldos",
  }[value];
}
function localDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function applyTheme() {
  const theme = stateDoc.data.settings.theme;
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  window.document.documentElement.dataset.theme = dark ? "dark" : "light";
  window.document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#171e1b" : "#f5f5ef");
}

function home() {
  const name = stateDoc.data.profile.displayName;
  return `<section class="hero"><div class="eyebrow"><span class="dot"></span> TU ESPACIO, A TU RITMO</div>
    <h1>${name ? `Hola, ${escape(name)}.` : "Un poco de orden.<br>Más espacio para vos."}</h1>
    <p>Un lugar para organizar la plata y las comidas.<br class="desktop-break"> Empezamos por una base simple, que cuida tus datos.</p>
    <a class="button primary" href="#ajustes">Prepará tu espacio ${icon("arrow")}</a>
    <div class="hero-art" aria-hidden="true"><div class="art-circle"></div><div class="art-card card-back"></div><div class="art-card card-front">${icon("leaf")}<span>De a un paso.</span><div class="art-line"></div><div class="art-line short"></div></div><span class="art-spark">✳</span></div>
  </section>
  <div class="section-heading"><div><span class="eyebrow">LO QUE VIENE</span><h2>Tu día a día, en un lugar</h2></div><span class="pill">Primera etapa</span></div>
  <div class="module-grid"><a class="module-card" href="#finanzas"><span class="module-icon money">${icon("finanzas")}</span><span class="eyebrow">01 · FINANZAS</span><h3>Que la plata alcance.</h3><p>Gastos y presupuesto hasta el próximo cobro. Este módulo llega en la siguiente etapa.</p><span class="text-link">Ver el alcance ${icon("arrow")}</span></a>
  <a class="module-card" href="#alimentacion"><span class="module-icon food">${icon("alimentacion")}</span><span class="eyebrow">02 · ALIMENTACIÓN</span><h3>Comer bien, planificar mejor.</h3><p>Compras, ingredientes y recetas conectados, sin contar dos veces el mismo gasto.</p><span class="text-link">Ver el alcance ${icon("arrow")}</span></a></div>
  <section class="privacy-strip">${icon("shield")}<div><h3>Tu información se queda acá.</h3><p>Se guarda en este navegador. Exportá un respaldo para llevarla a otro dispositivo o recuperarla.</p></div><a href="#ajustes">Ir a respaldos ${icon("arrow")}</a></section>`;
}

function upcoming(current: "finanzas" | "alimentacion") {
  const finance = current === "finanzas";
  return `<section class="page-head"><span class="eyebrow">${finance ? "01 · TU PLATA" : "02 · TUS COMIDAS"}</span><h1>${finance ? "Finanzas" : "Alimentación"}</h1><p>${finance ? "Entender cuánto tenés y cuánto podés gastar." : "Conocer el costo de lo que cocinás."}</p></section>
    <section class="panel roadmap"><span class="module-icon ${finance ? "money" : "food"}">${icon(current)}</span><span class="pill">Próxima etapa · aún no disponible</span><h2>${finance ? "Un presupuesto que se entiende." : "De la compra a la receta."}</h2><p>${finance ? "Vamos a incorporar saldo inicial, registro de gastos, presupuesto semanal y disponibilidad hasta el próximo cobro." : "Vamos a conectar ingredientes, precios, compras y recetas para calcular el costo por porción."}</p><ul>${finance ? "<li>Gastos con fecha, categoría y descripción.</li><li>Semanas del período, con cálculos transparentes.</li><li>Una compra de alimentos, un solo gasto.</li>" : "<li>Ingredientes con precio y cantidad del envase.</li><li>Recetas con cantidades y porciones.</li><li>Compras vinculadas a finanzas, sin duplicaciones.</li>"}</ul><p class="quiet">Esta entrega prepara la estructura y los respaldos. No registra ${finance ? "movimientos financieros" : "ingredientes ni compras"} todavía.</p><a class="button secondary" href="#inicio">Volver al inicio ${icon("arrow")}</a></section>`;
}

function settings() {
  return `<section class="page-head"><span class="eyebrow">TU ESPACIO</span><h1>Ajustes y respaldos</h1><p>Lo básico para empezar. Lo importante para conservarlo.</p></section>
    <div class="settings-grid"><section class="panel"><div class="panel-title"><span class="step">01</span><h2>Hacelo tuyo</h2></div>
      <form id="profile-form"><label for="display-name">¿Cómo querés que te llamemos?</label><input id="display-name" name="displayName" maxlength="60" autocomplete="nickname" value="${escape(stateDoc.data.profile.displayName)}" placeholder="Tu nombre o un apodo (opcional)"><p class="hint">Solo se guarda en este dispositivo.</p><button class="button primary" type="submit">Guardar nombre ${icon("arrow")}</button></form>
      <div class="divider"></div><label for="theme">Apariencia</label><select id="theme"><option value="system">Según el dispositivo</option><option value="light">Claro</option><option value="dark">Oscuro</option></select><p class="hint">Moneda: pesos uruguayos (UYU). Zona horaria: Uruguay.</p>
    </section><section class="panel"><div class="panel-title"><span class="step">02</span><h2>Cuidá tus datos</h2></div><p>Un respaldo incluye todos los datos de este espacio. Hoy: nombre y preferencias; los módulos siguientes ampliarán el formato.</p>
      <button class="button secondary full" id="export">${icon("download")} Exportar respaldo</button>
      <label class="file-label" for="import">Importar un respaldo JSON</label><input type="file" id="import" accept="application/json,.json"><p class="hint">Hasta 2 MB. Revisás el contenido antes de reemplazar. Guardamos una copia previa.</p>
      <div id="import-preview"></div><div class="divider"></div><h3>Copias automáticas</h3><p class="hint">Las últimas 5 copias de este espacio, antes de importar o restaurar. No sustituyen un archivo exportado.</p><div id="snapshots">Cargando copias…</div>
    </section></div>
    <section class="panel device-panel"><div>${icon("shield")}<h2>Guardado en este navegador</h2><p>Otro dispositivo tendrá su propio espacio. Si borrás los datos del sitio, podés perderlos: exportá un respaldo cada tanto.</p></div><button class="button secondary" id="persist">Solicitar almacenamiento persistente</button></section>`;
}

async function render() {
  applyTheme();
  const current = route();
  app.innerHTML = `<a class="skip-link" href="#main">Saltar al contenido</a><div class="layout"><aside class="sidebar"><a class="brand" href="#inicio"><span class="brand-mark">f.</span><span>field<span class="brand-sub">SISTEMA PERSONAL</span></span></a><nav aria-label="Navegación principal">${routes.map((item) => `<a href="#${item}" ${current === item ? 'aria-current="page"' : ""}>${icon(item)}<span>${label(item)}</span>${current === item ? '<span class="nav-dot"></span>' : ""}</a>`).join("")}</nav><div class="sidebar-bottom"><span class="eyebrow">HECHO PARA TU DÍA A DÍA</span><p>Menos vueltas.<br>Más claridad.</p><span class="version">Field · etapa 1</span></div></aside>
    <div class="main-wrap"><header class="topbar"><span class="breadcrumb">Tu espacio <span>/</span> ${label(current)}</span><div class="space-controls"><span class="space-label">${space === "demo" ? "Demo ficticia" : "Espacio personal"}</span><button id="switch-space" class="button compact">${space === "demo" ? "Volver a mis datos" : "Explorar demo"}</button></div></header>
    ${space === "demo" ? '<div class="demo-banner" role="note"><strong>Estás en la demo.</strong> Datos ficticios en una base separada. Tus datos personales no cambian.</div>' : ""}
    <main id="main" tabindex="-1">${current === "inicio" ? home() : current === "ajustes" ? settings() : upcoming(current)}</main>
    <footer><span>Un paso a la vez.</span><span>Sin cuentas. Sin nube. En tu dispositivo.</span></footer></div></div>
    <div id="notice" class="notice ${noticeError ? "error" : ""}" role="${noticeError ? "alert" : "status"}" ${notice ? "" : "hidden"}>${escape(notice)}</div>`;
  const switchButton =
    window.document.querySelector<HTMLButtonElement>("#switch-space")!;
  switchButton.addEventListener("click", () => void switchSpace());
  if (current === "ajustes") {
    const theme = window.document.querySelector<HTMLSelectElement>("#theme")!;
    theme.value = stateDoc.data.settings.theme;
    theme.addEventListener(
      "change",
      () =>
        void action(async () => {
          const next = structuredClone(stateDoc.data);
          next.settings.theme = theme.value as Theme;
          stateDoc = await repository.save(next, stateDoc.revision);
          applyTheme();
          setNotice("Apariencia guardada en este dispositivo.");
        }),
    );
    window.document
      .querySelector("#profile-form")!
      .addEventListener("submit", (event) => {
        event.preventDefault();
        void action(async () => {
          const next = structuredClone(stateDoc.data);
          next.profile.displayName = window.document
            .querySelector<HTMLInputElement>("#display-name")!
            .value.trim();
          stateDoc = await repository.save(next, stateDoc.revision);
          setNotice("Nombre guardado en este dispositivo.");
        });
      });
    window.document
      .querySelector("#export")!
      .addEventListener("click", () => void action(exportFile));
    window.document
      .querySelector("#import")!
      .addEventListener("change", (event) => void readImport(event));
    window.document.querySelector("#persist")!.addEventListener(
      "click",
      () =>
        void action(async () => {
          const supported = typeof navigator.storage?.persist === "function";
          const granted = supported ? await navigator.storage.persist() : false;
          setNotice(
            granted
              ? "El navegador concedió almacenamiento persistente. Conservá igualmente tus respaldos."
              : "El navegador no concedió almacenamiento persistente. Podés seguir usando Field y exportar respaldos.",
          );
        }),
    );
    await renderSnapshots();
  }
  window.document.title = `${label(current)} · Field`;
}

function setNotice(message: string, error = false) {
  notice = message;
  noticeError = error;
  const element = window.document.querySelector<HTMLDivElement>("#notice");
  if (element) {
    element.textContent = message;
    element.hidden = false;
    element.classList.toggle("error", error);
    element.setAttribute("role", error ? "alert" : "status");
  }
}

async function action(fn: () => Promise<void>) {
  if (busy) return;
  busy = true;
  app.setAttribute("aria-busy", "true");
  const controls = [
    ...app.querySelectorAll<
      HTMLInputElement | HTMLButtonElement | HTMLSelectElement
    >("button, input, select"),
  ];
  controls.forEach((control) => (control.disabled = true));
  try {
    await fn();
  } catch (error) {
    setNotice(
      error instanceof Error
        ? error.message
        : "No se pudo completar la operación. No se confirmó el guardado.",
      true,
    );
  } finally {
    busy = false;
    app.removeAttribute("aria-busy");
    controls.forEach((control) => (control.disabled = false));
  }
}

async function switchSpace() {
  await action(async () => {
    const nextSpace = space === "personal" ? "demo" : "personal";
    const nextRepository = createRepository(nextSpace);
    const nextDocument = await nextRepository.load();
    space = nextSpace;
    repository = nextRepository;
    stateDoc = nextDocument;
    pending = null;
    notice = "";
    // Solo la selección del espacio usa sessionStorage; los datos viven en IndexedDB.
    try {
      sessionStorage.setItem("field-space", space);
    } catch {
      /* seguirá personal al recargar */
    }
    await render();
  });
}

async function exportFile() {
  // Leer la última revisión incluye cambios confirmados en otra pestaña.
  stateDoc = await repository.load();
  const blob = new Blob([exportBackup(space, stateDoc.data)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `field-${space}-${new Date().toISOString().slice(0, 10)}.json`;
  app.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  setNotice("Respaldo generado. Guardalo en Archivos o en una carpeta segura.");
}

async function readImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await action(async () => {
    pending = null;
    window.document.querySelector("#import-preview")!.replaceChildren();
    if (file.size > 2_000_000)
      throw new Error("El respaldo supera el límite de 2 MB de esta versión.");
    const next = parseBackup(await file.text(), space);
    pending = next;
    pendingReason = "Antes de importar un respaldo";
    showPreview(next, "Revisá antes de importar");
  });
}

function showPreview(data: Data, title: string) {
  const container =
    window.document.querySelector<HTMLDivElement>("#import-preview")!;
  container.innerHTML = `<div class="import-preview"><h3>${title}</h3><p>Espacio: ${space === "personal" ? "personal" : "demo ficticia"}<br>Nombre: ${escape(data.profile.displayName || "Sin nombre")}<br>Apariencia: ${escape({ system: "Según el dispositivo", dark: "Oscuro", light: "Claro" }[data.settings.theme])}</p><p class="hint">Reemplazará los datos de este espacio. Se guardará una copia de los datos actuales.</p><div class="button-row"><button id="confirm-import" class="button primary">Confirmar reemplazo</button><button id="cancel-import" class="button secondary">Cancelar</button></div></div>`;
  window.document.querySelector("#confirm-import")!.addEventListener(
    "click",
    () =>
      void action(async () => {
        if (!pending) return;
        stateDoc = await repository.replace(
          pending,
          stateDoc.revision,
          pendingReason,
        );
        pending = null;
        setNotice(
          "Datos restaurados. La copia anterior quedó guardada en este espacio.",
        );
        await render();
      }),
  );
  window.document
    .querySelector("#cancel-import")!
    .addEventListener("click", () => {
      pending = null;
      container.replaceChildren();
      const input = window.document.querySelector<HTMLInputElement>("#import");
      if (input) input.value = "";
    });
}

async function renderSnapshots() {
  const target = window.document.querySelector<HTMLDivElement>("#snapshots")!;
  try {
    const copies = await repository.snapshots();
    // Una navegación mientras se lee no debe dibujar copias en otra pantalla.
    if (!target.isConnected) return;
    if (!copies.length) {
      target.textContent =
        "Todavía no hay copias. Se crean antes de reemplazar datos.";
      return;
    }
    target.innerHTML = copies
      .map(
        (copy, index) =>
          `<div class="snapshot"><div><strong>${escape(copy.reason)}</strong><span>${escape(localDate(copy.createdAt))}</span></div><button class="button compact" data-copy="${index}">Restaurar</button></div>`,
      )
      .join("");
    target
      .querySelectorAll<HTMLButtonElement>("[data-copy]")
      .forEach((button) =>
        button.addEventListener(
          "click",
          () =>
            void action(async () => {
              const copy = copies[Number(button.dataset.copy)];
              const data = migrateData(copy.data);
              pending = data;
              pendingReason = "Antes de restaurar una copia automática";
              showPreview(data, "Revisá la copia a restaurar");
              window.document
                .querySelector("#import-preview")!
                .scrollIntoView({ block: "center" });
            }),
        ),
      );
  } catch (error) {
    target.textContent = "No se pudieron leer las copias.";
    setNotice(
      error instanceof Error ? error.message : "Error al leer copias.",
      true,
    );
  }
}

window.addEventListener("hashchange", () => {
  pending = null;
  void render().then(() => {
    window.document.querySelector<HTMLElement>("#main")?.focus();
    window.scrollTo(0, 0);
  });
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (stateDoc) applyTheme();
});

async function boot() {
  try {
    try {
      space =
        sessionStorage.getItem("field-space") === "demo" ? "demo" : "personal";
    } catch {
      /* predeterminado */
    }
    repository = createRepository(space);
    stateDoc = await repository.load();
    await render();
  } catch (error) {
    app.innerHTML = `<main class="boot-error"><span class="brand-mark">f.</span><h1>No pudimos abrir tu espacio.</h1><p>${escape(error instanceof Error ? error.message : "El almacenamiento no está disponible.")}</p><p>No se reemplazaron tus datos. Probá cerrar otras pestañas y comprobar que este navegador permite almacenamiento.</p><button class="button primary" id="retry">Volver a intentar</button></main>`;
    window.document
      .querySelector("#retry")!
      .addEventListener("click", () => location.reload());
  }
}
void boot();
