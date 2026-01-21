import { openDB } from "idb";

export type AiImageHistoryMode = "txt2img" | "img2img";

export type AiImageHistoryV4Char = {
  prompt: string;
  negativePrompt: string;
  centerX: number;
  centerY: number;
};

export type AiImageHistoryRow = {
  id?: number;
  createdAt: number;

  mode: AiImageHistoryMode;
  model: string;
  seed: number;
  width: number;
  height: number;

  prompt: string;
  negativePrompt: string;

  v4Chars?: AiImageHistoryV4Char[];
  v4UseCoords?: boolean;
  v4UseOrder?: boolean;

  dataUrl: string;
  sourceDataUrl?: string;
};

const DB_NAME = "aiImageHistoryDB";
const DB_VERSION = 1;
const STORE = "images";

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("byCreatedAt", "createdAt");
      }
    },
  });
}

export async function addAiImageHistory(row: Omit<AiImageHistoryRow, "id">, options?: { maxItems?: number }) {
  const db = await getDb();
  await db.add(STORE, row);

  const maxItems = options?.maxItems ?? 30;
  if (!Number.isFinite(maxItems) || maxItems <= 0)
    return;

  const all = await listAiImageHistory({ limit: maxItems + 50 });
  if (all.length <= maxItems)
    return;

  const toDelete = all.slice(maxItems);
  await Promise.all(
    toDelete
      .filter(item => typeof item.id === "number")
      .map(item => db.delete(STORE, item.id as number)),
  );
}

export async function listAiImageHistory(params?: { limit?: number }): Promise<AiImageHistoryRow[]> {
  const db = await getDb();
  const tx = db.transaction(STORE, "readonly");
  const rows = (await tx.store.getAll()) as AiImageHistoryRow[];
  rows.sort((a, b) => b.createdAt - a.createdAt);
  const limit = params?.limit;
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

export async function deleteAiImageHistory(id: number) {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function clearAiImageHistory() {
  const db = await getDb();
  await db.clear(STORE);
}
