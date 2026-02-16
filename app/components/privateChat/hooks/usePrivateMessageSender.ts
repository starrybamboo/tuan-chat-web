import { useState } from "react";
import { useImmer } from "use-immer";

import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";

import type { MessageDirectSendRequest } from "../../../../api";

type UsePrivateMessageSenderProps = {
  webSocketUtils: any;
  userId: number;
  currentContactUserId: number | null;
};

type EmojiAttachmentMeta = {
  width?: number;
  height?: number;
  size?: number;
  fileName?: string;
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
  const send = (message: MessageDirectSendRequest) => webSocketUtils.send({ type: WEBSOCKET_TYPE, data: message });

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && imgFiles.length === 0 && emojiUrls.length === 0) || isSubmitting || !currentContactUserId)
      return;

    setIsSubmitting(true);

    try {
      // 发送图片消息
      if (imgFiles.length > 0) {
        for (let i = 0; i < imgFiles.length; i++) {
          const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
          const { width, height, size } = await getImageSize(imgFiles[i]);

          if (imgDownLoadUrl && imgDownLoadUrl !== "") {
            const imageMessage: MessageDirectSendRequest = {
              receiverId: currentContactUserId,
              content: "",
              messageType: 2, // 图片消息类型
              extra: {
                size: size > 0 ? size : imgFiles[i].size,
                url: imgDownLoadUrl,
                fileName: imgDownLoadUrl.split("/").pop() || `${userId}-${Date.now()}`,
                width,
                height,
              },
            };
            send(imageMessage);
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
        send(sendMessage);
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
            messageType: 2,
            extra: {
              size: size > 0 ? size : 0,
              fileName: meta?.fileName || emojiUrl.split("/").pop() || `${userId}-${Date.now()}`,
              width,
              height,
              url: emojiUrl,
            },
          };
          send(emojiMessage);
        }
        updateEmojiUrls((draft) => {
          draft.splice(0, draft.length);
        });
        setEmojiMetaByUrlState({});
      }
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
