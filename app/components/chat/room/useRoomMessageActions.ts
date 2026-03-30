import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { RoomUiStoreApi } from "@/components/chat/stores/roomUiStore";
import type { WebgalChoosePayload } from "@/types/webgalChoose";

import { commitBatchOptimisticMessages } from "@/components/chat/room/roomMessageBatchCommit";
import { getNextAppendPosition } from "@/components/chat/shared/messageOrder";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";

import type { ChatMessageRequest, ChatMessageResponse } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";

type UseRoomMessageActionsParams = {
  roomId: number;
  currentUserId: number;
  isSpaceOwner: boolean;
  curRoleId: number;
  isSubmitting: boolean;
  notMember: boolean;
  mainHistoryMessages: ChatMessageResponse[] | undefined;
  sendMessage: (message: ChatMessageRequest) => Promise<{ success: boolean; data?: ChatMessageResponse["message"] }>;
  batchSendMessages?: (messages: ChatMessageRequest[]) => Promise<{ success?: boolean; data?: ChatMessageResponse["message"][] }>;
  addOrUpdateMessage?: (message: ChatMessageResponse) => Promise<void> | void;
  addOrUpdateMessages?: (messages: ChatMessageResponse[]) => Promise<void> | void;
  removeMessageById?: (messageId: number) => Promise<void>;
  replaceMessageById?: (fromMessageId: number, message: ChatMessageResponse) => Promise<void>;
  ensureRuntimeAvatarIdForRole: (roleId: number) => Promise<number>;
  roomUiStoreApi: RoomUiStoreApi;
};

type UseRoomMessageActionsResult = {
  sendMessageWithInsert: (message: ChatMessageRequest) => Promise<ChatMessageResponse["message"] | null>;
  sendMessageBatch: (messages: ChatMessageRequest[]) => Promise<ChatMessageResponse["message"][]>;
  handleSendWebgalChoose: (payload: WebgalChoosePayload) => Promise<void>;
};

