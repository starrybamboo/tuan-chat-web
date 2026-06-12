import { useCallback } from "react";
import toast from "react-hot-toast";

import { compareChatMessageResponsesByOrder } from "@/components/chat/shared/messageOrder";
import { ANNOTATION_IDS, hasAnnotation, isImageMessageBackground, setAnnotation } from "@/types/messageAnnotations";
import { buildMessageExtraForRequest } from "@/types/messageDraft";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../../api";

type InsertMessages = (requests: ChatMessageRequest[]) => Promise<{ success?: boolean; data?: Message[] }>;
type SendMessageWithInsert = (request: ChatMessageRequest) => Promise<ChatMessageResponse["message"] | null>;
export type ForwardMode = "merged" | "separate";

type UseChatFrameMessageActionsParams = {
  historyMessages: ChatMessageResponse[];
  selectedMessageIds: Set<number>;
  curRoleId: number;
  curAvatarId: number;
  send: (message: ChatMessageRequest) => void;
  sendMessageWithInsert?: SendMessageWithInsert;
  insertMessages: InsertMessages;
  updateMessage: (message: Message) => void;
  setIsForwardWindowOpen: (open: boolean) => void;
  clearSelection: () => void;
};

type ForwardFinalizeOptions = {
  closeWindow?: boolean;
  clearSelection?: boolean;
  toastSuccess?: boolean;
};

const FORWARD_TOAST = "\u5DF2\u8F6C\u53D1\u6D88\u606F";
const FORWARD_SEPARATE_TOAST = "\u5DF2\u9010\u6761\u8F6C\u53D1\u6D88\u606F";

