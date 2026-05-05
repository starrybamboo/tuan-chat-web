import type { GeneratedImageItem } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

import { extensionFromDataUrl } from "@/components/aiImage/utils/imageData";

export function historyRowKey(row: Pick<AiImageHistoryRow, "id" | "createdAt" | "seed" | "batchIndex">) {
  if (typeof row.id === "number")
    return `id:${row.id}`;
  return `temp:${row.createdAt}-${row.seed}-${row.batchIndex ?? 0}`;
}

export function historyRowToGeneratedItem(row: AiImageHistoryRow): GeneratedImageItem {
  return {
    dataUrl: row.dataUrl,
    seed: row.seed,
    width: row.width,
    height: row.height,
    model: row.model,
    batchId: String(row.batchId || "").trim(),
    batchIndex: row.batchIndex ?? 0,
    batchSize: row.batchSize ?? 1,
    toolLabel: row.toolLabel,
  };
}

export function buildDirectorToolHistoryRow(args: {
  output: GeneratedImageItem;
  source: GeneratedImageItem;
  toolLabel: string;
  sourceHistoryRow?: AiImageHistoryRow | null;
  createdAt?: number;
}): Omit<AiImageHistoryRow, "id"> {
  const sourceHistoryRow = args.sourceHistoryRow ?? null;
  return {
    createdAt: args.createdAt ?? Date.now(),
    mode: sourceHistoryRow?.mode ?? "img2img",
    model: args.output.model,
    seed: args.output.seed,
    width: args.output.width,
    height: args.output.height,
    prompt: sourceHistoryRow?.prompt ?? "",
    negativePrompt: sourceHistoryRow?.negativePrompt ?? "",
    imageCount: args.output.batchSize ?? 1,
    steps: sourceHistoryRow?.steps,
    scale: sourceHistoryRow?.scale,
    sampler: sourceHistoryRow?.sampler,
    noiseSchedule: sourceHistoryRow?.noiseSchedule,
    cfgRescale: sourceHistoryRow?.cfgRescale,
    ucPreset: sourceHistoryRow?.ucPreset,
    qualityToggle: sourceHistoryRow?.qualityToggle,
    dynamicThresholding: sourceHistoryRow?.dynamicThresholding,
    smea: sourceHistoryRow?.smea,
    smeaDyn: sourceHistoryRow?.smeaDyn,
    strength: sourceHistoryRow?.strength,
    noise: sourceHistoryRow?.noise,
    v4Chars: sourceHistoryRow?.v4Chars?.map(item => ({ ...item })),
    v4UseCoords: sourceHistoryRow?.v4UseCoords,
    v4UseOrder: sourceHistoryRow?.v4UseOrder,
    referenceImages: sourceHistoryRow?.referenceImages?.map(item => ({ ...item })),
    preciseReference: sourceHistoryRow?.preciseReference
      ? { ...sourceHistoryRow.preciseReference }
      : null,
    dataUrl: args.output.dataUrl,
    toolLabel: args.toolLabel,
    sourceDataUrl: args.source.dataUrl,
    batchId: args.output.batchId,
    batchIndex: args.output.batchIndex,
    batchSize: args.output.batchSize,
  };
}

export function generatedItemKey(item: Pick<GeneratedImageItem, "batchId" | "batchIndex" | "dataUrl">) {
  const batchId = String(item.batchId || "").trim();
  return `batch:${batchId}:${item.batchIndex}`;
}

export function historyRowResultMatchKey(row: Pick<AiImageHistoryRow, "batchId" | "batchIndex" | "dataUrl">) {
  const batchId = String(row.batchId || "").trim();
  return `batch:${batchId}:${row.batchIndex ?? 0}`;
}

export function historyImageDragFileName(dataUrl: string, seed: number, batchIndex?: number) {
  return `nai_${seed}_${(batchIndex ?? 0) + 1}.${extensionFromDataUrl(dataUrl)}`;
}
