import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";

import type { ImageMessage } from "api";

import { getImageSize } from "@/utils/getImgSize";
import { useCreateEmojiMutation, useGetUserEmojisQuery } from "api/hooks/emojiQueryHooks";

const EMOJI_EXISTS_TOAST = "\u8868\u60C5\u5DF2\u5B58\u5728";
const EMOJI_ADDED_TOAST = "\u8868\u60C5\u6DFB\u52A0\u6210\u529F";

export default function useChatFrameEmojiActions() {
  const { data: emojisData } = useGetUserEmojisQuery();
  const emojiList = useMemo(() => (Array.isArray(emojisData?.data) ? emojisData.data : []), [emojisData?.data]);
  const createEmojiMutation = useCreateEmojiMutation();

  const handleAddEmoji = useCallback(async (imgMessage: ImageMessage) => {
    if (emojiList.find(emoji => emoji.imageUrl === imgMessage.url)) {
      toast.error(EMOJI_EXISTS_TOAST);
      return;
    }

    const fileSize = imgMessage.size > 0
      ? imgMessage.size
      : (await getImageSize(imgMessage.url)).size;

    createEmojiMutation.mutate({
      name: imgMessage.fileName,
      imageUrl: imgMessage.url,
      fileSize,
      format: imgMessage.url.split(".").pop() || "webp",
    }, {
      onSuccess: () => {
        toast.success(EMOJI_ADDED_TOAST);
      },
    });
  }, [createEmojiMutation, emojiList]);

  return { handleAddEmoji };
}
