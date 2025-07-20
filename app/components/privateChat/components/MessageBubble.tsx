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
        <div>
          <BetterImg
            src={imgData?.url}
            size={{ width: imgData?.width, height: imgData?.height }}
            className="max-h-[40vh] max-w-[300px] rounded-lg"
          />
        </div>
      );
    }
    else {
      // 文本消息
      return (
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
      );
    }
  };

  // 获取消息气泡的样式类
  const getMessageBubbleClass = () => {
    const baseClass = isOwn
      ? "bg-info text-info-content rounded-lg max-w-[70%]"
      : "bg-base-300 text-base-content rounded-lg max-w-[70%]";

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
    <div key={message.messageId} className={`flex items-start gap-2 ${isOwn ? "justify-end" : ""}`}>
      {/* 左侧头像（接收的消息） */}
      {!isOwn && (
        <UserAvatarComponent
          userId={message.senderId || -1}
          width={12}
          isRounded={true}
          uniqueKey={`${message.senderId}${message.messageId}`}
        />
      )}

      {/* 消息内容 */}
      <div className={getMessageBubbleClass()}>
        {renderMessageContent()}
      </div>

      {/* 右侧头像（发送的消息） */}
      {isOwn && (
        <UserAvatarComponent
          userId={message.senderId || -1}
          width={12}
          isRounded={true}
          uniqueKey={`${message.senderId}${message.messageId}`}
        />
      )}
    </div>
  );
}
