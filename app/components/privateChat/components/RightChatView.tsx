import type { MessageDirectResponse } from "api/models/MessageDirectResponse";
import type { DirectMessageEvent } from "api/wsModels";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ChevronRight } from "@/icons";
import { useGetMessageDirectPageQuery, useRecallMessageDirectMutation } from "api/hooks/MessageDirectQueryHooks";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { usePrivateMessageSender } from "../hooks/usePrivateMessageSender";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

export default function RightChatView({ setIsOpenLeftDrawer }: { setIsOpenLeftDrawer: (isOpen: boolean) => void }) {
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const webSocketUtils = globalContext.websocketUtils;
  const PAGE_SIZE = 30; // 每页消息数量

  const { targetUserId: urlTargetUserId, roomId: urlRoomId } = useParams();
  // 当前联系人信息
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : (urlTargetUserId ? Number.parseInt(urlTargetUserId) : null);
  const currentContactUserInfo = useGetUserInfoQuery(currentContactUserId || -1).data?.data;

  // 与当前联系人的历史消息
  const directMessageQuery = useGetMessageDirectPageQuery(currentContactUserId || -1, PAGE_SIZE);

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

  // 合并历史消息和实时消息
  const allMessages = useMemo(() => {
    return mergeMessages(directMessageQuery.historyMessages, currentContactMessages);
  }, [directMessageQuery.historyMessages, currentContactMessages]);

  // 使用自定义hook处理消息发送
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

  // 加载更多历史消息
  const loadMoreMessages = useCallback(() => {
    directMessageQuery.fetchNextPage();
  }, [directMessageQuery]);

  // 滚动相关
  const messagesLatestRef = useRef<HTMLDivElement>(null); // 用于滚动到最新消息的引用
  const scrollContainerRef = useRef<HTMLDivElement>(null); // 控制消息列表滚动行为的容器
  // const [showScrollToBottom, setShowScrollToBottom] = useState(false); // 是否显示滚动到底部按钮
  const [isAtBottom, setIsAtBottom] = useState(false); // 是否在底部
  // 保持滚动位置
  const prevScrollHeightRef = useRef(0);

  // 检查是否在底部并处理未读消息，同时处理自动加载
  const checkScrollPosition = useCallback(() => {
    if (!scrollContainerRef.current)
      return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);

    const atTop = scrollTop < 10;

    if (atTop && !directMessageQuery.isLastPage && !directMessageQuery.isFetchingNextPage) {
      loadMoreMessages();
    }
  }, [directMessageQuery.isLastPage, directMessageQuery.isFetchingNextPage, loadMoreMessages]);

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
    if (currentContactUserId && allMessages.length > 0 && !directMessageQuery.isLoading) {
      scrollToBottom(false);
    }
  }, [currentContactUserId, allMessages.length, directMessageQuery.isLoading]);

  // 处理加载更多消息时的滚动位置保持
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container)
      return;

    // 保存当前滚动高度（开始加载时）
    if (directMessageQuery.isFetchingNextPage && prevScrollHeightRef.current === 0) {
      prevScrollHeightRef.current = container.scrollHeight;
    }

    // 加载完成后恢复滚动位置
    if (!directMessageQuery.isFetchingNextPage && prevScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight;
      const heightDiff = newScrollHeight - prevScrollHeightRef.current;
      container.scrollTop = heightDiff;
      prevScrollHeightRef.current = 0;
    }
  }, [directMessageQuery.isFetchingNextPage, allMessages.length]);

  // 有新消息时自动滚动到底部。只有当用户在底部时才自动滚动，避免打断用户查看历史消息
  useEffect(() => {
    if (isAtBottom && allMessages.length > 0) {
      const timeoutId = setTimeout(() => scrollToBottom(true), 100); // 使用 setTimeout 确保 DOM 更新完成后再滚动
      return () => clearTimeout(timeoutId);
    }
  }, [allMessages.length, isAtBottom]);

  // 如果有新消息且不在底部，显示滚动到底部按钮

  /**
   * 右键菜单
   */
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number } | null>(null);
  const recallMessageMutation = useRecallMessageDirectMutation();
  function handleRevokeMessage(messageId: number) {
    recallMessageMutation.mutate(messageId, {
      onSuccess: () => {
        // 强制刷新并清除缓存
        directMessageQuery.refetch();
      },
    });
  }
  function handleContextMenu(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const messageElement = target.closest("[data-message-id]");
    const messageId = Number(messageElement?.getAttribute("data-message-id"));
    if (messageId) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, messageId });
    }
  }

  return (
    <div
      className="flex-1 bg-base-100 border-l border-base-300 flex flex-col"
      onContextMenu={handleContextMenu}
      onClick={() => setContextMenu(null)}
    >
      {/* 聊天顶部栏 */}
      <div className="h-10 w-full bg-base-100 border-b border-base-300 flex items-center px-4 relative">
        <ChevronRight
          onClick={() => setIsOpenLeftDrawer(true)}
          className="size-6 sm:hidden"
        />
        <span className="text-center font-semibold line-clamp-1 absolute left-1/2 transform -translate-x-1/2">
          {currentContactUserInfo ? `${currentContactUserInfo.username}` : "请选择联系人"}
        </span>
        {/* <span className="absolute right-0 transform -translate-x-4">
          <MoreMenu className="size-6 cursor-pointer rotate-90" />
        </span> */}
      </div>

      {/* 聊天消息区域 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-auto p-4 relative"
      >
        {currentContactUserId
          ? (
              // 会溢出的消息列表容器
              <div className="space-y-4">
                {/* 加载更多按钮 */}
                {!directMessageQuery.isLastPage && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={loadMoreMessages}
                      disabled={directMessageQuery.isFetchingNextPage}
                      className="btn btn-sm btn-ghost"
                    >
                      {directMessageQuery.isFetchingNextPage
                        ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                            </>
                          )
                        : null}
                    </button>
                  </div>
                )}

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
              <div className="flex items-center justify-center w-full h-full text-gray-500">
                快找小伙伴聊天吧💬
              </div>
            )}
      </div>

      {/* 输入区域 */}
      <MessageInput
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
      {contextMenu && (() => {
        const message = allMessages.find(msg => msg.messageId === contextMenu.messageId);
        return (
          <div
            className="fixed bg-base-100 shadow-lg rounded-md z-50"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <ul className="menu p-2 w-40">
              {message?.senderId === userId && (
                <li>
                  <a onClick={(e) => {
                    e.preventDefault();
                    handleRevokeMessage(contextMenu.messageId);
                    setContextMenu(null);
                  }}
                  >
                    撤回
                  </a>
                </li>
              )}
              <li>
                <a onClick={(e) => {
                  e.preventDefault();
                  setContextMenu(null);
                }}
                >
                  回复
                </a>
              </li>
            </ul>
          </div>
        );
      })()}
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
    .filter(msg => msg.status !== 1);

  return allMessages;
}
