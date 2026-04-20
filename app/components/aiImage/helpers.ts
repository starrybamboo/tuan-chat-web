import { unzipSync } from "fflate";

import type {
  GeneratedImageItem,
  ImportedSourceImagePayload,
  InternalHistoryImageDragPayload,
  MetadataImportSelectionState,
  NovelAiEmotion,
  ProFeatureSectionKey,
  V4CharGender,
  V4CharEditorRow,
} from "@/components/aiImage/types";
import type {
  AiImageHistoryMode,
  AiImageHistoryRow,
} from "@/utils/aiImageHistoryDb";
import type { NovelAiImportedSettings } from "@/utils/novelaiImageMetadata";

import {
  AVAILABLE_MODEL_OPTIONS,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_PRO_FEATURE_SECTION_OPEN,
  DEFAULT_PRO_IMAGE_SETTINGS,
  INTERNAL_HISTORY_IMAGE_DRAG_MIME,
  JPEG_REJECT_ERROR,
  NOVELAI_DIMENSION_MIN,
  NOVELAI_DIMENSION_STEP,
  NOVELAI_FREE_FIXED_IMAGE_COUNT,
  NOVELAI_FREE_MAX_DIMENSION,
  NOVELAI_FREE_MAX_STEPS,
  NOVELAI_FREE_ONLY_NOTICE,
  RESOLUTION_PRESETS,
  SIMPLE_MODE_CUSTOM_MAX_DIMENSION,
  SIMPLE_MODE_MAX_IMAGE_AREA,
} from "@/components/aiImage/constants";

export function clamp01(input: number, fallback = 0.5) {
  const value = Number(input);
  if (!Number.isFinite(value))
    return fallback;
  return Math.max(0, Math.min(1, value));
}

export function makeStableId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
      return crypto.randomUUID();
  }
  catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function newV4CharEditorRow(options?: { gender?: V4CharGender }): V4CharEditorRow {
  return {
    id: makeStableId(),
    gender: options?.gender ?? "other",
    prompt: "",
    negativePrompt: "",
    centerX: 0.5,
    centerY: 0.5,
  };
}

const V4_CHAR_GRID_COLUMNS = ["A", "B", "C", "D", "E"] as const;
const V4_CHAR_GRID_SIZE = 5;

export type V4CharGridCell = {
  code: string;
  colIndex: number;
  rowIndex: number;
  centerX: number;
  centerY: number;
};

export const V4_CHAR_GRID_CELLS: readonly V4CharGridCell[] = Object.freeze(
  Array.from({ length: V4_CHAR_GRID_SIZE * V4_CHAR_GRID_SIZE }, (_, index) => {
    const rowIndex = Math.floor(index / V4_CHAR_GRID_SIZE);
    const colIndex = index % V4_CHAR_GRID_SIZE;
    return {
      code: `${V4_CHAR_GRID_COLUMNS[colIndex]}${rowIndex + 1}`,
      colIndex,
      rowIndex,
      centerX: (colIndex + 0.5) / V4_CHAR_GRID_SIZE,
      centerY: (rowIndex + 0.5) / V4_CHAR_GRID_SIZE,
    };
  }),
);

const V4_CHAR_GRID_CELL_MAP = new Map<string, V4CharGridCell>(
  V4_CHAR_GRID_CELLS.map(cell => [cell.code, cell]),
);

export function getV4CharGridCellByCode(code: string) {
  return V4_CHAR_GRID_CELL_MAP.get(String(code || "").trim().toUpperCase()) ?? null;
}

export function getV4CharGridCellByCenter(centerX: number, centerY: number) {
  const normalizedX = clamp01(centerX, 0.5);
  const normalizedY = clamp01(centerY, 0.5);
  const colIndex = Math.max(0, Math.min(V4_CHAR_GRID_SIZE - 1, Math.round(normalizedX * V4_CHAR_GRID_SIZE - 0.5)));
  const rowIndex = Math.max(0, Math.min(V4_CHAR_GRID_SIZE - 1, Math.round(normalizedY * V4_CHAR_GRID_SIZE - 0.5)));
  return V4_CHAR_GRID_CELLS[rowIndex * V4_CHAR_GRID_SIZE + colIndex] ?? V4_CHAR_GRID_CELLS[12];
}

