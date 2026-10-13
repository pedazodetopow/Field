import { recipeCost } from "../modules/food/logic";
import { civilDate, daysBetween, units, type Unit } from "../shared/values";
export type Space = "personal" | "demo";
export type Theme = "system" | "light" | "dark";
export interface Period {
  id: string;
  start: string;
  payday: string;
  initialCents: number;
  savingsCents: number;
}
export interface Movement {
  id: string;
  periodId: string;
  type: "income" | "expense";
  date: string;
  cents: number;
  category: string;
  description: string;
  purchaseId: string | null;
}
export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  priceCents: number;
}
export interface RecipeLine {
  ingredientId: string;
  quantity: number;
  unit: Unit;
}
export interface Recipe {
  id: string;
  name: string;
  portions: number;
  lines: RecipeLine[];
}
export interface PurchaseLine extends RecipeLine {
  totalCents: number;
}
export interface Purchase {
  id: string;
  movementId: string;
  lines: PurchaseLine[];
}
export interface Preparation {
  id: string;
  recipeId: string | null;
  recipeName: string;
  date: string;
  portions: number;
  remaining: number;
  costPerPortionCents: number;
}
export interface Data {
  schemaVersion: 2;
  id: string;
  createdAt: string;
  updatedAt: string;
  profile: { displayName: string };
  settings: { theme: Theme; currency: "UYU"; timeZone: "America/Montevideo" };
  periods: Period[];
  activePeriodId: string | null;
  movements: Movement[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  purchases: Purchase[];
  preparations: Preparation[];
}
export interface Document {
  revision: number;
  data: Data;
}
export interface Snapshot {
  id: string;
  createdAt: string;
  reason: string;
  data: unknown;
}
export interface Backup {
  app: "field";
  formatVersion: 1;
  space: Space;
  exportedAt: string;
  data: Data;
}
export function createData(displayName = ""): Data {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    profile: { displayName },
    settings: {
      theme: "system",
      currency: "UYU",
      timeZone: "America/Montevideo",
    },
    periods: [],
    activePeriodId: null,
    movements: [],
    ingredients: [],
    recipes: [],
    purchases: [],
    preparations: [],
  };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("El archivo no tiene una estructura válida.");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, names: string[]) {
  if (
    Object.keys(value).length !== names.length ||
    names.some((k) => !(k in value))
  )
    throw new Error(
      "El archivo tiene campos incompatibles o incompletos. No se reemplazaron tus datos.",
    );
}
function timestamp(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error("Fecha inválida.");
}
function text(value: unknown, max = 120) {
  if (typeof value !== "string" || value.length > max)
    throw new Error(`El texto debe tener hasta ${max} caracteres.`);
}
function id(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value))
    throw new Error("Identificador inválido.");
}
function cents(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 1_000_000_000_000
  )
    throw new Error("Monto inválido.");
}
function quantity(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 1_000_000
  )
    throw new Error("La cantidad debe ser mayor que cero y hasta un millón.");
}
function portion(value: unknown) {
  quantity(value);
  if (!Number.isInteger(value))
    throw new Error("Las porciones deben ser enteras.");
}
function list(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > 20000)
    throw new Error("Lista de datos inválida o demasiado grande.");
  return value.map(object);
}
function collection(
  value: unknown,
  names: string[],
  check: (o: Record<string, unknown>) => void,
) {
  const rows = list(value);
  const ids = new Set();
  for (const row of rows) {
    keys(row, names);
    id(row.id);
    if (ids.has(row.id)) throw new Error("Hay identificadores duplicados.");
    ids.add(row.id);
    check(row);
  }
  return rows;
}
function named(o: Record<string, unknown>) {
  text(o.name);
  if (!(o.name as string).trim()) throw new Error("Ingresá un nombre.");
}
function line(o: Record<string, unknown>) {
  id(o.ingredientId);
  quantity(o.quantity);
  if (!units.includes(o.unit as Unit)) throw new Error("Unidad inválida.");
}
function dimension(unit: unknown) {
  return ["g", "kg"].includes(String(unit))
    ? "mass"
    : ["ml", "l"].includes(String(unit))
      ? "volume"
      : "unit";
}
function validateProfile(data: Record<string, unknown>) {
  id(data.id);
  timestamp(data.createdAt);
  timestamp(data.updatedAt);
  const profile = object(data.profile);
  keys(profile, ["displayName"]);
  text(profile.displayName, 60);
  const settings = object(data.settings);
  keys(settings, ["theme", "currency", "timeZone"]);
  if (
    typeof settings.theme !== "string" ||
    !["system", "light", "dark"].includes(settings.theme) ||
    settings.currency !== "UYU" ||
    settings.timeZone !== "America/Montevideo"
  )
    throw new Error("La configuración del archivo no es compatible.");
}
export function validateData(value: unknown): Data {
  const data = object(value);
  if (typeof data.schemaVersion === "number" && data.schemaVersion > 2)
    throw new Error("Este respaldo necesita una versión más nueva de Field.");
  keys(data, [
    "schemaVersion",
    "id",
    "createdAt",
    "updatedAt",
    "profile",
    "settings",
    "periods",
    "activePeriodId",
    "movements",
    "ingredients",
    "recipes",
    "purchases",
    "preparations",
  ]);
  if (data.schemaVersion !== 2) throw new Error("La versión no es válida.");
  validateProfile(data);
  const periods = collection(
    data.periods,
    ["id", "start", "payday", "initialCents", "savingsCents"],
    (o) => {
      if (
        !civilDate(o.start) ||
        !civilDate(o.payday) ||
        daysBetween(o.start, o.payday) <= 0 ||
        daysBetween(o.start, o.payday) > 1096
      )
        throw new Error(
          "El período debe terminar después del inicio y durar hasta tres años.",
        );
      cents(o.initialCents);
      cents(o.savingsCents);
    },
  );
  if (
    data.activePeriodId !== null &&
    !periods.some((p) => p.id === data.activePeriodId)
  )
    throw new Error("El período activo no existe.");
  const movements = collection(
    data.movements,
    [
      "id",
      "periodId",
      "type",
      "date",
      "cents",
      "category",
      "description",
      "purchaseId",
    ],
    (o) => {
      const period = periods.find((p) => p.id === o.periodId);
      if (
        !period ||
        !civilDate(o.date) ||
        o.date < (period.start as string) ||
        o.date >= (period.payday as string)
      )
        throw new Error(
          "La fecha del movimiento debe estar dentro de su período, antes del cobro.",
        );
      if (
        !["income", "expense"].includes(String(o.type)) ||
        typeof o.type !== "string"
      )
        throw new Error("Tipo de movimiento inválido.");
      cents(o.cents);
      if (o.cents === 0)
        throw new Error("El movimiento debe ser mayor que cero.");
      text(o.category, 60);
      text(o.description, 180);
      if (o.purchaseId !== null) id(o.purchaseId);
    },
  );
  // Mantener todas las sumas por debajo del límite de enteros exactos.
  if (
    movements.reduce((sum, m) => sum + (m.cents as number), 0) >
    Number.MAX_SAFE_INTEGER - 1_000_000_000_000
  )
    throw new Error("El total de movimientos supera el límite seguro.");
  const ingredients = collection(
    data.ingredients,
    ["id", "name", "quantity", "unit", "priceCents"],
    (o) => {
      named(o);
      quantity(o.quantity);
      if (!units.includes(o.unit as Unit)) throw new Error("Unidad inválida.");
      cents(o.priceCents);
    },
  );
  const checkLines = (value: unknown, purchase: boolean) => {
    const rows = list(value);
    if (!rows.length || rows.length > 100)
      throw new Error("Agregá de 1 a 100 ingredientes.");
    const refs = new Set();
    for (const row of rows) {
      keys(
        row,
        purchase
          ? ["ingredientId", "quantity", "unit", "totalCents"]
          : ["ingredientId", "quantity", "unit"],
      );
      line(row);
      if (refs.has(row.ingredientId))
        throw new Error("Usá una sola línea por ingrediente.");
      refs.add(row.ingredientId);
      const ingredient = ingredients.find((i) => i.id === row.ingredientId);
      if (!ingredient || dimension(row.unit) !== dimension(ingredient.unit))
        throw new Error(
          "El ingrediente no existe o sus unidades no son compatibles.",
        );
      if (purchase) cents(row.totalCents);
    }
    return rows;
  };
  const recipes = collection(
    data.recipes,
    ["id", "name", "portions", "lines"],
    (o) => {
      named(o);
      portion(o.portions);
      checkLines(o.lines, false);
    },
  );
  for (const recipe of recipes)
    recipeCost(
      recipe as unknown as Recipe,
      ingredients as unknown as Ingredient[],
    );
  const purchases = collection(
    data.purchases,
    ["id", "movementId", "lines"],
    (o) => {
      const rows = checkLines(o.lines, true);
      const linked = movements.filter((m) => m.purchaseId === o.id);
      const movement = movements.find((m) => m.id === o.movementId);
      if (
        linked.length !== 1 ||
        !movement ||
        linked[0].id !== movement.id ||
        movement.type !== "expense" ||
        movement.category !== "Alimentación" ||
        movement.cents !==
          rows.reduce((sum, l) => sum + (l.totalCents as number), 0)
      )
        throw new Error(
          "La compra debe tener un único gasto financiero, con el mismo total.",
        );
    },
  );
  if (
    movements.some(
      (m) =>
        m.purchaseId !== null && !purchases.some((p) => p.id === m.purchaseId),
    )
  )
    throw new Error("El movimiento está vinculado a una compra inexistente.");
  collection(
    data.preparations,
    [
      "id",
      "recipeId",
      "recipeName",
      "date",
      "portions",
      "remaining",
      "costPerPortionCents",
    ],
    (o) => {
      if (o.recipeId !== null && !recipes.some((r) => r.id === o.recipeId))
        throw new Error("La receta de la preparación no existe.");
      text(o.recipeName);
      if (!civilDate(o.date)) throw new Error("Fecha de preparación inválida.");
      portion(o.portions);
      cents(o.remaining);
      if ((o.remaining as number) > (o.portions as number))
        throw new Error(
          "Las porciones disponibles no pueden superar las preparadas.",
        );
      cents(o.costPerPortionCents);
    },
  );
  return structuredClone(data) as unknown as Data;
}
export function migrateData(value: unknown): Data {
  const data = object(value);
  if (data.schemaVersion === 0) {
    keys(data, [
      "schemaVersion",
      "id",
      "createdAt",
      "updatedAt",
      "displayName",
      "theme",
    ]);
    return migrateData({
      schemaVersion: 1,
      id: data.id,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      profile: { displayName: data.displayName },
      settings: {
        theme: data.theme,
        currency: "UYU",
        timeZone: "America/Montevideo",
      },
    });
  }
  if (data.schemaVersion !== 1) return validateData(data);
  keys(data, [
    "schemaVersion",
    "id",
    "createdAt",
    "updatedAt",
    "profile",
    "settings",
  ]);
  validateProfile(data);
  return validateData({
    ...data,
    schemaVersion: 2,
    periods: [],
    activePeriodId: null,
    movements: [],
    ingredients: [],
    recipes: [],
    purchases: [],
    preparations: [],
  });
}
export function exportBackup(space: Space, data: Data): string {
  return JSON.stringify(
    {
      app: "field",
      formatVersion: 1,
      space,
      exportedAt: new Date().toISOString(),
      data: validateData(data),
    } satisfies Backup,
    null,
    2,
  );
}
export function parseBackup(text: string, space: Space): Data {
  if (new TextEncoder().encode(text).length > 2_000_000)
    throw new Error("El respaldo supera el límite de 2 MB de esta versión.");
  let backup: Record<string, unknown>;
  try {
    backup = object(JSON.parse(text.replace(/^\uFEFF/, "")));
  } catch {
    throw new Error("Elegí un respaldo JSON válido de Field.");
  }
  keys(backup, ["app", "formatVersion", "space", "exportedAt", "data"]);
  if (backup.app !== "field" || backup.formatVersion !== 1)
    throw new Error("El formato del respaldo no es compatible con Field.");
  if (backup.space !== space)
    throw new Error(
      "Este respaldo pertenece a otro espacio. Cambiá al espacio correspondiente antes de importarlo.",
    );
  timestamp(backup.exportedAt);
  return migrateData(backup.data);
}
