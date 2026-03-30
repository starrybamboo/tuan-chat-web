import type { MessageDraft } from "@/types/messageDraft";

import {
  getFileMessageExtra,
  getImageMessageExtra,
  getSoundMessageExtra,
  getVideoMessageExtra,
} from "@/types/messageExtra";

import { MessageType } from "../../../../api/wsModels";

export type MaterialAssetPresentation = {
  typeLabel: string;
  title: string;
  meta: string;
  contentPreview: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getMaterialAssetPresentation(message: MessageDraft, index: number): MaterialAssetPresentation {
  const annotationText = Array.isArray(message.annotations) && message.annotations.length > 0
    ? message.annotations.join(" / ")
    : "无标注";
  const contentPreview = normalizeText(message.content);

  if (message.messageType === MessageType.IMG) {
    const image = getImageMessageExtra(message.extra);
    return {
      typeLabel: "图片",
      title: normalizeText(image?.fileName) || `图片素材 ${index + 1}`,
      meta: annotationText,
      contentPreview,
    };
  }

  if (message.messageType === MessageType.SOUND) {
    const sound = getSoundMessageExtra(message.extra);
    return {
      typeLabel: "音频",
      title: normalizeText(sound?.fileName) || `音频素材 ${index + 1}`,
      meta: annotationText,
      contentPreview,
    };
  }

  if (message.messageType === MessageType.VIDEO) {
    const video = getVideoMessageExtra(message.extra);
    return {
      typeLabel: "视频",
      title: normalizeText(video?.fileName) || `视频素材 ${index + 1}`,
      meta: annotationText,
      contentPreview,
    };
  }

  if (message.messageType === MessageType.FILE) {
    const file = getFileMessageExtra(message.extra);
    return {
      typeLabel: "文件",
      title: normalizeText(file?.fileName) || `文件素材 ${index + 1}`,
      meta: annotationText,
      contentPreview,
    };
  }

  return {
    typeLabel: "素材",
    title: contentPreview || `素材 ${index + 1}`,
    meta: annotationText,
    contentPreview,
  };
}
