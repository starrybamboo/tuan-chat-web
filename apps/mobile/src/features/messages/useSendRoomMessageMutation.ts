import type { MessageDraft } from "@tuanchat/domain/message-draft";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { useQueryClient } from "@tanstack/react-query";
import {
  buildChatMessageRequestFromDraft,
} from "@tuanchat/domain/message-draft";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";
import {
  getAllRoomMessagesQueryKey,
  useSendMessageMutation as useSharedSendMessageMutation,
} from "@tuanchat/query/chat";
import {
  commitOptimisticRoomMessageInList,
  createOptimisticRoomMessage,
  getNextAppendPosition,
  mergeRoomMessagesForLocalState,
  removeRoomMessageFromList,
  removeRoomMessagesFromList,
} from "@tuanchat/query/room-message-lifecycle";
import { useRef } from "react";

import type { RoomMessagesQueryData } from "./roomMessagesQueryData";

import { mobileApiClient } from "../../lib/api";
import { writeCachedRoomMessages } from "./mobileRoomMessageCache";
import {
  withStableRoomMessagePosition,
  withStableRoomMessagePositions,
} from "./roomMessagePosition";
import { extractRoomMessagesFromQueryData, updateRoomMessagesQueryData } from "./roomMessagesQueryData";
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
  const optimisticIdRef = useRef(-1);

  const getNextOptimisticId = () => {
    const id = optimisticIdRef.current;
    optimisticIdRef.current -= 1;
    return id;
  };

  const getCurrentMessages = (): ChatMessageResponse[] => {
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId <= 0)
      return [];
    const queryMessages = extractRoomMessagesFromQueryData(
      queryClient.getQueryData<RoomMessagesQueryData>(getAllRoomMessagesQueryKey(resolvedRoomId)),
    );
    return mergeRoomMessagesForLocalState([...currentMessagesForPosition], queryMessages);
  };

  const updateQueryCache = (updater: (current: ChatMessageResponse[] | undefined) => ChatMessageResponse[]) => {
    const resolvedRoomId = requirePositiveRoomId(roomId);
    const queryKey = getAllRoomMessagesQueryKey(resolvedRoomId);
    queryClient.setQueryData<RoomMessagesQueryData>(queryKey, current => updateRoomMessagesQueryData(current, updater));
  };

  const persistOptimisticToCache = (messages: ChatMessageResponse[]) => {
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId <= 0 || messages.length === 0)
      return;
    void writeCachedRoomMessages(resolvedRoomId, messages).catch(() => {});
  };

  const insertOptimistic = (request: ChatMessageRequest): ChatMessageResponse => {
    const currentMessages = getCurrentMessages();
    const position = typeof request.position === "number"
      ? request.position
      : getNextAppendPosition(currentMessages);
    const optimistic = createOptimisticRoomMessage(request, {
      optimisticId: getNextOptimisticId(),
      currentUserId,
      position,
    });
    updateQueryCache(current => mergeRoomMessagesForLocalState(current, [optimistic]));
    persistOptimisticToCache([optimistic]);
    return optimistic;
  };

  const insertOptimisticBatch = (requests: ChatMessageRequest[]): ChatMessageResponse[] => {
    const currentMessages = getCurrentMessages();
    let nextPosition = getNextAppendPosition(currentMessages);
    const optimistics = requests.map((request) => {
      const position = typeof request.position === "number" ? request.position : nextPosition++;
      return createOptimisticRoomMessage(request, {
        optimisticId: getNextOptimisticId(),
        currentUserId,
        position,
      });
    });
    updateQueryCache(current => mergeRoomMessagesForLocalState(current, optimistics));
    persistOptimisticToCache(optimistics);
    return optimistics;
  };

  const commitOptimistic = (optimisticId: number, serverMessage: ChatMessageResponse["message"]) => {
    updateQueryCache(current => commitOptimisticRoomMessageInList(current, optimisticId, serverMessage));
    const resolvedRoomId = roomId ?? -1;
    if (resolvedRoomId > 0) {
      void writeCachedRoomMessages(resolvedRoomId, [{ message: serverMessage }]).catch(() => {});
    }
  };

  const revertOptimistic = (optimisticId: number) => {
    updateQueryCache(current => removeRoomMessageFromList(current, optimisticId));
  };

  const revertOptimisticBatch = (optimisticIds: number[]) => {
    updateQueryCache(current => removeRoomMessagesFromList(current, optimisticIds));
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
      throw new Error(extractOpenApiErrorMessage(error, "发送消息失败。"));
    }
  };

  const sendRequest = async (request: ChatMessageRequest) => {
    requirePositiveRoomId(roomId);
    const requestWithStablePosition = withStableRoomMessagePosition(request, getCurrentMessages());
    const optimistic = insertOptimistic(requestWithStablePosition);
    try {
      const result = await mutateRequest(requestWithStablePosition);
      if (result?.success && result.data) {
        commitOptimistic(optimistic.message.messageId, result.data);
      }
      else {
        revertOptimistic(optimistic.message.messageId);
      }
      return result;
    }
    catch (error) {
      revertOptimistic(optimistic.message.messageId);
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
          const result = await mutateRequest(requestsWithStablePositions[i]);
          if (result?.success && result.data) {
            commitOptimistic(optimistics[i].message.messageId, result.data);
          }
          else {
            failedIds.push(optimistics[i].message.messageId);
          }
          results.push(result);
        }
        catch (error) {
          failedIds.push(optimistics[i].message.messageId);
          throw error;
        }
      }
    }
    finally {
      if (failedIds.length > 0) {
        revertOptimisticBatch(failedIds);
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
          const result = await mutateRequest(requestsWithStablePositions[i]);
          if (result?.success && result.data) {
            commitOptimistic(optimistic.message.messageId, result.data);
          }
          else {
            failedIds.push(optimistic.message.messageId);
          }
          results.push(result);
        }
        catch (error) {
          failedIds.push(optimistic.message.messageId);
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
        revertOptimisticBatch(failedIds);
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
    sendCommandRequestMessage,
    sendDiceMessage,
    sendDraftMessage,
    sendDraftMessages,
    sendRequest,
    sendRequests,
    sendTextMessage,
  };
}
