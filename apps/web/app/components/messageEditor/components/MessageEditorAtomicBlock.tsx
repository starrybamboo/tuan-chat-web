import type { MessageEditorMessage } from "../messageEditorTypes";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CachedVideoMessage from "@/components/chat/message/media/CachedVideoMessage";
import MessageContentRenderer from "@/components/chat/message/messageContentRenderer";
import { resolveMessageMediaUrl } from "@/components/chat/message/messageMediaSource";
import { MediaImage } from "@/components/common/mediaImage";
import { TrashIcon } from "@/icons";
import { getImageMessageExtra, getVideoMessageExtra } from "@/types/messageExtra";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { isMessageEditorFileDrag, isMessageEditorUploadableMediaMessage } from "../runtime/messageEditorFileDrop";

interface MessageEditorAtomicBlockProps {
  active?: boolean;
  blockId: string;
  message: MessageEditorMessage;
  onDelete?: (blockId: string) => void;
  onFocus: (blockId: string) => void;
  onResize?: (blockId: string, size: { height: number; width: number }) => void;
  onUpdate?: (blockId: string, updater: (message: MessageEditorMessage) => MessageEditorMessage) => void;
  onUpload: (blockId: string, file: File) => Promise<void>;
  readOnly?: boolean;
}

function resolveUploadMeta(message: MessageEditorMessage) {
  switch (message.messageType) {
    case MESSAGE_TYPE.IMG:
      return {
        accept: "image/*",
        emptyLabel: "上传图片",
        replaceLabel: "更换图片",
        title: "图片块",
      };
    case MESSAGE_TYPE.FILE:
      return {
        accept: "*/*",
        emptyLabel: "上传文件",
        replaceLabel: "更换文件",
        title: "文件块",
      };
    case MESSAGE_TYPE.SOUND:
      return {
        accept: "audio/*",
        emptyLabel: "上传音频",
        replaceLabel: "更换音频",
        title: "音频块",
      };
    case MESSAGE_TYPE.VIDEO:
      return {
        accept: "video/*",
        emptyLabel: "上传视频",
        replaceLabel: "更换视频",
        title: "视频块",
      };
    case MESSAGE_TYPE.DICE:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "骰子块",
      };
    case MESSAGE_TYPE.WEBGAL_CHOOSE:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "选择块",
      };
    case MESSAGE_TYPE.DOC_CARD:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "文档块",
      };
    case MESSAGE_TYPE.ROOM_JUMP:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "群聊跳转",
      };
    case MESSAGE_TYPE.SYSTEM:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "系统消息",
      };
    case MESSAGE_TYPE.FORWARD:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "转发消息",
      };
    case MESSAGE_TYPE.EFFECT:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "特效",
      };
    case MESSAGE_TYPE.COMMAND_REQUEST:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "检定请求",
      };
    case MESSAGE_TYPE.STATE_EVENT:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "状态事件",
      };
    case MESSAGE_TYPE.CLUE_CARD:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "线索卡片",
      };
    case MESSAGE_TYPE.READ_LINE:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "已读标记",
      };
    default:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "其他消息",
      };
  }
}

function hasUploadedMedia(message: MessageEditorMessage) {
  if (!isMessageEditorUploadableMediaMessage(message)) {
    return true;
  }

  if (message.messageType === MESSAGE_TYPE.IMG) {
    return Boolean(message.extra?.imageMessage?.source);
  }
  if (message.messageType === MESSAGE_TYPE.FILE) {
    return Boolean(message.extra?.fileMessage?.fileId);
  }
  if (message.messageType === MESSAGE_TYPE.SOUND) {
    return Boolean(message.extra?.soundMessage?.source);
  }
  if (message.messageType === MESSAGE_TYPE.VIDEO) {
    return Boolean(message.extra?.videoMessage?.source);
  }
  return true;
}

function resolveUploadedImageUrl(message: MessageEditorMessage) {
  const imageMessage = getImageMessageExtra(message.extra);
  return resolveMessageMediaUrl(imageMessage, "medium", "image");
}

