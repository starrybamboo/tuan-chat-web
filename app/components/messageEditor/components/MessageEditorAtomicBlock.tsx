import type { MessageDraft } from "@/types/messageDraft";

import { useRef, useState } from "react";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import MessageContentRenderer from "../../chat/message/messageContentRenderer";

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

/**
 * 原子块编辑壳，负责上传与删除交互。
 */
export function MessageEditorAtomicBlock({
  active,
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

  const shellClassName = [
    "rounded-xl border bg-base-100 px-3 py-3 shadow-sm transition",
    active
      ? "border-primary/40 bg-primary/[0.045]"
      : "border-base-300/70",
  ].join(" ");

  return (
    <div
      className={shellClassName}
      onMouseDownCapture={() => {
        if (!readOnly) {
          onFocus(blockId);
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-base-content/55">{uploadMeta.title}</div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {uploadable && (
              <>
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
                <button
                  type="button"
                  className="rounded-md border border-base-300 px-2 py-1 text-xs text-base-content/70 transition hover:border-primary/40 hover:text-base-content"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploaded ? uploadMeta.replaceLabel : uploadMeta.emptyLabel}
                </button>
              </>
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

      {uploadError && (
        <div className="mb-3 rounded-md border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
          {uploadError}
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
    </div>
  );
}