export function getNextAvailableV4CharGridCell(rows: Array<Pick<V4CharEditorRow, "centerX" | "centerY">>) {
  const occupiedCodes = new Set(rows.map(row => getV4CharGridCellByCenter(row.centerX, row.centerY).code));
  return V4_CHAR_GRID_CELLS.find(cell => !occupiedCodes.has(cell.code)) ?? V4_CHAR_GRID_CELLS[V4_CHAR_GRID_CELLS.length - 1];
}

export function normalizeV4CharGridRows(rows: V4CharEditorRow[]) {
  const occupiedCodes = new Set<string>();
  let changed = false;
  const nextRows = rows.map((row) => {
    const preferredCell = getV4CharGridCellByCenter(row.centerX, row.centerY);
    const resolvedCell = occupiedCodes.has(preferredCell.code)
      ? (V4_CHAR_GRID_CELLS.find(cell => !occupiedCodes.has(cell.code)) ?? preferredCell)
      : preferredCell;
    occupiedCodes.add(resolvedCell.code);
    if (resolvedCell.centerX === row.centerX && resolvedCell.centerY === row.centerY)
      return row;
    changed = true;
    return {
      ...row,
      centerX: resolvedCell.centerX,
      centerY: resolvedCell.centerY,
    };
  });
  return changed ? nextRows : rows;
}

export function mergeTagString(base: string, extraTags: string[]) {
  const value = String(base || "");
  const list = value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  const uniq = new Set<string>();
  for (const item of [...extraTags, ...list]) {
    const normalized = String(item || "").trim();
    if (!normalized)
      continue;
    uniq.add(normalized);
  }

  return Array.from(uniq).join(", ");
}

export type NovelAiRandomTagKind = "prompt" | "negative";
export const NOVELAI_RANDOM_TAG_COUNT = 8;
export const NOVELAI_RANDOM_PROMPT_TAG_POOL = [
  "cinematic lighting",
  "dramatic shadows",
  "volumetric lighting",
  "rim light",
  "backlighting",
  "depth of field",
  "bokeh",
  "dynamic angle",
  "dutch angle",
  "wind-blown hair",
  "flowing fabric",
  "rainy street",
  "neon reflections",
  "sunset sky",
  "soft smile",
  "looking at viewer",
  "detailed background",
  "floating petals",
  "sparkles",
  "glowing particles",
  "cowboy shot",
  "upper body",
  "full body",
  "from above",
  "low angle",
] as const;
export const NOVELAI_RANDOM_NEGATIVE_TAG_POOL = [
  "lowres",
  "blurry",
  "bad anatomy",
  "bad hands",
  "extra fingers",
  "missing fingers",
  "deformed",
  "text",
  "watermark",
  "logo",
  "jpeg artifacts",
  "cropped",
  "duplicate",
  "oversaturated",
  "out of frame",
  "mutation",
  "bad perspective",
  "poorly drawn face",
  "poorly drawn hands",
  "artifacting",
] as const;

function takeRandomUniqueItems<T>(items: readonly T[], count: number, random: () => number) {
  const remaining = [...items];
  const picked: T[] = [];

  while (picked.length < count && remaining.length) {
    const randomIndex = Math.min(
      remaining.length - 1,
      Math.max(0, Math.floor(random() * remaining.length)),
    );
    const [nextItem] = remaining.splice(randomIndex, 1);
    if (nextItem != null)
      picked.push(nextItem);
  }

  return picked;
}

