import { useScroll } from "../hooks/useScroll";
import MessageBubble from "./MessageBubble";
import UserSearch from "./UserSearch";

function isSameSender(previousMessage: any | undefined, message: any) {
  return previousMessage?.senderId != null && previousMessage.senderId === message.senderId;
}

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
            <div key={currentContactUserId} className="private-direct-message-list-entry flex flex-col gap-1 px-1 py-2">
              {/* 消息列表项 */}
              {allMessages.map((msg, index) => {
                const groupedWithPrevious = isSameSender(allMessages[index - 1], msg);
                return (
                  <MessageBubble
                    key={msg.messageId}
                    message={msg}
                    isOwn={msg.senderId === userId}
                    groupedWithPrevious={groupedWithPrevious}
                  />
                );
              })}

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
