import type { Message } from "../../../../api";
import { FileArrowUpIcon } from "@phosphor-icons/react";
import { useEffect, useMemo } from "react";
import { resolveRenderedSoundMessagePurpose } from "@/components/chat/infra/audioMessage/audioMessagePurpose";
import AudioMessage from "@/components/chat/message/media/AudioMessage";
import CachedVideoMessage from "@/components/chat/message/media/CachedVideoMessage";
import { resolveMessageMediaUrl } from "@/components/chat/message/messageMediaSource";
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
import { mediaFileUrl } from "@/utils/mediaUrl";

type ReadonlyRenderableMessage = Pick<
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

type LocalImageMessagePayload = NonNullable<ReturnType<typeof getImageMessageExtra>> & {
  localFile?: File;
};

interface LocalMediaMessagePayload {
  localFile?: File;
}

function getLocalPreviewFile(payload: LocalMediaMessagePayload | undefined): File | undefined {
  if (typeof File === "undefined") {
    return undefined;
  }
  const localFile = payload?.localFile;
  return localFile instanceof File ? localFile : undefined;
}

function getLocalImagePreviewFile(payload: ReturnType<typeof getImageMessageExtra>): File | undefined {
  return getLocalPreviewFile(payload as LocalImageMessagePayload | undefined);
}

function useLocalPreviewUrl(file: File | undefined): string | undefined {
  const objectUrl = useMemo(() => {
    if (!file || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      return undefined;
    }
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!objectUrl || typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") {
      return;
    }
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return objectUrl;
}

function formatFileSize(bytes?: number) {
  if (!bytes || Number.isNaN(bytes)) {
    return "";
  }

  const units = ["B", "KiB", "MiB", "GiB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const valueLabel = unitIndex === 0 ? String(Math.round(value)) : value.toFixed(1);
  return `${valueLabel} ${units[unitIndex]}`;
}

export default function MessageContentRenderer({
  message,
  annotations: providedAnnotations,
  cacheKeyBase,
}: MessageContentRendererProps) {
  const effectiveAnnotationsBase = normalizeAnnotations(providedAnnotations ?? message.annotations);
  const imagePayload = getImageMessageExtra(message.extra);
  const soundPayload = getSoundMessageExtra(message.extra);
  const videoPayload = getVideoMessageExtra(message.extra);
  const localSoundUrl = useLocalPreviewUrl(getLocalPreviewFile(soundPayload as LocalMediaMessagePayload | undefined));
  const localVideoUrl = useLocalPreviewUrl(getLocalPreviewFile(videoPayload as LocalMediaMessagePayload | undefined));
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
      const localPreviewFile = getLocalImagePreviewFile(imagePayload);
      const imgSrc = localPreviewFile ?? resolveMessageMediaUrl(imagePayload, "medium", "image");
      const imgWidth = !localPreviewFile && typeof imagePayload?.width === "number" ? imagePayload.width : undefined;
      const imgHeight = !localPreviewFile && typeof imagePayload?.height === "number" ? imagePayload.height : undefined;

      return (
        <div className="flex flex-col gap-1">
          {imgSrc
            ? (
                <BetterImg
                  src={imgSrc}
                  size={{ width: imgWidth, height: imgHeight }}
                  zoomQuality="original"
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
      const fileUrl = mediaFileUrl(fileMessage?.fileId, fileMessage?.mediaType, "low");
      const fileName = fileMessage?.fileName || message.content || "文件";
      const sizeLabel = formatFileSize(fileMessage?.size);
      const contentNode = (
        <div className="flex min-w-0 w-full items-center gap-2 rounded-md bg-base-200/45 px-2 py-1.5 transition group-hover/file:bg-base-300/70">
          <FileArrowUpIcon className="size-5 shrink-0 text-base-content/75" />
          <span className="min-w-0 truncate text-sm text-base-content decoration-error/60 decoration-dotted underline-offset-3 group-hover/file:underline">
            {fileName}
          </span>
          {sizeLabel && <span className="shrink-0 text-sm text-base-content/50">{sizeLabel}</span>}
        </div>
      );

      return fileUrl
        ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="group/file flex min-w-0 w-full items-center no-underline"
              onClick={event => event.stopPropagation()}
            >
              {contentNode}
            </a>
          )
        : contentNode;
    }
    case MESSAGE_TYPE.VIDEO: {
      const videoUrl = localVideoUrl ?? resolveMessageMediaUrl(videoPayload, "low", "video");
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
        <div className="text-sm">
          <div className="whitespace-pre-wrap break-words">
            {result || "[骰子结果]"}
          </div>
        </div>
      );
    }
    case MESSAGE_TYPE.SOUND: {
      const audioUrl = localSoundUrl ?? resolveMessageMediaUrl(soundPayload, "low", "audio");
      const duration = soundPayload?.second;
      const purpose = resolveRenderedSoundMessagePurpose({
        annotations: effectiveAnnotations,
        payloadPurpose: soundPayload?.purpose,
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
                  title={soundPayload?.fileName}
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
