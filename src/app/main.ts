import "../styles/app.css";
import "../styles/finance.css";
import { payFixed, savingsFromPercent } from "../modules/finance/planning";
import { createRepository, type Repository } from "../storage/repository";
import {
  exportBackup,
  migrateData,
  parseBackup,
  type Data,
  type Document,
  type Space,
  type Theme,
  type Recipe,
} from "../storage/model";
import { createDemo } from "../demo/data";
import { activePeriod, periodMovements } from "../modules/finance/logic";
import { financeView, movementRows } from "../modules/finance/view";
import { kitchenView, type KitchenTab } from "../modules/food/view";
import { recipeCost } from "../modules/food/logic";
import {
  today,
  esc,
  money,
  parseMoney,
  uid,
  type Unit,
} from "../shared/values";
import { icon, button, input, select, unitOptions } from "../shared/ui";
import {
  formSpec,
  deleteEntity,
  lineRow,
  type EditorKind,
  type FormSpec,
} from "./forms";
import { homeView } from "./home";
const app = document.querySelector<HTMLDivElement>("#app")!;
const editor = document.createElement("dialog");
editor.className = "editor";
document.body.append(editor);
const notification = document.createElement("div");
notification.className = "notice";
notification.setAttribute("role", "status");
notification.hidden = true;
document.body.append(notification);
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
let space: Space = "personal",
  repository: Repository,
  state: Document,
  busy = false;
let editing: EditorKind | undefined,
  editingSpec: FormSpec | undefined,
  followup: (() => void) | undefined;
