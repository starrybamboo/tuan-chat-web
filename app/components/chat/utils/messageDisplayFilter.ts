import { isOutOfCharacterSpeech } from "@/components/chat/utils/outOfCharacterSpeech";

import type { ChatMessageResponse } from "../../../../api";

export type MessageDisplayFilterAction = "remove" | "keep";

export type MessageDisplayFilterConfig = {
  action: MessageDisplayFilterAction;
  filterOutOfCharacterSpeech: boolean;
  regexFlags: string;
  regexPattern: string;
};

export type MessageDisplayFilterMatcher = {
  error: string | null;
  test: ((message: ChatMessageResponse) => boolean) | null;
};

export function sanitizeMessageDisplayFilterRegexFlags(flags: string): string {
  const allowed = new Set(["g", "i", "m", "s", "u", "y"]);
  const deduped: string[] = [];
  for (const rawFlag of flags.toLowerCase()) {
    if (!allowed.has(rawFlag))
      continue;
    if (deduped.includes(rawFlag))
      continue;
    deduped.push(rawFlag);
  }
  return deduped.filter(flag => flag !== "g" && flag !== "y").join("");
}

export function extractMessageDisplayFilterSearchText(messageResponse: ChatMessageResponse): string {
  const message = messageResponse.message;
  const forwardMessageList = (message.extra as any)?.forwardMessage?.messageList;
  const forwardText = Array.isArray(forwardMessageList)
    ? forwardMessageList
        .map(item => (typeof item?.message?.content === "string" ? item.message.content : ""))
        .filter(Boolean)
        .join(" ")
    : "";

  return [
    typeof message.customRoleName === "string" ? message.customRoleName : "",
    typeof message.content === "string" ? message.content : "",
    forwardText,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function createMessageDisplayFilterMatcher(config: MessageDisplayFilterConfig): MessageDisplayFilterMatcher {
  const trimmedPattern = config.regexPattern.trim();
  let regexTest: ((text: string) => boolean) | null = null;

  if (trimmedPattern) {
    try {
      const regex = new RegExp(trimmedPattern, sanitizeMessageDisplayFilterRegexFlags(config.regexFlags));
      regexTest = (text: string) => regex.test(text);
    }
    catch (error) {
      if (!config.filterOutOfCharacterSpeech) {
        return { test: null, error: error instanceof Error ? error.message : "正则表达式不合法" };
      }
      return {
        error: error instanceof Error ? error.message : "正则表达式不合法",
        test: (messageResponse: ChatMessageResponse) => {
          const rawContent = typeof messageResponse.message.content === "string" ? messageResponse.message.content : "";
          return isOutOfCharacterSpeech(rawContent);
        },
      };
    }
  }

  if (!regexTest && !config.filterOutOfCharacterSpeech) {
    return { test: null, error: null };
  }

  return {
    error: null,
    test: (messageResponse: ChatMessageResponse) => {
      const rawContent = typeof messageResponse.message.content === "string" ? messageResponse.message.content : "";
      const isOutOfCharacterMatched = config.filterOutOfCharacterSpeech
        ? isOutOfCharacterSpeech(rawContent)
        : false;
      const isRegexMatched = regexTest
        ? regexTest(extractMessageDisplayFilterSearchText(messageResponse))
        : false;
      return isOutOfCharacterMatched || isRegexMatched;
    },
  };
}

export function describeMessageDisplayFilterStatus(config: MessageDisplayFilterConfig): string {
  const conditions: string[] = [];
  const trimmedPattern = config.regexPattern.trim();
  if (trimmedPattern) {
    const sanitizedFlags = sanitizeMessageDisplayFilterRegexFlags(config.regexFlags);
    conditions.push(sanitizedFlags
      ? `正则「${trimmedPattern}」/${sanitizedFlags}`
      : `正则「${trimmedPattern}」`);
  }
  if (config.filterOutOfCharacterSpeech) {
    conditions.push("场外发言");
  }

  if (conditions.length === 0) {
    return "筛选中";
  }
  const conditionText = conditions.join(" 或 ");
  return config.action === "keep"
    ? `显示匹配：${conditionText}`
    : `隐藏匹配：${conditionText}`;
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
  return messages.filter((message) => {
    const matched = matcher.test?.(message) ?? false;
    return config.action === "keep" ? matched : !matched;
  });
}
