import toast from "react-hot-toast";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { preheatChatMediaPreprocess } from "@/components/chat/utils/attachmentPreprocess";
import { ANNOTATION_IDS, normalizeAnnotations } from "@/types/messageAnnotations";

export function isFileDrag(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer)
    return false;
  // 对于文件拖拽，浏览器通常会包含 "Files" type
  return Array.from(dataTransfer.types || []).includes("Files");
}

type DroppedFileSummary = {
  images: number;
  videos: number;
  audios: number;
  files: number;
  total: number;
};

function classifyFileKind(input: { type?: string; name?: string }): "image" | "video" | "audio" | "file" {
  const type = (input.type || "").toLowerCase();
  if (type.startsWith("image/")) {
    return "image";
  }
  if (type.startsWith("video/")) {
    return "video";
  }
  if (type.startsWith("audio/")) {
    return "audio";
  }

  const name = (input.name || "").toLowerCase();
  if (/\.(?:png|jpe?g|gif|webp|bmp|svg|avif)$/.test(name)) {
    return "image";
  }
  if (/\.(?:mp4|mov|m4v|avi|mkv|wmv|flv|mpeg|mpg|webm)$/.test(name)) {
    return "video";
  }
  if (/\.(?:mp3|wav|m4a|aac|ogg|opus|flac)$/.test(name)) {
    return "audio";
  }
  return "file";
}

function summarizeDroppedFiles(dataTransfer: DataTransfer | null | undefined): DroppedFileSummary {
  const summary: DroppedFileSummary = {
    images: 0,
    videos: 0,
    audios: 0,
    files: 0,
    total: 0,
  };
  if (!dataTransfer) {
    return summary;
  }

  const items = Array.from(dataTransfer.items ?? []).filter(item => item.kind === "file");
  if (items.length > 0) {
    for (const item of items) {
      summary.total += 1;
      const kind = classifyFileKind({ type: item.type });
      if (kind === "image") {
        summary.images += 1;
      }
      else if (kind === "video") {
        summary.videos += 1;
      }
      else if (kind === "audio") {
        summary.audios += 1;
      }
      else {
        summary.files += 1;
      }
    }
    return summary;
  }

  for (const file of Array.from(dataTransfer.files ?? [])) {
    summary.total += 1;
    const kind = classifyFileKind(file);
    if (kind === "image") {
      summary.images += 1;
    }
    else if (kind === "video") {
      summary.videos += 1;
    }
    else if (kind === "audio") {
      summary.audios += 1;
    }
    else {
      summary.files += 1;
    }
  }
  return summary;
}

export function getFileDragOverlayText(dataTransfer: DataTransfer | null | undefined): string {
  const summary = summarizeDroppedFiles(dataTransfer);
  if (summary.total <= 0) {
    return "松开添加文件/视频/音频/图片";
  }
  const kinds: string[] = [];
  if (summary.images > 0)
    kinds.push("图片");
  if (summary.videos > 0)
    kinds.push("视频");
  if (summary.audios > 0)
    kinds.push("音频");
  if (summary.files > 0)
    kinds.push("文件");
  return `松开添加${kinds.join("、")}`;
}

function splitDroppedFiles(fileList: FileList | null | undefined) {
  const images: File[] = [];
  const videos: File[] = [];
  const audios: File[] = [];
  const files: File[] = [];
  if (!fileList)
    return { images, videos, audios, files };

  for (const file of Array.from(fileList)) {
    const kind = classifyFileKind(file);
    if (kind === "image")
      images.push(file);
    else if (kind === "video")
      videos.push(file);
    else if (kind === "audio")
      audios.push(file);
    else
      files.push(file);
  }
  return { images, videos, audios, files };
}

/**
 * 将拖入的文件写入聊天输入区附件 store。
 * 返回 true 表示已处理（上层应当 preventDefault/stopPropagation，避免浏览器打开文件）。
 */
export function addDroppedFilesToComposer(dataTransfer: DataTransfer | null | undefined) {
  if (!isFileDrag(dataTransfer)) {
    return false;
  }

  const { images, videos, audios, files } = splitDroppedFiles(dataTransfer?.files);
  if (images.length === 0 && videos.length === 0 && audios.length === 0 && files.length === 0) {
    toast.error("未检测到可用文件");
    return true;
  }

  if (images.length > 0) {
    useChatComposerStore.getState().updateImgFiles((draft) => {
      draft.push(...images);
    });
    const current = useChatComposerStore.getState().tempAnnotations;
    if (!current.includes(ANNOTATION_IDS.BACKGROUND)) {
      useChatComposerStore.getState().setTempAnnotations(
        normalizeAnnotations([...current, ANNOTATION_IDS.BACKGROUND]),
      );
    }
  }

  if (videos.length > 0 || files.length > 0) {
    useChatComposerStore.getState().updateFileAttachments((draft) => {
      draft.push(...videos, ...files);
    });
  }

  if (audios.length > 0) {
    useChatComposerStore.getState().setAudioFile(audios[0]);
    const current = useChatComposerStore.getState().tempAnnotations;
    const hasAudioAnnotation = current.includes(ANNOTATION_IDS.BGM) || current.includes(ANNOTATION_IDS.SE);
    if (!hasAudioAnnotation) {
      useChatComposerStore.getState().setTempAnnotations(
        normalizeAnnotations([...current, ANNOTATION_IDS.BGM]),
      );
    }
  }

  if (audios.length > 1) {
    toast.error("仅支持拖拽 1 个音频，已取第一个");
  }

  preheatChatMediaPreprocess({
    imageFiles: images,
    videoFiles: videos,
    audioFiles: audios.length > 0 ? [audios[0]] : [],
  });

  const summaryParts: string[] = [];
  if (images.length > 0) {
    summaryParts.push(`${images.length}张图片`);
  }
  if (audios.length > 0) {
    summaryParts.push("1个音频");
  }
  if (videos.length > 0) {
    summaryParts.push(`${videos.length}个视频`);
  }
  if (files.length > 0) {
    summaryParts.push(`${files.length}个文件`);
  }
  toast.success(`已添加${summaryParts.join("、")}`);

  return true;
}