function buildNovelAiRandomTagList(args: {
  preservedTag?: string;
  existingTags?: string[];
  kind?: NovelAiRandomTagKind;
  random?: () => number;
}) {
  const normalizedPreservedTag = String(args.preservedTag || "").trim();
  const existingTags = new Set(
    (args.existingTags ?? [])
      .map(tag => String(tag || "").trim())
      .filter(Boolean),
  );
  const kind = args.kind === "negative" ? "negative" : "prompt";
  const random = args.random ?? Math.random;
  const pool = kind === "negative"
    ? NOVELAI_RANDOM_NEGATIVE_TAG_POOL
    : NOVELAI_RANDOM_PROMPT_TAG_POOL;
  const availablePool = pool.filter((tag) => {
    if (tag === normalizedPreservedTag)
      return false;
    return !existingTags.has(tag);
  });
  const tags = takeRandomUniqueItems(
    availablePool,
    normalizedPreservedTag ? NOVELAI_RANDOM_TAG_COUNT - 1 : NOVELAI_RANDOM_TAG_COUNT,
    random,
  );

  return normalizedPreservedTag ? [normalizedPreservedTag, ...tags] : tags;
}

function clampSelectionIndex(value: string, index: number | null | undefined) {
  const fallback = value.length;
  const numericIndex = Number(index);
  if (!Number.isFinite(numericIndex))
    return fallback;
  return Math.min(value.length, Math.max(0, Math.floor(numericIndex)));
}

function needsTagSeparator(character: string | undefined) {
  return Boolean(character && !/[\s,]/.test(character));
}

export function insertNovelAiRandomTags(args: {
  kind?: NovelAiRandomTagKind;
  random?: () => number;
  value: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}) {
  const currentValue = String(args.value || "");
  const rawStart = clampSelectionIndex(currentValue, args.selectionStart);
  const rawEnd = clampSelectionIndex(currentValue, args.selectionEnd);
  const selectionStart = Math.min(rawStart, rawEnd);
  const selectionEnd = Math.max(rawStart, rawEnd);
  const before = currentValue.slice(0, selectionStart);
  const after = currentValue.slice(selectionEnd);
  const selectedText = currentValue.slice(selectionStart, selectionEnd).trim();
  const existingTags = `${before},${after}`
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
  const randomTags = buildNovelAiRandomTagList({
    preservedTag: selectedText,
    existingTags,
    kind: args.kind,
    random: args.random,
  });
  const insertedTags = randomTags.join(", ");
  const prefix = before && needsTagSeparator(before.at(-1))
    ? ", "
    : "";
  const suffix = after && needsTagSeparator(after[0])
    ? ", "
    : "";
  const value = `${before}${prefix}${insertedTags}${suffix}${after}`;
  const insertedSelectionStart = before.length + prefix.length;
  const insertedSelectionEnd = insertedSelectionStart + insertedTags.length;

  return {
    value,
    selectionStart: insertedSelectionStart,
    selectionEnd: insertedSelectionEnd,
    insertedText: insertedTags,
  };
}

export function resolveNovelAiRandomTagTarget(args: {
  currentValue: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  previousInsertion?: {
    selectionStart: number;
    selectionEnd: number;
    insertedText: string;
  } | null;
}) {
  const currentValue = String(args.currentValue || "");
  const rawStart = clampSelectionIndex(currentValue, args.selectionStart);
  const rawEnd = clampSelectionIndex(currentValue, args.selectionEnd);
  const selectionStart = Math.min(rawStart, rawEnd);
  const selectionEnd = Math.max(rawStart, rawEnd);
  const selectedText = currentValue.slice(selectionStart, selectionEnd).trim();
  if (selectedText) {
    return { selectionStart, selectionEnd };
  }

  const previousInsertion = args.previousInsertion;
  if (!previousInsertion)
    return { selectionStart, selectionEnd };

  const previousStart = clampSelectionIndex(currentValue, previousInsertion.selectionStart);
  const previousEnd = clampSelectionIndex(currentValue, previousInsertion.selectionEnd);
  if (previousEnd <= previousStart)
    return { selectionStart, selectionEnd };

  const currentInsertedText = currentValue.slice(previousStart, previousEnd);
  if (currentInsertedText !== previousInsertion.insertedText)
    return { selectionStart, selectionEnd };

  return {
    selectionStart: previousStart,
    selectionEnd: previousEnd,
  };
}

