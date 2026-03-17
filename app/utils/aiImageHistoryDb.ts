import { openDB } from "idb";

export type AiImageHistoryMode = "txt2img" | "img2img" | "infill";

export type AiImageHistoryV4Char = {
  prompt: string;
  negativePrompt: string;
  centerX: number;
  centerY: number;
};

export type AiImageHistoryReference = {
  name: string;
  dataUrl: string;
  strength: number;
  informationExtracted: number;
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

  imageCount?: number;
  steps?: number;
  scale?: number;
  sampler?: string;
  noiseSchedule?: string;
  cfgRescale?: number;
  ucPreset?: number;
  qualityToggle?: boolean;
  dynamicThresholding?: boolean;
  smea?: boolean;
  smeaDyn?: boolean;
  strength?: number;
  noise?: number;

  v4Chars?: AiImageHistoryV4Char[];
  v4UseCoords?: boolean;
  v4UseOrder?: boolean;
  referenceImages?: AiImageHistoryReference[];
  preciseReference?: AiImageHistoryReference | null;

  dataUrl: string;
  toolLabel?: string;
  sourceDataUrl?: string;
  batchId?: string;
  batchIndex?: number;
  batchSize?: number;
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
  return addAiImageHistoryBatch([row], options);
}

export async function addAiImageHistoryBatch(rows: Array<Omit<AiImageHistoryRow, "id">>, options?: { maxItems?: number }) {
  if (!rows.length)
    return;

  const db = await getDb();
  const tx = db.transaction(STORE, "readwrite");
  await Promise.all(rows.map(row => tx.store.add(row)));
  await tx.done;

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
