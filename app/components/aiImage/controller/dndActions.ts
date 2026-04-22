import type {
  ImageImportSource,
  InternalHistoryImageDragPayload,
} from "@/components/aiImage/types";

import {
  INTERNAL_HISTORY_IMAGE_DRAG_MIME,
} from "@/components/aiImage/constants";
import {
  base64ToBytes,
  dataUrlToBase64,
  extractImageFilesFromTransfer,
  extractInternalHistoryImageDragPayload,
  fileFromDataUrl,
  hasFileDrag,
  hasInternalHistoryImageDrag,
  historyImageDragFileName,
  mimeFromDataUrl,
} from "@/components/aiImage/helpers";

export async function pickSourceHistoryImageAction(args: {
  payload: InternalHistoryImageDragPayload;
  options?: { source?: ImageImportSource; imageCount?: number };
  setIsPageImageDragOver: (value: boolean) => void;
  showErrorToast: (message: string) => void;
  handleImportSourceImageBytes: (args: {
    bytes: Uint8Array;
    mime: string;
    name: string;
    source?: ImageImportSource;
    imageCount?: number;
  }) => Promise<void>;
}) {
  const imageBase64 = dataUrlToBase64(args.payload.dataUrl);
  if (!imageBase64) {
    args.setIsPageImageDragOver(false);
    args.showErrorToast("鎷栨嫿鍘嗗彶鍥剧墖澶辫触锛氭湭璇诲彇鍒板浘鐗囨暟鎹€?");
    return;
  }

  await args.handleImportSourceImageBytes({
    bytes: base64ToBytes(imageBase64),
    mime: mimeFromDataUrl(args.payload.dataUrl),
    name: args.payload.name,
    source: args.options?.source,
    imageCount: args.options?.imageCount,
  });
}

export function historyImageDragStartAction(args: {
  event: any;
  payload: { dataUrl: string; seed: number; batchIndex?: number };
}) {
  const fileName = historyImageDragFileName(args.payload.dataUrl, args.payload.seed, args.payload.batchIndex);
  const dataTransfer = args.event.dataTransfer;
  if (!dataTransfer)
    return;
  dataTransfer.effectAllowed = "copy";
  dataTransfer.setData(INTERNAL_HISTORY_IMAGE_DRAG_MIME, JSON.stringify({
    dataUrl: args.payload.dataUrl,
    name: fileName,
  } satisfies InternalHistoryImageDragPayload));
  dataTransfer.setData("text/plain", fileName);

  try {
    dataTransfer.items.add(fileFromDataUrl(args.payload.dataUrl, fileName));
  }
  catch (error) {
    console.warn("[ai-image] failed to attach dragged history image file", error);
  }
}

export function pageImageDragEnterAction(args: {
  event: any;
  isDirectorToolsOpen: boolean;
  setIsPageImageDragOver: (value: boolean) => void;
}) {
  if (args.isDirectorToolsOpen)
    return;
  const nextIsImageDrag = hasFileDrag(args.event.dataTransfer) || hasInternalHistoryImageDrag(args.event.dataTransfer);
  if (!nextIsImageDrag)
    return;
  args.event.preventDefault();
  args.event.stopPropagation();
  args.setIsPageImageDragOver(nextIsImageDrag);
}

export function pageImageDragLeaveAction(args: {
  event: any;
  isDirectorToolsOpen: boolean;
  setIsPageImageDragOver: (value: boolean) => void;
}) {
  if (args.isDirectorToolsOpen)
    return;
  args.event.preventDefault();
  args.event.stopPropagation();
  const currentTarget = args.event.currentTarget as HTMLElement | null;
  if (!currentTarget || !currentTarget.contains(args.event.relatedTarget as Node | null))
    args.setIsPageImageDragOver(false);
}

export function pageImageDragOverAction(args: {
  event: any;
  isDirectorToolsOpen: boolean;
  isPageImageDragOver: boolean;
  setIsPageImageDragOver: (value: boolean) => void;
}) {
  if (args.isDirectorToolsOpen)
    return;
  const nextIsImageDrag = hasFileDrag(args.event.dataTransfer) || hasInternalHistoryImageDrag(args.event.dataTransfer);
  if (!nextIsImageDrag)
    return;
  args.event.preventDefault();
  args.event.stopPropagation();
  args.event.dataTransfer.dropEffect = "copy";
  if (nextIsImageDrag !== args.isPageImageDragOver)
    args.setIsPageImageDragOver(nextIsImageDrag);
}

export async function pageImageDropAction(args: {
  event: any;
  isDirectorToolsOpen: boolean;
  setIsPageImageDragOver: (value: boolean) => void;
  showErrorToast: (message: string) => void;
  handlePickSourceHistoryImage: (payload: InternalHistoryImageDragPayload, options?: { source?: ImageImportSource; imageCount?: number }) => Promise<void>;
  handlePickSourceImage: (file: File, options?: { source?: ImageImportSource; imageCount?: number; target?: "img2img" }) => Promise<void>;
}) {
  if (args.isDirectorToolsOpen)
    return;
  const hasImportableDrag = hasFileDrag(args.event.dataTransfer) || hasInternalHistoryImageDrag(args.event.dataTransfer);
  if (!hasImportableDrag)
    return;
  args.event.preventDefault();
  args.event.stopPropagation();
  const internalPayload = extractInternalHistoryImageDragPayload(args.event.dataTransfer);
  if (internalPayload) {
    args.setIsPageImageDragOver(false);
    await args.handlePickSourceHistoryImage(internalPayload, { source: "drop", imageCount: 1 });
    return;
  }
  const files = extractImageFilesFromTransfer(args.event.dataTransfer);
  if (!files.length) {
    args.setIsPageImageDragOver(false);
    args.showErrorToast("鎷栨嫿瀵煎叆鐩墠鍙敮鎸佸浘鐗囨枃浠躲€?");
    return;
  }
  args.setIsPageImageDragOver(false);
  await args.handlePickSourceImage(files[0], { source: "drop", imageCount: files.length });
}

export async function pasteSourceImageAction(args: {
  event: ClipboardEvent;
  handlePickSourceImage: (file: File, options?: { source?: ImageImportSource; imageCount?: number; target?: "img2img" }) => Promise<void>;
}) {
  const files = extractImageFilesFromTransfer(args.event.clipboardData);
  if (!files.length)
    return;
  args.event.preventDefault();
  await args.handlePickSourceImage(files[0], { source: "paste", imageCount: files.length });
}