export function cleanImportedPromptText(value: string) {
  return String(value || "")
    .replace(/[\[\]\{\}]/g, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function clampToMultipleOf64(value: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0)
    return fallback;
  return Math.max(NOVELAI_DIMENSION_MIN, Math.round(num / NOVELAI_DIMENSION_STEP) * NOVELAI_DIMENSION_STEP);
}

export function clampSimpleModeDimension(value: number, otherDimension: number, fallback: number) {
  const normalizedOther = Math.min(NOVELAI_FREE_MAX_DIMENSION, clampToMultipleOf64(otherDimension, fallback));
  const normalizedValue = clampToMultipleOf64(value, fallback);
  const maxByArea = Math.max(
    NOVELAI_DIMENSION_MIN,
    Math.floor(SIMPLE_MODE_MAX_IMAGE_AREA / Math.max(NOVELAI_DIMENSION_MIN, normalizedOther) / NOVELAI_DIMENSION_STEP) * NOVELAI_DIMENSION_STEP,
  );
  return Math.max(NOVELAI_DIMENSION_MIN, Math.min(normalizedValue, maxByArea, NOVELAI_FREE_MAX_DIMENSION));
}

export function getClosestValidImageSize(rawWidth: number, rawHeight: number) {
  let nextWidth = clampToMultipleOf64(rawWidth, DEFAULT_PRO_IMAGE_SETTINGS.width);
  let nextHeight = clampToMultipleOf64(rawHeight, DEFAULT_PRO_IMAGE_SETTINGS.height);

  if (nextWidth <= NOVELAI_FREE_MAX_DIMENSION && nextHeight <= NOVELAI_FREE_MAX_DIMENSION) {
    return { width: nextWidth, height: nextHeight };
  }

  const scale = Math.min(
    1,
    NOVELAI_FREE_MAX_DIMENSION / nextWidth,
    NOVELAI_FREE_MAX_DIMENSION / nextHeight,
  );
  nextWidth = clampToMultipleOf64(nextWidth * scale, DEFAULT_PRO_IMAGE_SETTINGS.width);
  nextHeight = clampToMultipleOf64(nextHeight * scale, DEFAULT_PRO_IMAGE_SETTINGS.height);

  while (nextWidth > NOVELAI_FREE_MAX_DIMENSION || nextHeight > NOVELAI_FREE_MAX_DIMENSION) {
    if (nextWidth >= nextHeight && nextWidth > NOVELAI_DIMENSION_MIN) {
      nextWidth -= NOVELAI_DIMENSION_STEP;
      continue;
    }
    if (nextHeight > NOVELAI_DIMENSION_MIN) {
      nextHeight -= NOVELAI_DIMENSION_STEP;
      continue;
    }
    break;
  }

  return {
    width: Math.max(NOVELAI_DIMENSION_MIN, nextWidth),
    height: Math.max(NOVELAI_DIMENSION_MIN, nextHeight),
  };
}

export function getNovelAiFreeOnlyMessage(detail?: string) {
  const suffix = String(detail || "").trim();
  return suffix ? `${NOVELAI_FREE_ONLY_NOTICE} ${suffix}` : NOVELAI_FREE_ONLY_NOTICE;
}

function isPresetResolution(width: number, height: number) {
  return RESOLUTION_PRESETS.some(preset => preset.width === width && preset.height === height);
}

export function getNovelAiFreeGenerationViolation(args: {
  mode: AiImageHistoryMode;
  width: number;
  height: number;
  imageCount: number;
  steps: number;
  sourceImageBase64?: string;
  sourceImageWidth?: number;
  sourceImageHeight?: number;
  maskBase64?: string;
  vibeTransferReferenceCount?: number;
  hasPreciseReference?: boolean;
}) {
  if (args.mode === "infill") {
    if (!String(args.sourceImageBase64 || "").trim())
      return "Inpaint 缺少源图。";
    if (!String(args.maskBase64 || "").trim())
      return "Inpaint 缺少蒙版。";
  }
  else if (args.mode === "img2img") {
    if (!String(args.sourceImageBase64 || "").trim())
      return "Base Img 缺少源图。";
  }
  else if (args.mode !== "txt2img") {
    return getNovelAiFreeOnlyMessage("当前模式暂未开放。");
  }
  const sourceImageWidth = Math.floor(Number(args.sourceImageWidth));
  const sourceImageHeight = Math.floor(Number(args.sourceImageHeight));
  if (
    Number.isFinite(sourceImageWidth)
    && Number.isFinite(sourceImageHeight)
    && !isPresetResolution(sourceImageWidth, sourceImageHeight)
    && (sourceImageWidth > SIMPLE_MODE_CUSTOM_MAX_DIMENSION || sourceImageHeight > SIMPLE_MODE_CUSTOM_MAX_DIMENSION)
  ) {
    return getNovelAiFreeOnlyMessage(`导入图像若不是预设尺寸，任意一边不能超过 ${SIMPLE_MODE_CUSTOM_MAX_DIMENSION}。`);
  }
  if ((args.vibeTransferReferenceCount ?? 0) > 0 || args.hasPreciseReference)
    return getNovelAiFreeOnlyMessage("Reference Image、Vibe Transfer、Precise Reference 已禁用。");
  if (args.imageCount !== NOVELAI_FREE_FIXED_IMAGE_COUNT)
    return getNovelAiFreeOnlyMessage("当前仅允许单张生成。");
  if (args.steps > NOVELAI_FREE_MAX_STEPS)
    return getNovelAiFreeOnlyMessage("当前仅允许 steps <= 28。");
  if (args.width > NOVELAI_FREE_MAX_DIMENSION || args.height > NOVELAI_FREE_MAX_DIMENSION)
    return getNovelAiFreeOnlyMessage(`当前仅允许宽高不超过 ${NOVELAI_FREE_MAX_DIMENSION}。`);
  return null;
}

export function resolveFixedImageModel() {
  if (AVAILABLE_MODEL_OPTIONS.includes(DEFAULT_IMAGE_MODEL))
    return DEFAULT_IMAGE_MODEL;
  return AVAILABLE_MODEL_OPTIONS[0];
}

export function clampRange(value: number, min: number, max: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num))
    return fallback;
  return Math.min(max, Math.max(min, num));
}

