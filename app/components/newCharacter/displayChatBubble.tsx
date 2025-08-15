/**
 * 展示用聊天气泡组件的属性接口
 */
interface DisplayChatBubbleProps {
  /** 角色名称 */
  roleName: string;
  /** 角色头像URL */
  avatarUrl: string;
  /** 消息内容 */
  content: string;
  /** 是否使用气泡样式，默认为true */
  useChatBubbleStyle?: boolean;
}

/**
 * 纯展示用的聊天气泡组件
 * 不包含任何交互功能，仅用于展示消息
 */
export function DisplayChatBubble({
  roleName,
  avatarUrl,
  content,
  useChatBubbleStyle = true,
}: DisplayChatBubbleProps) {
  return (
    <div>
      {useChatBubbleStyle
        ? (
            <div className="flex w-full items-start gap-1 pb-2">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img
                    src={avatarUrl}
                    alt={roleName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="text-sm text-base-content/85 pb-1">
                  {roleName || "Undefined"}
                </div>
                <div className="max-w-xs sm:max-w-md break-words rounded-lg px-4 py-2 shadow bg-white dark:bg-black">
                  <div className="whitespace-pre-wrap">
                    {content}
                  </div>
                </div>
              </div>
            </div>
          )
        : (
            <div className="flex w-full pb-4">
              {/* 圆角矩形头像 */}
              <div className="flex-shrink-0 mr-3">
                <div className="w-20 h-20 rounded-md overflow-hidden">
                  <img
                    src={avatarUrl}
                    alt={roleName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              {/* 消息内容 */}
              <div className="flex-1 overflow-auto">
                {/* 角色名 */}
                <div className="font-semibold">
                  {roleName || "Undefined"}
                </div>
                <div className="whitespace-pre-wrap">
                  {content}
                </div>
              </div>
            </div>
          )}
    </div>
  );
}
