import { extractRoomJumpPayload } from "@/components/chat/utils/roomJump";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalChoosePayload, formatWebgalChooseSummary } from "@/types/webgalChoose";
import { extractWebgalVarPayload, formatWebgalVarSummary } from "@/types/webgalVar";

import type { Message } from "../../../../../api";

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
  // 例如：1b49d9c3af4decd18dd3c3b84000d932699708.jpg
  if (/^[0-9a-f]+$/i.test(base) && base.length >= 24) {
    return true;
  }
  if (/^\d+$/.test(base) && base.length >= 16) {
    return true;
  }
  return false;
}

function withTag(tag: string, text: string): string {
  const normalized = text.trim();
  return normalized ? `[${tag}] ${normalized}` : `[${tag}]`;
}

/**
 * 将一条消息转换为“可用于列表/回复引用”的简要预览文本。
 * 注意：不包含角色名等前缀（由调用方决定如何拼接）。
 */
export function getMessagePreviewText(message?: Message | null): string {
  if (!message) {
    return "加载中...";
  }

  if (message.status === 1) {
    return "[原消息已被删除]";
  }

  const extra: any = message.extra as any;
  const content = typeof message.content === "string" ? message.content : "";
  const trimmedContent = content.trim();
  const roomJumpPayload = extractRoomJumpPayload(extra);
  if (roomJumpPayload) {
    const title = safeTrim(roomJumpPayload.label)
      || safeTrim(roomJumpPayload.roomName)
      || `群聊 #${roomJumpPayload.roomId}`;
    return withTag("群聊", title);
  }

  switch (message.messageType) {
    case MESSAGE_TYPE.TEXT:
    case MESSAGE_TYPE.INTRO_TEXT:
      return content;
    case MESSAGE_TYPE.SYSTEM:
      return content || "[系统消息]";
    case MESSAGE_TYPE.IMG: {
      const imageMessage = extra?.imageMessage ?? extra;
      // 预览不区分“背景/图片”；背景语义属于演出标记（annotation/extra），不需要在引用预览中透出。
      const tag = "图片";
      const fileName = safeTrim(imageMessage?.fileName);
      const label = trimmedContent
        || (!isProbablyOpaqueFileName(fileName) ? fileName : "");
      return withTag(tag, label);
    }
    case MESSAGE_TYPE.FILE: {
      const fileMessage = extra?.fileMessage ?? extra;
      const fileName = safeTrim(fileMessage?.fileName) || trimmedContent || "文件";
      return withTag("文件", fileName);
    }
    case MESSAGE_TYPE.VIDEO: {
      const videoMessage = extra?.videoMessage ?? extra?.fileMessage ?? extra;
      const fileName = safeTrim(videoMessage?.fileName) || trimmedContent || "视频";
      return withTag("视频", fileName);
    }
    case MESSAGE_TYPE.SOUND: {
      const soundMessage = extra?.soundMessage ?? extra;
      const fileName = safeTrim(soundMessage?.fileName) || trimmedContent;
      const purpose = safeTrim(soundMessage?.purpose).toLowerCase();
      const tag = purpose === "bgm" ? "BGM" : "语音";
      return withTag(tag, fileName);
    }
    case MESSAGE_TYPE.EFFECT: {
      const effectName = safeTrim(extra?.effectMessage?.effectName) || trimmedContent || "特效";
      return withTag("特效", effectName);
    }
    case MESSAGE_TYPE.FORWARD: {
      const list = extra?.forwardMessage?.messageList;
      const count = Array.isArray(list) ? list.length : 0;
      return withTag("转发", count > 0 ? `${count}条消息` : "");
    }
    case MESSAGE_TYPE.DICE: {
      const result = safeTrim(extra?.diceResult?.result) || trimmedContent;
      return withTag("骰娘", result);
    }
    case MESSAGE_TYPE.WEBGAL_COMMAND: {
      const raw = safeTrim(message.content);
      const display = raw ? (raw.startsWith("%") ? raw : `%${raw}`) : "";
      return withTag("WebGAL", display);
    }
    case MESSAGE_TYPE.WEBGAL_VAR: {
      const payload = extractWebgalVarPayload(message.extra);
      const summary = payload ? formatWebgalVarSummary(payload) : trimmedContent;
      return withTag("变量", summary);
    }
    case MESSAGE_TYPE.WEBGAL_CHOOSE: {
      const payload = extractWebgalChoosePayload(message.extra);
      const summary = payload ? formatWebgalChooseSummary(payload) : trimmedContent;
      return withTag("选择", summary);
    }
    case MESSAGE_TYPE.COMMAND_REQUEST: {
      const commandText = safeTrim(extra?.commandRequest?.command) || trimmedContent || "[空指令]";
      return withTag("检定请求", commandText);
    }
    case MESSAGE_TYPE.CLUE_CARD: {
      const name = safeTrim(extra?.clueMessage?.name) || trimmedContent || "线索";
      return withTag("线索", name);
    }
    case MESSAGE_TYPE.DOC_CARD: {
      const raw = extra?.docCard ?? extra ?? null;
      const title = safeTrim(raw?.title);
      const docId = safeTrim(raw?.docId);
      return withTag("文档", title || docId || "文档");
    }
    case MESSAGE_TYPE.THREAD_ROOT: {
      const title = safeTrim(extra?.title) || trimmedContent || "子区";
      return withTag("子区", title);
    }
    case MESSAGE_TYPE.READ_LINE:
      return "[已读线]";
    default:
      // 对未知类型：如果 content 有值，就直接用它；否则兜底为“非文本消息”。
      return trimmedContent ? content : "非文本消息";
  }
}
