import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { RoomUiStoreApi } from "@/components/chat/stores/roomUiStore";

import { buildCommittedResponseFromOptimistic, commitBatchOptimisticMessages } from "@/components/chat/room/roomMessageBatchCommit";
import { createOptimisticRoomMessage, getNextAppendPosition } from "@tuanchat/query/room-message-lifecycle";

import type { ChatMessageRequest, ChatMessageResponse, RoomMessageMutationMeta } from "../../../../api";

type SendMessageBatchOptions = {
  mutationMeta?: RoomMessageMutationMeta;
};

type SendMessageOptions = {
  optimistic?: boolean;
};

type UseRoomMessageActionsParams = {
  currentUserId: number;
  mainHistoryMessages: ChatMessageResponse[] | undefined;
  sendMessage: (message: ChatMessageRequest) => Promise<{ success: boolean; data?: ChatMessageResponse["message"] }>;
  insertMessages?: (messages: ChatMessageRequest[], options?: SendMessageBatchOptions) => Promise<{ success?: boolean; data?: ChatMessageResponse["message"][] }>;
  addOrUpdateMessage?: (message: ChatMessageResponse) => Promise<void> | void;
  addOrUpdateMessages?: (messages: ChatMessageResponse[]) => Promise<void> | void;
  removeMessageById?: (messageId: number) => Promise<void>;
  replaceMessageById?: (fromMessageId: number, message: ChatMessageResponse) => Promise<void>;
  roomUiStoreApi: RoomUiStoreApi;
};

type UseRoomMessageActionsResult = {
  discardLocalOptimisticMessages: (messages: ChatMessageResponse[]) => Promise<void>;
  insertLocalOptimisticMessages: (messages: ChatMessageRequest[]) => ChatMessageResponse[];
  sendMessageBatchWithLocalOptimistic: (messages: ChatMessageRequest[], optimisticMessages: ChatMessageResponse[], options?: SendMessageBatchOptions) => Promise<ChatMessageResponse["message"][]>;
  sendMessageWithInsert: (message: ChatMessageRequest, options?: SendMessageOptions) => Promise<ChatMessageResponse["message"] | null>;
  sendMessageBatch: (messages: ChatMessageRequest[], options?: SendMessageBatchOptions) => Promise<ChatMessageResponse["message"][]>;
};

