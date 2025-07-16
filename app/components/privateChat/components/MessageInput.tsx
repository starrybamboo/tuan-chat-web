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
  return (
    <div className="h-36 w-full border-t border-base-300 flex flex-col px-6 pt-4 pb-2">
      <div className="flex-1 w-full">
        <textarea
          className="w-full h-full resize-none px-2 py-1 rounded-lg focus:outline-none"
          placeholder="请输入消息内容..."
          onChange={e => setMessageInput(e.target.value)}
          value={messageInput}
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
          发送
        </button>
      </div>
    </div>
  );
}
