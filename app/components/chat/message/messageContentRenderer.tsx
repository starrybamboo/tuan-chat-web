import type { Message } from "../../../../api";
import { resolveRenderedSoundMessagePurpose } from "@/components/chat/infra/audioMessage/audioMessagePurpose";
import AudioMessage from "@/components/chat/message/media/AudioMessage";
import CachedVideoMessage from "@/components/chat/message/media/CachedVideoMessage";
import WebgalChooseMessage from "@/components/chat/message/webgalChooseMessage";
import StateMessageCard from "@/components/chat/state/stateMessageCard";
import BetterImg from "@/components/common/betterImg";
import {
  ANNOTATION_IDS,
  getSceneEffectFromAnnotations,
  getSceneEffectLabel,
  hasAnnotation,
  normalizeAnnotations,
} from "@/types/messageAnnotations";
import {
  getFileMessageExtra,
  getImageMessageExtra,
  getSoundMessageExtra,
  getVideoMessageExtra,
} from "@/types/messageExtra";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalChoosePayload } from "@/types/webgalChoose";
import type { MediaQuality, MediaType } from "@/utils/imgCompressUtils";
import { mediaFileUrl, mediaFileUrlWithQuality, normalizeMediaType } from "@/utils/mediaUrl";

export type ReadonlyRenderableMessage = Pick<
  Message,
  | "messageType"
  | "content"
  | "annotations"
  | "roleId"
  | "avatarId"
  | "customRoleName"
> & Partial<Pick<Message, "messageId" | "roomId" | "status">> & {
  extra?: Record<string, any>;
  webgal?: Record<string, any>;
};

interface MessageContentRendererProps {
  message: ReadonlyRenderableMessage;
  annotations?: string[];
  cacheKeyBase?: string;
}

