import { isOutOfCharacterSpeech } from "@/components/chat/utils/outOfCharacterSpeech";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../api";

export type MessageDisplayFilterAction = "remove" | "keep";

export type MessageDisplayFilterConfig = {
  action: MessageDisplayFilterAction;
  filterOutOfCharacterSpeech: boolean;
  filterStateMessages: boolean;
};

export type MessageDisplayFilterMatcher = {
  error: string | null;
  test: ((message: ChatMessageResponse) => boolean) | null;
};

export type MessageDisplayFilterEntry = {
  message: ChatMessageResponse;
  sourceIndex: number;
};

export function createMessageDisplayFilterMatcher(config: MessageDisplayFilterConfig): MessageDisplayFilterMatcher {
  const matchers: Array<(message: ChatMessageResponse) => boolean> = [];

  if (config.filterOutOfCharacterSpeech) {
    matchers.push((messageResponse) => {
      const rawContent = typeof messageResponse.message.content === "string" ? messageResponse.message.content : "";
      return isOutOfCharacterSpeech(rawContent);
    });
  }

  if (config.filterStateMessages) {
    matchers.push(messageResponse => messageResponse.message.messageType === MESSAGE_TYPE.STATE_EVENT);
  }

  if (matchers.length === 0) {
    return { test: null, error: null };
  }

  return {
    error: null,
    test: (messageResponse: ChatMessageResponse) => matchers.some(match => match(messageResponse)),
  };
}

export function collectMessageDisplayFilterEntries(
  messages: ChatMessageResponse[],
  config: MessageDisplayFilterConfig | null,
): MessageDisplayFilterEntry[] {
  if (!config) {
    return messages.map((message, sourceIndex) => ({
      message,
      sourceIndex,
    }));
  }

  const matcher = createMessageDisplayFilterMatcher(config);
  if (!matcher.test) {
    return messages.map((message, sourceIndex) => ({
      message,
      sourceIndex,
    }));
  }

  const entries: MessageDisplayFilterEntry[] = [];
  for (let sourceIndex = 0; sourceIndex < messages.length; sourceIndex++) {
    const message = messages[sourceIndex]!;
    const matched = matcher.test(message);
    const shouldKeep = config.action === "keep" ? matched : !matched;
    if (shouldKeep) {
      entries.push({
        message,
        sourceIndex,
      });
    }
  }
  return entries;
}

export function describeMessageDisplayFilterStatus(config: MessageDisplayFilterConfig): string {
  const conditions: string[] = [];
  if (config.filterOutOfCharacterSpeech) {
    conditions.push("场外发言");
  }
  if (config.filterStateMessages) {
    conditions.push("状态消息");
  }

  if (conditions.length === 0) {
    return "筛选中";
  }
  const hiddenConditionText = conditions.map(condition => `隐藏${condition}`).join(" 或 ");
  const reverseConditionText = conditions.join(" 或 ");
  return config.action === "keep"
    ? `反选：仅显示${reverseConditionText}`
    : `筛选：${hiddenConditionText}`;
}

export function filterChatMessagesForDisplay(
  messages: ChatMessageResponse[],
  config: MessageDisplayFilterConfig | null,
): ChatMessageResponse[] {
  if (!config) {
    return messages;
  }
  const matcher = createMessageDisplayFilterMatcher(config);
  if (!matcher.test) {
    return messages;
  }
  return collectMessageDisplayFilterEntries(messages, config).map(entry => entry.message);
}
