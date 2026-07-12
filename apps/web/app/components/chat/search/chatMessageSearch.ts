import type { ChatMessageResponse } from "api";

export type ChatMessageSearchOrder = "newest" | "oldest";

type ChatMessageSearchIndex = {
  roleNamesById?: ReadonlyMap<number, string>;
  userNamesById?: ReadonlyMap<number, string>;
};

export type ChatMessageHighlightPart = {
  text: string;
  matched: boolean;
};

export function normalizeChatMessageSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function getMessageTime(message: ChatMessageResponse): number {
  const timestamp = Date.parse(message.message.createTime ?? "");
  return Number.isFinite(timestamp) ? timestamp : message.message.syncId;
}

/** 按消息正文、角色名、自定义角色名与用户名搜索当前房间历史。 */
export function searchChatMessages(
  messages: ChatMessageResponse[],
  query: string,
  index: ChatMessageSearchIndex = {},
  order: ChatMessageSearchOrder = "newest",
): ChatMessageResponse[] {
  const normalizedQuery = normalizeChatMessageSearchQuery(query);
  if (!normalizedQuery) {
    return [];
  }

  const results = messages.filter(({ message }) => {
    const candidates = [
      message.content,
      message.customRoleName,
      typeof message.roleId === "number" ? index.roleNamesById?.get(message.roleId) : undefined,
      index.userNamesById?.get(message.userId),
    ];
    return candidates.some(candidate => candidate?.toLocaleLowerCase().includes(normalizedQuery));
  });

  return results.toSorted((left, right) => {
    const difference = getMessageTime(left) - getMessageTime(right);
    return order === "oldest" ? difference : -difference;
  });
}

/** 拆分高亮片段，直接按字符串查找以支持括号等正则特殊字符。 */
export function splitChatMessageHighlight(text: string, query: string): ChatMessageHighlightPart[] {
  const normalizedQuery = normalizeChatMessageSearchQuery(query);
  if (!text || !normalizedQuery) {
    return [{ text, matched: false }];
  }

  const normalizedText = text.toLocaleLowerCase();
  const parts: ChatMessageHighlightPart[] = [];
  let cursor = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery, cursor);

  while (matchIndex >= 0) {
    if (matchIndex > cursor) {
      parts.push({ text: text.slice(cursor, matchIndex), matched: false });
    }
    const matchEnd = matchIndex + normalizedQuery.length;
    parts.push({ text: text.slice(matchIndex, matchEnd), matched: true });
    cursor = matchEnd;
    matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), matched: false });
  }

  return parts.length > 0 ? parts : [{ text, matched: false }];
}
