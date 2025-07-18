import type { useGetMessageDirectPageQuery } from "api/hooks/MessageDirectQueryHooks";
import type { MessageDirectResponse } from "../../../../api";
import { SideDrawerToggle } from "@/components/common/sideDrawer";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ChevronRight, MoreMenu } from "@/icons";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useEffect, useRef, useState } from "react";

import { usePrivateMessageSender } from "../hooks/usePrivateMessageSender";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

export default function RightChatView(
  {
    currentContactUserId,
    allMessages,
    directMessageQuery,
  }: {
    currentContactUserId: number | null;
    allMessages: MessageDirectResponse[];
    directMessageQuery: ReturnType<typeof useGetMessageDirectPageQuery>;
  },
) {
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const webSocketUtils = globalContext.websocketUtils;

  // 当前联系人信息
  const currentContactUserInfo = useGetUserInfoQuery(currentContactUserId || -1).data?.data;

  // 使用自定义hook处理消息发送
  const {
    messageInput,
    setMessageInput,
    imgFiles,
    updateImgFiles,
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
  const checkIfAtBottom = () => {
    if (!scrollContainerRef.current)
      return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px容差
    setIsAtBottom(atBottom);
    // setShowScrollToBottom(!atBottom && allMessages.length > 0);
  };

  // 开启监听滚动事件
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container)
      return;

    container.addEventListener("scroll", checkIfAtBottom);
    return () => container.removeEventListener("scroll", checkIfAtBottom);
  });

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
    const timeoutId = setTimeout(() => scrollToBottom(false), 0);
    return () => clearTimeout(timeoutId);
  }, [currentContactUserId]);

  // 有新消息时自动滚动到底部。只有当用户在底部时才自动滚动，避免打断用户查看历史消息
  useEffect(() => {
    if (isAtBottom && allMessages.length > 0) {
      const timeoutId = setTimeout(() => scrollToBottom(true), 100); // 使用 setTimeout 确保 DOM 更新完成后再滚动
      return () => clearTimeout(timeoutId);
    }
  }, [allMessages.length, isAtBottom]);

  // 如果有新消息且不在底部，显示滚动到底部按钮

  // 加载更多历史消息
  const loadMoreMessages = () => {
    directMessageQuery.fetchNextPage();
  };

  return (
    <div className="flex-1 bg-base-100 border-l border-base-300 flex flex-col">
      {/* 聊天顶部栏 */}
      <div className="h-10 w-full bg-base-100 border-b border-base-300 flex items-center px-4 relative">
        <SideDrawerToggle htmlFor="private-chat">
          <ChevronRight className="size-6" />
        </SideDrawerToggle>
        <span className="absolute left-1/2 transform -translate-x-1/2">
          {currentContactUserInfo ? `${currentContactUserInfo.username}` : "选择联系人"}
        </span>
        <span className="absolute right-0 transform -translate-x-4">
          <MoreMenu className="size-6 cursor-pointer rotate-90" />
        </span>
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
                              加载中...
                            </>
                          )
                        : (
                            "加载更多历史消息"
                          )}
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
                请选择一个联系人开始聊天
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
      />
    </div>
  );
}
