import type { MessageDirectResponse } from "../../../../api";
import type { MediaQuality, MediaType } from "@/utils/imgCompressUtils";
import BetterImg from "@/components/common/betterImg";
import { getImageMessageExtra, getVideoMessageExtra } from "@/types/messageExtra";
import { avatarThumbUrl, mediaFileUrl, normalizeMediaType } from "@/utils/mediaUrl";

interface MessageBubbleProps {
  message: MessageDirectResponse; // 消息内容
  isOwn: boolean; // 是否是自己的消息
  groupedWithPrevious?: boolean;
}

function formatMessageTimeLabel(createTime?: string | null) {
  if (!createTime) {
    return "";
  }
  const parsed = new Date(createTime);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleString("zh-CN", { hour12: false });
}

function resolveMediaPayloadUrl(
  payload: { fileId?: number; mediaType?: string } | undefined,
  quality: MediaQuality,
  expectedMediaType?: MediaType,
) {
  const resolvedMediaType = payload?.mediaType ? normalizeMediaType(payload.mediaType) : expectedMediaType;
  return mediaFileUrl(payload?.fileId, resolvedMediaType, quality);
}

function MessageAvatar({ name, fileId }: { name?: string; fileId?: number }) {
  const initial = name?.trim()?.slice(0, 1) || "?";
  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-base-300 text-xs font-semibold text-base-content/60">
      {fileId
        ? (
            <img
              src={avatarThumbUrl(fileId)}
              alt=""
              width={32}
              height={32}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )
        : (
            <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
              {initial}
            </div>
          )}
    </div>
  );
}

export default function MessageBubble({ message, isOwn, groupedWithPrevious = false }: MessageBubbleProps) {
  const messageTimeLabel = formatMessageTimeLabel(message.createTime || null);

  // 渲染消息内容（文本/图片/视频）
  const renderMessageContent = () => {
    if (message.messageType === 2) {
      const imgData = getImageMessageExtra(message.extra);
      return (
        <div data-message-id={message.messageId}>
          <BetterImg
            src={resolveMediaPayloadUrl(imgData, "medium", "image")}
            size={{ width: imgData?.width, height: imgData?.height }}
            className="max-h-[40vh] max-w-[245px] rounded-lg"
          />
        </div>
      );
    }

    if (message.messageType === 14) {
      const videoMessage = getVideoMessageExtra(message.extra);
      const videoUrl = resolveMediaPayloadUrl(videoMessage, "medium", "video");
      if (videoUrl) {
        return (
          <div data-message-id={message.messageId}>
            <video
              src={videoUrl}
              controls={true}
              preload="metadata"
              className="max-h-[40vh] max-w-[245px] rounded-lg bg-black"
            />
          </div>
        );
      }
      return <div className="whitespace-pre-wrap break-words">[视频]</div>;
    }

    return (
      <div
        className="whitespace-pre-wrap break-words"
        data-message-id={message.messageId}
      >
        {message.content}
      </div>
    );
  };

  const isMediaMessage = message.messageType === 2 || message.messageType === 14;

  const getMessageBubbleClass = () => {
    const baseClass = "rounded-2xl max-w-[min(70%,680px)] text-sm leading-6";

    if (isMediaMessage) {
      return baseClass;
    }

    if (isOwn) {
      return `${baseClass} bg-blue-500 text-white px-3 py-1.5`;
    }
    else {
      return `${baseClass} bg-base-300/80 dark:bg-gray-700 text-base-content px-3 py-1.5`;
    }
  };

  return (
    <div
      key={message.messageId}
      className={[
        "group/message flex items-end gap-2",
        isOwn ? "justify-end" : "justify-start",
        groupedWithPrevious ? "mt-0.5" : "mt-3",
      ].join(" ")}
    >
      {!isOwn && (
        groupedWithPrevious
          ? <div className="h-8 w-8 shrink-0" aria-hidden="true" />
          : <MessageAvatar name={message.senderUsername} fileId={message.senderAvatarFileId} />
      )}

      <div className={`flex max-w-[min(70%,680px)] flex-col ${isOwn ? "items-end" : "items-start"}`}>
        <div className={getMessageBubbleClass()}>
          {renderMessageContent()}
        </div>
        {messageTimeLabel && (
          <div className="h-0 px-1 text-[11px] leading-none text-base-content/45 opacity-0 transition-opacity duration-150 group-hover/message:h-3 group-hover/message:pt-1 group-hover/message:opacity-100">
            {messageTimeLabel}
          </div>
        )}
      </div>

      {isOwn && (
        groupedWithPrevious
          ? <div className="h-8 w-8 shrink-0" aria-hidden="true" />
          : <MessageAvatar name={message.senderUsername} fileId={message.senderAvatarFileId} />
      )}
    </div>
  );
}
