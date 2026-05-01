import { useState } from "react";
import toast from "react-hot-toast";
import { useImmer } from "use-immer";

import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { buildMessageExtraForRequest } from "@/types/messageDraft";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";

import type { MessageDirectSendRequest } from "../../../../api";

type UsePrivateMessageSenderProps = {
  webSocketUtils: any;
  userId: number;
  currentContactUserId: number | null;
};

type EmojiAttachmentMeta = {
  fileId?: number;
  width?: number;
  height?: number;
  mediaType?: string;
  size?: number;
  fileName?: string;
  originalUrl?: string;
};

export function usePrivateMessageSender({ webSocketUtils, userId, currentContactUserId }: UsePrivateMessageSenderProps) {
  const WEBSOCKET_TYPE = 5; // WebSocket 私聊消息类型
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
    const optimisticMessageId = webSocketUtils.pushOptimisticDirectMessage(message);
    const sent = await webSocketUtils.sendWithResult({ type: WEBSOCKET_TYPE, data: message });
    if (!sent && optimisticMessageId != null) {
      webSocketUtils.removeOptimisticDirectMessage(optimisticMessageId);
    }
    return sent;
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && imgFiles.length === 0 && emojiUrls.length === 0) || isSubmitting || !currentContactUserId)
      return;

    setIsSubmitting(true);

    try {
      // 发送图片消息
      if (imgFiles.length > 0) {
        for (let i = 0; i < imgFiles.length; i++) {
          const uploadedImage = await uploadUtils.uploadDualImage(imgFiles[i]);
          const { width, height, size } = await getImageSize(imgFiles[i]);

          if (uploadedImage.url && uploadedImage.url !== "") {
            const imageMessage: MessageDirectSendRequest = {
              receiverId: currentContactUserId,
              content: "",
              messageType: MESSAGE_TYPE.IMG,
              extra: buildMessageExtraForRequest(MESSAGE_TYPE.IMG, {
                imageMessage: {
                  size: size > 0 ? size : imgFiles[i].size,
                  originalUrl: uploadedImage.originalUrl,
                  url: uploadedImage.url,
                  fileName: uploadedImage.url.split("/").pop() || `${userId}-${Date.now()}`,
                  width,
                  height,
                },
              }),
            };
            const sent = await sendDirectMessageWithOptimistic(imageMessage);
            if (!sent) {
              throw new Error("发送图片消息失败");
            }
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
        const sent = await sendDirectMessageWithOptimistic(sendMessage);
        if (!sent) {
          throw new Error("发送文本消息失败");
        }
        setMessageInput("");
      }

      // 发送表情消息
      if (emojiUrls.length > 0) {
        for (const emojiUrl of emojiUrls) {
          const meta = emojiMetaByUrl[emojiUrl];
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
                fileId: meta?.fileId,
                mediaType: meta?.mediaType,
                size: size > 0 ? size : 0,
                fileName: meta?.fileName || emojiUrl.split("/").pop() || `${userId}-${Date.now()}`,
                width,
                height,
                originalUrl: meta?.originalUrl ?? emojiUrl,
                url: emojiUrl,
              },
            }),
          };
          const sent = await sendDirectMessageWithOptimistic(emojiMessage);
          if (!sent) {
            throw new Error("发送表情消息失败");
          }
        }
        updateEmojiUrls((draft) => {
          draft.splice(0, draft.length);
        });
        setEmojiMetaByUrlState({});
      }
    }
    catch (error) {
      console.error("私聊消息发送失败", error);
      toast.error("私聊消息发送失败，请稍后重试");
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
