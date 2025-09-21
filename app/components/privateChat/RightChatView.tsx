import type { MessageDirectResponse } from "api/models/MessageDirectResponse";
import type { DirectMessageEvent } from "api/wsModels";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ChevronRight } from "@/icons";
import { useGetInboxMessageWithUserQuery } from "api/hooks/MessageDirectQueryHooks";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import ContextMenu from "./components/ContextMenu";
import MessageBubble from "./components/MessageBubble";
import MessageInput from "./components/MessageInput";
import UserSearch from "./components/UserSearch";
import { useContextMenu } from "./hooks/useContextMenu";
import { usePrivateMessageSender } from "./hooks/usePrivateMessageSender";

export default function RightChatView({ setIsOpenLeftDrawer }: { setIsOpenLeftDrawer: (isOpen: boolean) => void }) {
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const webSocketUtils = globalContext.websocketUtils;

  const { targetUserId: urlTargetUserId, roomId: urlRoomId } = useParams();
  // 当前联系人信息
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : (urlTargetUserId ? Number.parseInt(urlTargetUserId) : null);
  const currentContactUserInfo = useGetUserInfoQuery(currentContactUserId || -1).data?.data;

  // 当前选中联系人从 WebSocket 接收到的实时消息
  const currentContactMessages = useMemo(() => {
    if (!currentContactUserId)
      return [];
    const userMessages = webSocketUtils.receivedDirectMessages[userId] || []; // senderId 为 userId
    const contactUserMessages = webSocketUtils.receivedDirectMessages[currentContactUserId] || []; // senderId 为 currentContactUserId
    // 筛选出与当前联系人相关的消息
    const filteredUserMessages = userMessages.filter(msg =>
      msg.receiverId === currentContactUserId, // 用户发给当前联系人的消息
    );
    const filteredContactMessages = contactUserMessages.filter(msg =>
      msg.senderId === currentContactUserId && msg.receiverId === userId, // 当前联系人发给用户的消息
    );
    return [...filteredUserMessages, ...filteredContactMessages];
  }, [webSocketUtils.receivedDirectMessages, userId, currentContactUserId]);

  const historyMessages = useGetInboxMessageWithUserQuery(userId, currentContactUserId || -1);

  // 合并历史消息和实时消息
  const allMessages = useMemo(() => {
    return mergeMessages(historyMessages.data ?? [], currentContactMessages);
  }, [historyMessages.data, currentContactMessages]);

  // 消息发送hook
  const {
    messageInput,
    setMessageInput,
    imgFiles,
    updateImgFiles,
    emojiUrls,
    updateEmojiUrls,
    handleSendMessage,
  } = usePrivateMessageSender({
    webSocketUtils,
    userId,
    currentContactUserId,
  });

  // 滚动相关
  const messagesLatestRef = useRef<HTMLDivElement>(null); // 用于滚动到最新消息的引用
  const scrollContainerRef = useRef<HTMLDivElement>(null); // 控制消息列表滚动行为的容器
  // const [showScrollToBottom, setShowScrollToBottom] = useState(false); // 是否显示滚动到底部按钮
  const [isAtBottom, setIsAtBottom] = useState(false); // 是否在底部

  // 检查是否在底部并处理未读消息
  const checkScrollPosition = useCallback(() => {
    if (!scrollContainerRef.current)
      return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
  }, []);

  // 开启监听滚动事件
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container)
      return;

    container.addEventListener("scroll", checkScrollPosition);
    return () => container.removeEventListener("scroll", checkScrollPosition);
  }, [checkScrollPosition]);

  // 滚动到底部
  const scrollToBottom = (smooth = false) => {
    if (messagesLatestRef.current) {
      messagesLatestRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  // 切换联系人时滚动到底部
  useEffect(() => {
    // 等待消息加载完成
    if (currentContactUserId && allMessages.length > 0) {
      scrollToBottom(false);
    }
  }, [currentContactUserId, allMessages.length]);

  // 有新消息时自动滚动到底部。只有当用户在底部时才自动滚动，避免打断用户查看历史消息
  useEffect(() => {
    if (isAtBottom && allMessages.length > 0) {
      const timeoutId = setTimeout(() => scrollToBottom(true), 100); // 使用 setTimeout 确保 DOM 更新完成后再滚动
      return () => clearTimeout(timeoutId);
    }
  }, [allMessages.length, isAtBottom]);

  // 如果有新消息且不在底部，显示滚动到底部按钮

  const { contextMenu, setContextMenu, handleContextMenu, handleRevokeMessage } = useContextMenu();

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

function mergeMessages(historyMessages: MessageDirectResponse[], currentContactMessages: DirectMessageEvent[]) {
  const messageMap = new Map<number, MessageDirectResponse>();

  historyMessages.forEach(msg => messageMap.set(msg.messageId || 0, msg));
  currentContactMessages.forEach(msg => messageMap.set(msg.messageId, msg));

  // 按消息位置排序，确保消息显示顺序正确
  const allMessages = Array.from(messageMap.values())
    .sort((a, b) => (a.messageId ?? 0) - (b.messageId ?? 0))
    .filter(msg => msg.messageType !== 10000);

  return allMessages;
}
