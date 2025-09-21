import { useGlobalContext } from "@/components/globalContextProvider";
import { ChevronRight } from "@/icons";
import { useGetInboxMessageWithUserQuery } from "api/hooks/MessageDirectQueryHooks";
import { useParams } from "react-router";
import ContextMenu from "./components/ContextMenu";
import MessageBubble from "./components/MessageBubble";
import MessageInput from "./components/MessageInput";
import UserSearch from "./components/UserSearch";
import { useContextMenu } from "./hooks/useContextMenu";
import { usePrivateMessageReceiver } from "./hooks/usePrivateMessageRecever";
import { usePrivateMessageSender } from "./hooks/usePrivateMessageSender";
import { useScroll } from "./hooks/useScroll";

export default function RightChatView({ setIsOpenLeftDrawer }: { setIsOpenLeftDrawer: (isOpen: boolean) => void }) {
  const globalContext = useGlobalContext();
  const webSocketUtils = globalContext.websocketUtils;
  const userId = globalContext.userId || -1;
  const { targetUserId: urlTargetUserId, roomId: urlRoomId } = useParams();
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : (urlTargetUserId ? Number.parseInt(urlTargetUserId) : null);

  // 历史消息hook
  const { historyMessages, refetch } = useGetInboxMessageWithUserQuery(userId, currentContactUserId || -1);
  const { currentContactUserInfo, allMessages } = usePrivateMessageReceiver(userId, currentContactUserId, historyMessages);

  // 消息发送hook
  const { messageInput, setMessageInput, imgFiles, updateImgFiles, emojiUrls, updateEmojiUrls, handleSendMessage } = usePrivateMessageSender({ webSocketUtils, userId, currentContactUserId });

  // 消息列表滚动hook
  const { scrollContainerRef, messagesLatestRef } = useScroll({ currentContactUserId, allMessages });

  // 右键菜单hook
  const { contextMenu, setContextMenu, handleContextMenu, handleRevokeMessage } = useContextMenu({ refetch });

  return (
    <div
      className="flex-1 bg-base-100 border-l border-base-300 flex flex-col"
      onContextMenu={handleContextMenu}
      onClick={() => setContextMenu(null)}
    >
      {/* 顶部信息栏 */}
      <div className="h-10 w-full bg-base-100 border-b border-base-300 flex items-center px-4 relative">
        <ChevronRight
          onClick={() => setIsOpenLeftDrawer(true)}
          className="size-6 sm:hidden"
        />
        <span className="text-center font-semibold line-clamp-1 absolute left-1/2 transform -translate-x-1/2">
          {currentContactUserInfo ? `${currentContactUserInfo.username}` : "好友"}
        </span>
      </div>
      {/* 聊天消息区域 */}
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

      {/* 输入区域 */}
      <MessageInput
        key={currentContactUserId}
        currentContactUserId={currentContactUserId}
        setMessageInput={setMessageInput}
        messageInput={messageInput}
        handleSendMessage={handleSendMessage}
        imgFiles={imgFiles}
        updateImgFiles={updateImgFiles}
        emojiUrls={emojiUrls}
        updateEmojiUrls={updateEmojiUrls}
      />
      {/* 右键菜单 */}
      <ContextMenu
        allMessages={allMessages}
        userId={userId}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        handleRevokeMessage={handleRevokeMessage}
      />
    </div>
  );
}
