import type { MessageDraft } from "@tuanchat/domain/message-draft";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { useQueryClient } from "@tanstack/react-query";
import {
  buildChatMessageRequestFromDraft,
} from "@tuanchat/domain/message-draft";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { extractOpenApiErrorMessage, isOpenApiResponseError } from "@tuanchat/domain/open-api-result";
import {
  useSendMessageMutation as useSharedSendMessageMutation,
} from "@tuanchat/query/chat";
import {
  commitOptimisticRoomMessageInList,
  createOptimisticRoomMessage,
  buildRoomMessageRetryRequest,
  getNextAppendPosition,
  getRoomMessageLocalRenderKey,
  mergeRoomMessagesForLocalState,
  markFailedRoomMessage,
  removeRoomMessageFromList,
  removeRoomMessagesFromList,
} from "@tuanchat/query/room-message-lifecycle";
import { useRef } from "react";

import type { RoomMessagesQueryData } from "./roomMessagesQueryData";

import { getMobileApiBaseUrl, mobileApiClient } from "../../lib/api";
import { createMobileOptimisticMessageId } from "../../lib/mobile-optimistic-id";
import {
  promotePendingRoomMessage,
  rollbackPendingRoomMessages,
  writeCachedRoomMessages,
  writePendingRoomMessages,
} from "./mobileRoomMessageCache";
import {
  createMobileRoomMessageRequestId,
  MobileRoomMessageDeliveryUnknownError,
  trySendMobileRoomMessageByWebSocket,
} from "./mobileRoomMessageTransport";
import {
  withStableRoomMessagePosition,
  withStableRoomMessagePositions,
} from "./roomMessagePosition";
import { extractRoomMessagesFromQueryData, updateRoomMessagesQueryData } from "./roomMessagesQueryData";
import { getRoomMessagesQueryKey } from "./roomMessagesQueryKey";
import { traceRoomMessageTiming } from "./roomMessageTimingTrace";
export { withStableRoomMessagePosition, withStableRoomMessagePositions } from "./roomMessagePosition";

type SendMessageContext = {
  annotations?: string[];
  avatarId?: number;
  customRoleName?: string;
  replayMessageId?: number;
  roleId?: number;
};

type SendDraftMessagesOptions = {
  optimisticMessages?: Array<ChatMessageResponse | null | undefined>;
};

class MobileRoomMessageRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MobileRoomMessageRejectedError";
  }
}

function reportSentMessageCacheFailure(error: unknown): void {
  console.warn("[useSendRoomMessageMutation] 已发送消息的磁盘缓存同步失败:", error);
}

function requirePositiveRoomId(roomId: number | null): number {
  if (!roomId || roomId <= 0) {
    throw new Error("请先选择一个房间。");
  }

  return roomId;
}

function requireNonEmptyContent(content: string, fallback = "消息内容不能为空。"): string {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error(fallback);
  }

  return trimmed;
}

