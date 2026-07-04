import { resolveMessageMediaUrl } from "@/components/chat/message/messageMediaSource";
import { MediaImage } from "@/components/common/mediaImage";
import { getImageMessageExtra } from "@/types/messageExtra";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { Message } from "../../../../../api";

import { getMessagePreviewText } from "./getMessagePreviewText";

type MessagePreviewContentProps = {
  canViewHiddenDiceReply?: boolean;
  message?: Message | null;
  /**
   * 是否展示媒体缩略图（目前仅图片）。
   * 默认不展示，避免在列表预览中导致布局抖动。
   */
  withMediaPreview?: boolean;
}

function resolveImagePreviewUrl(imageMessage: unknown): string {
  const imageRecord = imageMessage && typeof imageMessage === "object" && !Array.isArray(imageMessage)
    ? imageMessage as { source?: { kind?: string; fileId?: number; url?: string } }
    : undefined;
  return resolveMessageMediaUrl(imageRecord, "medium", "image");
}

export function MessagePreviewContent({
  canViewHiddenDiceReply = false,
  message,
  withMediaPreview = false,
}: MessagePreviewContentProps) {
  const previewText = getMessagePreviewText(message, { canViewHiddenDiceReply });

  if (!message || message.status === 1) {
    return <>{previewText}</>;
  }

  if (withMediaPreview && message.messageType === MESSAGE_TYPE.IMG) {
    const imageMessage = getImageMessageExtra(message.extra);
    const imgUrl = resolveImagePreviewUrl(imageMessage);
    const width = typeof imageMessage?.width === "number" ? imageMessage.width : undefined;
    const height = typeof imageMessage?.height === "number" ? imageMessage.height : undefined;

    if (imgUrl) {
      // 对图片：缩略图本身已经能表达类型，预览文本只展示“说明部分”（content/文件名等）。
      const caption = previewText.replace(/^\[图片\]\s*/, "").trim();
      return (
        <span className="inline-flex items-center gap-2 min-w-0 align-middle">
          <MediaImage
            src={imgUrl}
            referrerPolicy="no-referrer"
            className="max-h-[64px] w-auto object-contain rounded"
            alt=""
            width={width}
            height={height}
          />
          {caption && (
            <span className="min-w-0 wrap-break-word">
              {caption}
            </span>
          )}
        </span>
      );
    }
  }

  return <>{previewText}</>;
}
