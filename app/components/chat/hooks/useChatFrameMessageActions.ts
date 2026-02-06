import { useCallback } from "react";
import toast from "react-hot-toast";

import { ANNOTATION_IDS, hasAnnotation, isImageMessageBackground, setAnnotation } from "@/types/messageAnnotations";

import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../../api";

type SendMessageAsync = (request: ChatMessageRequest) => Promise<{ success?: boolean; data?: { messageId?: number } }>;

type UseChatFrameMessageActionsParams = {
  historyMessages: ChatMessageResponse[];
  selectedMessageIds: Set<number>;
  roomId: number;
  curRoleId: number;
  curAvatarId: number;
  send: (message: ChatMessageRequest) => void;
  sendMessageAsync: SendMessageAsync;
  updateMessage: (message: Message) => void;
  setIsForwardWindowOpen: (open: boolean) => void;
  clearSelection: () => void;
};

const FORWARD_TOAST = "\u5DF2\u8F6C\u53D1\u6D88\u606F";
const FORWARD_PLACEHOLDER_CONTENT = "\u675E\uE100\u5F42\u6D5C\u55D5\u4E92\u6D93\u5B2B\u79F7\u93AD\uE21A\u57CC\u7EC0\u60E7\u5C2F";

export default function useChatFrameMessageActions({
  historyMessages,
  selectedMessageIds,
  roomId,
  curRoleId,
  curAvatarId,
  send,
  sendMessageAsync,
  updateMessage,
  setIsForwardWindowOpen,
  clearSelection,
}: UseChatFrameMessageActionsParams) {
  const constructForwardRequest = useCallback((forwardRoomId: number) => {
    const forwardMessages = Array.from(selectedMessageIds)
      .map(id => historyMessages.find(m => m.message.messageId === id))
      .filter((msg): msg is ChatMessageResponse => msg !== undefined);
    const forwardMessageRequest: ChatMessageRequest = {
      roomId: forwardRoomId,
      roleId: curRoleId,
      content: "",
      avatarId: curAvatarId,
      messageType: 5,
      extra: {
        messageList: forwardMessages,
      },
    };
    return forwardMessageRequest;
  }, [curAvatarId, curRoleId, historyMessages, selectedMessageIds]);

  const handleForward = useCallback((forwardRoomId: number) => {
    send(constructForwardRequest(forwardRoomId));
    setIsForwardWindowOpen(false);
    clearSelection();
    toast(FORWARD_TOAST);
  }, [clearSelection, constructForwardRequest, send, setIsForwardWindowOpen]);

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

  const generateForwardMessage = useCallback(async (): Promise<number | null> => {
    const firstMessageResult = await sendMessageAsync({
      roomId,
      messageType: 1,
      roleId: curRoleId,
      avatarId: curAvatarId,
      content: FORWARD_PLACEHOLDER_CONTENT,
      extra: {},
    });
    if (!firstMessageResult.success)
      return null;

    const forwardResult = await sendMessageAsync(constructForwardRequest(roomId));
    if (!forwardResult.success || !forwardResult.data)
      return null;

    setIsForwardWindowOpen(false);
    clearSelection();

    return forwardResult.data.messageId ?? null;
  }, [clearSelection, constructForwardRequest, curAvatarId, curRoleId, roomId, sendMessageAsync, setIsForwardWindowOpen]);

  return {
    handleForward,
    toggleBackground,
    toggleUnlockCg,
    generateForwardMessage,
  };
}
