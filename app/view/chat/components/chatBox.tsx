import type { Message } from "@/view/chat/components/message";

/**
 * Gal风格的对话框组件
 * @constructor
 */
export function ChatBox({ message }: { message: Message }) {
  return (
    <div className="flex w-full mb-4" key={message.messageId}>
      {/* 圆角矩形头像（始终显示） */}
      <div className="flex-shrink-0 mr-3">
        <div className="w-20 h-20 rounded-md overflow-hidden">
          <img
            alt={message.userRole.roleName}
            src={message.avatar.avatarUrl}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 消息内容 */}
      <div className="flex-1">
        {/* 角色名（始终显示） */}
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {message.userRole.roleName}
        </div>

        {/* 消息文本（纯文字，无边框） */}
        <div
          className="text-base text-gray-700 dark:text-gray-300 mt-1"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {message.content}
        </div>

        {/* 时间（小字，低调） */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {message.createTime.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
