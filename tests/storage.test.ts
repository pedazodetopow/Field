import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createData,
  exportBackup,
  migrateData,
  parseBackup,
  validateData,
} from "../src/storage/model";
import {
  ConflictError,
  createRepository,
  databaseName,
} from "../src/storage/repository";

beforeEach(async () => {
  for (const space of ["personal", "demo"] as const) {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(databaseName(space));
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
});

describe("respaldo y validación", () => {
  it("exporta y restaura todos los datos del espacio", () => {
    const data = createData("Persona ficticia");
    data.settings.theme = "dark";
    expect(parseBackup(exportBackup("personal", data), "personal")).toEqual(
      data,
    );
  });
  it("rechaza demo en personal y personal en demo", () => {
    expect(() =>
      parseBackup(exportBackup("demo", createData()), "personal"),
    ).toThrow("otro espacio");
    expect(() =>
      parseBackup(exportBackup("personal", createData()), "demo"),
    ).toThrow("otro espacio");
  });
  it.each(["{", "[]", "null", '{"app":"otra"}'])(
    "rechaza archivo inválido %s",
    (text) => {
      expect(() => parseBackup(text, "personal")).toThrow();
    },
  );
  it("rechaza un esquema futuro en lugar de descartarle campos", () => {
    expect(() => validateData({ ...createData(), schemaVersion: 2 })).toThrow(
      "más nueva",
    );
  });
  it("rechaza campos desconocidos y valores incompletos", () => {
    expect(() => validateData({ ...createData(), expenses: [] })).toThrow(
      "campos",
    );
    expect(() =>
      validateData({ ...createData(), settings: { theme: "dark" } }),
    ).toThrow();
  });
  it("rechaza nombre largo y tema no soportado", () => {
    expect(() => validateData(createData("x".repeat(61)))).toThrow("60");
    const data = createData();
    expect(() =>
      validateData({
        ...data,
        settings: { ...data.settings, theme: "desconocido" },
      }),
    ).toThrow();
    expect(() =>
      validateData({
        ...data,
        settings: { ...data.settings, theme: ["dark"] },
      }),
    ).toThrow();
  });
  it("rechaza archivos demasiado grandes", () => {
    expect(() => parseBackup(" ".repeat(2_000_001), "personal")).toThrow(
      "2 MB",
    );
  });
  it("migra el formato anterior sin alterar sus datos fuente", () => {
    const base = createData("Ejemplo");
    const old = {
      schemaVersion: 0,
      id: base.id,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      displayName: "Ejemplo",
      theme: "dark",
    };
    const migrated = migrateData(old);
    expect(migrated.profile.displayName).toBe("Ejemplo");
    expect(migrated.settings.theme).toBe("dark");
    expect(migrated.id).toBe(old.id);
    expect(old.schemaVersion).toBe(0);
  });
});

describe("repositorio IndexedDB", () => {
  it("crea un espacio personal vacío y guarda tras abrir una nueva instancia", async () => {
    const repo = createRepository("personal");
    const doc = await repo.load();
    expect(doc.data.profile.displayName).toBe("");
    doc.data.profile.displayName = "Nombre ficticio";
    doc.data.settings.theme = "light";
    await repo.save(doc.data, doc.revision);
    const reopened = await createRepository("personal").load();
    expect(reopened.data.profile.displayName).toBe("Nombre ficticio");
    expect(reopened.data.settings.theme).toBe("light");
    expect(reopened.revision).toBe(1);
  });
  it("usa dos bases y no altera personal al editar demo", async () => {
    const personal = createRepository("personal");
    const real = await personal.load();
    const demo = createRepository("demo");
    const example = await demo.load();
    expect(example.data.profile.displayName).toContain("ejemplo");
    example.data.profile.displayName = "Otro ejemplo";
    await demo.save(example.data, example.revision);
    expect(await personal.load()).toEqual(real);
    expect(databaseName("personal")).not.toBe(databaseName("demo"));
  });
  it("crea una copia al reemplazar y permite recuperar los datos anteriores", async () => {
    const repo = createRepository("personal");
    const first = await repo.load();
    const replacement = createData("Importado ficticio");
    const after = await repo.replace(
      replacement,
      first.revision,
      "Antes de importar",
    );
    const copies = await repo.snapshots();
    expect(copies).toHaveLength(1);
    expect(copies[0].data).toEqual(first.data);
    await repo.replace(
      migrateData(copies[0].data),
      after.revision,
      "Antes de restaurar",
    );
    expect((await repo.load()).data.profile).toEqual(first.data.profile);
    expect(await repo.snapshots()).toHaveLength(2);
  });
  it("retiene exactamente las cinco copias más recientes", async () => {
    const repo = createRepository("personal");
    let doc = await repo.load();
    const clock = vi.spyOn(Date, "now");
    try {
      for (let index = 0; index < 7; index++) {
        clock.mockReturnValue(Date.parse("2026-10-13T12:00:00.000Z"));
        doc = await repo.replace(
          { ...doc.data, profile: { displayName: `Ejemplo ${index}` } },
          doc.revision,
          `Copia ${index}`,
        );
      }
      const copies = await repo.snapshots();
      expect(copies.map((copy) => copy.reason)).toEqual([
        "Copia 6",
        "Copia 5",
        "Copia 4",
        "Copia 3",
        "Copia 2",
      ]);
    } finally {
      clock.mockRestore();
    }
  });
  it("rechaza una escritura desactualizada sin borrar ni guardar copia", async () => {
    const repo = createRepository("personal");
    const first = await repo.load();
    await repo.save(createData("Primera pestaña"), first.revision);
    await expect(
      repo.replace(
        createData("Segunda pestaña"),
        first.revision,
        "No debe guardarse",
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    expect((await repo.load()).data.profile.displayName).toBe(
      "Primera pestaña",
    );
    expect(await repo.snapshots()).toHaveLength(0);
  });
  it("serializa escrituras simultáneas y detecta la revisión en conflicto", async () => {
    const repo = createRepository("personal");
    const first = await repo.load();
    const results = await Promise.allSettled([
      repo.save(createData("Uno"), first.revision),
      repo.save(createData("Dos"), first.revision),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect((await repo.load()).revision).toBe(1);
  });
  it("no altera datos al intentar reemplazar con datos inválidos", async () => {
    const repo = createRepository("personal");
    const first = await repo.load();
    await expect(
      repo.replace(
        { ...first.data, schemaVersion: 5 } as never,
        first.revision,
        "Inválido",
      ),
    ).rejects.toThrow();
    expect(await repo.load()).toEqual(first);
    expect(await repo.snapshots()).toHaveLength(0);
  });
  it("un fallo de escritura aborta también la copia previa", async () => {
    const repo = createRepository("personal");
    const first = await repo.load();
    const original = IDBObjectStore.prototype.put;
    const fail = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (
        this: IDBObjectStore,
        ...args: Parameters<typeof original>
      ) {
        if (this.name === "document")
          throw new DOMException("Sin espacio", "QuotaExceededError");
        return original.apply(this, args);
      });
    try {
      await expect(
        repo.replace(createData("Nuevo"), first.revision, "Fallida"),
      ).rejects.toThrow("Sin espacio");
    } finally {
      fail.mockRestore();
    }
    expect(await repo.load()).toEqual(first);
    expect(await repo.snapshots()).toHaveLength(0);
  });
  it("respalda antes de migrar un documento persistido", async () => {
    const repo = createRepository("personal");
    const first = await repo.load();
    const old = {
      schemaVersion: 0,
      id: first.data.id,
      createdAt: first.data.createdAt,
      updatedAt: first.data.updatedAt,
      displayName: "Anterior ficticio",
      theme: "dark",
    };
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open(databaseName("personal"), 1);
      req.onsuccess = () => resolve(req.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("document", "readwrite");
      tx.objectStore("document").put({ revision: 3, data: old }, "main");
      tx.oncomplete = () => resolve();
    });
    db.close();
    const migrated = await repo.load();
    expect(migrated.data.profile.displayName).toBe("Anterior ficticio");
    expect(migrated.revision).toBe(4);
    expect((await repo.snapshots())[0].data).toEqual(old);
  });
});