export function clampIntRange(value: number, min: number, max: number, fallback: number) {
  const num = Math.floor(Number(value));
  if (!Number.isFinite(num))
    return fallback;
  return Math.min(max, Math.max(min, num));
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function base64DataUrl(mime: string, bytes: Uint8Array) {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

export function mimeFromFilename(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png"))
    return "image/png";
  if (lower.endsWith(".webp"))
    return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
    return "image/jpeg";
  return "application/octet-stream";
}

export function extensionFromDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-z0-9.+-]+);/i.exec(String(dataUrl || ""));
  if (!match)
    return "png";

  if (match[1] === "image/webp")
    return "webp";
  if (match[1] === "image/jpeg")
    return "jpg";
  return "png";
}

export function mimeFromDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-z0-9.+-]+);/i.exec(String(dataUrl || ""));
  return match?.[1] || "application/octet-stream";
}

export function dataUrlToBase64(dataUrl: string) {
  const value = String(dataUrl || "");
  const idx = value.indexOf(",");
  if (idx < 0)
    return "";
  return value.slice(idx + 1).trim();
}

export function buildImportedSourceImagePayloadFromDataUrl(args: {
  dataUrl: string;
  name?: string;
  width?: number | null;
  height?: number | null;
}): ImportedSourceImagePayload | null {
  const dataUrl = String(args.dataUrl || "").trim();
  if (!dataUrl)
    return null;

  const imageBase64 = dataUrlToBase64(dataUrl);
  if (!imageBase64)
    return null;

  return {
    dataUrl,
    imageBase64,
    name: args.name,
    width: args.width ?? undefined,
    height: args.height ?? undefined,
  };
}

export function resolveEditorImageMode(sourceDataUrl?: string | null): "txt2img" | "img2img" {
  return buildImportedSourceImagePayloadFromDataUrl({ dataUrl: String(sourceDataUrl || "") })
    ? "img2img"
    : "txt2img";
}

