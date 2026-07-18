import type { InpaintFocusRect } from "@/components/aiImage/types";

import { loadChatHistoryDb } from "@/components/chat/infra/localDb/chatHistoryDbLoader";

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
  cfgDelay?: boolean;
  dynamicThresholding?: boolean;
  smea?: boolean;
  smeaDyn?: boolean;
  strength?: number;
  noise?: number;
  inpaintFocusedArea?: InpaintFocusRect | null;
  overlayOriginalImage?: boolean;

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

const COLLECTION = "ai-image-history";

export async function addAiImageHistoryBatch(rows: Array<Omit<AiImageHistoryRow, "id">>, options?: { maxItems?: number }) {
  if (!rows.length)
    return;

  const db = await loadChatHistoryDb();
  await Promise.all(rows.map(row => db.addLocalCollectionItem(COLLECTION, row, { sortAt: row.createdAt })));

  const maxItems = options?.maxItems ?? 30;
  if (!Number.isFinite(maxItems) || maxItems <= 0)
    return;

  await db.trimLocalCollection(COLLECTION, maxItems);
}

export async function listAiImageHistory(params?: { limit?: number }): Promise<AiImageHistoryRow[]> {
  const db = await loadChatHistoryDb();
  const rows = await db.listLocalCollectionItems<Omit<AiImageHistoryRow, "id">>(COLLECTION, params);
  return rows.map(row => ({
    ...row.payload,
    id: row.id,
  }));
}

export async function deleteAiImageHistory(id: number) {
  const db = await loadChatHistoryDb();
  await db.removeLocalCollectionItem(COLLECTION, id);
}

export async function clearAiImageHistory() {
  const db = await loadChatHistoryDb();
  await db.clearLocalCollection(COLLECTION);
}
