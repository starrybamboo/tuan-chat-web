import { ArrowClockwiseIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import {
  getDirectMessagePreviewText,
  isFailedDirectMessage,
  isOptimisticDirectMessage,
} from "@tuanchat/domain/direct-message";

import { resolveMessageMediaUrl } from "@/components/chat/message/messageMediaSource";
import BetterImg from "@/components/common/betterImg";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { getImageMessageExtra, getVideoMessageExtra } from "@/types/messageExtra";
import { formatTimeSmartly } from "@/utils/dateUtil";

import type { MessageDirectResponse } from "../../../../api";

type MessageBubbleProps = {
  message: MessageDirectResponse; // 消息内容
  replyMessage?: MessageDirectResponse | null;
  isOwn: boolean; // 是否是自己的消息
  groupedWithPrevious?: boolean;
  onRemoveFailed?: () => void;
  onRetryFailed?: () => void;
}

function formatMessageTimeLabel(createTime?: string | null) {
  if (!createTime) {
    return "";
  }
  const parsed = new Date(createTime);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return formatTimeSmartly(createTime);
}

function MessageAvatar({ name, fileId }: { name?: string; fileId?: number }) {
  const initial = name?.trim()?.slice(0, 1) || "?";
  return (
    <div className="
      h-8 w-8 shrink-0 overflow-hidden rounded-full bg-base-300 text-xs
      font-semibold text-base-content/60
    ">
      {fileId
        ? (
            <UserAvatarByUser
              user={{
                avatarFileId: fileId,
                username: name,
              }}
              width={8}
              isRounded={true}
              stopToastWindow={true}
              clickEnterProfilePage={false}
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

export default function MessageBubble({
  message,
  replyMessage = null,
  isOwn,
  groupedWithPrevious = false,
  onRemoveFailed,
  onRetryFailed,
}: MessageBubbleProps) {
  const messageTimeLabel = formatMessageTimeLabel(message.createTime || null);
  const isRecalled = message.status === 1;
  const isFailed = isOwn && isFailedDirectMessage(message);
  const isSending = isOwn && isOptimisticDirectMessage(message);
  const showReplyPreview = !isRecalled && typeof message.replyMessageId === "number" && message.replyMessageId > 0;

  // 渲染消息内容（文本/图片/视频）
  const renderMessageContent = () => {
    if (isRecalled) {
      return (
        <div
          className="text-base-content/55 italic"
          data-message-id={message.messageId}
        >
          此消息已被撤回
        </div>
      );
    }

    if (message.messageType === 2) {
      const imgData = getImageMessageExtra(message.extra);
      return (
        <div data-message-id={message.messageId}>
          <BetterImg
            src={resolveMessageMediaUrl(imgData, "medium", "image")}
            size={{ width: imgData?.width, height: imgData?.height }}
            className="max-h-[40vh] max-w-[245px] rounded-lg"
            zoomQuality="original"
          />
        </div>
      );
    }

    if (message.messageType === 14) {
      const videoMessage = getVideoMessageExtra(message.extra);
      const videoUrl = resolveMessageMediaUrl(videoMessage, "medium", "video");
      if (videoUrl) {
        return (
          <div data-message-id={message.messageId}>
            <video
              src={videoUrl}
              controls={true}
              preload="metadata"
              className="max-h-[40vh] max-w-[245px] rounded-lg bg-transparent"
            />
          </div>
        );
      }
      return <div className="whitespace-pre-wrap break-words text-pretty">[视频]</div>;
    }

    return (
      <div
        className="whitespace-pre-wrap break-words text-pretty"
        data-message-id={message.messageId}
      >
        {message.content}
      </div>
    );
  };

  const isMediaMessage = !isRecalled && (message.messageType === 2 || message.messageType === 14);
  const shouldUseOwnReplyPreviewTone = isOwn && !isMediaMessage;

  const getMessageBubbleClass = () => {
    const baseClass = "max-w-full rounded-2xl text-sm leading-6";

    if (isMediaMessage) {
      return baseClass;
    }

    if (isOwn) {
      return `${baseClass} bg-info text-white px-3 py-1.5`;
    }
    else {
      return `${baseClass} bg-base-300/80 dark:bg-base-300 text-base-content px-3 py-1.5`;
    }
  };

  return (
    <div
      key={message.messageId}
      data-message-id={message.messageId}
      data-local-sync-state={isFailed ? "failed" : isSending ? "optimistic" : undefined}
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

      <div className={`
        relative flex max-w-[min(70%,680px)] min-w-0 flex-col
        ${isOwn ? `items-end` : `items-start`}
      `}>
        <div
          className={getMessageBubbleClass()}
          data-message-id={message.messageId}
          data-private-message-menu-anchor="true"
        >
          {showReplyPreview && (
            <div className={[
              "mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs leading-5",
              shouldUseOwnReplyPreviewTone
                ? "border-white/60 bg-white/15 text-white/80"
                : "border-base-content/25 bg-base-100/60 text-base-content/65",
            ].join(" ")}
            >
              <div className="truncate font-medium">
                回复
                {replyMessage?.senderUsername ? ` ${replyMessage.senderUsername}` : ""}
              </div>
              <div className="truncate">
                {replyMessage ? getDirectMessagePreviewText(replyMessage) : "[原消息不可见]"}
              </div>
            </div>
          )}
          {renderMessageContent()}
        </div>
        {messageTimeLabel && (
          <div className="
            pointer-events-none absolute bottom-full right-0 z-10 mb-1 whitespace-nowrap
            rounded bg-base-300/90 px-1.5 py-1
            text-[11px] leading-none text-base-content/50 opacity-0
            translate-y-0.5 transition-[opacity,transform] duration-150
            motion-reduce:translate-y-0 motion-reduce:transition-none
            group-hover/message:opacity-100 group-hover/message:translate-y-0
          ">
            {messageTimeLabel}
          </div>
        )}
        {isSending && (
          <div className="mt-1 pr-1 text-xs text-base-content/45" aria-live="polite">
            发送中
          </div>
        )}
        {isFailed && (
          <div className="mt-1 flex items-center justify-end gap-1.5 pr-1 text-xs text-error">
            <span>发送失败</span>
            {onRetryFailed && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-error/10"
                title="重新发送"
                aria-label="重新发送失败私聊消息"
                onClick={onRetryFailed}
              >
                <ArrowClockwiseIcon className="size-3.5" />
                重试
              </button>
            )}
            {onRemoveFailed && (
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center rounded-md hover:bg-error/10"
                title="删除失败私聊消息"
                aria-label="删除失败私聊消息"
                onClick={onRemoveFailed}
              >
                <TrashSimpleIcon className="size-3.5" />
              </button>
            )}
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
