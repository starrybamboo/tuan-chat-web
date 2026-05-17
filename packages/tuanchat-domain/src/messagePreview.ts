import type { Message } from "@tuanchat/openapi-client/models/Message";

import {
  ANNOTATION_IDS,
  getSceneEffectFromAnnotations,
  getSceneEffectLabel,
  hasAnnotation,
  resolveSoundPurposeFromAnnotations,
} from "./message-annotations";
import {
  getClueMessageExtra,
  getCommandRequestExtra,
  getDocCardExtra,
  getFileMessageExtra,
  getForwardMessageExtra,
  getImageMessageExtra,
  getRoomJumpExtra,
  getSoundMessageExtra,
  getThreadRootExtra,
  getVideoMessageExtra,
} from "./message-extra";
import { MESSAGE_TYPE } from "./messageType";
import { formatStateEventPreviewText } from "./state-event";

function safeTrim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isProbablyOpaqueFileName(fileName: string): boolean {
  const raw = fileName.trim();
  if (!raw) {
    return true;
  }

  const lastDot = raw.lastIndexOf(".");
  const base = (lastDot > 0 ? raw.slice(0, lastDot) : raw).trim();
  if (!base) {
    return true;
  }

  if (/^[0-9a-f]+$/i.test(base) && base.length >= 24) {
    return true;
  }

  return /^\d+$/.test(base) && base.length >= 16;
}

function withTag(tag: string, text: string): string {
  const normalized = text.trim();
  return normalized ? `[${tag}] ${normalized}` : `[${tag}]`;
}

function formatWebgalChooseSummary(extra: unknown, fallback: string): string {
  const payload = (extra as { webgalChoose?: { prompt?: string; options?: Array<{ text?: string; label?: string }> } } | null)?.webgalChoose;
  const prompt = safeTrim(payload?.prompt);
  const options = Array.isArray(payload?.options)
    ? payload.options.map(option => safeTrim(option.text) || safeTrim(option.label)).filter(Boolean)
    : [];

  if (prompt && options.length > 0) {
    return `${prompt}：${options.slice(0, 3).join(" / ")}`;
  }
  if (prompt) {
    return prompt;
  }
  if (options.length > 0) {
    return options.slice(0, 3).join(" / ");
  }
  return fallback;
}

/**
 * 平台无关的消息预览文本。UI 可自行决定是否加角色名前缀或做截断。
 */
export function getMessagePreviewText(message?: Message | null): string {
  if (!message) {
    return "加载中...";
  }

  if (message.status === 1) {
    return "[原消息已被删除]";
  }

  const content = typeof message.content === "string" ? message.content : "";
  const trimmedContent = content.trim();
  const roomJumpPayload = getRoomJumpExtra(message.extra);
  if (roomJumpPayload) {
    const title = safeTrim((roomJumpPayload as { label?: unknown }).label)
      || safeTrim((roomJumpPayload as { roomName?: unknown }).roomName)
      || `群聊 #${(roomJumpPayload as { roomId?: unknown }).roomId ?? "?"}`;
    return withTag("群聊", title);
  }

  switch (message.messageType) {
    case MESSAGE_TYPE.TEXT:
    case MESSAGE_TYPE.INTRO_TEXT:
      return content;
    case MESSAGE_TYPE.SYSTEM:
      return content || "[系统消息]";
    case MESSAGE_TYPE.IMG: {
      const imageMessage = getImageMessageExtra(message.extra);
      const fileName = safeTrim(imageMessage?.fileName);
      const label = trimmedContent || (!isProbablyOpaqueFileName(fileName) ? fileName : "");
      return withTag("图片", label);
    }
    case MESSAGE_TYPE.FILE: {
      const fileMessage = getFileMessageExtra(message.extra);
      const fileName = safeTrim(fileMessage?.fileName) || trimmedContent || "文件";
      return withTag("文件", fileName);
    }
    case MESSAGE_TYPE.VIDEO: {
      const videoMessage = getVideoMessageExtra(message.extra);
      const fileName = safeTrim(videoMessage?.fileName) || trimmedContent || "视频";
      return withTag("视频", fileName);
    }
    case MESSAGE_TYPE.SOUND: {
      const soundMessage = getSoundMessageExtra(message.extra);
      const fileName = safeTrim(soundMessage?.fileName) || trimmedContent;
      const purpose = resolveSoundPurposeFromAnnotations(
        message.annotations,
        (soundMessage as { purpose?: unknown } | undefined)?.purpose,
      );
      return withTag(purpose === "bgm" ? "BGM" : "语音", fileName);
    }
    case MESSAGE_TYPE.EFFECT: {
      const sceneEffectName = getSceneEffectFromAnnotations(message.annotations);
      const effectLabel = getSceneEffectLabel(sceneEffectName)
        || (hasAnnotation(message.annotations, ANNOTATION_IDS.BACKGROUND_CLEAR) ? "清除背景" : "")
        || (hasAnnotation(message.annotations, ANNOTATION_IDS.FIGURE_CLEAR) ? "清除立绘" : "")
        || trimmedContent
        || "特效";
      return withTag("特效", effectLabel);
    }
    case MESSAGE_TYPE.FORWARD: {
      const list = getForwardMessageExtra(message.extra)?.messageList;
      const count = Array.isArray(list) ? list.length : 0;
      return withTag("转发", count > 0 ? `${count}条消息` : "");
    }
    case MESSAGE_TYPE.DICE: {
      const result = safeTrim((message.extra as { diceResult?: { result?: unknown } } | null)?.diceResult?.result) || trimmedContent;
      return withTag("骰娘", result);
    }
    case MESSAGE_TYPE.WEBGAL_CHOOSE:
      return withTag("选择", formatWebgalChooseSummary(message.extra, trimmedContent));
    case MESSAGE_TYPE.STATE_EVENT:
      return formatStateEventPreviewText(message.extra, trimmedContent);
    case MESSAGE_TYPE.COMMAND_REQUEST: {
      const commandText = safeTrim(getCommandRequestExtra(message.extra)?.command) || trimmedContent || "[空指令]";
      return withTag("检定请求", commandText);
    }
    case MESSAGE_TYPE.CLUE_CARD: {
      const name = safeTrim(getClueMessageExtra(message.extra)?.name) || trimmedContent || "线索";
      return withTag("线索", name);
    }
    case MESSAGE_TYPE.DOC_CARD: {
      const docCard = getDocCardExtra(message.extra);
      const title = safeTrim(docCard?.title);
      const docId = safeTrim(docCard?.docId);
      return withTag("文档", title || docId || "文档");
    }
    case MESSAGE_TYPE.ROOM_JUMP:
      return withTag("群聊", trimmedContent || "群聊跳转");
    case MESSAGE_TYPE.THREAD_ROOT: {
      const title = safeTrim(getThreadRootExtra(message.extra)?.title) || trimmedContent || "子区";
      return withTag("子区", title);
    }
    case MESSAGE_TYPE.READ_LINE:
      return "[已读线]";
    default:
      return trimmedContent ? content : "非文本消息";
  }
}
