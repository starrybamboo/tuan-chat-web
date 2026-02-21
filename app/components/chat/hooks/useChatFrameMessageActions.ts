import { useCallback } from "react";
import toast from "react-hot-toast";

import { ANNOTATION_IDS, hasAnnotation, isImageMessageBackground, setAnnotation } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../../api";

type BatchSendMessagesAsync = (requests: ChatMessageRequest[]) => Promise<{ success?: boolean; data?: Message[] }>;
export type ForwardMode = "merged" | "separate";

type UseChatFrameMessageActionsParams = {
  historyMessages: ChatMessageResponse[];
  selectedMessageIds: Set<number>;
  curRoleId: number;
  curAvatarId: number;
  send: (message: ChatMessageRequest) => void;
  batchSendMessagesAsync: BatchSendMessagesAsync;
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
  batchSendMessagesAsync,
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

  const pickObject = useCallback((value: unknown): Record<string, any> => {
    return value && typeof value === "object" ? value as Record<string, any> : {};
  }, []);

  const normalizeForwardedRawType = useCallback((messageType: number): number => {
    if (messageType === MESSAGE_TYPE.INTRO_TEXT || messageType === MESSAGE_TYPE.SYSTEM) {
      return MESSAGE_TYPE.TEXT;
    }
    return messageType;
  }, []);

  const normalizeForwardedRawExtra = useCallback((messageType: number, rawExtra: unknown): Record<string, any> => {
    const extra = pickObject(rawExtra);
    switch (messageType) {
      case MESSAGE_TYPE.IMG:
        return pickObject(extra.imageMessage ?? extra);
      case MESSAGE_TYPE.FILE:
        return pickObject(extra.fileMessage ?? extra);
      case MESSAGE_TYPE.VIDEO:
        return pickObject(extra.videoMessage ?? extra.fileMessage ?? extra);
      case MESSAGE_TYPE.SOUND:
        return pickObject(extra.soundMessage ?? extra);
      case MESSAGE_TYPE.EFFECT:
        return pickObject(extra.effectMessage ?? extra);
      case MESSAGE_TYPE.DICE:
        return pickObject(extra.diceResult ?? extra);
      case MESSAGE_TYPE.FORWARD:
        return pickObject(extra.forwardMessage ?? extra);
      case MESSAGE_TYPE.CLUE_CARD:
        return pickObject(extra.clueMessage ?? extra);
      case MESSAGE_TYPE.WEBGAL_VAR:
        return extra.webgalVar !== undefined ? { webgalVar: extra.webgalVar } : extra;
      case MESSAGE_TYPE.WEBGAL_CHOOSE:
        return extra.webgalChoose !== undefined ? { webgalChoose: extra.webgalChoose } : extra;
      case MESSAGE_TYPE.COMMAND_REQUEST:
        return extra.commandRequest !== undefined ? { commandRequest: extra.commandRequest } : extra;
      case MESSAGE_TYPE.DOC_CARD:
        return extra.docCard !== undefined ? { docCard: extra.docCard } : extra;
      case MESSAGE_TYPE.THREAD_ROOT: {
        const title = typeof extra.title === "string" ? extra.title.trim() : "";
        return title ? { title } : {};
      }
      default:
        return extra;
    }
  }, [pickObject]);

  const constructRawForwardRequest = useCallback((forwardRoomId: number, sourceMessage: Message): ChatMessageRequest => {
    const normalizedMessageType = normalizeForwardedRawType(sourceMessage.messageType);
    const shouldKeepOriginalExtra = normalizedMessageType === sourceMessage.messageType;
    const nextExtra = shouldKeepOriginalExtra
      ? normalizeForwardedRawExtra(normalizedMessageType, sourceMessage.extra)
      : {};

    return {
      roomId: forwardRoomId,
      roleId: curRoleId,
      avatarId: curAvatarId,
      content: sourceMessage.content ?? "",
      messageType: normalizedMessageType,
      ...(Array.isArray(sourceMessage.annotations) ? { annotations: sourceMessage.annotations } : {}),
      ...(typeof sourceMessage.customRoleName === "string" ? { customRoleName: sourceMessage.customRoleName } : {}),
      ...(sourceMessage.webgal !== undefined ? { webgal: sourceMessage.webgal } : {}),
      extra: nextExtra,
    };
  }, [curAvatarId, curRoleId, normalizeForwardedRawExtra, normalizeForwardedRawType]);

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
      try {
        const batchRequests = selectedMessages.map(message => constructRawForwardRequest(forwardRoomId, message.message));
        const result = await batchSendMessagesAsync(batchRequests);
        if (!result?.success)
          throw new Error("批量发送失败");
      }
      catch (error) {
        console.error("逐条转发失败:", error);
        toast.error("逐条转发失败");
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
  }, [batchSendMessagesAsync, clearSelection, constructForwardRequest, constructRawForwardRequest, getSelectedMessages, send, setIsForwardWindowOpen]);

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
