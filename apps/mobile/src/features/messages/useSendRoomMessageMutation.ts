import type { MessageDraft } from "@tuanchat/domain/message-draft";

import { useQueryClient } from "@tanstack/react-query";
import {
  buildChatMessageRequestFromDraft,
} from "@tuanchat/domain/message-draft";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { parseSimpleStateCommand } from "@tuanchat/domain/state-command";

import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";

import { mobileApiClient } from "@/lib/api";
import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";
import {
  getRoomMessagesQueryKey,
  useSendMessageMutation as useSharedSendMessageMutation,
} from "@tuanchat/query/chat";

type SendMessageContext = {
  customRoleName?: string;
  replayMessageId?: number;
  roleId?: number;
  threadId?: number;
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

export function useSendRoomMessageMutation(roomId: number | null, pageSize: number = 20) {
  const queryClient = useQueryClient();
  const mutation = useSharedSendMessageMutation(mobileApiClient, roomId ?? -1);

  const invalidateRoomMessages = async () => {
    const resolvedRoomId = requirePositiveRoomId(roomId);
    await queryClient.invalidateQueries({
      queryKey: getRoomMessagesQueryKey(resolvedRoomId, pageSize),
    });
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
    const result = await mutateRequest(request);
    await invalidateRoomMessages();
    return result;
  };

  const sendDraftMessage = async (
    draft: MessageDraft,
    context: SendMessageContext = {},
  ) => {
    const request = buildChatMessageRequestFromDraft(draft, {
      avatarId: undefined,
      customRoleName: context.customRoleName?.trim() || undefined,
      replayMessageId: context.replayMessageId,
      roleId: context.roleId,
      roomId: requirePositiveRoomId(roomId),
      threadId: context.threadId,
    });

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
        avatarId: undefined,
        customRoleName: context.customRoleName?.trim() || undefined,
        replayMessageId: index === 0 ? context.replayMessageId : undefined,
        roleId: context.roleId,
        roomId: resolvedRoomId,
        threadId: context.threadId,
      });
    });

    const results = [];
    for (const request of requests) {
      results.push(await mutateRequest(request));
    }
    await invalidateRoomMessages();
    return results;
  };

  const sendTextMessage = async (input: SendMessageContext & { content: string }) => {
    const content = requireNonEmptyContent(input.content);

    return sendDraftMessage({
      content,
      extra: {},
      messageType: MESSAGE_TYPE.TEXT,
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
    sendDraftMessage,
    sendDraftMessages,
    sendRequest,
    sendStateEventMessage,
    sendTextMessage,
  };
}
