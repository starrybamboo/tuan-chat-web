import type { Message } from "@/view/chat/components/message";

/**
 * 聊天风格的对话框组件
 */
export function ChatBubble({ message }: { message: Message }) {
  return (
  // <div className={message.type !== "user" ? "chat chat-start" : "chat chat-end"} key={message.id}>
    <div className="chat chat-start" key={message.messageId}>
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img
            alt="Tailwind CSS chat bubble component"
            src={message.avatar.avatarUrl}
          />
        </div>

      </div>
      <div
        className={message.type !== 1 ? "chat-bubble" : "chat-bubble chat-bubble-neutral"}
      >
        <div style={{ whiteSpace: "pre-wrap" }}>
          {message.content}
        </div>
      </div>
      <div className="chat-footer">
        {message.userRole.roleName}
        <time className="text-xs opacity-50">
          {message.createTime.toLocaleString()}
        </time>
      </div>
      {/* <div className="chat-footer opacity-50">Seen</div> */}
    </div>
  );
}
