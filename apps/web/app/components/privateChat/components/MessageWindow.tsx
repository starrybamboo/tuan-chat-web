import { useScroll } from "../hooks/useScroll";
import { buildPrivateChatTimelineEntries } from "../utils/privateChatTimeline";
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
  const timelineEntries = buildPrivateChatTimelineEntries(allMessages);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 w-full overflow-auto p-4 relative bg-base-100"
    >
      {currentContactUserId
      // 1. 与当前联系人的聊天页面
        ? (
            <div key={currentContactUserId} className="
              private-direct-message-list-entry flex flex-col gap-1 px-1 py-2
            ">
              {/* 消息列表项 */}
              {timelineEntries.map((entry, index) => {
                if (entry.type === "date-divider") {
                  return (
                    <div
                      key={`date-divider-${index}-${entry.label}`}
                      className="
                        flex items-center gap-3 py-3 text-xs
                        text-base-content/45
                      "
                    >
                      <div className="h-px flex-1 bg-base-content/10" />
                      <span className="
                        shrink-0 rounded-full bg-base-200 px-3 py-1 font-medium
                        tracking-wide
                      ">
                        {entry.label}
                      </span>
                      <div className="h-px flex-1 bg-base-content/10" />
                    </div>
                  );
                }

                const groupedWithPrevious = isSameSender(allMessages[entry.messageIndex - 1], entry.message);
                return (
                  <MessageBubble
                    key={entry.message.messageId}
                    message={entry.message}
                    isOwn={entry.message.senderId === userId}
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
