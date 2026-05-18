import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { groupDirectConversations } from "@tuanchat/domain/direct-message";
import { useDirectInboxMessagesQuery } from "@tuanchat/query/direct-message";
import { useMemo } from "react";

import { mobileApiClient } from "@/lib/api";

export interface DmConversation {
  contactId: number;
  contactName: string;
  contactAvatarFileId: number | undefined;
  lastMessage: MessageDirectResponse;
  messages: MessageDirectResponse[];
  unreadCount: number;
}

export function useDmInboxQuery(currentUserId: number | null) {
  const query = useDirectInboxMessagesQuery(mobileApiClient, currentUserId, {
    enabled: typeof currentUserId === "number" && currentUserId > 0,
  });

  const data = useMemo(
    () => groupDirectConversations(query.data ?? [], currentUserId) as DmConversation[],
    [query.data, currentUserId],
  );

  return { ...query, data };
}
