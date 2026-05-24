import type { MessageDraft } from "@tuanchat/domain/message-draft";

import { useQueryClient } from "@tanstack/react-query";
import {
  buildChatMessageRequestFromDraft,
} from "@tuanchat/domain/message-draft";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { parseSimpleStateCommand } from "@tuanchat/domain/state-command";
import { useRef } from "react";

import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { mobileApiClient } from "@/lib/api";
import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";
import {
  getAllRoomMessagesQueryKey,
  useSendMessageMutation as useSharedSendMessageMutation,
} from "@tuanchat/query/chat";
import {
  commitOptimisticRoomMessageInList,
  createOptimisticRoomMessage,
  getNextAppendPosition,
  removeRoomMessageFromList,
  removeRoomMessagesFromList,
} from "@tuanchat/query/room-message-lifecycle";

import { writeCachedRoomMessages } from "./mobileRoomMessageCache";
import { extractRoomMessagesFromQueryData, updateRoomMessagesQueryData } from "./roomMessagesQueryData";

type SendMessageContext = {
  annotations?: string[];
  avatarId?: number;
  customRoleName?: string;
  replayMessageId?: number;
  roleId?: number;
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

export function useSendRoomMessageMutation(roomId: number | null, currentUserId: number = 0, _pageSize: number = 20) {
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
    return extractRoomMessagesFromQueryData(
      queryClient.getQueryData(getAllRoomMessagesQueryKey(resolvedRoomId)),
    );
  };

  const updateQueryCache = (updater: (current: ChatMessageResponse[] | undefined) => ChatMessageResponse[]) => {
    const resolvedRoomId = requirePositiveRoomId(roomId);
    const queryKey = getAllRoomMessagesQueryKey(resolvedRoomId);
    queryClient.setQueryData(queryKey, current => updateRoomMessagesQueryData(current, updater));
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
    updateQueryCache(current => [...(current ?? []), optimistic].sort((a, b) => {
      const pa = a.message?.position ?? 0;
      const pb = b.message?.position ?? 0;
      return pa - pb || (a.message?.messageId ?? 0) - (b.message?.messageId ?? 0);
    }));
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
    updateQueryCache(current => [...(current ?? []), ...optimistics].sort((a, b) => {
      const pa = a.message?.position ?? 0;
      const pb = b.message?.position ?? 0;
      return pa - pb || (a.message?.messageId ?? 0) - (b.message?.messageId ?? 0);
    }));
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
    const optimistic = insertOptimistic(request);
    try {
      const result = await mutateRequest(request);
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

    const optimistics = insertOptimisticBatch(requests);
    const results = [];
    const failedIds: number[] = [];

    try {
      for (let i = 0; i < requests.length; i++) {
        try {
          const result = await mutateRequest(requests[i]);
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

    return sendRequests(requests);
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

  const sendStateEventMessage = async (input: SendMessageContext & { content: string }) => {
    const content = requireNonEmptyContent(input.content, "状态事件内容不能为空。");
    const parsed = parseSimpleStateCommand({
      curRoleId: input.roleId ?? -1,
      inputText: content,
      inputTextWithoutMentions: content,
      mentionedRoleCount: 0,
    });

    if (!parsed) {
      throw new Error("当前只支持 .next，或带角色 ID 的 .st 变量 +/-数值。");
    }

    return sendDraftMessage({
      content: parsed.content,
      extra: {
        stateEvent: parsed.stateEvent,
      },
      messageType: MESSAGE_TYPE.STATE_EVENT,
    }, input);
  };

  return {
    ...mutation,
    sendCommandRequestMessage,
    sendDiceMessage,
    sendDraftMessage,
    sendDraftMessages,
    sendRequest,
    sendRequests,
    sendStateEventMessage,
    sendTextMessage,
  };
}
