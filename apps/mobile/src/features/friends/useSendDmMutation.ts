import type { MessageDirectRecallRequest } from "@tuanchat/openapi-client/models/MessageDirectRecallRequest";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isOpenApiResponseError } from "@tuanchat/domain/open-api-result";
import {
  beginDirectReadOptimisticMutation,
  beginDirectRecallOptimisticMutation,
  getDirectInboxQueryKey,
  upsertDirectInboxQueryData,
} from "@tuanchat/query/direct-message";
import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";

import { mobileApiClient } from "@/lib/api";
import { createMobileOptimisticMessageId } from "@/lib/mobile-optimistic-id";

import {
  promotePendingDirectMessage,
  writeCachedDirectMessages,
  writePendingDirectMessage,
} from "./mobileDirectMessageCache";
import {
  createMobileOptimisticDirectMessage,
  markMobileOptimisticDirectMessageFailedData,
  replaceMobileOptimisticDirectMessageData,
} from "./mobileDirectMessageOptimistic";

let nextOptimisticDirectSyncId = Date.now() * 1000;

type SendDmMutationContext = {
  optimisticMessageId?: number;
  pendingWritePromise?: Promise<boolean>;
};

function warnDiskCacheFailure(action: string, error: unknown) {
  console.warn(`[useSendDmMutation] ${action}失败:`, error);
}

export function useSendDmMutation(currentUserId?: number | null) {
  const queryClient = useQueryClient();
  const markFailedAndPersist = (context: SendDmMutationContext | undefined) => {
    let failedMessage: MessageDirectResponse | undefined;
    queryClient.setQueryData<MessageDirectResponse[]>(
      getDirectInboxQueryKey(currentUserId),
      (current) => {
        const next = markMobileOptimisticDirectMessageFailedData(current, context?.optimisticMessageId);
        failedMessage = next?.find(message => message.messageId === context?.optimisticMessageId);
        return next;
      },
    );
    if (!failedMessage) {
      return;
    }
    void (context?.pendingWritePromise ?? Promise.resolve(false))
      .then(() => writePendingDirectMessage(currentUserId, failedMessage!))
      .catch(error => warnDiskCacheFailure("写入失败私聊消息", error));
  };
  const mutation = useMutation({
    mutationFn: (request: MessageDirectSendRequest) => mobileApiClient.messageDirectController.sendMessage1(request),
    mutationKey: ["sendDirectMessage", currentUserId ?? null],
    onMutate: async (request): Promise<SendDmMutationContext> => {
      const optimisticMessage = createMobileOptimisticDirectMessage({
        currentUserId,
        optimisticMessageId: createMobileOptimisticMessageId(),
        optimisticSyncId: nextOptimisticDirectSyncId++,
        request,
      });

      if (!optimisticMessage) {
        return {};
      }

      await queryClient.cancelQueries({ queryKey: getDirectInboxQueryKey(currentUserId) });
      upsertDirectInboxQueryData(queryClient, currentUserId, [optimisticMessage]);
      const pendingWritePromise = writePendingDirectMessage(currentUserId, optimisticMessage).then(
        () => true,
        (error) => {
          warnDiskCacheFailure("写入待发送私聊消息", error);
          return false;
        },
      );
      return {
        optimisticMessageId: optimisticMessage.messageId,
        pendingWritePromise,
      };
    },
    onError: (error, _request, context) => {
      if (isOpenApiResponseError(error)) {
        markFailedAndPersist(context);
      }
    },
    onSuccess: (result, _request, context) => {
      const confirmedMessage = result.data;
      if (confirmedMessage) {
        queryClient.setQueryData<MessageDirectResponse[]>(
          getDirectInboxQueryKey(currentUserId),
          current => replaceMobileOptimisticDirectMessageData(current, context?.optimisticMessageId, confirmedMessage),
        );
        const optimisticMessageId = context?.optimisticMessageId;
        if (typeof optimisticMessageId === "number") {
          const pendingWritePromise = context?.pendingWritePromise ?? Promise.resolve(false);
          void pendingWritePromise.then((wasWritten) => {
            const syncPromise = wasWritten
              ? promotePendingDirectMessage(currentUserId, optimisticMessageId, confirmedMessage)
              : writeCachedDirectMessages(currentUserId, [confirmedMessage]);
            return syncPromise.catch((error) => {
              warnDiskCacheFailure("确认待发送私聊消息", error);
            });
          });
        }
        else {
          void writeCachedDirectMessages(currentUserId, [confirmedMessage]).catch((error) => {
            warnDiskCacheFailure("写入已发送私聊消息磁盘缓存", error);
          });
        }
        return;
      }

      markFailedAndPersist(context);
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
    // 磁盘只保存服务端确认后的撤回事件；乐观投影仅留在 Query，等待 WS 或会话补洞收敛。
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
    // 同上：READ_LINE 由服务端追加并确认，不能把本地临时线写进 confirmed projection。
    onSettled: () => queryClient.invalidateQueries({ queryKey: getDirectInboxQueryKey(currentUserId) }),
  });
}
