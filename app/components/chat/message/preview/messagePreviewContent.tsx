import type { Message } from "../../../../../api";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import { getMessagePreviewText } from "./getMessagePreviewText";

interface MessagePreviewContentProps {
  message?: Message | null;
  /**
   * 是否展示媒体缩略图（目前仅图片）。
   * 默认不展示，避免在列表预览中导致布局抖动。
   */
  withMediaPreview?: boolean;
}

export function MessagePreviewContent({
  message,
  withMediaPreview = false,
}: MessagePreviewContentProps) {
  const previewText = getMessagePreviewText(message);

  if (!message || message.status === 1) {
    return <>{previewText}</>;
  }

  if (withMediaPreview && message.messageType === MESSAGE_TYPE.IMG) {
    const extra: any = message.extra as any;
    const imageMessage = extra?.imageMessage ?? extra;
    const imgUrl = typeof imageMessage?.url === "string" ? imageMessage.url : "";
    const width = typeof imageMessage?.width === "number" ? imageMessage.width : undefined;
    const height = typeof imageMessage?.height === "number" ? imageMessage.height : undefined;

    if (imgUrl) {
      // 对图片：缩略图本身已经能表达类型，预览文本只展示“说明部分”（content/文件名等）。
      const caption = previewText.replace(/^\[图片\]\s*/, "").trim();
      return (
        <span className="inline-flex items-center gap-2 min-w-0 align-middle">
          <img
            src={imgUrl}
            className="max-h-[64px] w-auto object-contain rounded"
            alt=""
            width={width}
            height={height}
          />
          {caption && (
            <span className="min-w-0 break-words">
              {caption}
            </span>
          )}
        </span>
      );
    }
  }

  return <>{previewText}</>;
}
