import type {
  GeneratedImageItem,
  InternalHistoryImageDragPayload,
} from "@/components/aiImage/types";

import { DEFAULT_PRO_IMAGE_SETTINGS } from "@/components/aiImage/constants";
import {
  base64DataUrl,
  buildDirectorToolHistoryRow,
  dataUrlToBase64,
  generatedItemKey,
  makeStableId,
  mimeFromFilename,
  readFileAsBytes,
} from "@/components/aiImage/helpers";

export async function buildDirectorSourceItemAction(args: {
  dataUrl: string;
  name?: string;
  model: string;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
}) {
  let imageSize: { width: number; height: number } = {
    width: DEFAULT_PRO_IMAGE_SETTINGS.width,
    height: DEFAULT_PRO_IMAGE_SETTINGS.height,
  };
  try {
    const resolvedSize = await args.readImageSize(args.dataUrl);
    imageSize = resolvedSize;
  }
  catch {
    // keep fallback size
  }

  return {
    dataUrl: args.dataUrl,
    seed: -1,
    width: imageSize.width,
    height: imageSize.height,
    model: args.model,
    batchId: makeStableId(),
    batchIndex: 0,
    batchSize: 1,
    toolLabel: args.name,
  } satisfies GeneratedImageItem;
}

export async function pickDirectorSourceImagesAction(args: {
  files: FileList | File[];
  showErrorToast: (message: string) => void;
  model: string;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  setDirectorSourceItems: (updater: (prev: GeneratedImageItem[]) => GeneratedImageItem[]) => void;
  setDirectorSourcePreview: (value: GeneratedImageItem | null) => void;
  setDirectorOutputPreview: (value: GeneratedImageItem | null) => void;
}) {
  const fileList = Array.from(args.files).filter(file => file.type.startsWith("image/") || file.name);
  if (!fileList.length) {
    args.showErrorToast("璇峰厛瀵煎叆鍥剧墖鏂囦欢銆?");
    return;
  }

  const importedItems: GeneratedImageItem[] = [];
  for (const file of fileList) {
    const bytes = await readFileAsBytes(file);
    const mime = file.type || mimeFromFilename(file.name);
    const dataUrl = base64DataUrl(mime, bytes);
    importedItems.push(await buildDirectorSourceItemAction({
      dataUrl,
      name: file.name,
      model: args.model,
      readImageSize: args.readImageSize,
    }));
  }

  if (!importedItems.length)
    return;

  args.setDirectorSourceItems(prev => [...importedItems, ...prev]);
  args.setDirectorSourcePreview(importedItems[0]);
  args.setDirectorOutputPreview(null);
}

export async function pickDirectorSourceHistoryImageAction(args: {
  payload: InternalHistoryImageDragPayload;
  model: string;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  setDirectorSourceItems: (updater: (prev: GeneratedImageItem[]) => GeneratedImageItem[]) => void;
  setDirectorSourcePreview: (value: GeneratedImageItem | null) => void;
  setDirectorOutputPreview: (value: GeneratedImageItem | null) => void;
}) {
  const item = await buildDirectorSourceItemAction({
    dataUrl: args.payload.dataUrl,
    name: args.payload.name,
    model: args.model,
    readImageSize: args.readImageSize,
  });
  args.setDirectorSourceItems(prev => [item, ...prev]);
  args.setDirectorSourcePreview(item);
  args.setDirectorOutputPreview(null);
}

export async function runDirectorToolAction(args: Record<string, any>) {
  if (!args.directorInputPreview || !args.directorTool)
    return;

  if (args.isDirectorToolDisabled(args.activeDirectorTool)) {
    args.showErrorToast(`${args.directorTool.label} 宸茬鐢ㄣ€俙`);
    return;
  }

  const imageBase64 = dataUrlToBase64(args.directorInputPreview.dataUrl);
  if (!imageBase64) {
    args.showErrorToast("瀵兼紨宸ュ叿杈撳叆鍥捐鍙栧け璐ャ€?");
    return;
  }

  args.setError("");
  args.setPendingPreviewAction(args.activeDirectorTool);
  args.setDirectorOutputPreview(null);

  try {
    const response = await args.augmentNovelImageViaProxy({
      requestType: args.directorTool.requestType,
      imageBase64,
      width: args.directorInputPreview.width,
      height: args.directorInputPreview.height,
      prompt: args.directorTool.parameterMode === "colorize"
        ? args.directorColorizePrompt
        : args.directorTool.parameterMode === "emotion"
          ? args.directorEmotionExtraPrompt
          : undefined,
      defry: args.directorTool.parameterMode === "colorize"
        ? args.directorColorizeDefry
        : args.directorTool.parameterMode === "emotion"
          ? args.directorEmotionDefry
          : undefined,
      emotion: args.directorTool.parameterMode === "emotion" ? args.directorEmotion : undefined,
    });
    const nextDataUrl = response.dataUrls[0];
    if (!nextDataUrl)
      throw new Error("Director Tools 娌℃湁杩斿洖鍥惧儚銆?");

    let nextSize = {
      width: args.directorInputPreview.width,
      height: args.directorInputPreview.height,
    };
    try {
      nextSize = await args.readImageSize(nextDataUrl);
    }
    catch {
      // keep input image size
    }

    const nextOutput = {
      dataUrl: nextDataUrl,
      seed: -1,
      width: nextSize.width,
      height: nextSize.height,
      model: args.directorInputPreview.model || args.model,
      batchId: makeStableId(),
      batchIndex: 0,
      batchSize: 1,
      toolLabel: args.directorTool.label,
    } satisfies GeneratedImageItem;
    const directorSourceHistoryRow = args.historyRowByResultMatchKey.get(generatedItemKey(args.directorInputPreview)) || null;

    args.setDirectorOutputPreview(nextOutput);
    args.setResults([nextOutput]);
    args.setSelectedResultIndex(0);
    args.setSelectedHistoryPreviewKey(null);
    await args.addAiImageHistoryBatch([
      buildDirectorToolHistoryRow({
        output: nextOutput,
        source: args.directorInputPreview,
        toolLabel: args.directorTool.label,
        sourceHistoryRow: directorSourceHistoryRow,
      }),
    ]);
    await args.refreshHistory();
    args.showSuccessToast(`${args.directorTool.label} 宸插畬鎴愩€俙`);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    args.setError(message);
    args.showErrorToast(message);
  }
  finally {
    args.setPendingPreviewAction("");
  }
}
