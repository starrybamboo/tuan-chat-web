import type { MessageDirectResponse } from "../../../../api";
import BetterImg from "@/components/common/betterImg";
import UserAvatarComponent from "@/components/common/userAvatar";

interface MessageBubbleProps {
  message: MessageDirectResponse; // 消息内容
  isOwn: boolean; // 是否是自己的消息
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  // 渲染消息内容（文本或图片）
  const renderMessageContent = () => {
    if (message.messageType === 2) {
      // 图片消息
      const imgData = message.extra?.imageMessage;
      return (
        <div
          data-message-id={message.messageId}
        >
          <BetterImg
            src={imgData?.url}
            size={{ width: imgData?.width, height: imgData?.height }}
            className="max-h-[40vh] max-w-[300px] rounded-lg"
            popWindowKey={`${message.messageId}img_${imgData.url}`}
          />
        </div>
      );
    }
    else {
      // 文本消息
      return (
        <div
          className="whitespace-pre-wrap break-words"
          data-message-id={message.messageId}
        >
          {message.content}
        </div>
      );
    }
  };

  // 获取消息气泡的样式类
  const getMessageBubbleClass = () => {
    const baseClass = isOwn
      ? "bg-info text-info-content rounded-lg max-w-[70%] h-full"
      : "bg-base-300 text-base-content rounded-lg max-w-[70%] h-full";

    if (message.messageType === 2) {
      // 图片消息减少内边距
      return `${baseClass}`;
    }
    else {
      // 文本消息正常内边距
      return `${baseClass} p-2`;
    }
  };

  return (
    <div key={message.messageId} className={`flex items-start gap-2 relative ${isOwn ? "justify-end" : ""}`}>
      {/* 左侧头像（接收的消息） */}
      {!isOwn && (
        <>
          <UserAvatarComponent
            userId={message.senderId || -1}
            width={10}
            isRounded={true}
            uniqueKey={`${message.senderId}${message.messageId}`}
          />
          <div className={`text-xs text-base-content/70 absolute left-12 -bottom-4 opacity-0 message-time-${message.messageId} transition-opacity duration-200`}>
            {new Date(message.createTime || Date.now()).getFullYear() !== new Date().getFullYear() && `${new Date(message.createTime || Date.now()).getFullYear()}/`}
            {new Date(message.createTime || Date.now()).toLocaleDateString() !== new Date().toLocaleDateString() && `${new Date(message.createTime || Date.now()).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" })} `}
            {new Date(message.createTime || Date.now()).toLocaleTimeString()}
          </div>
        </>
      )}

      {/* 消息内容 */}
      <div
        className={getMessageBubbleClass()}
        onMouseEnter={() => {
          // 鼠标悬停时显示时间
          const timeElement = document.querySelector(`.message-time-${message.messageId}`);
          if (timeElement) {
            timeElement.classList.remove("opacity-0");
            timeElement.classList.add("opacity-100");
          }
        }}
        onMouseLeave={() => {
          // 鼠标离开时隐藏时间
          const timeElement = document.querySelector(`.message-time-${message.messageId}`);
          if (timeElement) {
            timeElement.classList.remove("opacity-100");
            timeElement.classList.add("opacity-0");
          }
        }}
      >
        {renderMessageContent()}
      </div>

      {/* 右侧头像（发送的消息） */}
      {isOwn && (
        <div>
          <UserAvatarComponent
            userId={message.senderId || -1}
            width={10}
            isRounded={true}
            uniqueKey={`${message.senderId}${message.messageId}`}
          />
          <div className={`text-xs text-base-content/70 absolute right-12 -bottom-4 opacity-0 message-time-${message.messageId} transition-opacity duration-200`}>
            {new Date(message.createTime || Date.now()).getFullYear() !== new Date().getFullYear() && `${new Date(message.createTime || Date.now()).getFullYear()}/`}
            {new Date(message.createTime || Date.now()).toLocaleDateString() !== new Date().toLocaleDateString() && `${new Date(message.createTime || Date.now()).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" })} `}
            {new Date(message.createTime || Date.now()).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
