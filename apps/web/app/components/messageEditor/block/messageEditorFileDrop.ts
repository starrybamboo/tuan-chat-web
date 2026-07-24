import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { MessageEditorMessage } from "../messageEditorTypes";
import type { MessageEditorInsertableBlockKind } from "../document/messageEditorTransforms";

export function isMessageEditorFileDrag(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer) {
    return false;
  }

  return Array.from(dataTransfer.types || []).includes("Files");
}

export function isMessageEditorUploadableMediaMessage(message: MessageEditorMessage | undefined) {
  return message?.messageType === MESSAGE_TYPE.IMG
    || message?.messageType === MESSAGE_TYPE.FILE
    || message?.messageType === MESSAGE_TYPE.SOUND
    || message?.messageType === MESSAGE_TYPE.VIDEO;
}

export function getMessageEditorMediaBlockKindForMessage(message: MessageEditorMessage | undefined): MessageEditorInsertableBlockKind | null {
  if (message?.messageType === MESSAGE_TYPE.IMG) {
    return "image";
  }
  if (message?.messageType === MESSAGE_TYPE.FILE) {
    return "file";
  }
  if (message?.messageType === MESSAGE_TYPE.SOUND) {
    return "audio";
  }
  if (message?.messageType === MESSAGE_TYPE.VIDEO) {
    return "video";
  }
  return null;
}

export function getMessageEditorMediaBlockKindForFile(file: Pick<File, "name" | "type">): MessageEditorInsertableBlockKind {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) {
    return "image";
  }
  if (type.startsWith("audio/")) {
    return "audio";
  }
  if (type.startsWith("video/")) {
    return "video";
  }

  const name = (file.name || "").toLowerCase();
  if (/\.(?:png|jpe?g|gif|webp|bmp|svg|avif)$/.test(name)) {
    return "image";
  }
  if (/\.(?:mp3|wav|m4a|aac|ogg|opus|flac)$/.test(name)) {
    return "audio";
  }
  if (/\.(?:mp4|mov|m4v|avi|mkv|wmv|flv|mpeg|mpg|webm)$/.test(name)) {
    return "video";
  }

  return "file";
}

function createClipboardFileName(file: File, index: number) {
  const mime = file.type || "application/octet-stream";
  const ext = (mime.split("/")[1] || "bin").split(";")[0]?.replace(/[^a-z0-9.+-]/gi, "") || "bin";
  const prefix = mime.startsWith("image/")
    ? "pasted-image"
    : mime.startsWith("audio/")
      ? "pasted-audio"
      : mime.startsWith("video/")
        ? "pasted-video"
        : "pasted-file";
  return `${prefix}-${Date.now()}-${index + 1}.${ext}`;
}

function ensureNamedClipboardFile(file: File, index: number) {
  if (file.name || typeof File === "undefined") {
    return file;
  }

  return new File([file], createClipboardFileName(file, index), {
    type: file.type || "application/octet-stream",
  });
}

export function getMessageEditorClipboardFiles(dataTransfer: DataTransfer | null | undefined) {
  const items = Array.from(dataTransfer?.items ?? []).filter(item => item.kind === "file");
  if (items.length > 0) {
    return items
      .map(item => item.getAsFile())
      .filter((file): file is File => Boolean(file))
      .map(ensureNamedClipboardFile);
  }

  return Array.from(dataTransfer?.files ?? []).map(ensureNamedClipboardFile);
}
