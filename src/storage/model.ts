export type Space = "personal" | "demo";
export type Theme = "system" | "light" | "dark";

export interface Data {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  profile: { displayName: string };
  settings: { theme: Theme; currency: "UYU"; timeZone: "America/Montevideo" };
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
    schemaVersion: 1,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    profile: { displayName },
    settings: {
      theme: "system",
      currency: "UYU",
      timeZone: "America/Montevideo",
    },
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("El archivo no tiene una estructura válida.");
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !(key in value))
  ) {
    throw new Error(
      "El archivo tiene campos incompatibles o incompletos. No se reemplazaron tus datos.",
    );
  }
}

function date(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error("El archivo contiene una fecha inválida.");
  }
}

export function validateData(value: unknown): Data {
  const data = object(value);
  if (typeof data.schemaVersion === "number" && data.schemaVersion > 1) {
    throw new Error("Este respaldo necesita una versión más nueva de Field.");
  }
  exactKeys(data, [
    "schemaVersion",
    "id",
    "createdAt",
    "updatedAt",
    "profile",
    "settings",
  ]);
  if (
    data.schemaVersion !== 1 ||
    typeof data.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(data.id)
  )
    throw new Error("La versión o el identificador no es válido.");
  date(data.createdAt);
  date(data.updatedAt);
  const profile = object(data.profile);
  exactKeys(profile, ["displayName"]);
  if (
    typeof profile.displayName !== "string" ||
    profile.displayName.length > 60
  )
    throw new Error("El nombre debe tener hasta 60 caracteres.");
  const settings = object(data.settings);
  exactKeys(settings, ["theme", "currency", "timeZone"]);
  if (
    typeof settings.theme !== "string" ||
    !["system", "light", "dark"].includes(settings.theme) ||
    settings.currency !== "UYU" ||
    settings.timeZone !== "America/Montevideo"
  ) {
    throw new Error("La configuración del archivo no es compatible.");
  }
  return structuredClone(data) as unknown as Data;
}

// Formato previo de desarrollo: solo se acepta esta forma conocida, nunca datos arbitrarios.
export function migrateData(value: unknown): Data {
  const data = object(value);
  if (data.schemaVersion !== 0) return validateData(data);
  exactKeys(data, [
    "schemaVersion",
    "id",
    "createdAt",
    "updatedAt",
    "displayName",
    "theme",
  ]);
  return validateData({
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

export function exportBackup(space: Space, data: Data): string {
  const backup: Backup = {
    app: "field",
    formatVersion: 1,
    space,
    exportedAt: new Date().toISOString(),
    data: validateData(data),
  };
  return JSON.stringify(backup, null, 2);
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
  exactKeys(backup, ["app", "formatVersion", "space", "exportedAt", "data"]);
  if (backup.app !== "field" || backup.formatVersion !== 1)
    throw new Error("El formato del respaldo no es compatible con Field.");
  if (backup.space !== space)
    throw new Error(
      "Este respaldo pertenece a otro espacio. Cambiá al espacio correspondiente antes de importarlo.",
    );
  date(backup.exportedAt);
  return migrateData(backup.data);
}
