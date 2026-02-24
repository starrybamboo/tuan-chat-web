import type { MessageDirectResponse } from "../../../../api";
import BetterImg from "@/components/common/betterImg";
import UserAvatarComponent from "@/components/common/userAvatar";

interface MessageBubbleProps {
  message: MessageDirectResponse; // 消息内容
  isOwn: boolean; // 是否是自己的消息
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const extra: any = message.extra as any;

  // 渲染消息内容（文本/图片/视频）
  const renderMessageContent = () => {
    if (message.messageType === 2) {
      const imgData = extra?.imageMessage ?? extra;
      return (
        <div data-message-id={message.messageId}>
          <BetterImg
            src={imgData?.url}
            size={{ width: imgData?.width, height: imgData?.height }}
            className="max-h-[40vh] max-w-[245px] rounded-lg"
          />
        </div>
      );
    }

    if (message.messageType === 14) {
      const videoMessage = extra?.videoMessage ?? extra?.fileMessage ?? extra;
      const videoUrl = typeof videoMessage?.url === "string" ? videoMessage.url : "";
      if (videoUrl) {
        return (
          <div data-message-id={message.messageId}>
            <video
              src={videoUrl}
              controls={true}
              preload="metadata"
              className="max-h-[40vh] max-w-[245px] rounded-lg bg-black"
            />
          </div>
        );
      }
      return <div className="whitespace-pre-wrap break-words">[视频]</div>;
    }

    return (
      <div
        className="whitespace-pre-wrap break-words"
        data-message-id={message.messageId}
      >
        {message.content}
      </div>
    );
  };

  const isMediaMessage = message.messageType === 2 || message.messageType === 14;

  const getMessageBubbleClass = () => {
    const baseClass = "rounded-lg max-w-[70%] h-full";

    if (isMediaMessage) {
      return baseClass;
    }

    if (isOwn) {
      return `${baseClass} bg-blue-300 dark:bg-blue-500 text-info-content dark:text-white p-2`;
    }
    else {
      return `${baseClass} bg-base-300 dark:bg-gray-700 text-base-content p-2`;
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
