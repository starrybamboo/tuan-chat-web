import toast from "react-hot-toast";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";

export function isFileDrag(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer)
    return false;
  // 对于文件拖拽，浏览器通常会包含 "Files" type
  return Array.from(dataTransfer.types || []).includes("Files");
}

function splitDroppedFiles(fileList: FileList | null | undefined) {
  const images: File[] = [];
  const audios: File[] = [];
  const others: File[] = [];
  if (!fileList)
    return { images, audios, others };

  for (const file of Array.from(fileList)) {
    if (file.type?.startsWith("image/"))
      images.push(file);
    else if (file.type?.startsWith("audio/"))
      audios.push(file);
    else
      others.push(file);
  }
  return { images, audios, others };
}

/**
 * 将拖入的图片/音频写入聊天输入区附件 store。
 * 返回 true 表示已处理（上层应当 preventDefault/stopPropagation，避免浏览器打开文件）。
 */
export function addDroppedFilesToComposer(dataTransfer: DataTransfer | null | undefined) {
  if (!isFileDrag(dataTransfer)) {
    return false;
  }

  const { images, audios, others } = splitDroppedFiles(dataTransfer?.files);
  if (images.length === 0 && audios.length === 0) {
    toast.error(others.length > 0 ? "仅支持拖拽图片或音频文件" : "未检测到可用文件");
    return true;
  }

  if (images.length > 0) {
    useChatComposerStore.getState().updateImgFiles((draft) => {
      draft.push(...images);
    });
  }

  if (audios.length > 0) {
    useChatComposerStore.getState().setAudioFile(audios[0]);
    if (audios.length > 1) {
      toast.error("仅支持拖拽 1 个音频，已取第一个");
    }
  }

  if (images.length > 0 && audios.length > 0) {
    toast.success(`已添加${images.length}张图片，并添加音频`);
  }
  else if (images.length > 0) {
    toast.success(`已添加${images.length}张图片`);
  }
  else {
    toast.success("已添加音频");
  }

  return true;
}
