import type { useGetMessageDirectPageQuery } from "api/hooks/MessageDirectQueryHooks";
import type {
  MessageDirectResponse,
  MessageDirectSendRequest,
} from "../../../../api";
import BetterImg from "@/components/common/betterImg";
import { SideDrawerToggle } from "@/components/common/sideDrawer";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ChevronRight, MoreMenu } from "@/icons";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
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
  const WEBSOCKET_TYPE = 5; // WebSocket 私聊消息类型
  const uploadUtils = new UploadUtils(2);

  // 当前联系人信息
  const currentContactUserInfo = useGetUserInfoQuery(currentContactUserId || -1).data?.data;
  // 用户输入
  const [messageInput, setMessageInput] = useState("");
  // 聊天框中包含的图片
  const [imgFiles, updateImgFiles] = useImmer<File[]>([]);
  // 发送状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 发送私聊消息相关
  const send = (message: MessageDirectSendRequest) => webSocketUtils.send({ type: WEBSOCKET_TYPE, data: message }); // 私聊消息发送
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && imgFiles.length === 0) || isSubmitting || !currentContactUserId)
      return;

    setIsSubmitting(true);

    // 发送图片消息
    if (imgFiles.length > 0) {
      for (let i = 0; i < imgFiles.length; i++) {
        const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
        // 获取到图片的宽高
        const { width, height } = await getImageSize(imgFiles[i]);
        // 如果有图片，发送独立的图片消息
        if (imgDownLoadUrl && imgDownLoadUrl !== "") {
          const imageMessage: MessageDirectSendRequest = {
            receiverId: currentContactUserId,
            content: "",
            messageType: 2, // 图片消息类型
            extra: {
              size: 0,
              url: imgDownLoadUrl,
              fileName: imgDownLoadUrl.split("/").pop() || `${userId}-${Date.now()}`,
              width,
              height,
            },
          };
          send(imageMessage);
        }
      }
    }
    updateImgFiles([]);

    // 发送文本消息
    if (messageInput.trim() !== "") {
      const sendMessage: MessageDirectSendRequest = {
        receiverId: currentContactUserId,
        content: messageInput,
        messageType: 1,
        extra: {},
      };
      send(sendMessage); // 当消息发送到服务器后，服务器会通过 WebSocket 广播给所有在线用户
      setMessageInput(""); // 包括发送者自己也会收到这条消息的回显，无需主动refetch
    }

    setIsSubmitting(false);
  };

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

  // 渲染消息内容（文本或图片）
  const renderMessageContent = (msg: MessageDirectResponse) => {
    if (msg.messageType === 2) {
      // 图片消息
      const imgData = msg.extra?.imageMessage;
      return (
        <div>
          <BetterImg
            src={imgData?.url}
            size={{ width: imgData?.width, height: imgData?.height }}
            className="max-h-[40vh] max-w-[300px] rounded-lg"
          />
        </div>
      );
    }
    else {
      // 文本消息
      return (
        <div className="whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      );
    }
  };

  // 获取消息气泡的样式类，图片消息需要特殊处理
  const getMessageBubbleClass = (msg: MessageDirectResponse, isOwn: boolean) => {
    const baseClass = isOwn
      ? "bg-info text-info-content rounded-lg max-w-[70%]"
      : "bg-base-300 text-base-content rounded-lg max-w-[70%]";

    if (msg.messageType === 2) {
      // 图片消息减少内边距
      return `${baseClass} px-2 pt-2`;
    }
    else {
      // 文本消息正常内边距
      return `${baseClass} p-2`;
    }
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
                  msg.senderId === userId
                    ? (
                        <div key={msg.messageId} className="flex items-start justify-end gap-2">
                          <div className={getMessageBubbleClass(msg, true)}>
                            {renderMessageContent(msg)}
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
                          <div className={getMessageBubbleClass(msg, false)}>
                            {renderMessageContent(msg)}
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
