import type { MessageDirectRecallRequest } from "@tuanchat/openapi-client/models/MessageDirectRecallRequest";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DIRECT_MESSAGE_READ_LINE_TYPE, getLatestIncomingSync } from "@tuanchat/domain/direct-message";
import {
  getDirectInboxQueryKey,
  markDirectMessageRecalledInCaches,
  upsertDirectInboxQueryData,
} from "@tuanchat/query/direct-message";

import { mobileApiClient } from "@/lib/api";

import {
  markCachedDirectMessagesRecalled,
  upsertCachedDirectReadLine,
  writeCachedDirectMessages,
} from "./mobileDirectMessageCache";
import {
  createMobileOptimisticDirectMessage,
  markMobileOptimisticDirectMessageFailedData,
  removeMobileOptimisticDirectMessageData,
  replaceMobileOptimisticDirectMessageData,
} from "./mobileDirectMessageOptimistic";

let nextOptimisticDirectMessageId = -Date.now() * 1000;
let nextOptimisticDirectSyncId = Date.now() * 1000;

type SendDmMutationContext = {
  optimisticMessageId?: number;
};

function isPositiveUserId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function createDirectReadLineMessage(currentUserId: number, contactId: number, syncId: number): MessageDirectResponse {
  return {
    createTime: new Date().toISOString(),
    messageId: -contactId,
    messageType: DIRECT_MESSAGE_READ_LINE_TYPE,
    receiverId: contactId,
    senderId: currentUserId,
    status: 0,
    syncId,
    userId: currentUserId,
  };
}

function warnDiskCacheFailure(action: string, error: unknown) {
  console.warn(`[useSendDmMutation] ${action}失败:`, error);
}

export function useSendDmMutation(currentUserId?: number | null) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (request: MessageDirectSendRequest) => mobileApiClient.messageDirectController.sendMessage(request),
    mutationKey: ["sendDirectMessage", currentUserId ?? null],
    onMutate: async (request): Promise<SendDmMutationContext> => {
      const optimisticMessage = createMobileOptimisticDirectMessage({
        currentUserId,
        optimisticMessageId: nextOptimisticDirectMessageId--,
        optimisticSyncId: nextOptimisticDirectSyncId++,
        request,
      });

      if (!optimisticMessage) {
        return {};
      }

      await queryClient.cancelQueries({ queryKey: getDirectInboxQueryKey(currentUserId) });
      upsertDirectInboxQueryData(queryClient, currentUserId, [optimisticMessage]);
      return { optimisticMessageId: optimisticMessage.messageId };
    },
    onError: (_error, _request, context) => {
      queryClient.setQueryData<MessageDirectResponse[]>(
        getDirectInboxQueryKey(currentUserId),
        current => markMobileOptimisticDirectMessageFailedData(current, context?.optimisticMessageId),
      );
    },
    onSuccess: (result, _request, context) => {
      if (result.data) {
        queryClient.setQueryData<MessageDirectResponse[]>(
          getDirectInboxQueryKey(currentUserId),
          current => replaceMobileOptimisticDirectMessageData(current, context?.optimisticMessageId, result.data),
        );
        void writeCachedDirectMessages(currentUserId, [result.data]).catch((error) => {
          warnDiskCacheFailure("写入已发送私聊消息磁盘缓存", error);
        });
        return;
      }

      queryClient.setQueryData<MessageDirectResponse[]>(
        getDirectInboxQueryKey(currentUserId),
        current => removeMobileOptimisticDirectMessageData(current, context?.optimisticMessageId),
      );
    },
  });

  return {
    ...mutation,
    mutate: (request: MessageDirectSendRequest) => mutation.mutate(request),
    mutateAsync: (request: MessageDirectSendRequest) => mutation.mutateAsync(request),
  };
}

export function useRecallDmMutation(currentUserId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MessageDirectRecallRequest) => mobileApiClient.messageDirectController.recallMessage(request),
    mutationKey: ["recallDirectMessage", currentUserId ?? null],
    onSuccess: (_result, request) => {
      markDirectMessageRecalledInCaches(queryClient, request.messageId);
      queryClient.invalidateQueries({ queryKey: getDirectInboxQueryKey(currentUserId) });
      void markCachedDirectMessagesRecalled(currentUserId, [request.messageId]).catch((error) => {
        warnDiskCacheFailure("写入私聊撤回磁盘缓存", error);
      });
    },
  });
}

export function useUpdateDmReadPositionMutation(currentUserId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: number) => mobileApiClient.messageDirectController.updateReadPosition({ targetUserId }),
    mutationKey: ["updateDirectReadPosition", currentUserId ?? null],
    onSuccess: (_result, targetUserId) => {
      if (isPositiveUserId(currentUserId) && isPositiveUserId(targetUserId)) {
        const messages = queryClient.getQueryData<MessageDirectResponse[]>(getDirectInboxQueryKey(currentUserId)) ?? [];
        const latestIncomingSync = getLatestIncomingSync(messages, targetUserId);
        if (latestIncomingSync > 0) {
          upsertDirectInboxQueryData(queryClient, currentUserId, [
            createDirectReadLineMessage(currentUserId, targetUserId, latestIncomingSync),
          ]);
          void upsertCachedDirectReadLine(currentUserId, targetUserId, latestIncomingSync).catch((error) => {
            warnDiskCacheFailure("写入私聊已读线磁盘缓存", error);
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: getDirectInboxQueryKey(currentUserId) });
    },
  });
}