export default function useRoomMessageActions({
  roomId,
  currentUserId,
  isSpaceOwner,
  curRoleId,
  isSubmitting,
  notMember,
  mainHistoryMessages,
  sendMessage,
  batchSendMessages,
  addOrUpdateMessage,
  addOrUpdateMessages,
  removeMessageById,
  replaceMessageById,
  ensureRuntimeAvatarIdForRole,
  roomUiStoreApi,
}: UseRoomMessageActionsParams): UseRoomMessageActionsResult {
  const webgalChooseSendingRef = useRef(false);
  const optimisticMessageIdRef = useRef(-1);

  const getNextMainFlowPosition = useCallback(() => {
    return getNextAppendPosition(mainHistoryMessages ?? []);
  }, [mainHistoryMessages]);

  const createOptimisticMessage = useCallback((request: ChatMessageRequest): ChatMessageResponse => {
    const optimisticMessageId = optimisticMessageIdRef.current;
    optimisticMessageIdRef.current -= 1;
    const nowIso = new Date().toISOString();
    const resolvedPosition = typeof request.position === "number"
      ? request.position
      : getNextMainFlowPosition();

    return {
      message: {
        messageId: optimisticMessageId,
        syncId: optimisticMessageId,
        roomId: request.roomId,
        userId: currentUserId > 0 ? currentUserId : 0,
        roleId: request.roleId,
        content: request.content ?? "",
        customRoleName: request.customRoleName,
        annotations: request.annotations,
        avatarId: request.avatarId,
        webgal: request.webgal,
        replyMessageId: request.replayMessageId,
        status: 0,
        messageType: request.messageType,
        threadId: request.threadId,
        position: resolvedPosition,
        extra: request.extra as any,
        createTime: nowIso,
        updateTime: nowIso,
      },
    };
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

  const commitOptimisticMessage = useCallback(async (
    optimisticMessage: ChatMessageResponse,
    createdMessage: ChatMessageResponse["message"],
  ): Promise<ChatMessageResponse["message"]> => {
    const normalizedCreated = {
      ...createdMessage,
      position: typeof createdMessage.position === "number"
        ? createdMessage.position
        : optimisticMessage.message.position,
    };
    const createdResponse: ChatMessageResponse = {
      message: normalizedCreated,
    };

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

  const sendBatchWithOptimistic = useCallback(async (
    requests: ChatMessageRequest[],
    errorLogLabel: string,
  ): Promise<ChatMessageResponse["message"][]> => {
    if (requests.length === 0) {
      return [];
    }

    if (!batchSendMessages) {
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
      const result = await batchSendMessages(requests);
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
    batchSendMessages,
    createOptimisticMessages,
    replaceMessageById,
    revertOptimisticMessages,
    roomUiStoreApi,
    sendWithOptimistic,
  ]);

  const sendMessageWithInsert = useCallback(async (message: ChatMessageRequest) => {
    const insertAfterMessageId = roomUiStoreApi.getState().insertAfterMessageId;

    if (insertAfterMessageId && mainHistoryMessages?.length) {
      const targetIndex = mainHistoryMessages.findIndex(m => m.message.messageId === insertAfterMessageId);
      if (targetIndex === -1) {
        return await sendWithOptimistic(message, "插入消息失败（fallback 路径）");
      }

      const targetMessage = mainHistoryMessages[targetIndex];
      const nextMessage = mainHistoryMessages[targetIndex + 1];
      const targetPosition = targetMessage.message.position;
      const nextPosition = nextMessage?.message.position ?? targetPosition + 1;
      // 插入消息：先计算新 position，随发送请求一次性写入
      const newPosition = (targetPosition + nextPosition) / 2;

      return await sendWithOptimistic({
        ...message,
        position: newPosition,
      }, "插入消息失败");
    }

    return await sendWithOptimistic(message, "发送消息失败");
  }, [mainHistoryMessages, roomUiStoreApi, sendWithOptimistic]);

  const sendMessageBatch = useCallback(async (messages: ChatMessageRequest[]) => {
    return await sendBatchWithOptimistic(messages, "批量发送消息失败");
  }, [sendBatchWithOptimistic]);

  const handleSendWebgalChoose = useCallback(async (payload: WebgalChoosePayload) => {
    const options = payload?.options ?? [];
    const normalizedOptions = options.map(option => ({
      text: String(option.text ?? "").trim(),
      code: option.code ? String(option.code).trim() : "",
    }));

    const isNarrator = curRoleId <= 0;

    if (isNarrator && !isSpaceOwner && !notMember) {
      toast.error("旁白仅主持可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting || webgalChooseSendingRef.current) {
      toast.error("正在提交中，请稍候");
      return;
    }
    if (normalizedOptions.length === 0) {
      toast.error("请至少添加一个选项");
      return;
    }
    if (normalizedOptions.some(option => !option.text)) {
      toast.error("选项文本不能为空");
      return;
    }

    const finalPayload: WebgalChoosePayload = {
      options: normalizedOptions.map(option => ({
        text: option.text,
        ...(option.code ? { code: option.code } : {}),
      })),
    };

    webgalChooseSendingRef.current = true;
    try {
      const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);
      const chooseMsg: ChatMessageRequest = {
        roomId,
        roleId: curRoleId,
        avatarId: resolvedAvatarId,
        content: "",
        messageType: MessageType.WEBGAL_CHOOSE,
        extra: {
          webgalChoose: finalPayload,
        },
      };

      const draftCustomRoleName = useRoomPreferenceStore.getState().draftCustomRoleNameMap[curRoleId];
      if (draftCustomRoleName?.trim()) {
        chooseMsg.customRoleName = draftCustomRoleName.trim();
      }

      await sendMessageWithInsert(chooseMsg);
    }
    finally {
      webgalChooseSendingRef.current = false;
    }
  }, [curRoleId, ensureRuntimeAvatarIdForRole, isSpaceOwner, isSubmitting, notMember, roomId, sendMessageWithInsert]);

  return {
    sendMessageWithInsert,
    sendMessageBatch,
    handleSendWebgalChoose,
  };
}
