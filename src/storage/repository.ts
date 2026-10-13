import { createDemo } from "../demo/data";
import {
  createData,
  migrateData,
  validateData,
  type Data,
  type Document,
  type Snapshot,
  type Space,
} from "./model";

export interface Repository {
  load(): Promise<Document>;
  save(data: Data, revision: number): Promise<Document>;
  replace(data: Data, revision: number, reason: string): Promise<Document>;
  snapshots(): Promise<Snapshot[]>;
}

export class ConflictError extends Error {
  constructor() {
    super(
      "Tus datos cambiaron en otra pestaña. Recargá la página antes de guardar.",
    );
  }
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("No se pudo leer el almacenamiento."));
  });
}

export function databaseName(space: Space): string {
  return `field-${space}`;
}

async function open(space: Space): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    throw new Error("Este navegador no permite guardar datos con IndexedDB.");
  const req = indexedDB.open(databaseName(space), 1);
  req.onupgradeneeded = () => {
    req.result.createObjectStore("document");
    req.result.createObjectStore("snapshots", { keyPath: "id" });
  };
  return new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(
        new Error(
          "Otra pestaña bloquea el almacenamiento. Cerrala y volvé a intentar.",
        ),
      );
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
  });
}

async function transaction<T>(
  space: Space,
  mode: IDBTransactionMode,
  operation: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await open(space);
  const tx = db.transaction(["document", "snapshots"], mode);
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(
        tx.error ??
          new Error("No se pudo guardar. Tus datos anteriores se conservaron."),
      );
    tx.onerror = () => {
      /* onabort comunica el fallo final */
    };
  });
  // Un rechazo del caso de uso puede abortar antes de que se espere el evento.
  void done.catch(() => {});
  try {
    const result = await operation(tx);
    await done;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* ya finalizada */
    }
    await done.catch(() => {});
    throw error;
  } finally {
    db.close();
  }
}

async function addSnapshot(tx: IDBTransaction, data: unknown, reason: string) {
  const store = tx.objectStore("snapshots");
  const copies = (await request(store.getAll())) as Snapshot[];
  // Orden estable incluso cuando dos reemplazos ocurren en el mismo milisegundo.
  const newest = Math.max(
    0,
    ...copies.map((copy) => Date.parse(copy.createdAt)),
  );
  const now = new Date(Math.max(Date.now(), newest + 1)).toISOString();
  const copy: Snapshot = {
    id: crypto.randomUUID(),
    createdAt: now,
    reason,
    data: structuredClone(data),
  };
  store.put(copy);
  copies.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const old of copies.slice(4)) store.delete(old.id);
}

export function createRepository(space: Space): Repository {
  async function write(
    data: Data,
    revision: number,
    reason?: string,
  ): Promise<Document> {
    const validated = validateData(data);
    return transaction(space, "readwrite", async (tx) => {
      const store = tx.objectStore("document");
      const current = (await request(store.get("main"))) as
        | Document
        | undefined;
      if (!current || current.revision !== revision) throw new ConflictError();
      if (reason) await addSnapshot(tx, current.data, reason);
      const next: Document = {
        revision: revision + 1,
        data: { ...validated, updatedAt: new Date().toISOString() },
      };
      store.put(next, "main");
      return next;
    });
  }

  return {
    load: () =>
      transaction(space, "readwrite", async (tx) => {
        const store = tx.objectStore("document");
        const current = (await request(store.get("main"))) as
          | Document
          | undefined;
        if (!current) {
          const first = {
            revision: 0,
            data: space === "demo" ? createDemo() : createData(),
          };
          store.put(first, "main");
          return first;
        }
        if (!Number.isSafeInteger(current.revision) || current.revision < 0)
          throw new Error(
            "No se pudo validar el documento guardado. No se modificó.",
          );
        const migrated = migrateData(current.data);
        if ((current.data as Data).schemaVersion !== migrated.schemaVersion) {
          await addSnapshot(tx, current.data, "Antes de actualizar el formato");
          const next = { revision: current.revision + 1, data: migrated };
          store.put(next, "main");
          return next;
        }
        return { ...current, data: migrated };
      }),
    save: (data, revision) => write(data, revision),
    replace: (data, revision, reason) => write(data, revision, reason),
    snapshots: () =>
      transaction(space, "readonly", async (tx) => {
        const copies = (await request(
          tx.objectStore("snapshots").getAll(),
        )) as Snapshot[];
        return copies.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }),
  };
}
