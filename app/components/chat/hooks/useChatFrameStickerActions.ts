import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";

import type { ImageMessage } from "api";

import { getImageSize } from "@/utils/getImgSize";
import { useCreateStickerMutation, useGetUserStickersQuery } from "api/hooks/stickerQueryHooks";

const STICKER_EXISTS_TOAST = "表情已存在";
const STICKER_ADDED_TOAST = "表情添加成功";

export default function useChatFrameStickerActions() {
  const { data: emojisData } = useGetUserStickersQuery();
  const emojiList = useMemo(() => (Array.isArray(emojisData?.data) ? emojisData.data : []), [emojisData?.data]);
  const createStickerMutation = useCreateStickerMutation();

  const handleAddSticker = useCallback(async (imgMessage: ImageMessage) => {
    if (emojiList.find(emoji => emoji.imageUrl === imgMessage.url)) {
      toast.error(STICKER_EXISTS_TOAST);
      return;
    }

    const fileSize = imgMessage.size > 0
      ? imgMessage.size
      : (await getImageSize(imgMessage.url)).size;

    createStickerMutation.mutate({
      name: imgMessage.fileName,
      imageUrl: imgMessage.url,
      fileSize,
      format: imgMessage.url.split(".").pop() || "webp",
    }, {
      onSuccess: () => {
        toast.success(STICKER_ADDED_TOAST);
      },
    });
  }, [createStickerMutation, emojiList]);

  return { handleAddSticker };
}
