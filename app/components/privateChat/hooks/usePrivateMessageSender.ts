import { useState } from "react";
import { useImmer } from "use-immer";

import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";

import type { MessageDirectSendRequest } from "../../../../api";

type UsePrivateMessageSenderProps = {
  webSocketUtils: any;
  userId: number;
  currentContactUserId: number | null;
};

export function usePrivateMessageSender({ webSocketUtils, userId, currentContactUserId }: UsePrivateMessageSenderProps) {
  const WEBSOCKET_TYPE = 5; // WebSocket 私聊消息类型
  const uploadUtils = new UploadUtils(2);

  // 状态管理
  const [messageInput, setMessageInput] = useState("");
  const [imgFiles, updateImgFiles] = useImmer<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 发送消息函数
  const send = (message: MessageDirectSendRequest) => webSocketUtils.send({ type: WEBSOCKET_TYPE, data: message });

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && imgFiles.length === 0) || isSubmitting || !currentContactUserId)
      return;

    setIsSubmitting(true);

    try {
      // 发送图片消息
      if (imgFiles.length > 0) {
        for (let i = 0; i < imgFiles.length; i++) {
          const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
          const { width, height } = await getImageSize(imgFiles[i]);

          if (imgDownLoadUrl && imgDownLoadUrl !== "") {
            const imageMessage: MessageDirectSendRequest = {
              receiverId: currentContactUserId,
              content: "",
              messageType: 2, // 图片消息类型
              extra: {
                size: 0,
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
    }
    finally {
      setIsSubmitting(false);
    }
  };

  return {
    messageInput,
    setMessageInput,
    imgFiles,
    updateImgFiles,
    isSubmitting,
    handleSendMessage,
  };
}
