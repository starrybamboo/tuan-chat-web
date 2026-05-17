import type { Message } from "@tuanchat/openapi-client/models/Message";
import { useMemo, useState } from "react";

interface MessageItem {
  message: Message;
}

export function useMessageSearch(messages: MessageItem[]) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const filteredMessages = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return messages;
    return messages.filter((item) => {
      const content = item.message.content?.toLowerCase() ?? "";
      const roleName = item.message.customRoleName?.toLowerCase() ?? "";
      return content.includes(trimmed) || roleName.includes(trimmed);
    });
  }, [messages, query]);

  const openSearch = () => setIsSearching(true);
  const closeSearch = () => {
    setIsSearching(false);
    setQuery("");
  };

  return {
    closeSearch,
    filteredMessages,
    isSearching,
    openSearch,
    query,
    resultCount: query.trim() ? filteredMessages.length : 0,
    setQuery,
  };
}
