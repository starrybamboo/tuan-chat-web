import type { UploadedImageMessageDraftAsset } from "@tuanchat/domain/message-draft";
import type { StickerCreateRequest } from "@tuanchat/openapi-client/models/StickerCreateRequest";

import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";

const SUPPORTED_STICKER_FORMATS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const STICKER_UPLOAD_FALLBACK_ERROR_MESSAGE = "表情包上传失败。";
const STICKER_CROP_FILE_SUFFIX = "sticker";
const STICKER_CROP_FILE_EXTENSION = "webp";
const MAX_STICKER_NAME_LENGTH = 100;

function normalizeStickerFormat(format?: string | null): string | null {
  if (!format) {
    return null;
  }
  const next = format.trim().toLowerCase();
  return SUPPORTED_STICKER_FORMATS.has(next) ? next : null;
}

function getFileExtension(fileName: string): string | null {
  const matchedExtension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return matchedExtension?.[1] ?? null;
}

function truncateStickerName(name: string) {
  return Array.from(name).slice(0, MAX_STICKER_NAME_LENGTH).join("");
}

function resolveStickerFormat(attachment: Pick<MobileMessageAttachment, "fileName" | "mimeType">): string | null {
  const mimeType = attachment.mimeType?.trim().toLowerCase();
  const fromMimeType = mimeType?.startsWith("image/")
    ? normalizeStickerFormat(mimeType.slice("image/".length))
    : null;
  if (fromMimeType) {
    return fromMimeType;
  }

  return normalizeStickerFormat(getFileExtension(attachment.fileName));
}

export function buildStickerCreateRequest(
  attachment: Pick<MobileMessageAttachment, "fileName" | "mimeType">,
  uploadedImage: Pick<UploadedImageMessageDraftAsset, "fileId" | "fileName" | "height" | "size" | "width">,
): StickerCreateRequest {
  const format = resolveStickerFormat(attachment);
  if (!format) {
    throw new Error("表情仅支持 jpg/jpeg/png/gif/webp");
  }

  const name = attachment.fileName.trim() || uploadedImage.fileName.trim() || `表情.${format}`;
  return {
    name: truncateStickerName(name),
    fileId: uploadedImage.fileId,
    fileSize: uploadedImage.size,
    width: uploadedImage.width > 0 ? uploadedImage.width : undefined,
    height: uploadedImage.height > 0 ? uploadedImage.height : undefined,
    format,
  };
}

export function getStickerUploadErrorMessage(error: unknown) {
  return extractOpenApiErrorMessage(error, STICKER_UPLOAD_FALLBACK_ERROR_MESSAGE);
}

export function createStickerCropFileName(fileName: string, now = Date.now()) {
  const baseName = fileName.trim().replace(/\.[^.]+$/, "") || "sticker";
  return `${baseName}_${STICKER_CROP_FILE_SUFFIX}_${now}.${STICKER_CROP_FILE_EXTENSION}`;
}
