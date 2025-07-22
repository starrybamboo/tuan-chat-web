import EmojiWindow from "@/components/chat/window/EmojiWindow";
import BetterImg from "@/components/common/betterImg";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { EmojiIcon, Image2Fill } from "@/icons";

export default function MessageInput({
  currentContactUserId,
  setMessageInput,
  messageInput,
  handleSendMessage,
  imgFiles,
  updateImgFiles,
}: {
  currentContactUserId: number | null;
  setMessageInput: (value: string) => void;
  messageInput: string;
  handleSendMessage: () => void | Promise<void>;
  imgFiles: File[]; // 预览的图片文件列表
  updateImgFiles: (recipe: (draft: File[]) => void) => void; // 更新图片文件列表的函数
}) {
  /**
   * 文本消息发送
   */
  // Enter 键发送消息
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!currentContactUserId) {
    return null;
  }
  return (
    <>
      {/* 移动端样式 */}
      <div className="md:hidden w-full border-t border-base-300 flex flex-col px-4 py-2">
        {/* 预览要发送的图片 */}
        {imgFiles.length > 0 && (
          <div className="flex flex-row gap-x-3 overflow-x-auto pb-2">
            {imgFiles.map((file, index) => (
              <BetterImg
                src={file}
                className="h-14 w-max rounded"
                onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                key={file.name}
              />
            ))}
          </div>
        )}
        {/* 下方输入框和按钮 */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1">
            <input
              type="text"
              className="w-full h-10 px-3 py-2 rounded-full border border-base-300 focus:outline-none focus:border-info text-sm"
              placeholder="输入消息..."
              onChange={e => setMessageInput(e.target.value)}
              value={messageInput}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex items-center gap-2">
            <Emoji updateImgFiles={updateImgFiles}>
              <EmojiIcon className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
            </Emoji>

            <Image updateImgFiles={updateImgFiles}>
              <Image2Fill className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
            </Image>
          </div>
          <button
            type="button"
            className="btn btn-info btn-sm btn-circle"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() && imgFiles.length === 0}
          >
            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 桌面端样式 */}
      <div className="hidden md:flex flex-col w-full border-t border-base-300 px-6 pt-4 pb-2">
        {/* 预览要发送的图片 */}
        {imgFiles.length > 0 && (
          <div className="flex flex-row gap-x-3 overflow-x-auto pb-2">
            {imgFiles.map((file, index) => (
              <BetterImg
                src={file}
                className="h-14 w-max rounded"
                onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                key={file.name}
              />
            ))}
          </div>
        )}
        {/* 上方输入框 */}
        <div className="flex-1 w-full">
          <textarea
            className="w-full h-full resize-none px-2 py-1 rounded-lg focus:outline-none"
            placeholder="输入消息内容，按 Enter 发送，Shift+Enter 换行"
            onChange={e => setMessageInput(e.target.value)}
            value={messageInput}
            onKeyDown={handleKeyDown}
          />
        </div>
        {/* 下方工具栏 */}
        <div className="h-12 w-full flex items-center justify-between px-2">
          {/* 工具 */}
          <div className="h-full flex items-center gap-4">
            <Emoji updateImgFiles={updateImgFiles}>
              <EmojiIcon className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
            </Emoji>
            <Image updateImgFiles={updateImgFiles}>
              <Image2Fill className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
            </Image>
          </div>
          {/* 发送按钮 */}
          <button
            type="button"
            className="btn btn-info"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() && imgFiles.length === 0}
          >
            发送 (Enter)
          </button>
        </div>
      </div>
    </>
  );
}

function Emoji({ children, updateImgFiles }: { children: React.ReactNode; updateImgFiles: (recipe: (draft: File[]) => void) => void }) {
  const onChoose = async (emoji: any) => {
    // 通过 fetch 获取图片 blob
    const response = await fetch(emoji.imageUrl);
    const blob = await response.blob();

    // 用 blob 创建 File
    const file = new File(
      [blob],
      `${emoji.name || "emoji"}-${emoji.emojiId}.${emoji.format}`,
      { type: blob.type },
    );

    // 添加到图片列表
    updateImgFiles((draft) => {
      draft.push(file);
    });
  };
  return (
    <div className="dropdown dropdown-top flex items-center justify-center h-full">
      {/* dropdown 默认展示 */}
      <div
        role="button"
        tabIndex={0}
        className="tooltip"
        data-tip="发送表情"
      >
        {children}
      </div>
      {/* dropdown 表情选择窗口 */}
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-1 w-80 p-2 shadow-sm overflow-y-auto"
      >
        <EmojiWindow onChoose={onChoose}></EmojiWindow>
      </ul>
    </div>
  );
}

function Image({ children, updateImgFiles }: { children: React.ReactNode; updateImgFiles: (recipe: (draft: File[]) => void) => void }) {
  return (
    <ImgUploader setImg={newImg => updateImgFiles((draft: File[]) => {
      draft.push(newImg);
    })}
    >
      <div className="tooltip flex items-center justify-center" data-tip="发送图片">
        {children}
      </div>
    </ImgUploader>
  );
}