function resolveUploadedVideoUrl(message: MessageEditorMessage) {
  const videoMessage = getVideoMessageExtra(message.extra);
  return resolveMessageMediaUrl(videoMessage, "low", "video");
}

function resolveMediaDimensions(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const record = payload as Record<string, unknown>;
  return {
    height: typeof record.height === "number" ? record.height : undefined,
    width: typeof record.width === "number" ? record.width : undefined,
  };
}

function resolveMediaEditorSize(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const record = payload as Record<string, unknown>;
  return {
    height: typeof record.editorHeight === "number" && record.editorHeight > 0 ? record.editorHeight : undefined,
    width: typeof record.editorWidth === "number" && record.editorWidth > 0 ? record.editorWidth : undefined,
  };
}

function formatAudioProgressLabel(second: unknown) {
  if (typeof second !== "number" || !Number.isFinite(second) || second <= 0) {
    return "";
  }

  const totalSeconds = Math.round(second);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `0:00 / ${minutes}:${seconds}`;
}

/**
 * 原子块编辑壳，负责上传、删除与媒体缩放交互。
 */
export function MessageEditorAtomicBlock({
  blockId,
  message,
  onDelete,
  onFocus,
  onResize,
  onUpload,
  readOnly = false,
}: MessageEditorAtomicBlockProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaFrameRef = useRef<HTMLDivElement | null>(null);
  const resizeSessionRef = useRef<{
    aspectRatio: number;
    lastWidth: number;
    startWidth: number;
    startX: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileDropActive, setFileDropActive] = useState(false);
  const uploadMeta = resolveUploadMeta(message);
  const uploadable = uploadMeta.accept.length > 0;
  const uploaded = hasUploadedMedia(message);
  const isImageBlock = message.messageType === MESSAGE_TYPE.IMG;
  const isVideoBlock = message.messageType === MESSAGE_TYPE.VIDEO;
  const isResizableMediaBlock = isImageBlock || isVideoBlock;
  const isCenteredUploadBlock = message.messageType === MESSAGE_TYPE.IMG
    || message.messageType === MESSAGE_TYPE.SOUND
    || message.messageType === MESSAGE_TYPE.VIDEO;
  const mediaPayload = isImageBlock
    ? getImageMessageExtra(message.extra)
    : isVideoBlock
      ? getVideoMessageExtra(message.extra)
      : undefined;
  const mediaDimensions = resolveMediaDimensions(mediaPayload);
  const mediaEditorSize = resolveMediaEditorSize(mediaPayload);
  const mediaEditorSizeRef = useRef(mediaEditorSize);
  mediaEditorSizeRef.current = mediaEditorSize;
  const [displayWidth, setDisplayWidth] = useState<number | null>(() => mediaEditorSize.width ?? null);
  const uploadedMediaUrl = isImageBlock
    ? resolveUploadedImageUrl(message)
    : isVideoBlock
      ? resolveUploadedVideoUrl(message)
      : "";
  const audioProgressLabel = message.messageType === MESSAGE_TYPE.SOUND
    ? formatAudioProgressLabel(message.extra?.soundMessage?.second)
    : "";
  const mediaAspectRatio = useMemo(() => {
    const editorWidth = typeof mediaEditorSize?.width === "number" && mediaEditorSize.width > 0 ? mediaEditorSize.width : 0;
    const editorHeight = typeof mediaEditorSize?.height === "number" && mediaEditorSize.height > 0 ? mediaEditorSize.height : 0;
    if (editorWidth > 0 && editorHeight > 0) {
      return editorHeight / editorWidth;
    }
    const width = typeof mediaDimensions?.width === "number" && mediaDimensions.width > 0 ? mediaDimensions.width : 0;
    const height = typeof mediaDimensions?.height === "number" && mediaDimensions.height > 0 ? mediaDimensions.height : 0;
    return width > 0 && height > 0 ? height / width : 1;
  }, [mediaDimensions?.height, mediaDimensions?.width, mediaEditorSize?.height, mediaEditorSize?.width]);
  const mediaIdentity = JSON.stringify(mediaPayload?.source ?? mediaPayload ?? {});

  useEffect(() => {
    setDisplayWidth(mediaEditorSizeRef.current.width ?? null);
    resizeSessionRef.current = null;
  }, [mediaIdentity]);

  const startUpload = useCallback((file: File) => {
    setUploadError("");
    setUploading(true);
    void onUpload(blockId, file)
      .catch((error) => {
        setUploadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        setUploading(false);
      });
  }, [blockId, onUpload]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    startUpload(file);
    event.target.value = "";
  }, [startUpload]);

  const handleFileDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (readOnly || !uploadable || !isMessageEditorFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    setFileDropActive(true);
  }, [readOnly, uploadable]);

  const handleFileDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (readOnly || !uploadable || !isMessageEditorFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, [readOnly, uploadable]);

  const handleFileDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (readOnly || !uploadable || !isMessageEditorFileDrag(event.dataTransfer)) {
      return;
    }

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return;
    }

    setFileDropActive(false);
  }, [readOnly, uploadable]);

  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (readOnly || !uploadable || !isMessageEditorFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setFileDropActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    startUpload(file);
  }, [readOnly, startUpload, uploadable]);

  const commitResize = (nextWidth: number) => {
    const clampedWidth = Math.max(160, Math.round(nextWidth));
    const nextHeight = Math.max(1, Math.round(clampedWidth * mediaAspectRatio));
    if (resizeSessionRef.current) {
      resizeSessionRef.current.lastWidth = clampedWidth;
    }
    setDisplayWidth(clampedWidth);
    onResize?.(blockId, {
      height: nextHeight,
      width: clampedWidth,
    });
  };

  const handleResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (readOnly || !uploaded || !uploadedMediaUrl) {
      return;
    }

    const frame = mediaFrameRef.current;
    if (!frame) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeSessionRef.current = {
      aspectRatio: mediaAspectRatio,
      lastWidth: displayWidth ?? frame.getBoundingClientRect().width,
      startWidth: displayWidth ?? frame.getBoundingClientRect().width,
      startX: event.clientX,
    };
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resizeSession = resizeSessionRef.current;
    if (!resizeSession) {
      return;
    }

    event.preventDefault();
    commitResize(resizeSession.startWidth + (event.clientX - resizeSession.startX));
  };

  const finishResize = (event?: React.PointerEvent<HTMLButtonElement>) => {
    const resizeSession = resizeSessionRef.current;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!resizeSession) {
      return;
    }

    resizeSessionRef.current = null;
    const currentWidth = resizeSession.lastWidth;
    onResize?.(blockId, {
      height: Math.max(1, Math.round(currentWidth * resizeSession.aspectRatio)),
      width: Math.max(1, Math.round(currentWidth)),
    });
  };

  const openFilePicker = () => {
    if (readOnly || !uploadable || uploading) {
      return;
    }
    fileInputRef.current?.click();
  };

  const deleteBlock = () => {
    onDelete?.(blockId);
  };

  const uploadButtonLabel = uploading
    ? "上传中..."
    : (uploaded ? uploadMeta.replaceLabel : uploadMeta.emptyLabel);
  const placeholderButtonLabel = uploading ? "上传中..." : `点击${uploadMeta.emptyLabel}`;

  const renderInlineDeleteAction = (label: string) => {
    if (readOnly) {
      return null;
    }
    return (
      <button
        type="button"
        className="
          pointer-events-none absolute right-1 top-1/2 z-10 flex size-7
          -translate-y-1/2 items-center justify-center rounded-md border
          border-base-300/70 bg-base-100/92 text-base-content/55 opacity-0
          shadow-sm transition duration-150
          hover:border-error/40 hover:text-error
          group-hover/media:pointer-events-auto group-hover/media:opacity-100
          group-focus-within/media:pointer-events-auto
          group-focus-within/media:opacity-100
        "
        onMouseDown={event => event.preventDefault()}
        onClick={deleteBlock}
        aria-label={label}
        title={label}
      >
        <TrashIcon className="size-4" />
      </button>
    );
  };

  const renderFloatingUploadActions = () => {
    if (readOnly) {
      return null;
    }
    return (
      <div className="
        pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2
        opacity-0 transition-opacity duration-150
        group-hover/media:pointer-events-auto group-hover/media:opacity-100
        group-focus-within/media:pointer-events-auto
        group-focus-within/media:opacity-100
      ">
        {uploadable && (
          <button
            type="button"
            className="
              rounded-md border border-base-300/70 bg-base-100/92 px-2 py-1
              text-xs text-base-content/75 shadow-sm transition
              hover:border-primary/40 hover:text-base-content
            "
            onMouseDown={event => event.preventDefault()}
            onClick={openFilePicker}
          >
            {uploadButtonLabel}
          </button>
        )}
        <button
          type="button"
          className="
            rounded-md border border-base-300/70 bg-base-100/92 px-2 py-1
            text-xs text-base-content/75 shadow-sm transition
            hover:border-error/40 hover:text-error
          "
          onMouseDown={event => event.preventDefault()}
          onClick={deleteBlock}
        >
          删除
        </button>
      </div>
    );
  };

  const renderEmptyUploadBlock = () => (
    <>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-base-content/55">{uploadMeta.title}</div>
        {!readOnly && (
          <button
            type="button"
            className="
              rounded-md border border-base-300 px-2 py-1 text-xs
              text-base-content/70 transition
              hover:border-error/40 hover:text-error
            "
            onMouseDown={event => event.preventDefault()}
            onClick={deleteBlock}
          >
            删除
          </button>
        )}
      </div>
      <button
        type="button"
        className="
          flex min-h-24 w-full items-center justify-center rounded-xl border
          border-dashed border-base-300 bg-base-200/25 px-4 py-4 text-sm
          text-base-content/55 transition
          hover:border-primary/45 hover:bg-base-200/40 hover:text-base-content
        "
        onMouseDown={event => event.preventDefault()}
        onClick={openFilePicker}
      >
        {placeholderButtonLabel}
      </button>
    </>
  );

  const renderResizableMediaBlock = () => {
    const mediaLabel = isImageBlock ? "图片" : "视频";
    const resizeLabel = `拖拽缩放${mediaLabel}`;

    return (
      <div className="group/media flex flex-col gap-3">
        {uploaded && uploadedMediaUrl
          ? (
              <div
                ref={mediaFrameRef}
                className="
                  group/media relative overflow-hidden rounded-xl bg-base-100
                "
                style={displayWidth !== null ? { maxWidth: "100%", width: `${displayWidth}px` } : undefined}
              >
                {renderFloatingUploadActions()}

                {!readOnly && (
                  <button
                    type="button"
                    className="
                      pointer-events-none absolute right-0 top-1/2 z-10 flex
                      h-20 w-3 translate-x-1/2 -translate-y-1/2 cursor-ew-resize
                      items-center justify-center rounded-full border
                      border-base-300/70 bg-base-100/92 opacity-0 shadow-sm
                      transition duration-150
                      hover:border-primary/40 hover:bg-primary/10
                      group-hover/media:pointer-events-auto
                      group-hover/media:opacity-100
                      group-focus-within/media:pointer-events-auto
                      group-focus-within/media:opacity-100
                    "
                    onPointerDown={handleResizePointerDown}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={finishResize}
                    onPointerCancel={finishResize}
                    aria-label={resizeLabel}
                    title={resizeLabel}
                  >
                    <span className="h-8 w-0.5 rounded-full bg-base-content/25" />
                  </button>
                )}

                {isImageBlock
                  ? (
                      <MediaImage
                        src={uploadedMediaUrl}
                        alt={message.content?.trim() || uploadMeta.title}
                        width={typeof mediaDimensions?.width === "number" ? mediaDimensions.width : undefined}
                        height={typeof mediaDimensions?.height === "number" ? mediaDimensions.height : undefined}
                        className="
                          block h-auto w-full max-w-full object-contain
                        "
                      />
                    )
                  : (
                      <CachedVideoMessage
                        cacheKey={`${blockId}:video`}
                        url={uploadedMediaUrl}
                        className="
                          block h-auto w-full max-w-full bg-black object-contain
                        "
                      />
                    )}
              </div>
            )
          : renderEmptyUploadBlock()}

        {message.content && (
          <div className="
            whitespace-pre-wrap break-words text-sm text-base-content/80
          ">
            {message.content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={[
        "flex flex-col gap-3 transition-colors",
        fileDropActive ? "rounded-sm bg-base-200/30 ring-1 ring-primary/30" : "",
      ].join(" ")}
      onMouseDownCapture={() => {
        if (!readOnly) {
          onFocus(blockId);
        }
      }}
      onDragEnter={handleFileDragEnter}
      onDragLeave={handleFileDragLeave}
      onDragOver={handleFileDragOver}
      onDrop={handleFileDrop}
    >
      {uploadable && (
        <input
          ref={fileInputRef}
          type="file"
          accept={uploadMeta.accept}
          className="hidden"
          onChange={handleFileInputChange}
        />
      )}

      {isResizableMediaBlock
        ? renderResizableMediaBlock()
        : (
            <>
              {!uploaded && uploadable
                ? renderEmptyUploadBlock()
                : (
                    <>
                      {!isCenteredUploadBlock && message.messageType !== MESSAGE_TYPE.FILE && (
                        <div className="
                          mb-2 flex items-center justify-between gap-2
                        ">
                          <div className="
                            text-xs font-medium text-base-content/55
                          ">{uploadMeta.title}</div>
                          {!readOnly && (
                            <div className="flex items-center gap-2">
                              {uploadable && (
                                <button
                                  type="button"
                                  className="
                                    rounded-md border border-base-300 px-2 py-1
                                    text-xs text-base-content/70 transition
                                    hover:border-primary/40
                                    hover:text-base-content
                                  "
                                  onMouseDown={event => event.preventDefault()}
                                  onClick={openFilePicker}
                                >
                                  {uploadButtonLabel}
                                </button>
                              )}
                              <button
                                type="button"
                                className="
                                  rounded-md border border-base-300 px-2 py-1
                                  text-xs text-base-content/70 transition
                                  hover:border-error/40 hover:text-error
                                "
                                onMouseDown={event => event.preventDefault()}
                                onClick={deleteBlock}
                              >
                                删除
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={message.messageType === MESSAGE_TYPE.SOUND
                          ? "group/media relative inline-block max-w-full pr-9"
                          : message.messageType === MESSAGE_TYPE.FILE
                            ? "group/media relative min-w-0 pr-9"
                            : isCenteredUploadBlock
                              ? "group/media relative"
                              : ""}
                      >
                        {isCenteredUploadBlock && message.messageType !== MESSAGE_TYPE.SOUND && renderFloatingUploadActions()}
                        <MessageContentRenderer
                          message={{
                            ...message,
                            content: message.content ?? "",
                            messageType: message.messageType ?? 0,
                          }}
                        />
                        {audioProgressLabel && <span className="sr-only">{audioProgressLabel}</span>}
                        {message.messageType === MESSAGE_TYPE.SOUND && renderInlineDeleteAction("删除音频块")}
                        {message.messageType === MESSAGE_TYPE.FILE && renderInlineDeleteAction("删除文件块")}
                      </div>
                    </>
                  )}
            </>
          )}

      {uploadError && (
        <div className="
          mt-3 rounded-md border border-error/20 bg-error/5 px-3 py-2 text-xs
          text-error
        ">
          {uploadError}
        </div>
      )}
    </div>
  );
}
