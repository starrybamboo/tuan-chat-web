import type { MessageDirectRecallRequest } from "@tuanchat/openapi-client/models/MessageDirectRecallRequest";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  beginDirectReadOptimisticMutation,
  beginDirectRecallOptimisticMutation,
  getDirectInboxQueryKey,
  upsertDirectInboxQueryData,
} from "@tuanchat/query/direct-message";
import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";

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

function warnDiskCacheFailure(action: string, error: unknown) {
  console.warn(`[useSendDmMutation] ${action}失败:`, error);
}

export function useSendDmMutation(currentUserId?: number | null) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (request: MessageDirectSendRequest) => mobileApiClient.messageDirectController.sendMessage1(request),
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
    onMutate: request => beginDirectRecallOptimisticMutation(queryClient, request.messageId),
    onError: (_error, _request, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSuccess: (_result, request) => {
      void markCachedDirectMessagesRecalled(currentUserId, [request.messageId]).catch((error) => {
        warnDiskCacheFailure("写入私聊撤回磁盘缓存", error);
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: getDirectInboxQueryKey(currentUserId) }),
  });
}

export function useUpdateDmReadPositionMutation(currentUserId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: number) => mobileApiClient.messageDirectController.updateReadPosition({ targetUserId }),
    mutationKey: ["updateDirectReadPosition", currentUserId ?? null],
    onMutate: targetUserId => beginDirectReadOptimisticMutation(queryClient, currentUserId, targetUserId),
    onError: (_error, _targetUserId, context) => rollbackOptimisticQueryTransaction(queryClient, context?.transaction),
    onSuccess: (_result, targetUserId, context) => {
      if (context.readSync > 0) {
          void upsertCachedDirectReadLine(currentUserId, targetUserId, context.readSync).catch((error) => {
            warnDiskCacheFailure("写入私聊已读线磁盘缓存", error);
          });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: getDirectInboxQueryKey(currentUserId) }),
  });
}
