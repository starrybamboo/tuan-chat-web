import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

function isVideoFile(file: File) {
  if (file.type.startsWith("video/")) {
    return true;
  }
  return /\.(?:mp4|mov|m4v|avi|mkv|wmv|flv|mpeg|mpg|webm)$/i.test(file.name || "");
}

export function inferAttachmentAnnotationMessageType(params: {
  audioFile?: File | null;
  emojiCount?: number;
  fileAttachments?: File[];
  imageCount?: number;
}) {
  if ((params.imageCount ?? 0) > 0 || (params.emojiCount ?? 0) > 0) {
    return MESSAGE_TYPE.IMG;
  }
  if (params.audioFile) {
    return MESSAGE_TYPE.SOUND;
  }
  if ((params.fileAttachments ?? []).some(isVideoFile)) {
    return MESSAGE_TYPE.VIDEO;
  }
  return MESSAGE_TYPE.FILE;
}
