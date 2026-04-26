import { getDiceResultExtra } from "@/types/messageExtra";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, Message } from "../../../../api";

import { hasHostPrivileges } from "./memberPermissions";

type MessageVisibilityParams = {
  currentUserId?: number | null;
  memberType?: number | null;
};

function normalizeUserId(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function isHiddenDiceMessage(message?: Message | null): boolean {
  if (!message || message.messageType !== MESSAGE_TYPE.DICE) {
    return false;
  }
  return getDiceResultExtra(message.extra)?.hidden === true;
}

export function canCurrentUserViewMessage(
  message: Message | null | undefined,
  {
    currentUserId,
    memberType,
  }: MessageVisibilityParams,
): boolean {
  if (!message) {
    return false;
  }
  if (!isHiddenDiceMessage(message)) {
    return true;
  }
  const normalizedCurrentUserId = normalizeUserId(currentUserId);
  if (normalizedCurrentUserId !== null && normalizedCurrentUserId === normalizeUserId(message.userId)) {
    return true;
  }
  return hasHostPrivileges(memberType);
}

export function filterVisibleChatMessages(
  messages: ChatMessageResponse[],
  params: MessageVisibilityParams,
): ChatMessageResponse[] {
  return messages.filter(item => canCurrentUserViewMessage(item.message, params));
}
