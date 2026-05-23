import type { MessageEditorMessage } from "../messageEditorTypes";
import { useCallback, useRef, useState } from "react";
import { PlusIcon } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { isMessageEditorFileDrag, isMessageEditorUploadableMediaMessage } from "../runtime/messageEditorFileDrop";
import { MessageEditorAtomicContent } from "./MessageEditorAtomicContent";

interface MessageEditorAtomicBlockProps {
  blockId: string;
  message: MessageEditorMessage;
  onFocus: (blockId: string) => void;
  onUpdate: (blockId: string, updater: (message: MessageEditorMessage) => MessageEditorMessage) => void;
  onUpload: (blockId: string, file: File) => Promise<void>;
  readOnly?: boolean;
}

function resolveUploadMeta(message: MessageEditorMessage) {
  switch (message.messageType) {
    case MESSAGE_TYPE.IMG:
      return {
        accept: "image/*",
        emptyLabel: "上传图片",
        title: "图片块",
      };
    case MESSAGE_TYPE.FILE:
      return {
        accept: "*/*",
        emptyLabel: "上传文件",
        title: "文件块",
      };
    case MESSAGE_TYPE.SOUND:
      return {
        accept: "audio/*",
        emptyLabel: "上传音频",
        title: "音频块",
      };
    case MESSAGE_TYPE.VIDEO:
      return {
        accept: "video/*",
        emptyLabel: "上传视频",
        title: "视频块",
      };
    case MESSAGE_TYPE.DICE:
      return {
        accept: "",
        emptyLabel: "",
        title: "骰子块",
      };
    case MESSAGE_TYPE.WEBGAL_CHOOSE:
      return {
        accept: "",
        emptyLabel: "",
        title: "选择块",
      };
    case MESSAGE_TYPE.DOC_CARD:
      return {
        accept: "",
        emptyLabel: "",
        title: "文档块",
      };
    case MESSAGE_TYPE.ROOM_JUMP:
      return {
        accept: "",
        emptyLabel: "",
        title: "群聊跳转",
      };
    case MESSAGE_TYPE.SYSTEM:
      return {
        accept: "",
        emptyLabel: "",
        title: "系统消息",
      };
    case MESSAGE_TYPE.FORWARD:
      return {
        accept: "",
        emptyLabel: "",
        title: "转发消息",
      };
    case MESSAGE_TYPE.EFFECT:
      return {
        accept: "",
        emptyLabel: "",
        title: "特效",
      };
    case MESSAGE_TYPE.COMMAND_REQUEST:
      return {
        accept: "",
        emptyLabel: "",
        title: "检定请求",
      };
    case MESSAGE_TYPE.STATE_EVENT:
      return {
        accept: "",
        emptyLabel: "",
        title: "状态事件",
      };
    case MESSAGE_TYPE.CLUE_CARD:
      return {
        accept: "",
        emptyLabel: "",
        title: "线索卡片",
      };
    case MESSAGE_TYPE.READ_LINE:
      return {
        accept: "",
        emptyLabel: "",
        title: "已读标记",
      };
    default:
      return {
        accept: "",
        emptyLabel: "",
        title: "其他消息",
      };
  }
}

function hasUploadedMedia(message: MessageEditorMessage) {
  if (!isMessageEditorUploadableMediaMessage(message)) {
    return true;
  }

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
 * 原子块内容壳，负责空媒体块的内联上传占位。
 */
export function MessageEditorAtomicBlock({
  blockId,
  message,
  onFocus,
  onUpdate,
  onUpload,
  readOnly = false,
}: MessageEditorAtomicBlockProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileDropActive, setFileDropActive] = useState(false);
  const uploadMeta = resolveUploadMeta(message);
  const uploadable = uploadMeta.accept.length > 0;
  const uploaded = hasUploadedMedia(message);

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

  return (
    <div
      className={[
        "relative min-w-0 py-1 transition-colors",
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

      {!uploaded && uploadable && (
        <button
          type="button"
          className="inline-flex min-h-7 items-center gap-2 rounded-sm text-sm leading-7 text-base-content/45 transition hover:text-base-content/75"
          onMouseDown={event => event.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          disabled={readOnly || uploading}
        >
          <PlusIcon className="size-4" />
          {uploading ? "上传中..." : uploadMeta.emptyLabel}
        </button>
      )}

      {uploadError && (
        <div className="mt-1 text-xs leading-5 text-error">
          {uploadError}
        </div>
      )}

      {(uploaded || !uploadable) && (
        <MessageEditorAtomicContent
          blockId={blockId}
          message={message}
          onUpdate={onUpdate}
          readOnly={readOnly}
          typeLabel={uploadMeta.title}
        />
      )}
    </div>
  );
}