export function resolveSimpleGenerateMode(mode: AiImageHistoryMode): AiImageHistoryMode {
  return mode === "infill" ? "infill" : "txt2img";
}

export function base64ToBytes(value: string) {
  const normalized = String(value || "").replace(/\s+/g, "");
  if (!normalized)
    return new Uint8Array();
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function fileFromDataUrl(dataUrl: string, fileName: string) {
  return new File(
    [base64ToBytes(dataUrlToBase64(dataUrl))],
    fileName,
    { type: mimeFromDataUrl(dataUrl), lastModified: Date.now() },
  );
}

export function triggerBrowserDownload(dataUrl: string, fileName: string) {
  if (typeof document === "undefined")
    return;
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function triggerBlobDownload(blob: Blob, fileName: string) {
  if (typeof document === "undefined" || typeof URL === "undefined")
    return;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
  finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

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
    batchId: row.batchId || historyRowKey(row),
    batchIndex: row.batchIndex ?? 0,
    batchSize: row.batchSize ?? 1,
    toolLabel: row.toolLabel,
  };
}

export function generatedItemKey(item: Pick<GeneratedImageItem, "batchId" | "batchIndex" | "dataUrl">) {
  const batchId = String(item.batchId || "").trim();
  if (batchId)
    return `batch:${batchId}:${item.batchIndex}`;
  return `data:${item.dataUrl}`;
}

export function historyRowResultMatchKey(row: Pick<AiImageHistoryRow, "batchId" | "batchIndex" | "dataUrl">) {
  const batchId = String(row.batchId || "").trim();
  if (batchId)
    return `batch:${batchId}:${row.batchIndex ?? 0}`;
  return `data:${row.dataUrl}`;
}

export function historyImageDragFileName(dataUrl: string, seed: number, batchIndex?: number) {
  return `nai_${seed}_${(batchIndex ?? 0) + 1}.${extensionFromDataUrl(dataUrl)}`;
}

function startsWithBytes(bytes: Uint8Array, prefix: number[]) {
  if (bytes.length < prefix.length)
    return false;
  return prefix.every((byte, index) => bytes[index] === byte);
}

function looksLikeZip(bytes: Uint8Array) {
  if (bytes.length < 4)
    return false;
  return (
    bytes[0] === 0x50
    && bytes[1] === 0x4B
    && (
      (bytes[2] === 0x03 && bytes[3] === 0x04)
      || (bytes[2] === 0x05 && bytes[3] === 0x06)
      || (bytes[2] === 0x07 && bytes[3] === 0x08)
    )
  );
}

function detectBinaryDataUrl(bytes: Uint8Array) {
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
    return base64DataUrl("image/png", bytes);

  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return base64DataUrl("image/webp", bytes);
  }

  return "";
}

function allImagesFromZip(zipBytes: Uint8Array) {
  const files = unzipSync(zipBytes);
  const names = Object.keys(files);
  if (!names.length)
    throw new Error("ZIP 解包失败：未找到任何文件");

  const preferred = names
    .filter(name => /\.(?:png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (!preferred.length) {
    const jpegEntry = names.find(name => /\.jpe?g$/i.test(name));
    if (jpegEntry)
      throw new Error(JPEG_REJECT_ERROR);
    throw new Error("ZIP 解包失败：未找到 PNG/WebP 文件");
  }

  return preferred.map((name) => {
    return base64DataUrl(mimeFromFilename(name), files[name]);
  });
}

export function extractImageDataUrlsFromBinary(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF)
    throw new Error(JPEG_REJECT_ERROR);

  const detected = detectBinaryDataUrl(bytes);
  if (detected)
    return [detected];

  if (looksLikeZip(bytes))
    return allImagesFromZip(bytes);

  return [];
}

export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

async function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("读取图片失败"));
    img.src = dataUrl;
  });
}

export function formatDirectorEmotionLabel(value: NovelAiEmotion) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function readImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  const img = await loadImageElement(dataUrl);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

