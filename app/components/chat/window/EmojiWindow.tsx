import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { UploadUtils } from "@/utils/UploadUtils";
import { useCreateEmojiMutation, useGetUserEmojisQuery } from "api/hooks/emojiQueryHooks";

export default function EmojiWindow({ onChoose }:
{
  onChoose: (emoji: any) => void; // 选择表情的回调函数
}) {
  // 获取用户自定义表情列表
  const { data: emojisData } = useGetUserEmojisQuery();
  const emojiList = Array.isArray(emojisData?.data) ? emojisData.data : [];

  // 新增表情
  const createEmojiMutation = useCreateEmojiMutation();
  const uploadUtils = new UploadUtils(2);

  const handleAddEmoji = async (newImg: File) => {
    if (!newImg) {
      return;
    }
    const imageUrl = await uploadUtils.uploadImg(newImg);

    const emojiCreateRequest = {
      name: newImg.name,
      imageUrl,
      fileSize: newImg.size,
      format: newImg.type.split("/").pop() || "jpg",
    };

    createEmojiMutation.mutate(emojiCreateRequest);
  };

  return (
    <div className="p-1 pb-0 w-full">
      {/* 显示表情 */}
      <div className="grid grid-cols-4 mb-2">
        {emojiList.length === 0
          ? (
              <div className="col-span-4 text-center text-base-content/70">暂无表情包</div>
            )
          : (
              emojiList.map(emoji => (
                <div
                  key={emoji.emojiId}
                  onClick={() => { onChoose(emoji); }}
                  className="aspect-square cursor-pointer hover:bg-base-200 rounded-lg p-2 hover:scale-105 transition-transform"
                >
                  <img
                    src={emoji.imageUrl}
                    alt={emoji.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
              ))
            )}
        {/* 添加新表情 */}
        <ImgUploader setImg={(newImg) => { handleAddEmoji(newImg); }}>
          <div className="aspect-square cursor-pointer hover:bg-base-200 rounded-lg p-2 hover:scale-105 transition-transform">
            <div className="flex items-center justify-center h-full text-base-content/70">
              <span className="text-2xl">+</span>
            </div>
          </div>
        </ImgUploader>
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
