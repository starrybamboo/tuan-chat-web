import { useScroll } from "../hooks/useScroll";
import MessageBubble from "./MessageBubble";
import UserSearch from "./UserSearch";

export default function MessageWindow({
  currentContactUserId,
  allMessages,
  userId,
}: {
  currentContactUserId: number | null;
  allMessages: any[];
  userId: number;
}) {
  // 消息列表滚动hook（消息）
  const { scrollContainerRef, messagesLatestRef } = useScroll({ currentContactUserId, allMessages });

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 w-full overflow-auto p-4 relative bg-base-100"
    >
      {currentContactUserId
      // 1. 与当前联系人的聊天页面
        ? (
            <div className="space-y-4">
              {/* 消息列表项 */}
              {allMessages.map(msg => (
                <MessageBubble
                  key={msg.messageId}
                  message={msg}
                  isOwn={msg.senderId === userId}
                />
              ))}

              {/* 滚动锚点 */}
              <div ref={messagesLatestRef} />
            </div>
          )
        : (
      // 搜索用户
            <UserSearch />
          )}
    </div>
  );
}
