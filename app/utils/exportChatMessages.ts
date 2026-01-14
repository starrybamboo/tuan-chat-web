import { extractWebgalVarPayload, formatWebgalVarSummary } from "@/types/webgalVar";

import type { ChatMessageResponse, Message } from "../../api";

import { MessageType } from "../../api/wsModels";

/**
 * 聊天记录导出配置
 */
export type ExportOptions = {
  includeTimestamp?: boolean; // 是否包含时间戳
  includeUsername?: boolean; // 是否包含用户名
  dateFormat?: "full" | "short"; // 日期格式：完整或简短
};

const UNKNOWN_LABEL = "未知";

function formatFileSize(bytes?: number): string {
  if (!bytes || Number.isNaN(bytes)) {
    return "";
  }

  const sizeUnits = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < sizeUnits.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)}${sizeUnits[unitIndex]}`;
}

function buildSenderLabel(
  message: Message | undefined,
  roleMap: Map<number, string>,
  userMap: Map<number, string>,
  includeUsername: boolean,
): string {
  if (!message) {
    return `[${UNKNOWN_LABEL}消息]`;
  }

  const roleId = message.roleId ?? -1;
  const roleName = roleMap.get(roleId) || `角色${message.roleId ?? UNKNOWN_LABEL}`;
  if (!includeUsername) {
    return roleName;
  }

  const username = userMap.get(message.userId) || `用户${message.userId ?? UNKNOWN_LABEL}`;
  return `${roleName}(${username})`;
}

function formatForwardContent(
  message: Message,
  roleMap: Map<number, string>,
  userMap: Map<number, string>,
  includeUsername: boolean,
): string {
  const forwardedMessages = message.extra?.forwardMessage?.messageList;
  if (!Array.isArray(forwardedMessages) || forwardedMessages.length === 0) {
    return "[转发消息]";
  }

  const forwardedContent = forwardedMessages
    .map((raw) => {
      const forwardedMessage: Message | undefined = (raw as any)?.message ?? raw;
      const sender = buildSenderLabel(forwardedMessage, roleMap, userMap, includeUsername);
      const body = formatMessageContent(forwardedMessage, roleMap, userMap, includeUsername);
      return `${sender}: ${body}`;
    })
    .join("\n  ");

  return `[转发消息]\n  ${forwardedContent}`;
}

function formatMessageContent(
  message: Message | undefined,
  roleMap: Map<number, string>,
  userMap: Map<number, string>,
  includeUsername: boolean,
): string {
  if (!message) {
    return "[消息缺失]";
  }

  const { messageType, extra, content } = message;

  switch (messageType) {
    case MessageType.TEXT:
      return content || "[空白文本]";
    case MessageType.IMG: {
      const imageMessage = extra?.imageMessage;
      if (imageMessage?.background) {
        return "[背景图片]";
      }
      return "[图片]";
    }
    case MessageType.FILE: {
      const fileMessage = extra?.fileMessage;
      const name = fileMessage?.fileName || content || "文件";
      const size = formatFileSize(fileMessage?.size);
      return `[文件] ${name}${size ? ` (${size})` : ""}`;
    }
    case MessageType.FORWARD:
      return formatForwardContent(message, roleMap, userMap, includeUsername);
    case MessageType.DICE: {
      const diceResult = extra?.diceResult;
      const result = diceResult?.result || content;
      return result ? `[骰子] ${result}` : "[骰子]";
    }
    case MessageType.SOUND: {
      const sound = extra?.soundMessage as { second?: number; duration?: number; fileName?: string } | undefined;
      const seconds = sound?.second ?? sound?.duration;
      const parts = [] as string[];
      if (sound?.fileName)
        parts.push(sound.fileName);
      if (typeof seconds === "number")
        parts.push(`${seconds}s`);
      return `[语音]${parts.length ? ` ${parts.join(" / ")}` : ""}`;
    }
    case MessageType.EFFECT: {
      const effect = (extra as any)?.effectMessage;
      const name = effect?.effectName || content;
      return `[演出效果]${name ? ` ${name}` : ""}`;
    }
    case MessageType.WEBGAL_VAR: {
      const payload = extractWebgalVarPayload(extra);
      const summary = payload ? formatWebgalVarSummary(payload) : "";
      return `[变量]${summary ? ` ${summary}` : ""}`;
    }
    case MessageType.CLUE_CARD: {
      const clue = extra?.clueMessage as { name?: string; description?: string } | undefined;
      const name = clue?.name || content || "线索卡";
      const description = clue?.description ? ` - ${clue.description}` : "";
      return `[线索卡] ${name}${description}`;
    }
    case MessageType.SYSTEM:
      return content || "[系统消息]";
    default:
      return content || `[未知类型:${messageType ?? UNKNOWN_LABEL}]`;
  }
}

/**
 * 将聊天记录导出为文本格式
 * 格式参考：角色名(用户名) YYYY/MM/DD HH:mm:ss\n消息内容
 * @param messages 聊天消息列表
 * @param roleMap 角色信息映射 (roleId -> roleName)
 * @param userMap 用户信息映射 (userId -> username)
 * @param options 导出选项
 * @returns 格式化的文本内容
 */
export function formatChatMessages(
  messages: ChatMessageResponse[],
  roleMap: Map<number, string> = new Map(),
  userMap: Map<number, string> = new Map(),
  options: ExportOptions = {},
): string {
  const {
    includeTimestamp = true,
    includeUsername = true,
    dateFormat = "full",
  } = options;

  return messages
    .map((msg) => {
      try {
        const message = msg?.message;
        const senderLabel = buildSenderLabel(message, roleMap, userMap, includeUsername);

        let header = senderLabel;

        if (includeTimestamp && message?.createTime) {
          const date = new Date(message.createTime);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          const seconds = String(date.getSeconds()).padStart(2, "0");

          header = dateFormat === "full"
            ? `${senderLabel} ${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
            : `${senderLabel} ${hours}:${minutes}:${seconds}`;
        }

        const content = formatMessageContent(message, roleMap, userMap, includeUsername);
        return `${header}\n${content}`;
      }
      catch (error) {
        console.error("格式化消息失败", msg, error);
        return `[消息导出失败 messageId=${msg?.message?.messageId ?? UNKNOWN_LABEL}]`;
      }
    })
    .join("\n\n");
}

/**
 * 下载文本文件
 * @param content 文件内容
 * @param filename 文件名
 */
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出聊天记录
 * @param messages 聊天消息列表
 * @param roleMap 角色信息映射
 * @param userMap 用户信息映射
 * @param roomName 房间名称（用于生成文件名）
 * @param options 导出选项
 */
export function exportChatMessages(
  messages: ChatMessageResponse[],
  roleMap: Map<number, string> = new Map(),
  userMap: Map<number, string> = new Map(),
  roomName: string = "聊天记录",
  options: ExportOptions = {},
): void {
  if (messages.length === 0) {
    console.warn("没有消息可导出");
    return;
  }

  // 格式化消息
  const content = formatChatMessages(messages, roleMap, userMap, options);

  // 生成文件名（包含日期）
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const filename = `${roomName}_${year}${month}${day}_${hours}${minutes}.txt`;

  // 下载文件
  downloadTextFile(content, filename);
}
