import { useState } from "react";
import { useImmer } from "use-immer";
import { appToast } from "@/components/common/appToast/appToast";

import { internalMessageMediaSource } from "@/components/chat/message/messageMediaSource";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { buildMessageExtraForRequest } from "@/types/messageDraft";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { getImageSize } from "@/utils/media/getImgSize";
import { UploadUtils } from "@/utils/media/UploadUtils";

import type { MessageDirectResponse, MessageDirectSendRequest } from "../../../../api";

type UsePrivateMessageSenderProps = {
  webSocketUtils: any;
  userId: number;
  currentContactUserId: number | null;
  replyMessage?: MessageDirectResponse | null;
  onMessageSent?: () => void;
};

type EmojiAttachmentMeta = {
  fileId?: number;
  width?: number;
  height?: number;
  mediaType?: string;
  size?: number;
  fileName?: string;
};

const WEBSOCKET_DIRECT_MESSAGE_TYPE = 5;

type DirectMessageOptimisticWebSocketUtils = {
  pushOptimisticDirectMessage: (request: MessageDirectSendRequest) => number | null;
  removeOptimisticDirectMessage: (optimisticMessageId: number) => void;
  sendWithResult: (request: { type: number; data: MessageDirectSendRequest }) => Promise<boolean>;
};

export async function sendDirectMessageWithOptimisticRollback(
  webSocketUtils: DirectMessageOptimisticWebSocketUtils,
  message: MessageDirectSendRequest,
) {
  const optimisticMessageId = webSocketUtils.pushOptimisticDirectMessage(message);
  try {
    const sent = await webSocketUtils.sendWithResult({
      type: WEBSOCKET_DIRECT_MESSAGE_TYPE,
      data: message,
    });
    if (!sent && optimisticMessageId != null) {
      webSocketUtils.removeOptimisticDirectMessage(optimisticMessageId);
    }
    return sent;
  }
  catch (error) {
    if (optimisticMessageId != null) {
      webSocketUtils.removeOptimisticDirectMessage(optimisticMessageId);
    }
    throw error;
  }
}

export function withPrivateReplyMessageId(
  message: MessageDirectSendRequest,
  replyMessage?: MessageDirectResponse | null,
): MessageDirectSendRequest {
  const replyMessageId = replyMessage?.messageId;
  if (typeof replyMessageId !== "number" || replyMessageId <= 0) {
    return message;
  }

  return {
    ...message,
    replyMessageId,
  };
}

