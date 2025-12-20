import type { Emoji as EmojiType } from "api/models/Emoji";
import EmojiWindow from "@/components/chat/window/EmojiWindow";
import BetterImg from "@/components/common/betterImg";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useGlobalContext } from "@/components/globalContextProvider";
import { EmojiIcon, Image2Fill } from "@/icons";
import { usePrivateMessageSender } from "../hooks/usePrivateMessageSender";

export default function MessageInput({ userId, currentContactUserId }: { userId: number; currentContactUserId: number | null }) {
  const globalContext = useGlobalContext();
  const webSocketUtils = globalContext.websocketUtils;

  // 消息发送hook
  const { messageInput, setMessageInput, imgFiles, updateImgFiles, emojiUrls, updateEmojiUrls, handleSendMessage } = usePrivateMessageSender({ webSocketUtils, userId, currentContactUserId });

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
      <div className="md:hidden w-full border-t border-base-300 flex flex-col px-4 py-2 max-h-32">
        {/* 预览要发送的图片和表情 */}
        {(imgFiles.length > 0 || emojiUrls.length > 0) && (
          <div className="flex flex-row gap-x-3 overflow-x-auto pb-2">
            {imgFiles.map((file, index) => (
              <BetterImg
                src={file}
                className="h-14 w-max rounded"
                onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                key={file.name}
              />
            ))}
            {emojiUrls.map((url, index) => (
              <BetterImg
                src={url}
                className="h-14 w-max rounded"
                onClose={() => updateEmojiUrls(draft => void draft.splice(index, 1))}
                key={url}
              />
            ))}
          </div>
        )}

        {/* 下方输入框和按钮 */}
        <div className="flex items-center gap-3 w-full h-10">
          <div className="flex-1">
            <input
              type="text"
              className="w-full h-10 px-3 py-2 rounded-full border border-base-300 focus:outline-none focus:border-info text-sm"
              placeholder=""
              onChange={(e) => {
                setMessageInput(e.target.value);
              }}
              value={messageInput}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex items-center gap-2">
            <Emoji updateEmojiUrls={updateEmojiUrls}>
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
            disabled={!messageInput.trim() && imgFiles.length === 0 && emojiUrls.length === 0}
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
        {(imgFiles.length > 0 || emojiUrls.length > 0) && (
          <div className="flex flex-row gap-x-3 overflow-x-auto pb-2">
            {imgFiles.map((file, index) => (
              <BetterImg
                src={file}
                className="h-14 w-max rounded"
                onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                key={file.name}
              />
            ))}
            {emojiUrls.map((url, index) => (
              <BetterImg
                src={url}
                className="h-14 w-max rounded"
                onClose={() => updateEmojiUrls(draft => void draft.splice(index, 1))}
                key={url}
              />
            ))}
          </div>
        )}
        {/* 上方输入框 */}
        <div className="flex-1 w-full">
          <textarea
            className="w-full h-full resize-none px-2 py-1 rounded-lg focus:outline-none"
            placeholder="Enter 发送，Shift+Enter 换行"
            onChange={(e) => {
              setMessageInput(e.target.value);
            }}
            value={messageInput}
            onKeyDown={handleKeyDown}
          />
        </div>
        {/* 下方工具栏 */}
        <div className="h-12 w-full flex items-center justify-between px-2">
          {/* 工具 */}
          <div className="h-full flex items-center gap-4">
            <Emoji updateEmojiUrls={updateEmojiUrls}>
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
            disabled={!messageInput.trim() && imgFiles.length === 0 && emojiUrls.length === 0}
          >
            发送
          </button>
        </div>
      </div>
    </>
  );
}

function Emoji({ children, updateEmojiUrls }: { children: React.ReactNode; updateEmojiUrls: (recipe: (draft: string[]) => void) => void }) {
  const onChoose = async (emoji: EmojiType) => {
    // 添加到表情列表
    updateEmojiUrls((draft) => {
      const newUrl = emoji?.imageUrl;
      if (newUrl && !draft.includes(newUrl)) {
        draft.push(newUrl);
      }
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
        className="dropdown-content menu bg-base-100 rounded-box z-1 p-2 shadow-sm overflow-y-auto w-96 transform -translate-x-1/3 md:translate-x-0"
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