export default function useChatFrameMessageActions({
  historyMessages,
  selectedMessageIds,
  curRoleId,
  curAvatarId,
  send,
  sendMessageWithInsert,
  insertMessages,
  updateMessage,
  setIsForwardWindowOpen,
  clearSelection,
}: UseChatFrameMessageActionsParams) {
  const getSelectedMessages = useCallback(() => (
    Array.from(selectedMessageIds)
      .map(id => historyMessages.find(m => m.message.messageId === id))
      .filter((msg): msg is ChatMessageResponse => msg !== undefined)
      .sort(compareChatMessageResponsesByOrder)
  ), [historyMessages, selectedMessageIds]);

  const constructForwardRequest = useCallback((forwardRoomId: number, forwardMessages: ChatMessageResponse[]) => {
    const forwardMessageRequest: ChatMessageRequest = {
      roomId: forwardRoomId,
      roleId: curRoleId,
      content: "",
      avatarId: curAvatarId,
      messageType: MESSAGE_TYPE.FORWARD,
      extra: buildMessageExtraForRequest(MESSAGE_TYPE.FORWARD, {
        forwardMessage: {
          messageList: forwardMessages,
        },
      }),
    };
    return forwardMessageRequest;
  }, [curAvatarId, curRoleId]);

  const normalizeForwardedRawType = useCallback((messageType: number): number => {
    if (messageType === MESSAGE_TYPE.INTRO_TEXT || messageType === MESSAGE_TYPE.SYSTEM) {
      return MESSAGE_TYPE.TEXT;
    }
    return messageType;
  }, []);

  const constructRawForwardRequest = useCallback((forwardRoomId: number, sourceMessage: Message): ChatMessageRequest => {
    const normalizedMessageType = normalizeForwardedRawType(sourceMessage.messageType);
    const shouldKeepOriginalExtra = normalizedMessageType === sourceMessage.messageType;
    const nextExtra = shouldKeepOriginalExtra
      ? buildMessageExtraForRequest(normalizedMessageType, sourceMessage.extra)
      : {};

    return {
      roomId: forwardRoomId,
      roleId: sourceMessage.roleId,
      avatarId: sourceMessage.avatarId,
      content: sourceMessage.content ?? "",
      messageType: normalizedMessageType,
      ...(Array.isArray(sourceMessage.annotations) ? { annotations: sourceMessage.annotations } : {}),
      ...(typeof sourceMessage.customRoleName === "string" ? { customRoleName: sourceMessage.customRoleName } : {}),
      ...(sourceMessage.webgal !== undefined ? { webgal: sourceMessage.webgal } : {}),
      extra: nextExtra,
    };
  }, [normalizeForwardedRawType]);

  const forwardSelectedMessagesToRoom = useCallback(async (
    forwardRoomId: number,
    mode: ForwardMode,
    options?: ForwardFinalizeOptions,
  ): Promise<boolean> => {
    if (forwardRoomId <= 0) {
      toast.error("请选择有效的转发房间");
      return false;
    }

    const selectedMessages = getSelectedMessages();
    if (selectedMessages.length === 0) {
      toast.error("请选择要转发的消息");
      return false;
    }

    if (mode === "separate") {
      try {
        const insertRequests = selectedMessages.map(message => constructRawForwardRequest(forwardRoomId, message.message));
        const result = await insertMessages(insertRequests);
        const createdMessages = Array.isArray(result?.data) ? result.data : [];
        if (!result?.success || createdMessages.length !== insertRequests.length)
          throw new Error("批量插入失败");
      }
      catch (error) {
        console.error("逐条转发失败:", error);
        toast.error("逐条转发失败");
        return false;
      }
      if (options?.closeWindow ?? true) {
        setIsForwardWindowOpen(false);
      }
      if (options?.clearSelection ?? true) {
        clearSelection();
      }
      if (options?.toastSuccess ?? true) {
        toast(FORWARD_SEPARATE_TOAST);
      }
      return true;
    }

    const mergedForwardRequest = constructForwardRequest(forwardRoomId, selectedMessages);
    if (sendMessageWithInsert) {
      try {
        const sendResult = await sendMessageWithInsert(mergedForwardRequest);
        if (!sendResult) {
          throw new Error("合并转发发送失败");
        }
      }
      catch (error) {
        console.error("合并转发失败:", error);
        toast.error("合并转发失败");
        return false;
      }
    }
    else {
      send(mergedForwardRequest);
    }
    if (options?.closeWindow ?? true) {
      setIsForwardWindowOpen(false);
    }
    if (options?.clearSelection ?? true) {
      clearSelection();
    }
    if (options?.toastSuccess ?? true) {
      toast(FORWARD_TOAST);
    }
    return true;
  }, [
    clearSelection,
    constructForwardRequest,
    constructRawForwardRequest,
    getSelectedMessages,
    insertMessages,
    send,
    sendMessageWithInsert,
    setIsForwardWindowOpen,
  ]);

  const handleForward = useCallback(async (forwardRoomId: number, mode: ForwardMode): Promise<boolean> => {
    return await forwardSelectedMessagesToRoom(forwardRoomId, mode);
  }, [forwardSelectedMessagesToRoom]);

  const handleForwardToRooms = useCallback(async (forwardRoomIds: number[], mode: ForwardMode): Promise<boolean> => {
    const nextRoomIds = Array.from(new Set(forwardRoomIds)).filter(roomId => roomId > 0);
    if (nextRoomIds.length === 0) {
      toast.error("请选择有效的转发房间");
      return false;
    }

    for (const roomId of nextRoomIds) {
      const success = await forwardSelectedMessagesToRoom(roomId, mode, {
        closeWindow: false,
        clearSelection: false,
        toastSuccess: false,
      });
      if (!success) {
        return false;
      }
    }

    setIsForwardWindowOpen(false);
    clearSelection();
    toast.success(`已转发到 ${nextRoomIds.length} 个房间`);
    return true;
  }, [clearSelection, forwardSelectedMessagesToRoom, setIsForwardWindowOpen]);

  const toggleBackground = useCallback((messageId: number) => {
    const message = historyMessages.find(m => m.message.messageId === messageId)?.message;
    if (!message || !message.extra?.imageMessage)
      return;
    const isBackground = isImageMessageBackground(message.annotations, message.extra.imageMessage);
    const nextBackground = !isBackground;
    const nextAnnotations = setAnnotation(message.annotations, ANNOTATION_IDS.BACKGROUND, nextBackground);
    updateMessage({
      ...message,
      annotations: nextAnnotations,
      extra: {
        ...message.extra,
        imageMessage: {
          ...message.extra.imageMessage,
          background: nextBackground,
        },
      },
    });
  }, [historyMessages, updateMessage]);

  const toggleUnlockCg = useCallback((messageId: number) => {
    const message = historyMessages.find(m => m.message.messageId === messageId)?.message;
    if (!message || message.messageType !== 2)
      return;

    const isUnlocked = hasAnnotation(message.annotations, ANNOTATION_IDS.CG);
    const nextAnnotations = setAnnotation(message.annotations, ANNOTATION_IDS.CG, !isUnlocked);

    updateMessage({
      ...message,
      annotations: nextAnnotations,
    });
  }, [historyMessages, updateMessage]);

  return {
    handleForward,
    handleForwardToRooms,
    toggleBackground,
    toggleUnlockCg,
  };
}