export function usePrivateMessageSender({
  webSocketUtils,
  userId,
  currentContactUserId,
  replyMessage,
  onMessageSent,
}: UsePrivateMessageSenderProps) {
  const uploadUtils = new UploadUtils();

  // 状态管理
  const [messageInput, setMessageInput] = useState("");
  const [imgFiles, updateImgFiles] = useImmer<File[]>([]);
  const [emojiUrls, updateEmojiUrls] = useImmer<string[]>([]);
  const [emojiMetaByUrl, setEmojiMetaByUrlState] = useState<Record<string, EmojiAttachmentMeta>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletedContactIds, setDeletedContactIds] = useLocalStorage<number[]>("deletedContactIds", []);

  const setEmojiMetaByUrl = (url: string, meta: EmojiAttachmentMeta) => {
    if (!url) {
      return;
    }
    setEmojiMetaByUrlState(prev => ({
      ...prev,
      [url]: meta,
    }));
  };

  const removeEmojiMetaByUrl = (url: string) => {
    setEmojiMetaByUrlState((prev) => {
      if (!url || !Object.prototype.hasOwnProperty.call(prev, url)) {
        return prev;
      }
      const next = { ...prev };
      delete next[url];
      return next;
    });
  };

  // 发送消息函数
  const sendDirectMessageWithOptimistic = async (message: MessageDirectSendRequest) => {
    return sendDirectMessageWithOptimisticRollback(webSocketUtils, message);
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && imgFiles.length === 0 && emojiUrls.length === 0) || isSubmitting || !currentContactUserId)
      return;

    setIsSubmitting(true);

    try {
      // 发送图片消息
      if (imgFiles.length > 0) {
        const uploadedImages = await Promise.all(imgFiles.map(async (imgFile) => {
          const [uploadedImage, { width, height, size }] = await Promise.all([
            uploadUtils.uploadDualImage(imgFile),
            getImageSize(imgFile),
          ]);
          return {
            file: imgFile,
            uploadedImage,
            width,
            height,
            size,
          };
        }));

        for (const image of uploadedImages) {
          const imageMessage: MessageDirectSendRequest = {
            receiverId: currentContactUserId,
            content: "",
            messageType: MESSAGE_TYPE.IMG,
            extra: buildMessageExtraForRequest(MESSAGE_TYPE.IMG, {
              imageMessage: {
                source: internalMessageMediaSource(image.uploadedImage.fileId),
                size: image.size > 0 ? image.size : image.file.size,
                fileName: image.file.name || `${userId}-${Date.now()}`,
                width: image.width,
                height: image.height,
              },
            }),
          };
          const sent = await sendDirectMessageWithOptimistic(withPrivateReplyMessageId(imageMessage, replyMessage));
          if (!sent) {
            throw new Error("发送图片消息失败");
          }
        }
        updateImgFiles([]);
      }

      // 发送文本消息
      if (messageInput.trim() !== "") {
        const sendMessage: MessageDirectSendRequest = {
          receiverId: currentContactUserId,
          content: messageInput,
          messageType: 1,
          extra: {},
        };
        const sent = await sendDirectMessageWithOptimistic(withPrivateReplyMessageId(sendMessage, replyMessage));
        if (!sent) {
          throw new Error("发送文本消息失败");
        }
        setMessageInput("");
      }

      // 发送表情消息
      if (emojiUrls.length > 0) {
        for (const emojiUrl of emojiUrls) {
          const meta = emojiMetaByUrl[emojiUrl];
          if (typeof meta?.fileId !== "number") {
            throw new TypeError("表情素材缺少媒体文件 ID，请重新选择表情。");
          }
          let width = meta?.width ?? -1;
          let height = meta?.height ?? -1;
          let size = meta?.size ?? -1;

          if (width <= 0 || height <= 0 || size <= 0) {
            const measured = await getImageSize(emojiUrl);
            width = width > 0 ? width : measured.width;
            height = height > 0 ? height : measured.height;
            size = size > 0 ? size : measured.size;
          }

          const emojiMessage: MessageDirectSendRequest = {
            receiverId: currentContactUserId,
            content: "",
            messageType: MESSAGE_TYPE.IMG,
            extra: buildMessageExtraForRequest(MESSAGE_TYPE.IMG, {
              imageMessage: {
                source: internalMessageMediaSource(meta.fileId),
                size: size > 0 ? size : 0,
                fileName: meta?.fileName || emojiUrl.split("/").pop() || `${userId}-${Date.now()}`,
                width,
                height,
              },
            }),
          };
          const sent = await sendDirectMessageWithOptimistic(withPrivateReplyMessageId(emojiMessage, replyMessage));
          if (!sent) {
            throw new Error("发送表情消息失败");
          }
        }
        updateEmojiUrls((draft) => {
          draft.splice(0, draft.length);
        });
        setEmojiMetaByUrlState({});
      }
      onMessageSent?.();
    }
    catch (error) {
      console.error("私聊消息发送失败", error);
      appToast.error("私聊消息发送失败，请稍后重试");
    }
    finally {
      setIsSubmitting(false);
      if (deletedContactIds.includes(currentContactUserId)) {
        setDeletedContactIds(deletedContactIds.filter(id => id !== currentContactUserId));
      }
    }
  };
  return {
    messageInput,
    setMessageInput,
    imgFiles,
    updateImgFiles,
    emojiUrls,
    updateEmojiUrls,
    setEmojiMetaByUrl,
    removeEmojiMetaByUrl,
    isSubmitting,
    handleSendMessage,
  };
}
