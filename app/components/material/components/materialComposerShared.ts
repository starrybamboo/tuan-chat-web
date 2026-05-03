import {
  getRoomMediaAnnotationPreference,
  setRoomMediaAnnotationPreference,
} from "@/components/chat/utils/mediaAnnotationPreference";
import { ANNOTATION_IDS } from "@/types/messageAnnotations";

type QueuedComposerFiles = {
  images: File[];
  videos: File[];
  audios: File[];
  files: File[];
};

type MaterialAssetUploadKind = "image" | "audio" | "video" | "file";

export const MATERIAL_COMPOSER_ROOM_ID = 2147483001;

const DEFAULT_IMAGE_ANNOTATIONS = [ANNOTATION_IDS.BACKGROUND];
const DEFAULT_AUDIO_ANNOTATIONS = [ANNOTATION_IDS.BGM];

function classifyComposerFile(file: Pick<File, "name" | "type">): MaterialAssetUploadKind {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  const fileName = file.name || "";
  if (/\.(?:png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(fileName)) {
    return "image";
  }
  if (/\.(?:mp4|mov|m4v|avi|mkv|wmv|flv|mpeg|mpg|webm)$/i.test(fileName)) {
    return "video";
  }
  if (/\.(?:mp3|wav|m4a|aac|ogg|opus|flac)$/i.test(fileName)) {
    return "audio";
  }
  return "file";
}

function splitComposerFiles(files: Iterable<File>): QueuedComposerFiles {
  const queued: QueuedComposerFiles = {
    images: [],
    videos: [],
    audios: [],
    files: [],
  };

  for (const file of files) {
    const kind = classifyComposerFile(file);
    if (kind === "image") {
      queued.images.push(file);
      continue;
    }
    if (kind === "video") {
      queued.videos.push(file);
      continue;
    }
    if (kind === "audio") {
      queued.audios.push(file);
      continue;
    }
    queued.files.push(file);
  }

  return queued;
}

function buildQueuedFilesSummary({
  images,
  videos,
  audios,
}: QueuedComposerFiles) {
  const summaryParts: string[] = [];

  if (images.length > 0) {
    summaryParts.push(`${images.length} 张图片`);
  }
  if (audios.length > 0) {
    summaryParts.push("1 个音频");
  }
  if (videos.length > 0) {
    summaryParts.push(`${videos.length} 个视频`);
  }

  return summaryParts;
}

export function ensureMaterialComposerMediaPreferences() {
  const imagePreference = getRoomMediaAnnotationPreference(MATERIAL_COMPOSER_ROOM_ID, "image");
  if (imagePreference === undefined) {
    setRoomMediaAnnotationPreference(MATERIAL_COMPOSER_ROOM_ID, "image", DEFAULT_IMAGE_ANNOTATIONS);
  }

  const audioPreference = getRoomMediaAnnotationPreference(MATERIAL_COMPOSER_ROOM_ID, "audio");
  if (audioPreference === undefined) {
    setRoomMediaAnnotationPreference(MATERIAL_COMPOSER_ROOM_ID, "audio", DEFAULT_AUDIO_ANNOTATIONS);
  }
}

export {
  buildQueuedFilesSummary,
  splitComposerFiles,
};
