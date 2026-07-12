import type { QueryClient } from "@tanstack/react-query";
import type { MessageDirectRecallRequest } from "@tuanchat/openapi-client/models/MessageDirectRecallRequest";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";
import type { DirectBadgeSummaryResponse } from "@tuanchat/openapi-client/models/DirectBadgeSummaryResponse";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { groupDirectConversations, mergeDirectMessages } from "@tuanchat/domain/direct-message";

type DirectMessageClient = Pick<TuanChat, "messageDirectController">;

export function getDirectInboxQueryKey(currentUserId?: number | null) {
  return ["dmInbox", currentUserId ?? null] as const;
}

export function getDirectConversationQueryKey(currentUserId: number | null | undefined, contactId: number | null | undefined) {
  return ["dmConversation", currentUserId ?? null, contactId ?? null] as const;
}

export function getDirectBadgeSummaryQueryKey(currentUserId?: number | null) {
  return ["directBadgeSummary", currentUserId ?? null] as const;
}

export function useDirectBadgeSummaryQuery(
  client: DirectMessageClient,
  currentUserId: number | null | undefined,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<DirectBadgeSummaryResponse>({
    enabled: (options.enabled ?? true) && typeof currentUserId === "number" && currentUserId > 0,
    queryFn: async () => {
      const result = await client.messageDirectController.getBadgeSummary();
      return result.data ?? { directUnreadCount: 0, pendingFriendRequestCount: 0 };
    },
    queryKey: getDirectBadgeSummaryQueryKey(currentUserId),
    staleTime: options.staleTime ?? 30_000,
  });
}

export function upsertDirectInboxMessagesData(
  currentMessages: MessageDirectResponse[] | undefined,
  incomingMessages: MessageDirectResponse[],
): MessageDirectResponse[] {
  return mergeDirectMessages(currentMessages, incomingMessages);
}

export function upsertDirectInboxQueryData(
  queryClient: QueryClient,
  currentUserId: number | null | undefined,
  incomingMessages: MessageDirectResponse[],
) {
  queryClient.setQueryData<MessageDirectResponse[]>(
    getDirectInboxQueryKey(currentUserId),
    current => upsertDirectInboxMessagesData(current, incomingMessages),
  );
}

export function removeDirectInboxMessageData(
  currentMessages: MessageDirectResponse[] | undefined,
  messageId: number,
): MessageDirectResponse[] {
  return (currentMessages ?? []).filter(message => message.messageId !== messageId);
}

export function removeDirectInboxMessageFromCache(
  queryClient: QueryClient,
  currentUserId: number | null | undefined,
  messageId: number,
) {
  queryClient.setQueryData<MessageDirectResponse[]>(
    getDirectInboxQueryKey(currentUserId),
    current => removeDirectInboxMessageData(current, messageId),
  );
}

export function replaceDirectOptimisticInboxMessageData(
  currentMessages: MessageDirectResponse[] | undefined,
  optimisticMessageId: number,
  committedMessage: MessageDirectResponse,
): MessageDirectResponse[] {
  return mergeDirectMessages(
    removeDirectInboxMessageData(currentMessages, optimisticMessageId),
    [committedMessage],
  );
}

export function replaceDirectOptimisticMessageInCache(
  queryClient: QueryClient,
  currentUserId: number | null | undefined,
  optimisticMessageId: number,
  committedMessage: MessageDirectResponse,
) {
  queryClient.setQueryData<MessageDirectResponse[]>(
    getDirectInboxQueryKey(currentUserId),
    current => replaceDirectOptimisticInboxMessageData(current, optimisticMessageId, committedMessage),
  );
}

export function markDirectMessageRecalledData(
  currentMessages: MessageDirectResponse[] | undefined,
  messageId: number,
): MessageDirectResponse[] | undefined {
  if (!currentMessages) {
    return currentMessages;
  }

  return currentMessages.map((message) => {
    if (message.messageId !== messageId) {
      return message;
    }
    return {
      ...message,
      status: 1,
    };
  });
}

export function markDirectMessageRecalledInCaches(
  queryClient: QueryClient,
  messageId: number,
) {
  for (const [queryKey, data] of queryClient.getQueriesData<MessageDirectResponse[]>({ queryKey: ["dmInbox"] })) {
    queryClient.setQueryData(queryKey, markDirectMessageRecalledData(data, messageId));
  }
}

export function useDirectInboxMessagesQuery(
  client: DirectMessageClient,
  currentUserId: number | null | undefined,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<MessageDirectResponse[]>({
    enabled: (options.enabled ?? true) && typeof currentUserId === "number" && currentUserId > 0,
    queryFn: async () => {
      const res = await client.messageDirectController.getInboxMessages();
      return mergeDirectMessages(res.data ?? []);
    },
    queryKey: getDirectInboxQueryKey(currentUserId),
    staleTime: options.staleTime ?? 30_000,
  });
}

export function useDirectConversationsQuery(
  client: DirectMessageClient,
  currentUserId: number | null | undefined,
  options: { enabled?: boolean; optimisticReadSyncByContact?: Record<number, number>; staleTime?: number } = {},
) {
  const query = useDirectInboxMessagesQuery(client, currentUserId, options);
  return {
    ...query,
    data: groupDirectConversations(query.data ?? [], currentUserId, options.optimisticReadSyncByContact),
  };
}

export function useSendDirectMessageMutation(client: DirectMessageClient, currentUserId?: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MessageDirectSendRequest) => client.messageDirectController.sendMessage1(request),
    mutationKey: ["sendDirectMessage", currentUserId ?? null],
    onSuccess: (result) => {
      if (result.data) {
        upsertDirectInboxQueryData(queryClient, currentUserId, [result.data]);
      }
      queryClient.invalidateQueries({ queryKey: getDirectBadgeSummaryQueryKey(currentUserId) });
    },
  });
}

export function useRecallDirectMessageMutation(client: DirectMessageClient, currentUserId?: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MessageDirectRecallRequest) => client.messageDirectController.recallMessage(request),
    mutationKey: ["recallDirectMessage", currentUserId ?? null],
    onSuccess: (_result, request) => {
      markDirectMessageRecalledInCaches(queryClient, request.messageId);
      queryClient.invalidateQueries({ queryKey: getDirectInboxQueryKey(currentUserId) });
      queryClient.invalidateQueries({ queryKey: getDirectBadgeSummaryQueryKey(currentUserId) });
    },
  });
}

export function useUpdateDirectReadPositionMutation(client: DirectMessageClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) => client.messageDirectController.updateReadPosition({ targetUserId }),
    mutationKey: ["updateDirectReadPosition"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dmInbox"] });
      queryClient.invalidateQueries({ queryKey: ["directBadgeSummary"] });
    },
  });
}
