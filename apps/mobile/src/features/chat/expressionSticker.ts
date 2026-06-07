import type { UploadedImageMessageDraftAsset } from "@tuanchat/domain/message-draft";
import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";

const FALLBACK_STICKER_SIZE = 256;
const FALLBACK_STICKER_FILE_SIZE = 1;
const FALLBACK_STICKER_FORMAT = "webp";

/**
 * 把表情包元数据转换成消息发送所需的图片素材结构。
 */
export function buildExpressionDraftAsset(sticker: Sticker): UploadedImageMessageDraftAsset {
  const format = sticker.format?.trim() || FALLBACK_STICKER_FORMAT;
  const fileName = sticker.name?.trim() || `表情.${format}`;

  return {
    fileId: sticker.fileId ?? 0,
    fileName,
    height: sticker.height && sticker.height > 0 ? sticker.height : FALLBACK_STICKER_SIZE,
    size: sticker.fileSize && sticker.fileSize > 0 ? sticker.fileSize : FALLBACK_STICKER_FILE_SIZE,
    width: sticker.width && sticker.width > 0 ? sticker.width : FALLBACK_STICKER_SIZE,
  };
}
