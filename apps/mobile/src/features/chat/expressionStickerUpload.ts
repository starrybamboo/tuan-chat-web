import type { StickerCreateRequest } from "@tuanchat/openapi-client/models/StickerCreateRequest";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";
import type { UploadedImageMessageDraftAsset } from "@tuanchat/domain/message-draft";

const SUPPORTED_STICKER_FORMATS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

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

  return {
    name: attachment.fileName.trim() || uploadedImage.fileName.trim() || `表情.${format}`,
    fileId: uploadedImage.fileId,
    fileSize: uploadedImage.size,
    width: uploadedImage.width > 0 ? uploadedImage.width : undefined,
    height: uploadedImage.height > 0 ? uploadedImage.height : undefined,
    format,
  };
}