export default function useRoomMessageActions({
  currentUserId,
  mainHistoryMessages,
  sendMessage,
  insertMessages,
  addOrUpdateMessage,
  addOrUpdateMessages,
  removeMessageById,
  replaceMessageById,
  roomUiStoreApi,
}: UseRoomMessageActionsParams): UseRoomMessageActionsResult {
  const optimisticMessageIdRef = useRef(-1);

  const getNextMainFlowPosition = useCallback(() => {
    return getNextAppendPosition(mainHistoryMessages ?? []);
  }, [mainHistoryMessages]);

  const createOptimisticMessage = useCallback((request: ChatMessageRequest): ChatMessageResponse => {
    const optimisticMessageId = optimisticMessageIdRef.current;
    optimisticMessageIdRef.current -= 1;
    const resolvedPosition = typeof request.position === "number"
      ? request.position
      : getNextMainFlowPosition();

    return createOptimisticRoomMessage(request, {
      currentUserId,
      optimisticId: optimisticMessageId,
      position: resolvedPosition,
    }) as ChatMessageResponse;
  }, [currentUserId, getNextMainFlowPosition]);

  const createOptimisticMessages = useCallback((requests: ChatMessageRequest[]): ChatMessageResponse[] => {
    let nextPosition = getNextMainFlowPosition();
    return requests.map((request) => {
      const position = typeof request.position === "number" ? request.position : nextPosition++;
      return createOptimisticMessage({
        ...request,
        position,
      });
    });
  }, [createOptimisticMessage, getNextMainFlowPosition]);

  const revertOptimisticMessage = useCallback(async (optimisticMessage: ChatMessageResponse) => {
    const optimisticId = optimisticMessage.message.messageId;
    if (removeMessageById) {
      await removeMessageById(optimisticId);
      return;
    }
    if (addOrUpdateMessage) {
      await addOrUpdateMessage({
        ...optimisticMessage,
        message: {
          ...optimisticMessage.message,
          status: 1,
        },
      });
    }
  }, [addOrUpdateMessage, removeMessageById]);

  const revertOptimisticMessages = useCallback(async (optimisticMessages: ChatMessageResponse[]) => {
    for (const optimisticMessage of optimisticMessages) {
      await revertOptimisticMessage(optimisticMessage);
    }
  }, [revertOptimisticMessage]);

  const insertLocalOptimisticMessages = useCallback((requests: ChatMessageRequest[]): ChatMessageResponse[] => {
    if (requests.length === 0) {
      return [];
    }

    const optimisticMessages = createOptimisticMessages(requests);
    if (addOrUpdateMessages) {
      void addOrUpdateMessages(optimisticMessages);
    }
    else if (addOrUpdateMessage) {
      optimisticMessages.forEach((message) => {
        void addOrUpdateMessage(message);
      });
    }
    return optimisticMessages;
  }, [addOrUpdateMessage, addOrUpdateMessages, createOptimisticMessages]);

  const commitOptimisticMessage = useCallback(async (
    optimisticMessage: ChatMessageResponse,
    createdMessage: ChatMessageResponse["message"],
  ): Promise<ChatMessageResponse["message"]> => {
    const createdResponse = buildCommittedResponseFromOptimistic(optimisticMessage, createdMessage);
    const normalizedCreated = createdResponse.message;

    if (replaceMessageById) {
      await replaceMessageById(optimisticMessage.message.messageId, createdResponse);
      return normalizedCreated;
    }

    if (removeMessageById) {
      await removeMessageById(optimisticMessage.message.messageId);
    }
    if (addOrUpdateMessage) {
      await addOrUpdateMessage(createdResponse);
    }
    return normalizedCreated;
  }, [addOrUpdateMessage, removeMessageById, replaceMessageById]);

  const sendWithOptimistic = useCallback(async (request: ChatMessageRequest, errorLogLabel: string) => {
    const optimisticMessage = createOptimisticMessage(request);
    if (addOrUpdateMessage) {
      void addOrUpdateMessage(optimisticMessage);
    }

    try {
      const result = await sendMessage(request);
      if (!result.success || !result.data) {
        await revertOptimisticMessage(optimisticMessage);
        toast.error("发送消息失败");
        return null;
      }

      const created = await commitOptimisticMessage(optimisticMessage, result.data);
      roomUiStoreApi.getState().pushMessageUndo({ type: "send", after: created });
      return created;
    }
    catch (error) {
      console.error(errorLogLabel, error);
      await revertOptimisticMessage(optimisticMessage);
      toast.error("发送消息失败");
      return null;
    }
  }, [
    addOrUpdateMessage,
    commitOptimisticMessage,
    createOptimisticMessage,
    revertOptimisticMessage,
    roomUiStoreApi,
    sendMessage,
  ]);

  const sendWithoutOptimistic = useCallback(async (request: ChatMessageRequest, errorLogLabel: string) => {
    try {
      const result = await sendMessage(request);
      if (!result.success || !result.data) {
        toast.error("发送消息失败");
        return null;
      }

      const createdResponse = { message: result.data };
      if (addOrUpdateMessage) {
        await addOrUpdateMessage(createdResponse);
      }
      roomUiStoreApi.getState().pushMessageUndo({ type: "send", after: result.data });
      return result.data;
    }
    catch (error) {
      console.error(errorLogLabel, error);
      toast.error("发送消息失败");
      return null;
    }
  }, [addOrUpdateMessage, roomUiStoreApi, sendMessage]);

  const sendWithExistingOptimistic = useCallback(async (
    request: ChatMessageRequest,
    optimisticMessage: ChatMessageResponse,
    errorLogLabel: string,
  ) => {
    const requestWithStablePosition = typeof request.position === "number"
      ? request
      : {
          ...request,
          position: optimisticMessage.message.position,
        };

    try {
      const result = await sendMessage(requestWithStablePosition);
      if (!result.success || !result.data) {
        await revertOptimisticMessage(optimisticMessage);
        toast.error("发送消息失败");
        return null;
      }

      const created = await commitOptimisticMessage(optimisticMessage, result.data);
      roomUiStoreApi.getState().pushMessageUndo({ type: "send", after: created });
      return created;
    }
    catch (error) {
      console.error(errorLogLabel, error);
      await revertOptimisticMessage(optimisticMessage);
      toast.error("发送消息失败");
      return null;
    }
  }, [
    commitOptimisticMessage,
    revertOptimisticMessage,
    roomUiStoreApi,
    sendMessage,
  ]);

  const sendBatchWithOptimistic = useCallback(async (
    requests: ChatMessageRequest[],
    errorLogLabel: string,
    options?: SendMessageBatchOptions,
  ): Promise<ChatMessageResponse["message"][]> => {
    if (requests.length === 0) {
      return [];
    }

    if (!insertMessages) {
      const createdMessages: ChatMessageResponse["message"][] = [];
      for (const request of requests) {
        const created = await sendWithOptimistic(request, errorLogLabel);
        if (!created) {
          return [];
        }
        createdMessages.push(created);
      }
      return createdMessages;
    }

    const optimisticMessages = createOptimisticMessages(requests);
    if (addOrUpdateMessages) {
      void addOrUpdateMessages(optimisticMessages);
    }
    else if (addOrUpdateMessage) {
      optimisticMessages.forEach((message) => {
        void addOrUpdateMessage(message);
      });
    }

    try {
      const result = await insertMessages(requests, options);
      const createdMessages = Array.isArray(result?.data) ? result.data : [];
      if (!result?.success || createdMessages.length !== requests.length) {
        await revertOptimisticMessages(optimisticMessages);
        toast.error("批量发送消息失败");
        return [];
      }

      const committedResponses = await commitBatchOptimisticMessages({
        optimisticMessages,
        createdMessages,
        addOrUpdateMessage,
        addOrUpdateMessages,
        replaceMessageById,
      });

      committedResponses.forEach((response) => {
        roomUiStoreApi.getState().pushMessageUndo({ type: "send", after: response.message });
      });
      return committedResponses.map(response => response.message);
    }
    catch (error) {
      console.error(errorLogLabel, error);
      await revertOptimisticMessages(optimisticMessages);
      toast.error("批量发送消息失败");
      return [];
    }
  }, [
    addOrUpdateMessage,
    addOrUpdateMessages,
    insertMessages,
    createOptimisticMessages,
    replaceMessageById,
    revertOptimisticMessages,
    roomUiStoreApi,
    sendWithOptimistic,
  ]);

  const sendMessageBatchWithLocalOptimistic = useCallback(async (
    requests: ChatMessageRequest[],
    optimisticMessages: ChatMessageResponse[],
    options?: SendMessageBatchOptions,
  ): Promise<ChatMessageResponse["message"][]> => {
    if (requests.length === 0) {
      await revertOptimisticMessages(optimisticMessages);
      return [];
    }

    if (optimisticMessages.length === 0) {
      return await sendBatchWithOptimistic(requests, "批量发送消息失败", options);
    }

    if (requests.length === 1) {
      const created = await sendWithExistingOptimistic(requests[0], optimisticMessages[0], "发送消息失败");
      if (optimisticMessages.length > 1) {
        await revertOptimisticMessages(optimisticMessages.slice(1));
      }
      return created ? [created] : [];
    }

    if (!insertMessages || optimisticMessages.length !== requests.length) {
      const createdMessages: ChatMessageResponse["message"][] = [];
      for (let index = 0; index < requests.length; index += 1) {
        const request = requests[index];
        const optimisticMessage = optimisticMessages[index];
        const created = optimisticMessage
          ? await sendWithExistingOptimistic(request, optimisticMessage, "发送消息失败")
          : await sendWithOptimistic(request, "发送消息失败");
        if (!created) {
          await revertOptimisticMessages(optimisticMessages.slice(index + 1));
          return [];
        }
        createdMessages.push(created);
      }
      if (optimisticMessages.length > requests.length) {
        await revertOptimisticMessages(optimisticMessages.slice(requests.length));
      }
      return createdMessages;
    }

    const requestsWithStablePositions = requests.map((request, index) => {
      if (typeof request.position === "number") {
        return request;
      }
      return {
        ...request,
        position: optimisticMessages[index]?.message.position,
      };
    });

    try {
      const result = await insertMessages(requestsWithStablePositions, options);
      const createdMessages = Array.isArray(result?.data) ? result.data : [];
      if (!result?.success || createdMessages.length !== requests.length) {
        await revertOptimisticMessages(optimisticMessages);
        toast.error("批量发送消息失败");
        return [];
      }

      const committedResponses = await commitBatchOptimisticMessages({
        optimisticMessages,
        createdMessages,
        addOrUpdateMessage,
        addOrUpdateMessages,
        replaceMessageById,
      });

      committedResponses.forEach((response) => {
        roomUiStoreApi.getState().pushMessageUndo({ type: "send", after: response.message });
      });
      return committedResponses.map(response => response.message);
    }
    catch (error) {
      console.error("批量发送消息失败", error);
      await revertOptimisticMessages(optimisticMessages);
      toast.error("批量发送消息失败");
      return [];
    }
  }, [
    addOrUpdateMessage,
    addOrUpdateMessages,
    insertMessages,
    replaceMessageById,
    revertOptimisticMessages,
    roomUiStoreApi,
    sendBatchWithOptimistic,
    sendWithExistingOptimistic,
    sendWithOptimistic,
  ]);

  const sendMessageWithInsert = useCallback(async (message: ChatMessageRequest, options?: SendMessageOptions) => {
    const sendOne = options?.optimistic === false ? sendWithoutOptimistic : sendWithOptimistic;
    const insertAfterMessageId = roomUiStoreApi.getState().insertAfterMessageId;

    if (insertAfterMessageId && mainHistoryMessages?.length) {
      const targetIndex = mainHistoryMessages.findIndex(m => m.message.messageId === insertAfterMessageId);
      if (targetIndex === -1) {
        return await sendOne(message, "插入消息失败（fallback 路径）");
      }

      const targetMessage = mainHistoryMessages[targetIndex];
      const nextMessage = mainHistoryMessages[targetIndex + 1];
      const targetPosition = targetMessage.message.position;
      const nextPosition = nextMessage?.message.position ?? targetPosition + 1;
      // 插入消息：先计算新 position，随发送请求一次性写入
      const newPosition = (targetPosition + nextPosition) / 2;

      return await sendOne({
        ...message,
        position: newPosition,
      }, "插入消息失败");
    }

    return await sendOne(message, "发送消息失败");
  }, [mainHistoryMessages, roomUiStoreApi, sendWithOptimistic, sendWithoutOptimistic]);

  const sendMessageBatch = useCallback(async (messages: ChatMessageRequest[], options?: SendMessageBatchOptions) => {
    return await sendBatchWithOptimistic(messages, "批量发送消息失败", options);
  }, [sendBatchWithOptimistic]);

  return {
    discardLocalOptimisticMessages: revertOptimisticMessages,
    insertLocalOptimisticMessages,
    sendMessageBatchWithLocalOptimistic,
    sendMessageWithInsert,
    sendMessageBatch,
  };
}
