import type { Message } from "@tuanchat/openapi-client/models/Message";

import { buildMessageSearchText } from "@tuanchat/domain/message-search";
import { useMemo, useState } from "react";

type MessageItem = {
  message: Message;
};

export function useMessageSearch(messages: MessageItem[]) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const filteredMessages = useMemo(() => {
    const trimmed = query.trim().toLocaleLowerCase("zh-CN");
    if (!trimmed)
      return messages;
    return messages.filter((item) => {
      return buildMessageSearchText(item.message).includes(trimmed);
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