export async function readImagePixels(dataUrl: string): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const img = await loadImageElement(dataUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context)
    throw new Error("无法读取图片像素");
  context.drawImage(img, 0, 0, width, height);
  return {
    width,
    height,
    data: context.getImageData(0, 0, width, height).data,
  };
}

export function extractImageFilesFromTransfer(dataTransfer: DataTransfer | null | undefined): File[] {
  if (!dataTransfer)
    return [];

  const fromItems = Array.from(dataTransfer.items ?? [])
    .filter(item => item.kind === "file")
    .map(item => item.getAsFile())
    .filter((file): file is File => Boolean(file))
    .filter((file) => {
      const type = String(file.type || "").toLowerCase();
      if (type.startsWith("image/"))
        return true;
      return /\.(?:png|jpe?g|gif|webp|bmp|avif)$/i.test(file.name);
    });
  if (fromItems.length)
    return fromItems;

  return Array.from(dataTransfer.files ?? []).filter((file) => {
    const type = String(file.type || "").toLowerCase();
    if (type.startsWith("image/"))
      return true;
    return /\.(?:png|jpe?g|gif|webp|bmp|avif)$/i.test(file.name);
  });
}

export function hasFileDrag(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer)
    return false;
  return Array.from(dataTransfer.types || []).includes("Files");
}

export function hasInternalHistoryImageDrag(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer)
    return false;
  return Array.from(dataTransfer.types || []).includes(INTERNAL_HISTORY_IMAGE_DRAG_MIME);
}

export function extractInternalHistoryImageDragPayload(dataTransfer: DataTransfer | null | undefined): InternalHistoryImageDragPayload | null {
  if (!dataTransfer || !hasInternalHistoryImageDrag(dataTransfer))
    return null;

  const raw = dataTransfer.getData(INTERNAL_HISTORY_IMAGE_DRAG_MIME);
  if (!raw)
    return null;

  try {
    const parsed = JSON.parse(raw) as Partial<InternalHistoryImageDragPayload>;
    if (!parsed || typeof parsed.dataUrl !== "string" || !parsed.dataUrl.trim())
      return null;
    return {
      dataUrl: parsed.dataUrl,
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : "history-image.png",
    };
  }
  catch {
    return null;
  }
}

export function modelLabel(value: string) {
  if (value === "nai-diffusion-4-5-full")
    return "NAI v4.5 Full";
  if (value === "nai-diffusion-4-5-curated")
    return "NAI v4.5 Curated";
  if (value === "nai-diffusion-4-5-full-inpainting")
    return "NAI v4.5 Full Inpainting";
  if (value === "nai-diffusion-4-5-curated-inpainting")
    return "NAI v4.5 Curated Inpainting";
  if (value === "nai-diffusion-4-full")
    return "NAI v4 Full";
  if (value === "nai-diffusion-4-full-inpainting")
    return "NAI v4 Full Inpainting";
  if (value === "nai-diffusion-4-curated-preview")
    return "NAI v4 Curated Preview";
  if (value === "nai-diffusion-4-curated-inpainting")
    return "NAI v4 Curated Inpainting";
  if (value === "nai-diffusion-3")
    return "NAI v3";
  if (value === "nai-diffusion-3-inpainting")
    return "NAI v3 Inpainting";
  if (value === "nai-diffusion-2")
    return "NAI v2";
  if (value === "nai-diffusion")
    return "NAI";
  if (value === "nai-diffusion-inpainting")
    return "NAI Inpainting";
  if (value === "nai-diffusion-furry")
    return "NAI Furry";
  if (value === "furry-diffusion-inpainting")
    return "NAI Furry Inpainting";
  if (value === "safe-diffusion")
    return "Safe Diffusion";
  if (value === "safe-diffusion-inpainting")
    return "Safe Diffusion Inpainting";
  return value;
}

