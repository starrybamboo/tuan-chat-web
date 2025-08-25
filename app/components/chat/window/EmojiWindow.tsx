import type { Emoji } from "api/models/Emoji";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { UploadUtils } from "@/utils/UploadUtils";
import { useCreateEmojiMutation, useDeleteEmojiMutation, useGetUserEmojisQuery } from "api/hooks/emojiQueryHooks";
import { useState } from "react";

export default function EmojiWindow({ onChoose }:
{
  onChoose: (emoji: Emoji) => void; // 选择表情的回调函数
}) {
  const { data: emojisData } = useGetUserEmojisQuery();
  const emojiList = Array.isArray(emojisData?.data) ? emojisData.data : [];
  const deleteEmojiMutation = useDeleteEmojiMutation();
  const [deleteButtonVisible, setDeleteButtonVisible] = useState(false);

  // 新增表情
  const createEmojiMutation = useCreateEmojiMutation();
  const uploadUtils = new UploadUtils();
  const handleAddEmoji = async (newImg: File) => {
    if (!newImg) {
      return;
    }
    const imageUrl = await uploadUtils.uploadImg(newImg, 2);

    const emojiCreateRequest = {
      name: newImg.name,
      imageUrl,
      fileSize: newImg.size,
      format: newImg.type.split("/").pop() || "jpg",
    };

    createEmojiMutation.mutate(emojiCreateRequest);
  };

  // 删除表情
  const onDelete = (emojiId: number) => {
    deleteEmojiMutation.mutate(emojiId);
  };

  return (
    <div className="w-full">
      {/* 显示表情 */}
      <div className="grid grid-cols-4 md:grid-cols-5 mb-2 max-h-80 p-1 overflow-y-auto overflow-x-hidden">
        {/* 添加新表情 */}
        <ImgUploader setImg={(newImg) => { handleAddEmoji(newImg); }}>
          <div className="aspect-square cursor-pointer hover:bg-base-200 rounded-lg p-1 transition-transform">
            <div className="flex items-center justify-center h-full text-base-content/70">
              <span className="text-2xl">+</span>
            </div>
          </div>
        </ImgUploader>

        {emojiList.length === 0
          ? (
              <div className="col-span-4 md:col-span-5 text-center text-base-content/70 h-20 flex items-center justify-center">暂无表情包</div>
            )
          : (
              emojiList.map(emoji => (
                <div
                  key={emoji.emojiId}
                  onClick={() => { onChoose(emoji); }}
                  className={`aspect-square cursor-pointer rounded-lg p-1 transition-transform relative ${deleteButtonVisible ? "" : "hover:scale-105"}`}
                >
                  <img
                    src={emoji.imageUrl}
                    alt={emoji.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                  {/* 删除按钮 */}
                  {deleteButtonVisible && (
                    <button
                      type="button"
                      className="cursor-pointer absolute top-0 right-0 rounded-full size-5 flex items-center justify-center bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(emoji.emojiId || -1);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            )}
        {emojiList.length !== 0 && (
          <div
            className="aspect-square cursor-pointer hover:bg-base-200 rounded-lg p-1 transition-transform"
            onClick={() => {
              setDeleteButtonVisible(!deleteButtonVisible);
            }}
          >
            <div className="flex items-center justify-center h-full text-base-content/70">
              <span className="text-xl">×</span>
            </div>
          </div>
        )}
      </div>
      {/* 选择表情包列表 */}
      <div className="flex">
        {/* 自定义 */}
        <button type="button" className="btn btn-ghost btn-sm">
          <span>自定义表情</span>
        </button>
        {/* more emoji */}
      </div>
    </div>
  );
}
