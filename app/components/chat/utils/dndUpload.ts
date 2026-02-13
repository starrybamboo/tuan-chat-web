import toast from "react-hot-toast";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { ANNOTATION_IDS, normalizeAnnotations } from "@/types/messageAnnotations";

export function isFileDrag(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer)
    return false;
  // 对于文件拖拽，浏览器通常会包含 "Files" type
  return Array.from(dataTransfer.types || []).includes("Files");
}

type DroppedFileSummary = {
  images: number;
  audios: number;
  files: number;
  total: number;
};

function summarizeDroppedFiles(dataTransfer: DataTransfer | null | undefined): DroppedFileSummary {
  const summary: DroppedFileSummary = {
    images: 0,
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
      const type = (item.type || "").toLowerCase();
      if (type.startsWith("image/")) {
        summary.images += 1;
      }
      else if (type.startsWith("audio/")) {
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
    if (file.type?.startsWith("image/")) {
      summary.images += 1;
    }
    else if (file.type?.startsWith("audio/")) {
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
    return "松开添加文件/音频/图片";
  }
  if (summary.images > 0 && summary.audios === 0 && summary.files === 0) {
    return "松开添加图片";
  }
  if (summary.images === 0 && summary.audios > 0 && summary.files === 0) {
    return "松开添加音频";
  }
  if (summary.images === 0 && summary.audios === 0 && summary.files > 0) {
    return "松开添加文件";
  }
  if (summary.files === 0) {
    return "松开添加图片和音频";
  }
  if (summary.images === 0) {
    return "松开添加音频和文件";
  }
  if (summary.audios === 0) {
    return "松开添加图片和文件";
  }
  return "松开添加文件、音频和图片";
}

function splitDroppedFiles(fileList: FileList | null | undefined) {
  const images: File[] = [];
  const audios: File[] = [];
  const files: File[] = [];
  if (!fileList)
    return { images, audios, files };

  for (const file of Array.from(fileList)) {
    if (file.type?.startsWith("image/"))
      images.push(file);
    else if (file.type?.startsWith("audio/"))
      audios.push(file);
    else
      files.push(file);
  }
  return { images, audios, files };
}

/**
 * 将拖入的文件写入聊天输入区附件 store。
 * 返回 true 表示已处理（上层应当 preventDefault/stopPropagation，避免浏览器打开文件）。
 */
export function addDroppedFilesToComposer(dataTransfer: DataTransfer | null | undefined) {
  if (!isFileDrag(dataTransfer)) {
    return false;
  }

  const { images, audios, files } = splitDroppedFiles(dataTransfer?.files);
  if (images.length === 0 && audios.length === 0 && files.length === 0) {
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

  if (files.length > 0) {
    useChatComposerStore.getState().updateFileAttachments((draft) => {
      draft.push(...files);
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

  const summaryParts: string[] = [];
  if (images.length > 0) {
    summaryParts.push(`${images.length}张图片`);
  }
  if (audios.length > 0) {
    summaryParts.push("1个音频");
  }
  if (files.length > 0) {
    summaryParts.push(`${files.length}个文件`);
  }
  toast.success(`已添加${summaryParts.join("、")}`);

  return true;
}
