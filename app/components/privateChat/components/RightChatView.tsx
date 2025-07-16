import type { DirectMessageEvent } from "api/wsModels";
import type {
  MessageDirectResponse,
  MessageDirectSendRequest,
} from "../../../../api";
import { SideDrawerToggle } from "@/components/common/sideDrawer";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ChevronRight, EmojiIcon, Image2Fill, MoreMenu } from "@/icons";
import { useGetMessageDirectPageQuery } from "api/hooks/MessageDirectQueryHooks";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useEffect, useMemo, useRef, useState } from "react";

export default function RightChatView(
  {
    currentContactUserId,
  }: {
    currentContactUserId: number;
  },
) {
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const webSocketUtils = globalContext.websocketUtils;
  const WEBSOCKET_TYPE = 5; // WebSocket 消息类型
  const PAGE_SIZE = 30; // 每页消息数量

  // 当前联系人信息
  const currentContactUserInfo = useGetUserInfoQuery(currentContactUserId || -1).data?.data;
  // 用户输入
  const [messageInput, setMessageInput] = useState("");
  // 与当前联系人的历史消息
  const directMessageQuery = useGetMessageDirectPageQuery(currentContactUserId, PAGE_SIZE);
  // 从 WebSocket 接收到的实时消息
  const receivedMessages = useMemo(() => {
    const userMessages = webSocketUtils.receivedDirectMessages[userId] || []; // senderId 为 userId
    const contactUserMessages = webSocketUtils.receivedDirectMessages[currentContactUserId] || []; // senderId 为 currentContactUserId
    return [...userMessages, ...contactUserMessages];
  }, [webSocketUtils.receivedDirectMessages, userId, currentContactUserId]);

  // 合并历史消息和实时消息
  const allMessages = useMemo(() => {
    return mergeMessages(directMessageQuery.historyMessages, receivedMessages);
  }, [directMessageQuery.historyMessages, receivedMessages]);

  // 发送私聊消息相关
  const send = (message: MessageDirectSendRequest) => webSocketUtils.send({ type: WEBSOCKET_TYPE, data: message }); // 私聊消息发送
  const handleSendMessage = () => {
    if (messageInput.trim() === "")
      return;
    const sendMessage: MessageDirectSendRequest = {
      receiverId: currentContactUserId || -1,
      content: messageInput,
      messageType: 1,
      extra: {},
    };
    send(sendMessage);
    setMessageInput("");
    // 当消息发送到服务器后，服务器会通过 WebSocket 广播给所有在线用户
    // 包括发送者自己也会收到这条消息的回显，无需主动refetch
  };

  // 滚动相关
  const messagesLatestRef = useRef<HTMLDivElement>(null); // 用于滚动到最新消息的引用
  const scrollContainerRef = useRef<HTMLDivElement>(null); // 控制消息列表滚动行为的容器
  // const [showScrollToBottom, setShowScrollToBottom] = useState(false); // 是否显示滚动到底部按钮
  const [isAtBottom, setIsAtBottom] = useState(true); // 是否在底部

  // 检查是否在底部
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
                      onClick={() => loadMoreMessages()}
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
                  msg.senderId === userId
                    ? (
                        <div key={msg.messageId} className="flex items-start justify-end gap-2">
                          <div className="bg-info p-2 rounded-lg">
                            {msg.content}
                          </div>
                          <UserAvatarComponent
                            userId={msg.senderId || -1}
                            width={12}
                            isRounded={true}
                            uniqueKey={`${msg.senderId}${msg.messageId}`}
                          />
                        </div>
                      )
                    : (
                        <div key={msg.messageId} className="flex items-start gap-2">
                          <UserAvatarComponent
                            userId={msg.senderId || -1}
                            width={12}
                            isRounded={true}
                            uniqueKey={`${msg.senderId}${msg.messageId}`}
                          />
                          <div className="bg-base-300 p-2 rounded-lg">
                            {msg.content}
                          </div>
                        </div>
                      )
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
      {currentContactUserId && (
        <div className="h-36 w-full border-t border-base-300 flex flex-col px-6 pt-4 pb-2">
          <div className="flex-1 w-full">
            <textarea
              className="w-full h-full resize-none px-2 py-1 rounded-lg focus:outline-none"
              placeholder="请输入消息内容..."
              onChange={e => setMessageInput(e.target.value)}
              value={messageInput}
            />
          </div>
          <div className="h-12 w-full flex items-center justify-between px-2">
            <div className="h-full flex items-center gap-4">
              <EmojiIcon className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
              <Image2Fill className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
            </div>
            <button
              type="button"
              className="btn btn-info"
              onClick={handleSendMessage}
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function mergeMessages(historyMessages: MessageDirectResponse[], receivedMessages: DirectMessageEvent[]) {
  const messageMap = new Map<number, MessageDirectResponse>();

  historyMessages.forEach(msg => messageMap.set(msg.messageId || 0, msg));
  receivedMessages.forEach(msg => messageMap.set(msg.messageId, msg));

  // 按消息位置排序，确保消息显示顺序正确
  const allMessages = Array.from(messageMap.values())
    .sort((a, b) => (a.messageId ?? 0) - (b.messageId ?? 0))
    .filter(msg => msg.status !== 1);

  return allMessages;
}