function formatFileSize(bytes?: number) {
  if (!bytes || Number.isNaN(bytes)) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)}${units[unitIndex]}`;
}

function resolveMediaPayloadUrl(
  payload: { fileId?: number; mediaType?: string; url?: string } | undefined,
  quality: MediaQuality,
  expectedMediaType?: MediaType,
) {
  const resolvedMediaType = payload?.mediaType ? normalizeMediaType(payload.mediaType) : expectedMediaType;
  const mediaUrl = mediaFileUrl(payload?.fileId, resolvedMediaType, quality);
  const fallbackUrl = typeof payload?.url === "string"
    ? resolvedMediaType
      ? mediaFileUrlWithQuality(payload.url, resolvedMediaType, quality)
      : payload.url
    : "";
  return mediaUrl || fallbackUrl;
}

export default function MessageContentRenderer({
  message,
  annotations: providedAnnotations,
  cacheKeyBase,
}: MessageContentRendererProps) {
  const effectiveAnnotationsBase = normalizeAnnotations(providedAnnotations ?? message.annotations);
  const imagePayload = getImageMessageExtra(message.extra);
  const effectiveAnnotations = message.messageType === MESSAGE_TYPE.IMG && imagePayload?.background
    ? (effectiveAnnotationsBase.includes(ANNOTATION_IDS.BACKGROUND)
        ? effectiveAnnotationsBase
        : [...effectiveAnnotationsBase, ANNOTATION_IDS.BACKGROUND])
    : effectiveAnnotationsBase;
  const resolvedCacheKeyBase = cacheKeyBase || `message-preview:${message.messageId ?? "temp"}`;

  if (message.status === 1) {
    return <span className="text-xs text-base-content/60">[原消息已删除]</span>;
  }

  switch (message.messageType) {
    case MESSAGE_TYPE.TEXT:
      return (
        <div className="whitespace-pre-wrap break-words">
          {message.content || "[空消息]"}
        </div>
      );
    case MESSAGE_TYPE.INTRO_TEXT:
      return (
        <div className="rounded-lg bg-black px-3 py-2 text-white shadow-inner">
          <div className="whitespace-pre-wrap break-words text-white">
            {message.content || "[黑屏文字]"}
          </div>
        </div>
      );
    case MESSAGE_TYPE.IMG: {
      const imgUrl = resolveMediaPayloadUrl(imagePayload, "high", "image");
      const imgWidth = typeof imagePayload?.width === "number" ? imagePayload.width : undefined;
      const imgHeight = typeof imagePayload?.height === "number" ? imagePayload.height : undefined;

      return (
        <div className="flex flex-col gap-1">
          {imgUrl
            ? (
                <BetterImg
                  src={imgUrl}
                  size={{ width: imgWidth, height: imgHeight }}
                  className="h-auto max-h-[350px] max-w-full rounded"
                />
              )
            : (
                <span className="text-xs text-base-content/60">[图片]</span>
              )}
          {message.content && (
            <div className="whitespace-pre-wrap break-words text-sm text-base-content/80">
              {message.content}
            </div>
          )}
        </div>
      );
    }
    case MESSAGE_TYPE.FILE: {
      const fileMessage = getFileMessageExtra(message.extra);
      const fileUrl = resolveMediaPayloadUrl(fileMessage, "original");
      const fileName = fileMessage?.fileName || message.content || "文件";
      const sizeLabel = formatFileSize(fileMessage?.size);
      const contentNode = (
        <div className="flex min-w-0 items-center gap-2">
          <span className="badge badge-outline badge-xs">文件</span>
          <span className="truncate">{fileName}</span>
          {sizeLabel && <span className="text-[10px] text-base-content/50">{sizeLabel}</span>}
        </div>
      );

      return fileUrl
        ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="link link-hover flex items-center gap-2"
              onClick={event => event.stopPropagation()}
            >
              {contentNode}
            </a>
          )
        : contentNode;
    }
    case MESSAGE_TYPE.VIDEO: {
      const videoMessage = getVideoMessageExtra(message.extra);
      const videoUrl = resolveMediaPayloadUrl(videoMessage, "high", "video");
      return (
        <div className="flex min-w-0 w-full max-w-[420px] flex-col gap-2">
          {videoUrl
            ? (
                <div className="relative overflow-hidden rounded-2xl border border-base-300/70 bg-base-200/40 shadow-sm">
                  <CachedVideoMessage
                    cacheKey={`${resolvedCacheKeyBase}:video`}
                    url={videoUrl}
                    className="block max-h-[360px] w-full bg-black object-contain"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
                  <span className="pointer-events-none badge badge-neutral badge-xs absolute left-2 top-2 opacity-90">视频</span>
                </div>
              )
            : (
                <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 px-3 py-6 text-center text-xs text-base-content/60">
                  [视频资源不可用]
                </div>
              )}
          {message.content && (
            <div className="whitespace-pre-wrap break-words text-sm text-base-content/80">
              {message.content}
            </div>
          )}
        </div>
      );
    }
    case MESSAGE_TYPE.DICE: {
      const diceResult = message.extra?.diceResult;
      const result = diceResult?.result || message.content || "";
      return (
        <div className="relative text-sm">
          <span className="badge badge-accent badge-xs absolute right-0 top-0">骰娘</span>
          <div className="whitespace-pre-wrap break-words pr-10 pt-1">
            {result || "[骰子结果]"}
          </div>
        </div>
      );
    }
    case MESSAGE_TYPE.SOUND: {
      const soundMessage = getSoundMessageExtra(message.extra);
      const audioUrl = resolveMediaPayloadUrl(soundMessage, "high", "audio");
      const duration = soundMessage?.second;
      const purpose = resolveRenderedSoundMessagePurpose({
        annotations: effectiveAnnotations,
        payloadPurpose: soundMessage?.purpose,
        content: message.content,
      });
      return (
        <div className="flex flex-col gap-2">
          {audioUrl
            ? (
                <AudioMessage
                  roomId={message.roomId}
                  messageId={message.messageId}
                  purpose={purpose}
                  cacheKey={`${resolvedCacheKeyBase}:audio`}
                  url={audioUrl}
                  duration={typeof duration === "number" ? duration : undefined}
                  title={soundMessage?.fileName}
                />
              )
            : (
                <span className="text-xs text-base-content/60">[语音]</span>
              )}
          {message.content && (
            <div className="whitespace-pre-wrap break-words text-sm text-base-content/80">
              {message.content}
            </div>
          )}
        </div>
      );
    }
    case MESSAGE_TYPE.EFFECT: {
      const sceneEffectName = getSceneEffectFromAnnotations(effectiveAnnotations);
      const effectName = getSceneEffectLabel(sceneEffectName)
        || (hasAnnotation(effectiveAnnotations, ANNOTATION_IDS.BACKGROUND_CLEAR) ? "清除背景" : "")
        || (hasAnnotation(effectiveAnnotations, ANNOTATION_IDS.FIGURE_CLEAR) ? "清除立绘" : "")
        || message.content
        || "特效";
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="badge badge-info badge-xs">特效</span>
          <span className="opacity-70">{effectName}</span>
        </div>
      );
    }
    case MESSAGE_TYPE.WEBGAL_CHOOSE: {
      const payload = extractWebgalChoosePayload(message.extra);
      return <WebgalChooseMessage payload={payload} />;
    }
    case MESSAGE_TYPE.STATE_EVENT:
      return <StateMessageCard message={message} />;
    case MESSAGE_TYPE.SYSTEM:
      return (
        <div className="whitespace-pre-wrap break-words text-sm text-base-content/60">
          {message.content || "[系统消息]"}
        </div>
      );
    default:
      return (
        <div className="whitespace-pre-wrap break-words text-sm text-base-content/80">
          {message.content || "[未知消息]"}
        </div>
      );
  }
}