export function resolveInpaintModel(model: string) {
  const value = String(model || "").trim();
  if (!value)
    return DEFAULT_IMAGE_MODEL;
  if (value.endsWith("-inpainting"))
    return value;
  if (value === "nai-diffusion-4-5-curated")
    return "nai-diffusion-4-5-curated-inpainting";
  if (value === "nai-diffusion-4-5-full")
    return "nai-diffusion-4-5-full-inpainting";
  if (value === "nai-diffusion-4-full")
    return "nai-diffusion-4-full-inpainting";
  if (value === "nai-diffusion-4-curated-preview")
    return "nai-diffusion-4-curated-inpainting";
  if (value === "nai-diffusion-3")
    return "nai-diffusion-3-inpainting";
  if (value === "nai-diffusion-furry")
    return "furry-diffusion-inpainting";
  if (value === "safe-diffusion")
    return "safe-diffusion-inpainting";
  if (value === "nai-diffusion")
    return "nai-diffusion-inpainting";
  return value;
}

export function isNaiV4Family(model: string) {
  const value = String(model || "").trim();
  if (!value)
    return false;
  return value === "nai-diffusion-4-curated-preview"
    || value === "nai-diffusion-4-full"
    || value === "nai-diffusion-4-full-inpainting"
    || value === "nai-diffusion-4-curated-inpainting"
    || value === "nai-diffusion-4-5-curated"
    || value === "nai-diffusion-4-5-curated-inpainting"
    || value === "nai-diffusion-4-5-full"
    || value === "nai-diffusion-4-5-full-inpainting";
}

export function readLocalStorageString(key: string, fallback: string) {
  if (typeof window === "undefined")
    return fallback;
  try {
    const value = String(window.localStorage.getItem(key) || "");
    return value || fallback;
  }
  catch {
    return fallback;
  }
}

export function writeLocalStorageString(key: string, value: string) {
  if (typeof window === "undefined")
    return;
  try {
    window.localStorage.setItem(key, value);
  }
  catch {
    // ignore
  }
}

export function formatSliderValue(value: number) {
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function normalizeReferenceStrengthRows<T extends { strength: number }>(rows: T[]) {
  const totalStrength = rows.reduce((sum, row) => {
    return sum + Math.max(0, Number(row.strength) || 0);
  }, 0);
  if (!Number.isFinite(totalStrength) || totalStrength <= 0)
    return rows;

  return rows.map((row) => {
    return {
      ...row,
      strength: clampRange(Number(row.strength) / totalStrength, 0, 1, 0),
    };
  });
}

export function resolveImportedValue<T>(value: T | null | undefined, cleanImports: boolean, fallback: T): T | undefined {
  if (value != null)
    return value;
  return cleanImports ? fallback : undefined;
}

export function hasNonEmptyText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasMetadataSettingsPayload(settings: NovelAiImportedSettings) {
  return (
    settings.mode != null
    || settings.width != null
    || settings.height != null
    || settings.imageCount != null
    || settings.steps != null
    || settings.scale != null
    || settings.sampler != null
    || settings.noiseSchedule != null
    || settings.cfgRescale != null
    || settings.ucPreset != null
    || settings.qualityToggle != null
    || settings.dynamicThresholding != null
    || settings.smea != null
    || settings.smeaDyn != null
    || settings.strength != null
    || settings.noise != null
    || settings.v4UseCoords != null
    || settings.v4UseOrder != null
    || (settings.vibeTransferReferences?.length ?? 0) > 0
    || settings.preciseReference != null
  );
}

export function createMetadataImportSelection(settings: NovelAiImportedSettings): MetadataImportSelectionState {
  return {
    prompt: hasNonEmptyText(settings.prompt),
    undesiredContent: hasNonEmptyText(settings.negativePrompt),
    characters: Array.isArray(settings.v4Chars) && settings.v4Chars.length > 0,
    appendCharacters: false,
    settings: hasMetadataSettingsPayload(settings),
    seed: settings.seed != null,
    cleanImports: false,
  };
}

export function createProFeatureSectionState(overrides?: Partial<Record<ProFeatureSectionKey, boolean>>) {
  return {
    ...DEFAULT_PRO_FEATURE_SECTION_OPEN,
    ...overrides,
  };
}
