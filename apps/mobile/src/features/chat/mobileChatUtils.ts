import type { Message } from "@tuanchat/openapi-client/models/Message";

import { getMessagePreviewText } from "@tuanchat/domain/message-preview";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";

import {
  formatMobileMessageAttachmentSize,
  MOBILE_MESSAGE_ATTACHMENT_KIND,
} from "@/features/messages/mobileMessageAttachment";

export { getMessageAuthorLabel, getRoomTypeLabel, getSpaceStatusLabel } from "@tuanchat/domain/display-labels";
export { buildMessageSearchText } from "@tuanchat/domain/message-search";
export { formatMessageDateTime, formatMessageTime } from "@tuanchat/domain/message-time";

export type MessageSubmitPhase = "idle" | "uploading" | "sending";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return fallback;
}

export function getMessagePreview(message: Message) {
  return getMessagePreviewText(message);
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
