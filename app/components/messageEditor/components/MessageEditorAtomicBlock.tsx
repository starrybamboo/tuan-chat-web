import type { MessageDraft } from "@/types/messageDraft";

import { useRef, useState } from "react";
import MessageContentRenderer from "@/components/chat/message/messageContentRenderer";
import { getImageMessageExtra } from "@/types/messageExtra";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { mediaFileUrl } from "@/utils/mediaUrl";

interface MessageEditorAtomicBlockProps {
  active: boolean;
  blockId: string;
  message: MessageDraft;
  onDelete: (blockId: string) => void;
  onFocus: (blockId: string) => void;
  onUpload: (blockId: string, file: File) => Promise<void>;
  readOnly?: boolean;
}

function resolveUploadMeta(message: MessageDraft) {
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
    default:
      return {
        accept: "",
        emptyLabel: "",
        replaceLabel: "",
        title: "消息块",
      };
  }
}

function hasUploadedMedia(message: MessageDraft) {
  if (message.messageType === MESSAGE_TYPE.IMG) {
    return Boolean(message.extra?.imageMessage?.fileId);
  }
  if (message.messageType === MESSAGE_TYPE.FILE) {
    return Boolean(message.extra?.fileMessage?.fileId);
  }
  if (message.messageType === MESSAGE_TYPE.SOUND) {
    return Boolean(message.extra?.soundMessage?.fileId);
  }
  if (message.messageType === MESSAGE_TYPE.VIDEO) {
    return Boolean(message.extra?.videoMessage?.fileId);
  }
  return true;
}

function resolveUploadedImageUrl(message: MessageDraft) {
  const imageMessage = getImageMessageExtra(message.extra);
  if (typeof imageMessage?.fileId !== "number" || imageMessage.fileId <= 0) {
    return "";
  }
  return mediaFileUrl(imageMessage.fileId, imageMessage.mediaType, "medium");
}

/**
 * 原子块编辑壳，负责上传与删除交互。
 */
export function MessageEditorAtomicBlock({
  blockId,
  message,
  onDelete,
  onFocus,
  onUpload,
  readOnly = false,
}: MessageEditorAtomicBlockProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const uploadMeta = resolveUploadMeta(message);
  const uploadable = uploadMeta.accept.length > 0;
  const uploaded = hasUploadedMedia(message);
  const isImageBlock = message.messageType === MESSAGE_TYPE.IMG;
  const imagePayload = isImageBlock ? getImageMessageExtra(message.extra) : undefined;
  const uploadedImageUrl = isImageBlock ? resolveUploadedImageUrl(message) : "";

  const shellClassName = [
    "rounded-xl bg-base-100 px-3 py-3 shadow-sm transition",
    "bg-base-100",
  ].join(" ");

  const openFilePicker = () => {
    if (readOnly || !uploadable || uploading) {
      return;
    }
    fileInputRef.current?.click();
  };

  const uploadButtonLabel = uploading
    ? "上传中..."
    : (uploaded ? uploadMeta.replaceLabel : uploadMeta.emptyLabel);

  return (
    <div
      className={shellClassName}
      onMouseDownCapture={() => {
        if (!readOnly) {
          onFocus(blockId);
        }
      }}
    >
      {uploadable && (
        <input
          ref={fileInputRef}
          type="file"
          accept={uploadMeta.accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            setUploadError("");
            setUploading(true);
            void onUpload(blockId, file)
              .catch((error) => {
                setUploadError(error instanceof Error ? error.message : String(error));
              })
              .finally(() => {
                setUploading(false);
                if (event.target) {
                  event.target.value = "";
                }
              });
          }}
        />
      )}

      {isImageBlock
        ? (
            <div className="group/image flex flex-col gap-3">
              {uploaded && uploadedImageUrl
                ? (
                    <div className="relative overflow-hidden rounded-xl border border-base-300 bg-base-200/20">
                      {!readOnly && (
                        <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover/image:pointer-events-auto group-hover/image:opacity-100 group-focus-within/image:pointer-events-auto group-focus-within/image:opacity-100">
                          <button
                            type="button"
                            className="rounded-md border border-base-100/70 bg-base-100/92 px-2 py-1 text-xs text-base-content/75 shadow-sm transition hover:border-primary/40 hover:text-base-content"
                            onMouseDown={event => event.preventDefault()}
                            onClick={openFilePicker}
                          >
                            {uploadButtonLabel}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-base-100/70 bg-base-100/92 px-2 py-1 text-xs text-base-content/75 shadow-sm transition hover:border-error/40 hover:text-error"
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => onDelete(blockId)}
                          >
                            删除
                          </button>
                        </div>
                      )}

                      <img
                        src={uploadedImageUrl}
                        alt={message.content?.trim() || uploadMeta.title}
                        width={typeof imagePayload?.width === "number" ? imagePayload.width : undefined}
                        height={typeof imagePayload?.height === "number" ? imagePayload.height : undefined}
                        className="block h-auto w-full max-w-full object-contain"
                      />
                    </div>
                  )
                : (
                    <button
                      type="button"
                      className="flex min-h-60 w-full items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-200/25 px-4 py-10 text-sm text-base-content/55 transition hover:border-primary/45 hover:bg-base-200/40 hover:text-base-content"
                      onMouseDown={event => event.preventDefault()}
                      onClick={openFilePicker}
                    >
                      {uploading ? "上传中..." : "点击上传图片"}
                    </button>
                  )}

              {message.content && (
                <div className="whitespace-pre-wrap break-words text-sm text-base-content/80">
                  {message.content}
                </div>
              )}
            </div>
          )
        : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-base-content/55">{uploadMeta.title}</div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    {uploadable && (
                      <button
                        type="button"
                        className="rounded-md border border-base-300 px-2 py-1 text-xs text-base-content/70 transition hover:border-primary/40 hover:text-base-content"
                        onMouseDown={event => event.preventDefault()}
                        onClick={openFilePicker}
                      >
                        {uploadButtonLabel}
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-md border border-base-300 px-2 py-1 text-xs text-base-content/70 transition hover:border-error/40 hover:text-error"
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => onDelete(blockId)}
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>

              {!uploaded && uploadable && (
                <div className="mb-3 rounded-lg border border-dashed border-base-300 bg-base-200/30 px-3 py-6 text-center text-sm text-base-content/55">
                  {uploading ? "上传中..." : uploadMeta.emptyLabel}
                </div>
              )}

              {(uploaded || !uploadable) && (
                <MessageContentRenderer
                  message={{
                    ...message,
                    content: message.content ?? "",
                    messageType: message.messageType ?? 0,
                  }}
                />
              )}
            </>
          )}

      {uploadError && (
        <div className="mt-3 rounded-md border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
          {uploadError}
        </div>
      )}
    </div>
  );
}
