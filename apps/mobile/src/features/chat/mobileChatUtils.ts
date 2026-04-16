import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import {
  formatMobileMessageAttachmentSize,
  MOBILE_MESSAGE_ATTACHMENT_KIND,
} from "@/features/messages/mobileMessageAttachment";

export type MessageSubmitPhase = "idle" | "uploading" | "sending";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return fallback;
}

export function getRoomTypeLabel(roomType?: number | null) {
  if (roomType === 2) {
    return "全员房间";
  }

  return "游戏房间";
}

export function getSpaceStatusLabel(status?: number | null) {
  return status === 2 ? "已归档" : "活跃中";
}

export function getMessageAuthorLabel(message: Message) {
  const customRoleName = message.customRoleName?.trim();
  if (customRoleName) {
    return customRoleName;
  }

  if (message.roleId && message.roleId > 0) {
    return `角色 #${message.roleId}`;
  }

  return `用户 #${message.userId}`;
}

export function getMessagePreview(message: Message) {
  const content = message.content?.trim() ?? "";

  switch (message.messageType) {
    case MESSAGE_TYPE.TEXT:
      return content || "空文本消息";
    case MESSAGE_TYPE.IMG:
      return content || "[图片]";
    case MESSAGE_TYPE.FILE:
      return content || "[文件]";
    case MESSAGE_TYPE.SYSTEM:
      return content ? `[系统] ${content}` : "[系统消息]";
    case MESSAGE_TYPE.SOUND:
      return content || "[语音]";
    case MESSAGE_TYPE.COMMAND_REQUEST:
      return content ? `[指令请求] ${content}` : "[指令请求]";
    case MESSAGE_TYPE.VIDEO:
      return content || "[视频]";
    case MESSAGE_TYPE.STATE_EVENT:
      return content || "[状态事件]";
    case MESSAGE_TYPE.ROOM_JUMP:
      return content || "[群聊跳转]";
    case MESSAGE_TYPE.THREAD_ROOT:
      return content || "[子区]";
    default:
      return content || `消息类型 #${message.messageType}`;
  }
}

export function formatMessageTime(value?: string | null) {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatMessageDateTime(value?: string | null) {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${month}-${day} ${formatMessageTime(value)}`;
}

export function getMessageSubmitPhaseText(phase: MessageSubmitPhase) {
  switch (phase) {
    case "uploading":
      return "正在上传附件…";
    case "sending":
      return "正在发送消息…";
    default:
      return null;
  }
}

function getAttachmentFileExtension(fileName: string) {
  const matchedExtension = fileName.trim().match(/\.([a-z0-9]+)$/i);
  return matchedExtension?.[1]?.toUpperCase() ?? null;
}

export function getMessageAttachmentMetaText(attachment: MobileMessageAttachment) {
  const metaParts = [
    formatMobileMessageAttachmentSize(attachment.size),
  ];

  if (
    attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE
    && attachment.width
    && attachment.height
  ) {
    metaParts.push(`${attachment.width}×${attachment.height}`);
  }

  const extension = getAttachmentFileExtension(attachment.fileName);
  if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.FILE && extension) {
    metaParts.push(extension);
  }

  return metaParts.join(" · ");
}

export function parsePositiveIntegerInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function buildMessageSearchText(message: Message) {
  const parts = [
    getMessageAuthorLabel(message),
    getMessagePreview(message),
    `消息 #${message.messageId ?? "-"}`,
  ];

  return parts.join(" ").toLocaleLowerCase("zh-CN");
}
