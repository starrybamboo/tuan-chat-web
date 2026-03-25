import { openDB } from "idb";

const DB_NAME = "blocksuiteDescriptionDB";
const DB_VERSION = 1;

const UPDATES_STORE = "updates";
const DOC_ID_INDEX = "doc_id_idx";

export type StoredUpdate = {
  id?: number;
  docId: string;
  data: Uint8Array;
  createdAt: number;
};

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(UPDATES_STORE)) {
        const store = db.createObjectStore(UPDATES_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex(DOC_ID_INDEX, "docId", { unique: false });
      }
    },
  });
}

export async function addUpdate(docId: string, data: Uint8Array): Promise<void> {
  const db = await getDb();
  await db.add(UPDATES_STORE, {
    docId,
    data,
    createdAt: Date.now(),
  } satisfies StoredUpdate);
}

export async function listUpdates(docId: string): Promise<Uint8Array[]> {
  const db = await getDb();
  const tx = db.transaction(UPDATES_STORE, "readonly");
  const index = tx.store.index(DOC_ID_INDEX);
  const records = (await index.getAll(docId)) as StoredUpdate[];
  await tx.done;
  return records.map(r => r.data);
}

export async function clearUpdates(docId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(UPDATES_STORE, "readwrite");
  const index = tx.store.index(DOC_ID_INDEX);

  // Delete all records under this docId.
  // Use cursor to avoid loading full objects (and to access primary keys).
  let cursor = await index.openCursor(docId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}
