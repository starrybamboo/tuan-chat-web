import type {
  ImageImportSource,
  ImportedSourceImagePayload,
  MetadataImportSelectionState,
  PendingMetadataImportState,
  UiMode,
} from "@/components/aiImage/types";
import type { NovelAiImageMetadataResult } from "@/utils/novelaiImageMetadata";

import {
  base64DataUrl,
  bytesToBase64,
  createMetadataImportSelection,
  mimeFromFilename,
  readFileAsBytes,
} from "@/components/aiImage/helpers";

async function inspectImportedMetadata(args: {
  bytes: Uint8Array;
  dataUrl: string;
  extractNovelAiMetadataFromPngBytes: (bytes: Uint8Array) => NovelAiImageMetadataResult | null;
  extractNovelAiMetadataFromStealthPixels: (pixels: { width: number; height: number; data: Uint8ClampedArray }) => NovelAiImageMetadataResult | null;
  readImagePixels: (dataUrl: string) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
}) {
  let importedMetadata: NovelAiImageMetadataResult | null = args.extractNovelAiMetadataFromPngBytes(args.bytes);

  if (!importedMetadata) {
    try {
      const pixels = await args.readImagePixels(args.dataUrl);
      importedMetadata = args.extractNovelAiMetadataFromStealthPixels(pixels);
    }
    catch (error) {
      console.warn("[ai-image] failed to inspect imported image pixels", error);
    }
  }

  return importedMetadata;
}

export async function importSourceImageBytesAction(args: {
  bytes: Uint8Array;
  mime: string;
  name: string;
  source?: ImageImportSource;
  imageCount?: number;
  target?: "img2img";
  uiMode: UiMode;
  setError: (value: string) => void;
  setIsPageImageDragOver: (value: boolean) => void;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  applySourceImageForUi: (uiMode: UiMode, sourceImage: ImportedSourceImagePayload, successMessage?: string) => void;
  setPendingMetadataImport: (value: PendingMetadataImportState | null) => void;
  defaultMetadataImportSelection: MetadataImportSelectionState;
  setMetadataImportSelection: (value: MetadataImportSelectionState) => void;
  extractNovelAiMetadataFromPngBytes: (bytes: Uint8Array) => NovelAiImageMetadataResult | null;
  extractNovelAiMetadataFromStealthPixels: (pixels: { width: number; height: number; data: Uint8ClampedArray }) => NovelAiImageMetadataResult | null;
  readImagePixels: (dataUrl: string) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
}) {
  const dataUrl = base64DataUrl(args.mime, args.bytes);
  const imageBase64 = bytesToBase64(args.bytes);
  const importedMetadata = await inspectImportedMetadata({
    bytes: args.bytes,
    dataUrl,
    extractNovelAiMetadataFromPngBytes: args.extractNovelAiMetadataFromPngBytes,
    extractNovelAiMetadataFromStealthPixels: args.extractNovelAiMetadataFromStealthPixels,
    readImagePixels: args.readImagePixels,
  });

  args.setError("");
  args.setIsPageImageDragOver(false);

  let imageSize: { width: number; height: number } | null = null;
  try {
    imageSize = await args.readImageSize(dataUrl);
  }
  catch {
    // ignore
  }

  const sourceImage = {
    dataUrl,
    imageBase64,
    name: args.name,
    width: imageSize?.width,
    height: imageSize?.height,
  } satisfies ImportedSourceImagePayload;

  if (args.target === "img2img") {
    args.applySourceImageForUi(args.uiMode, sourceImage, "已设置 Base Img。");
    return;
  }

  if ((args.imageCount ?? 1) > 1)
    return;

  args.setPendingMetadataImport({
    sourceImage,
    metadata: importedMetadata,
    source: args.source,
    imageCount: args.imageCount ?? 1,
  });

  const nextMetadataImportSelection = importedMetadata
    ? createMetadataImportSelection(importedMetadata.settings)
    : { ...args.defaultMetadataImportSelection };

  if (args.uiMode === "simple")
    nextMetadataImportSelection.settings = false;
  if (args.uiMode === "simple")
    nextMetadataImportSelection.characters = false;

  args.setMetadataImportSelection(nextMetadataImportSelection);
}

export async function importSourceFileAction(args: {
  file: File;
  options?: { source?: ImageImportSource; imageCount?: number; target?: "img2img" };
  importSourceImageBytes: (args: {
    bytes: Uint8Array;
    mime: string;
    name: string;
    source?: ImageImportSource;
    imageCount?: number;
    target?: "img2img";
  }) => Promise<void>;
}) {
  const bytes = await readFileAsBytes(args.file);
  await args.importSourceImageBytes({
    bytes,
    mime: args.file.type || mimeFromFilename(args.file.name),
    name: args.file.name,
    source: args.options?.source,
    imageCount: args.options?.imageCount,
    target: args.options?.target,
  });
}
