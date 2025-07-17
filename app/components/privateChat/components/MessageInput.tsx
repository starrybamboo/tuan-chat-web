import { EmojiIcon, Image2Fill } from "@/icons";

export default function MessageInput({
  currentContactUserId,
  setMessageInput,
  messageInput,
  handleSendMessage,
}: {
  currentContactUserId: number | null;
  setMessageInput: (value: string) => void;
  messageInput: string;
  handleSendMessage: () => void;
}) {
  if (!currentContactUserId) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* 移动端样式 */}
      <div className="md:hidden h-16 w-full border-t border-base-300 flex items-center px-4 gap-3">
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
          <EmojiIcon className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
          <Image2Fill className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
        </div>
        <button
          type="button"
          className="btn btn-info btn-sm btn-circle"
          onClick={handleSendMessage}
          disabled={!messageInput.trim()}
        >
          <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* 桌面端样式 */}
      <div className="hidden md:flex flex-col h-36 w-full border-t border-base-300 px-6 pt-4 pb-2">
        <div className="flex-1 w-full">
          <textarea
            className="w-full h-full resize-none px-2 py-1 rounded-lg focus:outline-none"
            placeholder="输入消息内容，按 Enter 发送，Shift+Enter 换行"
            onChange={e => setMessageInput(e.target.value)}
            value={messageInput}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="h-12 w-full flex items-center justify-between px-2">
          <div className="h-full flex items-center gap-4">
            <EmojiIcon className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
            <Image2Fill className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
          </div>
          <button
            type="button"
            className="btn btn-info"
            onClick={handleSendMessage}
          >
            发送 (Enter)
          </button>
        </div>
      </div>
    </>
  );
}