export function useSendRoomMessageMutation(
  roomId: number | null,
  currentUserId: number = 0,
  currentMessagesForPosition: readonly ChatMessageResponse[] = [],
) {
  const queryClient = useQueryClient();
  const mutation = useSharedSendMessageMutation(mobileApiClient, roomId ?? -1);
  const pendingWritePromisesRef = useRef(new Map<number, Promise<boolean>>());
  const sendAttemptIdRef = useRef(0);

  const trackPendingWrite = (resolvedRoomId: number, optimistics: ChatMessageResponse[]) => {
    const pendingWritePromise = writePendingRoomMessages(resolvedRoomId, optimistics).then(
      () => true,
      (error) => {
        reportSentMessageCacheFailure(error);
        return false;
      },
    );
    for (const optimistic of optimistics) {
      pendingWritePromisesRef.current.set(optimistic.message.messageId, pendingWritePromise);
    }
  };

  const getCurrentMessages = (): ChatMessageResponse[] => {
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId <= 0)
      return [];
    const queryMessages = extractRoomMessagesFromQueryData(
      queryClient.getQueryData<RoomMessagesQueryData>(getRoomMessagesQueryKey(resolvedRoomId)),
    );
    return mergeRoomMessagesForLocalState([...currentMessagesForPosition], queryMessages);
  };

  const updateQueryCache = (updater: (current: ChatMessageResponse[] | undefined) => ChatMessageResponse[]) => {
    const resolvedRoomId = requirePositiveRoomId(roomId);
    const queryKey = getRoomMessagesQueryKey(resolvedRoomId);
    queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, updater));
  };

  const insertOptimistic = (request: ChatMessageRequest): ChatMessageResponse => {
    const currentMessages = getCurrentMessages();
    const position = typeof request.position === "number"
      ? request.position
      : getNextAppendPosition(currentMessages);
    const optimistic = createOptimisticRoomMessage(request, {
      optimisticId: createMobileOptimisticMessageId(),
      currentUserId,
      position,
    });
    updateQueryCache(current => mergeRoomMessagesForLocalState(current, [optimistic]));
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId > 0) {
      trackPendingWrite(resolvedRoomId, [optimistic]);
    }
    return optimistic;
  };

  const insertOptimisticBatch = (requests: ChatMessageRequest[]): ChatMessageResponse[] => {
    const currentMessages = getCurrentMessages();
    let nextPosition = getNextAppendPosition(currentMessages);
    const optimistics = requests.map((request) => {
      const position = typeof request.position === "number" ? request.position : nextPosition++;
      return createOptimisticRoomMessage(request, {
        optimisticId: createMobileOptimisticMessageId(),
        currentUserId,
        position,
      });
    });
    updateQueryCache(current => mergeRoomMessagesForLocalState(current, optimistics));
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId > 0) {
      trackPendingWrite(resolvedRoomId, optimistics);
    }
    return optimistics;
  };

  const commitOptimistic = (optimisticId: number, serverMessage: ChatMessageResponse["message"]) => {
    updateQueryCache(current => commitOptimisticRoomMessageInList(current, optimisticId, serverMessage));
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId > 0) {
      const pendingWritePromise = pendingWritePromisesRef.current.get(optimisticId) ?? Promise.resolve(false);
      pendingWritePromisesRef.current.delete(optimisticId);
      void pendingWritePromise.then((wasWritten) => {
        const confirmedMessage = { message: serverMessage };
        const syncPromise = wasWritten
          ? promotePendingRoomMessage(resolvedRoomId, optimisticId, confirmedMessage)
          : writeCachedRoomMessages(resolvedRoomId, [confirmedMessage]);
        return syncPromise.catch(reportSentMessageCacheFailure);
      });
    }
  };

  const revertOptimistic = (optimisticId: number) => {
    updateQueryCache(current => removeRoomMessageFromList(current, optimisticId));
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId > 0) {
      const pendingWritePromise = pendingWritePromisesRef.current.get(optimisticId);
      pendingWritePromisesRef.current.delete(optimisticId);
      void pendingWritePromise?.then((wasWritten) => {
        return wasWritten
          ? rollbackPendingRoomMessages(resolvedRoomId, [optimisticId]).catch(reportSentMessageCacheFailure)
          : undefined;
      });
    }
  };

  const revertOptimisticBatch = (optimisticIds: number[]) => {
    updateQueryCache(current => removeRoomMessagesFromList(current, optimisticIds));
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId > 0) {
      const pendingWrites = optimisticIds.map(async (optimisticId) => {
        const pendingWritePromise = pendingWritePromisesRef.current.get(optimisticId);
        pendingWritePromisesRef.current.delete(optimisticId);
        return pendingWritePromise && await pendingWritePromise ? optimisticId : null;
      });
      void Promise.all(pendingWrites).then((writtenIds) => {
        const idsToRollback = writtenIds.filter((optimisticId): optimisticId is number => optimisticId !== null);
        return idsToRollback.length > 0
          ? rollbackPendingRoomMessages(resolvedRoomId, idsToRollback).catch(reportSentMessageCacheFailure)
          : undefined;
      });
    }
  };

  const markOptimisticFailed = (optimistic: ChatMessageResponse) => {
    const failedMessage = {
      ...optimistic,
      message: markFailedRoomMessage(optimistic.message),
    };
    updateQueryCache(current => mergeRoomMessagesForLocalState(current, [failedMessage]));
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId > 0) {
      const pendingWritePromise = pendingWritePromisesRef.current.get(optimistic.message.messageId) ?? Promise.resolve(false);
      pendingWritePromisesRef.current.delete(optimistic.message.messageId);
      void pendingWritePromise.then(() => writePendingRoomMessages(resolvedRoomId, [failedMessage]))
        .catch(reportSentMessageCacheFailure);
    }
  };

  const markOptimisticBatchFailed = (optimistics: ChatMessageResponse[]) => {
    optimistics.forEach(markOptimisticFailed);
  };

  const findCommittedOptimistic = (optimistic: ChatMessageResponse) => {
    const localRenderKey = getRoomMessageLocalRenderKey(optimistic.message);
    if (!localRenderKey) {
      return null;
    }
    return getCurrentMessages().find(item => (
      item.message.messageId > 0
      && getRoomMessageLocalRenderKey(item.message) === localRenderKey
    )) ?? null;
  };

  const insertLocalOptimisticMessages = (requests: ChatMessageRequest[]) => {
    requirePositiveRoomId(roomId);
    return requests.length > 0 ? insertOptimisticBatch(requests) : [];
  };

  const discardLocalOptimisticMessages = (optimisticMessages: ChatMessageResponse[]) => {
    const optimisticIds = optimisticMessages.map(item => item.message.messageId);
    if (optimisticIds.length > 0) {
      revertOptimisticBatch(optimisticIds);
    }
  };

  const mutateRequest = async (request: ChatMessageRequest) => {
    try {
      return await mutation.mutateAsync(request);
    }
    catch (error) {
      if (isOpenApiResponseError(error)) {
        throw new MobileRoomMessageRejectedError(extractOpenApiErrorMessage(error, "发送消息失败。"));
      }
      throw error;
    }
  };

  const sendTransportRequest = async (
    request: ChatMessageRequest,
    traceContext?: { attemptId: number; roomId: number },
  ): Promise<Awaited<ReturnType<typeof mutateRequest>>> => {
    const requestId = createMobileRoomMessageRequestId();
    const webSocketResult = trySendMobileRoomMessageByWebSocket(requestId, request);
    if (webSocketResult) {
      const startedAt = Date.now();
      traceRoomMessageTiming("send.ws.start", {
        attemptId: traceContext?.attemptId,
        requestId,
        roomId: traceContext?.roomId ?? request.roomId,
      });
      const result = await webSocketResult;
      traceRoomMessageTiming("send.ws.end", {
        attemptId: traceContext?.attemptId,
        durationMs: Date.now() - startedAt,
        messageId: result.message?.messageId,
        requestId,
        roomId: traceContext?.roomId ?? request.roomId,
        success: result.success,
        syncId: result.message?.syncId,
      });
      if (!result.success || !result.message) {
        throw new MobileRoomMessageRejectedError(result.error?.trim() || "发送消息失败。");
      }
      return {
        data: result.message,
        success: true,
      };
    }

    const startedAt = Date.now();
    traceRoomMessageTiming("send.http.start", {
      attemptId: traceContext?.attemptId,
      apiBaseUrl: getMobileApiBaseUrl(),
      path: "/chat/message",
      roomId: traceContext?.roomId ?? request.roomId,
    });
    const result = await mutateRequest(request);
    traceRoomMessageTiming("send.http.end", {
      attemptId: traceContext?.attemptId,
      durationMs: Date.now() - startedAt,
      messageId: result?.data?.messageId,
      roomId: traceContext?.roomId ?? request.roomId,
      success: Boolean(result?.success && result.data),
      syncId: result?.data?.syncId,
    });
    return result;
  };

  const sendRequest = async (request: ChatMessageRequest) => {
    const resolvedRoomId = requirePositiveRoomId(roomId);
    const attemptId = sendAttemptIdRef.current + 1;
    sendAttemptIdRef.current = attemptId;
    const startedAt = Date.now();
    traceRoomMessageTiming("send.start", {
      attemptId,
      roomId: resolvedRoomId,
    });
    const requestWithStablePosition = withStableRoomMessagePosition(request, getCurrentMessages());
    const optimistic = insertOptimistic(requestWithStablePosition);
    traceRoomMessageTiming("send.optimistic.inserted", {
      attemptId,
      durationMs: Date.now() - startedAt,
      optimisticId: optimistic.message.messageId,
      position: requestWithStablePosition.position,
      roomId: resolvedRoomId,
    });
    try {
      const result = await sendTransportRequest(requestWithStablePosition, { attemptId, roomId: resolvedRoomId });
      if (result?.success && result.data) {
        commitOptimistic(optimistic.message.messageId, result.data);
      }
      else {
        markOptimisticFailed(optimistic);
      }
      return result;
    }
    catch (error) {
      traceRoomMessageTiming("send.error", {
        attemptId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
        roomId: resolvedRoomId,
      });
      if (error instanceof MobileRoomMessageDeliveryUnknownError) {
        const committed = findCommittedOptimistic(optimistic);
        if (committed) {
          return { data: committed.message, success: true };
        }
      }
      else if (error instanceof MobileRoomMessageRejectedError) {
        markOptimisticFailed(optimistic);
      }
      throw error;
    }
  };

  const sendRequests = async (requests: ChatMessageRequest[]) => {
    requirePositiveRoomId(roomId);
    if (requests.length === 0) {
      return [];
    }

    const requestsWithStablePositions = withStableRoomMessagePositions(requests, getCurrentMessages());
    const optimistics = insertOptimisticBatch(requestsWithStablePositions);
    const results = [];
    const failedIds: number[] = [];

    try {
      for (let i = 0; i < requestsWithStablePositions.length; i++) {
        try {
          const result = await sendTransportRequest(requestsWithStablePositions[i]);
          if (result?.success && result.data) {
            commitOptimistic(optimistics[i].message.messageId, result.data);
          }
          else {
            failedIds.push(optimistics[i].message.messageId);
          }
          results.push(result);
        }
        catch (error) {
          if (error instanceof MobileRoomMessageDeliveryUnknownError) {
            const committed = findCommittedOptimistic(optimistics[i]);
            if (committed) {
              results.push({ data: committed.message, success: true });
              continue;
            }
          }
          else if (error instanceof MobileRoomMessageRejectedError) {
            failedIds.push(optimistics[i].message.messageId);
          }
          throw error;
        }
      }
    }
    finally {
      if (failedIds.length > 0) {
        markOptimisticBatchFailed(optimistics.filter(item => failedIds.includes(item.message.messageId)));
      }
    }

    return results;
  };

  const sendRequestsWithExistingOptimistic = async (
    requests: ChatMessageRequest[],
    optimisticMessages: Array<ChatMessageResponse | null | undefined>,
  ) => {
    requirePositiveRoomId(roomId);
    if (requests.length === 0) {
      revertOptimisticBatch(optimisticMessages
        .filter((item): item is ChatMessageResponse => Boolean(item))
        .map(item => item.message.messageId));
      return [];
    }

    if (optimisticMessages.length === 0) {
      return sendRequests(requests);
    }

    const requestsWithStablePositions = requests.map((request, index) => {
      if (typeof request.position === "number") {
        return request;
      }
      const position = optimisticMessages[index]?.message.position;
      return typeof position === "number" ? { ...request, position } : request;
    });
    const alignedOptimisticMessages = requestsWithStablePositions.map((request, index) => {
      const optimistic = optimisticMessages[index];
      if (optimistic) {
        return optimistic;
      }
      return insertOptimistic(request);
    });
    const results = [];
    const failedIds: number[] = [];

    try {
      for (let i = 0; i < requestsWithStablePositions.length; i++) {
        const optimistic = alignedOptimisticMessages[i];
        try {
          const result = await sendTransportRequest(requestsWithStablePositions[i]);
          if (result?.success && result.data) {
            commitOptimistic(optimistic.message.messageId, result.data);
          }
          else {
            failedIds.push(optimistic.message.messageId);
          }
          results.push(result);
        }
        catch (error) {
          if (error instanceof MobileRoomMessageDeliveryUnknownError) {
            const committed = findCommittedOptimistic(optimistic);
            if (committed) {
              results.push({ data: committed.message, success: true });
              continue;
            }
          }
          else if (error instanceof MobileRoomMessageRejectedError) {
            failedIds.push(optimistic.message.messageId);
          }
          throw error;
        }
      }
    }
    finally {
      const extraOptimisticIds = optimisticMessages
        .slice(requestsWithStablePositions.length)
        .filter((item): item is ChatMessageResponse => Boolean(item))
        .map(item => item.message.messageId);
      if (extraOptimisticIds.length > 0) {
        revertOptimisticBatch(extraOptimisticIds);
      }
      if (failedIds.length > 0) {
        markOptimisticBatchFailed(alignedOptimisticMessages.filter(item => failedIds.includes(item.message.messageId)));
      }
    }

    return results;
  };

  const sendDraftMessage = async (
    draft: MessageDraft,
    context: SendMessageContext = {},
  ) => {
    const request = buildChatMessageRequestFromDraft(draft, {
      avatarId: context.avatarId,
      customRoleName: context.customRoleName?.trim() || undefined,
      replayMessageId: context.replayMessageId,
      roleId: context.roleId,
      roomId: requirePositiveRoomId(roomId),
    });

    if (context.annotations && context.annotations.length > 0) {
      request.annotations = context.annotations;
    }

    return sendRequest(request);
  };

  const sendDraftMessages = async (
    drafts: MessageDraft[],
    context: SendMessageContext = {},
    options: SendDraftMessagesOptions = {},
  ) => {
    const resolvedRoomId = requirePositiveRoomId(roomId);
    if (drafts.length === 0) {
      return [];
    }

    const requests = drafts.map((draft, index) => {
      return buildChatMessageRequestFromDraft(draft, {
        avatarId: context.avatarId,
        customRoleName: context.customRoleName?.trim() || undefined,
        replayMessageId: index === 0 ? context.replayMessageId : undefined,
        roleId: context.roleId,
        roomId: resolvedRoomId,
      });
    });

    return options.optimisticMessages
      ? sendRequestsWithExistingOptimistic(requests, options.optimisticMessages)
      : sendRequests(requests);
  };

  const sendTextMessage = async (input: SendMessageContext & { content: string }) => {
    const content = requireNonEmptyContent(input.content);

    return sendDraftMessage({
      content,
      extra: {},
      messageType: MESSAGE_TYPE.TEXT,
    }, input);
  };

  const removeFailedMessage = async (message: ChatMessageResponse["message"]) => {
    const messageId = message.messageId;
    if (typeof messageId !== "number" || messageId >= 0) {
      return;
    }
    updateQueryCache(current => removeRoomMessageFromList(current, messageId));
    pendingWritePromisesRef.current.delete(messageId);
    await rollbackPendingRoomMessages(requirePositiveRoomId(roomId), [messageId]);
  };

  const retryFailedMessage = async (message: ChatMessageResponse["message"]) => {
    const request = buildRoomMessageRetryRequest(message);
    if (!request) {
      throw new Error("这条消息暂时无法重新发送。");
    }
    await removeFailedMessage(message);
    return sendRequest(request);
  };

  const sendDiceMessage = async (input: SendMessageContext & {
    content: string;
    hidden?: boolean;
  }) => {
    const content = requireNonEmptyContent(input.content, "骰子内容不能为空。");

    return sendDraftMessage({
      content,
      extra: {
        diceResult: {
          hidden: input.hidden,
          result: content,
        },
      },
      messageType: MESSAGE_TYPE.DICE,
    }, input);
  };

  const sendCommandRequestMessage = async (input: SendMessageContext & {
    allowAll?: boolean;
    allowedRoleIds?: number[];
    command: string;
  }) => {
    const command = requireNonEmptyContent(input.command, "指令内容不能为空。");

    return sendDraftMessage({
      content: command,
      extra: {
        commandRequest: {
          allowAll: input.allowAll ?? true,
          allowedRoleIds: input.allowedRoleIds,
          command,
        },
      },
      messageType: MESSAGE_TYPE.COMMAND_REQUEST,
    }, input);
  };

  return {
    ...mutation,
    discardLocalOptimisticMessages,
    insertLocalOptimisticMessages,
    removeFailedMessage,
    retryFailedMessage,
    sendCommandRequestMessage,
    sendDiceMessage,
    sendDraftMessage,
    sendDraftMessages,
    sendRequest,
    sendRequests,
    sendTextMessage,
  };
}
