import { useCallback } from "react";
import toast from "react-hot-toast";

import { ANNOTATION_IDS, hasAnnotation, isImageMessageBackground, setAnnotation } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../../api";

type SendMessageAsync = (request: ChatMessageRequest) => Promise<{ success?: boolean; data?: { messageId?: number } }>;
export type ForwardMode = "merged" | "separate";

type UseChatFrameMessageActionsParams = {
  historyMessages: ChatMessageResponse[];
  selectedMessageIds: Set<number>;
  curRoleId: number;
  curAvatarId: number;
  send: (message: ChatMessageRequest) => void;
  sendMessageAsync: SendMessageAsync;
  updateMessage: (message: Message) => void;
  setIsForwardWindowOpen: (open: boolean) => void;
  clearSelection: () => void;
};

const FORWARD_TOAST = "\u5DF2\u8F6C\u53D1\u6D88\u606F";
const FORWARD_SEPARATE_TOAST = "\u5DF2\u9010\u6761\u8F6C\u53D1\u6D88\u606F";

export default function useChatFrameMessageActions({
  historyMessages,
  selectedMessageIds,
  curRoleId,
  curAvatarId,
  send,
  sendMessageAsync,
  updateMessage,
  setIsForwardWindowOpen,
  clearSelection,
}: UseChatFrameMessageActionsParams) {
  const getSelectedMessages = useCallback(() => (
    Array.from(selectedMessageIds)
      .map(id => historyMessages.find(m => m.message.messageId === id))
      .filter((msg): msg is ChatMessageResponse => msg !== undefined)
      .sort((a, b) => (a.message.position ?? 0) - (b.message.position ?? 0))
  ), [historyMessages, selectedMessageIds]);

  const constructForwardRequest = useCallback((forwardRoomId: number, forwardMessages: ChatMessageResponse[]) => {
    const forwardMessageRequest: ChatMessageRequest = {
      roomId: forwardRoomId,
      roleId: curRoleId,
      content: "",
      avatarId: curAvatarId,
      messageType: MESSAGE_TYPE.FORWARD,
      extra: {
        messageList: forwardMessages,
      },
    };
    return forwardMessageRequest;
  }, [curAvatarId, curRoleId]);

  const handleForward = useCallback(async (forwardRoomId: number, mode: ForwardMode): Promise<boolean> => {
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
      let successCount = 0;
      try {
        // 逐条转发时顺序发送，确保目标房间的消息顺序稳定。
        for (const message of selectedMessages) {
          const result = await sendMessageAsync(constructForwardRequest(forwardRoomId, [message]));
          if (!result?.success)
            throw new Error("发送失败");
          successCount++;
        }
      }
      catch (error) {
        console.error("逐条转发失败:", error);
        const failText = successCount > 0
          ? `逐条转发中断，已发送 ${successCount}/${selectedMessages.length} 条`
          : "逐条转发失败";
        toast.error(failText);
        return false;
      }
      setIsForwardWindowOpen(false);
      clearSelection();
      toast(FORWARD_SEPARATE_TOAST);
      return true;
    }

    send(constructForwardRequest(forwardRoomId, selectedMessages));
    setIsForwardWindowOpen(false);
    clearSelection();
    toast(FORWARD_TOAST);
    return true;
  }, [clearSelection, constructForwardRequest, getSelectedMessages, send, sendMessageAsync, setIsForwardWindowOpen]);

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
    toggleBackground,
    toggleUnlockCg,
  };
}
