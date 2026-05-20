import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { MessageDirectRecallRequest } from "@tuanchat/openapi-client/models/MessageDirectRecallRequest";
import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";

import { mobileApiClient } from "@/lib/api";
import { DIRECT_MESSAGE_READ_LINE_TYPE, getLatestIncomingSync } from "@tuanchat/domain/direct-message";
import {
  getDirectInboxQueryKey,
  markDirectMessageRecalledInCaches,
  upsertDirectInboxQueryData,
} from "@tuanchat/query/direct-message";

import {
  markCachedDirectMessagesRecalled,
  upsertCachedDirectReadLine,
  writeCachedDirectMessages,
} from "./mobileDirectMessageCache";

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
    onSuccess: (result) => {
      if (result.data) {
        upsertDirectInboxQueryData(queryClient, currentUserId, [result.data]);
        void writeCachedDirectMessages(currentUserId, [result.data]).catch((error) => {
          warnDiskCacheFailure("写入已发送私聊消息磁盘缓存", error);
        });
      }
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