const route = () => {
  const head = location.hash.slice(1).split("/")[0];
  return head === "finanzas"
    ? "finanzas"
    : head === "cocina" || head === "alimentacion"
      ? "cocina"
      : head === "ajustes"
        ? "ajustes"
        : "inicio";
};
const kitchenTab = (): KitchenTab => {
  const tab = location.hash.split("/")[1];
  return ["recetas", "ingredientes", "compras", "preparaciones"].includes(tab)
    ? (tab as KitchenTab)
    : "recetas";
};
function applyTheme() {
  const dark =
    state.data.settings.theme === "dark" ||
    (state.data.settings.theme === "system" && systemTheme.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')!
    .setAttribute("content", dark ? "#121b23" : "#f4f6f8");
}
let noticeTimer: number | undefined;
function announce(message: string, error = false) {
  window.clearTimeout(noticeTimer);
  notification.textContent = message;
  notification.hidden = false;
  notification.classList.toggle("error", error);
  notification.setAttribute("role", error ? "alert" : "status");
  if (!error)
    noticeTimer = window.setTimeout(() => {
      notification.hidden = true;
    }, 5000);
}
async function action(fn: () => Promise<void>) {
  if (busy) return;
  busy = true;
  app.setAttribute("aria-busy", "true");
  const controls = [
    ...document.querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLSelectElement
    >("button,input,select"),
  ];
  controls.forEach((c) => (c.disabled = true));
  try {
    await fn();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar la operación.";
    if (editor.open) {
      editor.querySelector<HTMLElement>("#form-error")!.textContent = message;
    } else announce(message, true);
  } finally {
    busy = false;
    app.removeAttribute("aria-busy");
    controls.forEach((c) => (c.disabled = false));
  }
}
let undo: { data: Data; revision: number; space: Space } | undefined;
async function commit(
  change: (data: Data) => void,
  message: string,
  reversible = false,
) {
  const before = structuredClone(state.data);
  const next = structuredClone(state.data);
  change(next);
  state = await repository.save(next, state.revision);
  undo = reversible
    ? { data: before, revision: state.revision, space }
    : undefined;
  announce(message);
  if (undo) {
    notification.insertAdjacentHTML(
      "beforeend",
      button("Deshacer", "undo", "text"),
    );
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => {
      notification.hidden = true;
      undo = undefined;
    }, 15000);
  }
}
function settingsView() {
  const data = state.data;
  return `<div class="page-heading"><div><span class="eyebrow">DATOS Y PREFERENCIAS</span><h1>Ajustes y respaldos</h1></div></div><div class="settings-grid"><section class="panel"><h2>Preferencias</h2><form id="profile-form">${input("¿Cómo querés que te llamemos?", "displayName", data.profile.displayName, "text", 'maxlength="60" autocomplete="nickname"')}${button("Guardar nombre", "save-profile", "primary", 'type="submit"')}</form>${select("Apariencia", "theme", `<option value="system">Según el dispositivo</option><option value="light">Claro</option><option value="dark">Oscuro</option>`)}<p class="footnote">Pesos uruguayos · America/Montevideo</p><div class="divider"></div><h3>Almacenamiento local</h3><p>Los datos se guardan en este navegador. Otro dispositivo tiene su propio espacio. Exportá un archivo para trasladarlos o recuperarlos.</p>${button("Solicitar almacenamiento persistente", "persist", "secondary small")}</section><section class="panel"><h2>Respaldo completo</h2><p>Incluye presupuestos, movimientos, fijos, pagos, metas, comprobaciones, proyecciones, ingredientes, recetas, compras, preparaciones y preferencias de este espacio.</p><div class="backup-actions">${button(icon("download") + " Exportar respaldo", "export", "primary")}<label class="field"><span>Importar un respaldo JSON</span><input id="import-file" type="file" accept="application/json,.json"></label></div><p class="footnote">Hasta 2 MB. El archivo se valida antes de reemplazar datos; se crea una copia previa. Los archivos no están cifrados.</p><div class="divider"></div><h3>Copias automáticas</h3><p class="footnote">Las últimas cinco copias, antes de importar, restaurar o migrar.</p><div id="snapshots">Cargando copias…</div></section></div>`;
}
async function render() {
  applyTheme();
  const current = route(),
    labels = {
      inicio: "Inicio",
      finanzas: "Finanzas",
      cocina: "Cocina",
      ajustes: "Ajustes y respaldos",
    },
    keys = ["inicio", "finanzas", "cocina", "ajustes"] as const;
  const glyph = {
    inicio: "home",
    finanzas: "finance",
    cocina: "food",
    ajustes: "settings",
  } as const;
  app.innerHTML = `<a class="skip-link" href="#main">Saltar al contenido</a><header class="app-header"><a href="#inicio" class="brand"><span class="brand-mark">f.</span>field<span class="brand-label">PERSONAL</span></a><nav aria-label="Navegación principal">${keys.map((key) => `<a href="#${key}" aria-label="${labels[key]}" ${current === key ? 'aria-current="page"' : ""}>${icon(glyph[key])}<span>${key === "ajustes" ? "Ajustes" : labels[key]}</span></a>`).join("")}</nav><div class="header-tools"><span class="profile-name">${esc(state.data.profile.displayName)}</span>${button(space === "demo" ? "Volver a mis datos" : "Explorar demo", "switch-space", "compact")}</div></header>${space === "demo" ? `<div class="demo-banner"><span><strong>Demo ficticia</strong> · Base separada. Tus datos personales no cambian.</span>${button("Cargar demo completa", "reset-demo", "text")}</div>` : ""}<main id="main" tabindex="-1">${current === "inicio" ? homeView(state.data) : current === "finanzas" ? financeView(state.data, ["plan", "movimientos", "fijos", "metas", "proyeccion"].includes(location.hash.split("/")[1]) ? location.hash.split("/")[1] : "plan") : current === "cocina" ? kitchenView(state.data, kitchenTab()) : settingsView()}</main><footer><span>UYU · Datos en este dispositivo</span><a href="#ajustes">Exportar y respaldar ${icon("arrow")}</a></footer>`;
  app.dataset.section = current;
  const quick = app.querySelector<HTMLFormElement>("#quick-expense");
  quick?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(quick);
    void action(async () => {
      await commit(
        (d) => {
          const period = activePeriod(d);
          if (!period) throw new Error("Configurá el presupuesto primero.");
          d.movements.push({
            id: uid(),
            periodId: period.id,
            type: "expense",
            date: today(),
            cents: parseMoney(String(form.get("cents"))),
            category: String(form.get("category")),
            description: String(form.get("description")).trim(),
            purchaseId: null,
          });
        },
        "Gasto registrado.",
        true,
      );
      await render();
      app
        .querySelector<HTMLInputElement>('#quick-expense [name="cents"]')
        ?.focus();
    });
  });
  document.title = labels[current] + " · Field";
  if (current === "ajustes") {
    const theme = app.querySelector<HTMLSelectElement>('[name="theme"]')!;
    theme.value = state.data.settings.theme;
    theme.addEventListener(
      "change",
      () =>
        void action(async () => {
          await commit((d) => {
            d.settings.theme = theme.value as Theme;
          }, "Apariencia guardada.");
          applyTheme();
        }),
    );
    app.querySelector("#profile-form")!.addEventListener("submit", (event) => {
      event.preventDefault();
      void action(async () => {
        const name = app
          .querySelector<HTMLInputElement>('[name="displayName"]')!
          .value.trim();
        await commit((d) => {
          d.profile.displayName = name;
        }, "Nombre guardado en este dispositivo.");
        const profile = app.querySelector(".profile-name");
        if (profile) profile.textContent = name;
      });
    });
    app.querySelector("#import-file")!.addEventListener("change", (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      (event.target as HTMLInputElement).value = "";
      if (file)
        void action(async () => {
          if (file.size > 2_000_000)
            throw new Error("El respaldo supera el límite de 2 MB.");
          const data = parseBackup(await file.text(), space);
          openRestore(data, "Antes de importar un respaldo");
        });
    });
    await renderCopies();
  }
  if (current === "finanzas") {
    const search = app.querySelector<HTMLInputElement>("#movement-search"),
      type = app.querySelector<HTMLSelectElement>("#movement-type");
    const filter = () => {
      const rows = periodMovements(state.data).filter(
        (m) =>
          (type?.value === "all" || m.type === type?.value) &&
          `${m.description} ${m.category}`
            .toLocaleLowerCase("es-UY")
            .includes(search?.value.toLocaleLowerCase("es-UY") ?? ""),
      );
      app.querySelector("#movement-list")!.innerHTML = rows.length
        ? movementRows(rows)
        : '<p class="empty-message">No hay movimientos para este filtro.</p>';
    };
    search?.addEventListener("input", filter);
    type?.addEventListener("change", filter);
  }
}
function editorShell(title: string, content: string, save = "Guardar") {
  editor.classList.toggle(
    "financial-editor",
    !!editing &&
      [
        "period",
        "movement",
        "fixed",
        "goal",
        "contribution",
        "balance-check",
        "forecast",
      ].includes(editing),
  );
  editor.innerHTML = `<div class="editor-heading"><h2>${title}</h2><button type="button" class="icon-button" data-action="close-editor" aria-label="Cerrar formulario">${icon("close")}</button></div><form id="editor-form">${content}<p id="form-error" class="form-error" role="alert"></p><div class="editor-footer"><button type="button" class="button secondary" data-action="close-editor">Cancelar</button><button type="submit" class="button primary">${save}</button></div></form>`;
  editor.showModal();
  editor
    .querySelector<HTMLInputElement | HTMLSelectElement>("input, select")
    ?.focus();
}
function openEditor(
  kind: EditorKind,
  id?: string,
  recipeId?: string,
  after?: () => void,
) {
  if (busy) return;
  if (
    ["movement", "purchase", "balance-check", "forecast"].includes(kind) &&
    !id &&
    !activePeriod(state.data)
  ) {
    openEditor("period", undefined, undefined, () =>
      openEditor(kind, id, recipeId, after),
    );
    return;
  }
  if (
    (kind === "recipe" || kind === "purchase") &&
    !state.data.ingredients.length
  ) {
    openEditor("ingredient", undefined, undefined, () =>
      openEditor(kind, id, recipeId, after),
    );
    return;
  }
  if (kind === "preparation" && !id && !state.data.recipes.length) {
    openEditor("recipe", undefined, undefined, () => openEditor("preparation"));
    return;
  }
  editing = kind;
  editingSpec = formSpec(kind, state.data, id, recipeId);
  followup = after;
  editorShell(editingSpec.title, editingSpec.html);
  editor.querySelector("#editor-form")!.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement),
      spec = editingSpec!,
      continuation = followup;
    void action(async () => {
      await commit(
        (d) => spec.submit(d, form),
        "Guardado en este dispositivo.",
        [
          "period",
          "movement",
          "fixed",
          "goal",
          "contribution",
          "balance-check",
          "forecast",
        ].includes(kind),
      );
      editor.close();
      await render();
      if (continuation) {
        busy = false;
        continuation();
      }
    });
  });
  editor.querySelector('[name="type"]')?.addEventListener("change", (event) => {
    const category =
      editor.querySelector<HTMLSelectElement>('[name="category"]')!;
    if ((event.target as HTMLSelectElement).value === "income")
      category.value = "Ingreso";
    else if (category.value === "Ingreso") category.value = "Otros";
  });
  editor
    .querySelector('[name="recipeId"]')
    ?.addEventListener("change", (event) => {
      const recipe = state.data.recipes.find(
        (r) => r.id === (event.target as HTMLSelectElement).value,
      );
      if (recipe && !id) {
        editor.querySelector<HTMLInputElement>('[name="portions"]')!.value =
          String(recipe.portions);
        editor.querySelector<HTMLInputElement>('[name="remaining"]')!.value =
          String(recipe.portions);
      }
    });
  const percent = editor.querySelector<HTMLInputElement>(
    '[name="savingsPercent"]',
  );
  const initial = editor.querySelector<HTMLInputElement>(
    '[name="initialCents"]',
  );
  const reserve = editor.querySelector<HTMLInputElement>(
    '[name="savingsCents"]',
  );
  const updateSavings = () => {
    if (!percent?.value || !initial || !reserve) return;
    try {
      reserve.value = (
        savingsFromPercent(parseMoney(initial.value), percent.value) / 100
      ).toFixed(2);
      percent.setCustomValidity("");
    } catch (e) {
      percent.setCustomValidity((e as Error).message);
    }
  };
  percent?.addEventListener("input", () => {
    percent.setCustomValidity("");
    updateSavings();
  });
  initial?.addEventListener("input", updateSavings);
  reserve?.addEventListener("input", () => {
    if (percent) {
      percent.value = "";
      percent.setCustomValidity("");
    }
  });
  updateCostPreview();
}
function updateCostPreview() {
  const output = editor.querySelector<HTMLOutputElement>("#cost-preview");
  if (!output) return;
  try {
    const form = new FormData(
      editor.querySelector<HTMLFormElement>("#editor-form")!,
    );
    if (editing === "purchase") {
      const total = form
        .getAll("totalCents")
        .reduce<number>((s, p) => s + parseMoney(String(p)), 0);
      output.textContent =
        "Total de la compra: " + money(total) + " · un único gasto";
    } else if (editing === "recipe") {
      const ids = form.getAll("ingredientId"),
        qty = form.getAll("quantity"),
        unit = form.getAll("unit");
      const recipe: Recipe = {
        id: "preview",
        name: "Preview",
        portions: Number(form.get("portions")),
        lines: ids.map((id, i) => ({
          ingredientId: String(id),
          quantity: Number(qty[i]),
          unit: String(unit[i]) as Unit,
        })),
      };
      const cost = recipeCost(recipe, state.data.ingredients);
      output.textContent =
        "Total " +
        money(cost.total) +
        " · " +
        money(cost.perPortion) +
        " por porción";
    }
  } catch {
    output.textContent =
      "Completá las cantidades y elegí unidades compatibles para calcular el costo.";
  }
}
editor.addEventListener("change", (event) => {
  const target = event.target as HTMLSelectElement;
  if (target.name === "ingredientId") {
    const row = target.closest("[data-line]")!,
      ingredient = state.data.ingredients.find((i) => i.id === target.value);
    if (ingredient) {
      row.querySelector<HTMLSelectElement>('[name="unit"]')!.innerHTML =
        unitOptions(ingredient.unit);
      if (editing === "purchase") {
        row.querySelector<HTMLInputElement>('[name="quantity"]')!.value =
          String(ingredient.quantity);
        row.querySelector<HTMLInputElement>('[name="totalCents"]')!.value = (
          ingredient.priceCents / 100
        ).toFixed(2);
      }
    }
  }
  updateCostPreview();
});
editor.addEventListener("input", updateCostPreview);
editor.addEventListener("click", (event) => {
  const remove = (event.target as Element).closest(".remove-line");
  if (remove && !busy) {
    remove.closest("[data-line]")!.remove();
    updateCostPreview();
  }
});
function openRestore(data: Data, reason: string) {
  editing = undefined;
  editorShell(
    "Revisá antes de restaurar",
    `<div class="restore-summary"><strong>${space === "demo" ? "Demo ficticia" : "Espacio personal"}</strong><p>Nombre: ${esc(data.profile.displayName || "Sin nombre")}</p><dl><div><dt>Períodos</dt><dd>${data.periods.length}</dd></div><div><dt>Movimientos</dt><dd>${data.movements.length}</dd></div><div><dt>Fijos / metas</dt><dd>${data.finance.fixed.length} / ${data.finance.goals.length}</dd></div><div><dt>Ingredientes</dt><dd>${data.ingredients.length}</dd></div><div><dt>Recetas</dt><dd>${data.recipes.length}</dd></div><div><dt>Compras</dt><dd>${data.purchases.length}</dd></div><div><dt>Preparaciones</dt><dd>${data.preparations.length}</dd></div></dl></div><p class="form-note">Reemplazará este espacio. Conservamos una copia de los datos actuales antes de restaurar.</p>`,
    "Confirmar reemplazo",
  );
  editor.querySelector("#editor-form")!.addEventListener("submit", (event) => {
    event.preventDefault();
    void action(async () => {
      state = await repository.replace(data, state.revision, reason);
      undo = undefined;
      editor.close();
      announce("Datos restaurados. La copia anterior quedó guardada.");
      await render();
    });
  });
}
async function renderCopies() {
  const target = app.querySelector("#snapshots")!;
  try {
    const copies = await repository.snapshots();
    if (!target.isConnected) return;
    target.innerHTML = copies.length
      ? copies
          .map(
            (c, i) =>
              `<div class="snapshot"><div><strong>${esc(c.reason)}</strong><small>${new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short", timeZone: "America/Montevideo" }).format(new Date(c.createdAt))}</small></div>${button("Restaurar", "restore-copy", "text", `data-index="${i}"`)}</div>`,
          )
          .join("")
      : '<p class="footnote">Todavía no hay copias automáticas.</p>';
    target.querySelectorAll("[data-index]").forEach((button) =>
      button.addEventListener("click", () => {
        if (!busy)
          try {
            openRestore(
              migrateData(
                copies[Number((button as HTMLElement).dataset.index)].data,
              ),
              "Antes de restaurar una copia",
            );
          } catch (e) {
            announce((e as Error).message, true);
          }
      }),
    );
  } catch (e) {
    target.textContent = "No se pudieron leer las copias.";
    announce((e as Error).message, true);
  }
}
async function exportFile() {
  state = await repository.load();
  const blob = new Blob([exportBackup(space, state.data)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `field-${space}-${today()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  announce("Respaldo generado. Guardalo fuera del navegador.");
}
async function switchSpace() {
  const nextSpace = space === "personal" ? "demo" : "personal",
    nextRepository = createRepository(nextSpace),
    next = await nextRepository.load();
  undo = undefined;
  space = nextSpace;
  repository = nextRepository;
  state = next;
  try {
    sessionStorage.setItem("field-space", space);
  } catch {
    /*solo selección*/
  }
  notification.hidden = true;
  await render();
}
const editorKinds = [
  "fixed",
  "goal",
  "contribution",
  "balance-check",
  "forecast",
  "period",
  "movement",
  "ingredient",
  "recipe",
  "purchase",
  "preparation",
];
document.addEventListener("click", (event) => {
  const target = (event.target as Element).closest<HTMLElement>(
    "[data-action]",
  );
  if (!target) return;
  const kind = target.dataset.action!,
    id = target.dataset.id;
  if (kind === "close-editor") {
    if (!busy) editor.close();
    return;
  }
  if (kind === "add-line") {
    event.preventDefault();
    if (!busy) {
      editor
        .querySelector("#builder-lines")!
        .insertAdjacentHTML(
          "beforeend",
          lineRow(state.data, undefined, editing === "purchase"),
        );
      updateCostPreview();
    }
    return;
  }
  if (busy) return;
  if (editorKinds.includes(kind)) {
    openEditor(kind as EditorKind, id, target.dataset.recipe);
    return;
  }
  if (kind === "show-payment") {
    openEditor("movement", id);
    return;
  }
  if (kind === "undo") {
    void action(async () => {
      if (!undo || undo.space !== space || undo.revision !== state.revision)
        throw new Error("Este cambio ya no puede deshacerse.");
      state = await repository.save(undo.data, state.revision);
      undo = undefined;
      announce("Cambio deshecho.");
      await render();
    });
    return;
  }
  if (kind === "pay-fixed") {
    const fixed = state.data.finance.fixed.find((f) => f.id === id);
    if (
      fixed &&
      confirm(
        `¿Registrar el pago de ${fixed.name} por ${money(fixed.cents)} con fecha de hoy?`,
      )
    )
      void action(async () => {
        await commit(
          (d) => payFixed(d, id!, target.dataset.date!, today()),
          "Pago registrado una sola vez.",
          true,
        );
        await render();
      });
    return;
  }
  if (kind === "switch-space") {
    void action(switchSpace);
    return;
  }
  if (kind === "export") {
    void action(exportFile);
    return;
  }
  if (kind === "persist") {
    void action(async () => {
      const granted =
        typeof navigator.storage?.persist === "function" &&
        (await navigator.storage.persist());
      announce(
        granted
          ? "El navegador concedió almacenamiento persistente. Conservá tus respaldos."
          : "El navegador no concedió persistencia. Podés seguir usando Field y exportar respaldos.",
      );
    });
    return;
  }
  if (kind === "reset-demo") {
    if (
      space === "demo" &&
      confirm("¿Reemplazar solamente la demo con datos ficticios completos?")
    )
      void action(async () => {
        state = await repository.replace(
          createDemo(),
          state.revision,
          "Antes de recargar la demo",
        );
        announce("Demo ficticia cargada. Tus datos personales no cambiaron.");
        await render();
      });
    return;
  }
  if (kind === "consume") {
    void action(async () => {
      await commit((d) => {
        const prep = d.preparations.find((p) => p.id === id)!;
        if (prep.remaining < 1) throw new Error("No quedan porciones.");
        prep.remaining--;
      }, "Una porción consumida. No se agregó ningún gasto.");
      await render();
    });
    return;
  }
  if (kind === "switch-period") {
    void action(async () => {
      await commit((d) => {
        d.activePeriodId = id!;
      }, "Período seleccionado.");
      await render();
    });
    return;
  }
  if (kind.startsWith("delete-") && id) {
    if (
      confirm(
        "¿Eliminar este registro? Si es una compra, también se elimina su único movimiento financiero.",
      )
    )
      void action(async () => {
        await commit(
          (d) => deleteEntity(d, kind.slice(7), id),
          "Registro eliminado.",
          [
            "delete-movement",
            "delete-purchase",
            "delete-fixed",
            "delete-goal",
          ].includes(kind),
        );
        await render();
      });
  }
});
window.addEventListener("hashchange", () => {
  if (state)
    void render().then(() => {
      document.querySelector<HTMLElement>("#main")?.focus();
      window.scrollTo(0, 0);
    });
});
systemTheme.addEventListener("change", () => {
  if (state) applyTheme();
});
editor.addEventListener("cancel", (event) => {
  if (busy) event.preventDefault();
});
async function boot() {
  try {
    try {
      space =
        sessionStorage.getItem("field-space") === "demo" ? "demo" : "personal";
    } catch {
      /*predeterminado*/
    }
    repository = createRepository(space);
    state = await repository.load();
    await render();
  } catch (e) {
    app.innerHTML = `<main class="boot-error"><h1>No pudimos abrir tus datos</h1><p>${esc((e as Error).message)}</p><p>El estado anterior no se reemplazó. Cerrá otras pestañas y comprobá que el navegador permite almacenamiento.</p><button class="button primary" id="retry">Volver a intentar</button></main>`;
    document
      .querySelector("#retry")!
      .addEventListener("click", () => location.reload());
  }
}
document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    state &&
    !busy &&
    !editor.open &&
    route() !== "ajustes"
  )
    void render();
});
void boot();
