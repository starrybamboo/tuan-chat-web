import type {
  ChatMessagePageRequest,
  ChatMessageRequest,
  ChatMessageResponse,
  FeedRequest,
  Message,
} from "../../../api";
import { ChatBubble } from "@/components/chat/chatBubble";
import { RoomContext } from "@/components/chat/roomContext";
import ForwardWindow from "@/components/chat/window/forwardWindow";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import React, { use, useEffect, useMemo, useRef, useState } from "react";
import {
  useDeleteMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";
import { usePublishFeedMutation } from "../../../api/hooks/FeedQueryHooks";
import { tuanchat } from "../../../api/instance";

export default function ChatFrame({ useChatBubbleStyle, chatFrameRef }:
{ useChatBubbleStyle: boolean; chatFrameRef: React.RefObject<HTMLDivElement> }) {
  // const chatFrameRef = useRef<HTMLDivElement>(null);
  // 滚动加载逻辑, 设置为倒数第n条消息的ref, 当这条消息进入用户窗口时, messageEntry.isIntersecting变为true, 之后启动滚动加载
  const [messageRef, messageEntry] = useIntersectionObserver();
  // 在顶部也设置一个，保险
  const [topMessageRef, topMessageEntry] = useIntersectionObserver();
  const PAGE_SIZE = 30; // 每页消息数量
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const curRoleId = roomContext.curRoleId ?? -1;
  const curAvatarId = roomContext.curAvatarId ?? -1;

  const websocketUtils = useGlobalContext().websocketUtils;
  const getNewMessagesByRoomId = websocketUtils.getNewMessagesByRoomId;
  const send = websocketUtils.send;
  const [isForwardWindowOpen, setIsForwardWindowOpen] = useState(false);

  // Mutations
  // const moveMessageMutation = useMoveMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const publishFeedMutation = usePublishFeedMutation();
  const updateMessageMutation = useUpdateMessageMutation();
  /**
   * 获取历史消息
   */
  // 分页获取消息
  // cursor用于获取当前的消息列表, 在往后端的请求中, 第一次发送null, 然后接受后端返回的cursor作为新的值
  const messagesInfiniteQuery = useInfiniteQuery({
    queryKey: ["getMsgPage", roomId],
    queryFn: async ({ pageParam }) => {
      return tuanchat.chatController.getMsgPage(pageParam);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data === undefined || lastPage.data?.isLast) {
        return undefined;
      }
      else {
        const params: ChatMessagePageRequest = { roomId, pageSize: PAGE_SIZE, cursor: lastPage.data?.cursor };
        return params;
      }
    },
    initialPageParam: { roomId, pageSize: PAGE_SIZE, cursor: null } as unknown as ChatMessagePageRequest,
    refetchOnWindowFocus: false,
  });
  // 合并所有分页消息 同时更新重复的消息
  const historyMessages: ChatMessageResponse[] = useMemo(() => {
    const historyMessages = (messagesInfiniteQuery.data?.pages.reverse().flatMap(p => p.data?.list ?? []) ?? []);
    const messageMap = new Map<number, ChatMessageResponse>();

    const receivedMessages = getNewMessagesByRoomId(roomId);
    // 这是为了更新历史消息(ws发过来的消息有可能是带有相同的messageId的, 代表消息的更新)
    historyMessages.forEach(msg => messageMap.set(msg.message.messageID, msg));
    receivedMessages.forEach(msg => messageMap.set(msg.message.messageID, msg));

    return Array.from(messageMap.values())
      .sort((a, b) => a.message.position - b.message.position)
    // 过滤掉删除的消息和不符合规则的消息
      .filter(msg => msg.message.status !== 1)
      .reverse();
  }, [getNewMessagesByRoomId, roomId, messagesInfiniteQuery.data?.pages]);
  /**
   * scroll相关
   */
  useEffect(() => {
    if (chatFrameRef.current) {
      if (chatFrameRef.current.scrollTop >= -80) {
        chatFrameRef.current.scrollTo({ top: 0, behavior: "instant" });
      }
    }
  }, [chatFrameRef, historyMessages]);
  useEffect(() => {
    if ((messageEntry?.isIntersecting || topMessageEntry?.isIntersecting) && !messagesInfiniteQuery.isFetchingNextPage) {
      messagesInfiniteQuery.fetchNextPage();
    }
  }, [messageEntry?.isIntersecting, topMessageEntry?.isIntersecting, messagesInfiniteQuery.isFetchingNextPage, messagesInfiniteQuery.fetchNextPage, messagesInfiniteQuery]);
  /**
   * 消息选择
   */
  const [selectedMessageIds, updateSelectedMessageIds] = useState<Set<number>>(new Set());
  const isSelecting = selectedMessageIds.size > 0;

  const toggleMessageSelection = (messageId: number) => {
    updateSelectedMessageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      }
      else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  function handleForward(forwardRoomId: number) {
    const forwardMessages = Array.from(selectedMessageIds)
      .map(id => historyMessages.find(m => m.message.messageID === id))
      .filter((msg): msg is ChatMessageResponse => msg !== undefined);
    const forwardMessageRequest: ChatMessageRequest = {
      roomId: forwardRoomId,
      roleId: curRoleId,
      content: "",
      avatarId: curAvatarId,
      messageType: 5,
      body: {
        messageList: forwardMessages,
      },
    };
    send(forwardMessageRequest);
    setIsForwardWindowOpen(false);
    updateSelectedMessageIds(new Set());
  }
  function toggleBackground(messageId: number) {
    const message = historyMessages.find(m => m.message.messageID === messageId)?.message;
    if (!message || !message.extra?.imageMessage)
      return;
    updateMessageMutation.mutate({
      ...message,
      extra: { imageMessage: { background: !message.extra.imageMessage.background, size: message?.extra?.imageMessage.size ?? 0, fileName: message.extra.imageMessage.fileName, url: message.extra.imageMessage.url } },
    });
  }
  function handlePublishFeed({ title, description }: { title: string; description: string }) {
    const feedRequest: FeedRequest = {
      messageId: selectedMessageIds.values().next().value,
      title: title || "default",
      description: description || "default",
    };
    publishFeedMutation.mutate(feedRequest);
    setIsForwardWindowOpen(false);
    updateSelectedMessageIds(new Set());
  }
  /**
   * 聊天气泡拖拽排序
   */
  // -1 代表未拖动
  const dragStartMessageIdRef = useRef(-1);
  const isDragging = dragStartMessageIdRef.current >= 0;
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  // before代表拖拽到元素上半，after代表拖拽到元素下半
  const dropPositionRef = useRef<"before" | "after">("before");
  const curDragOverMessageRef = useRef<HTMLDivElement | null>(null);
  function checkPosition(e: React.DragEvent<HTMLDivElement>) {
    if (dragStartMessageIdRef.current === -1) {
      return;
    }
    const target = e.currentTarget;
    curDragOverMessageRef.current = target;
    const rect = target.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    const indicator = document.createElement("div");
    indicator.className = "drag-indicator absolute left-0 right-0 h-0.5 bg-info pointer-events-none";
    indicator.style.zIndex = "50";
    if (relativeY < rect.height / 2) {
      indicator.style.top = "0";
      dropPositionRef.current = "before";
    }
    else {
      indicator.style.top = "0";
      dropPositionRef.current = "after";
    }
    indicatorRef.current?.remove();
    curDragOverMessageRef.current?.appendChild(indicator);
    indicatorRef.current = indicator;
  }
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    dragStartMessageIdRef.current = historyMessages[index].message.messageID;
    // 设置拖动预览图像
    const parent = e.currentTarget.parentElement!;
    let clone: HTMLElement;
    // 创建拖拽预览元素
    if (isSelecting && selectedMessageIds.size > 0) {
      clone = document.createElement("div");
      clone.className = "p-2 bg-info text-info-content rounded";
      clone.textContent = `移动${selectedMessageIds.size}条消息`;
    }
    else {
      clone = parent.cloneNode(true) as HTMLElement;
    }
    clone.style.width = `${e.currentTarget.offsetWidth}px`;
    clone.style.position = "fixed";
    clone.style.top = "-9999px";
    clone.style.width = `${parent.offsetWidth}px`; // 使用父元素实际宽度
    clone.style.opacity = "0.5";
    clone.onwheel = (e) => {
      chatFrameRef.current.scrollTop += e.deltaY;
    };
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, 0, 0);
    setTimeout(() => document.body.removeChild(clone));
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    checkPosition(e);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    curDragOverMessageRef.current = null;
  };
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dragEndIndex: number) => {
    e.preventDefault();
    curDragOverMessageRef.current = null;

    const adjustedIndex = dropPositionRef.current === "after" ? dragEndIndex : dragEndIndex + 1;

    // 如果是多选状态，则对选中的所有消息进行移动
    if (isSelecting && selectedMessageIds.size > 0) {
      const selectedMessages = Array.from(selectedMessageIds)
        .map(id => historyMessages.find(m => m.message.messageID === id)?.message)
        .filter((msg): msg is Message => msg !== undefined)
        .sort((a, b) => a.position - b.position);
      // 多选情况下，寻找到不位于selectMessageIds中且离dropPosition最近的消息
      let topMessageIndex: number = adjustedIndex;
      let bottomMessageIndex: number = adjustedIndex - 1;
      while (selectedMessageIds.has(historyMessages[topMessageIndex]?.message.messageID)) {
        topMessageIndex++;
      }
      while (selectedMessageIds.has(historyMessages[bottomMessageIndex]?.message.messageID)) {
        bottomMessageIndex--;
      }
      const topMessagePosition = historyMessages[topMessageIndex]?.message.position
        ?? historyMessages[historyMessages.length - 1].message.position - 1;
      const bottomMessagePosition = historyMessages[bottomMessageIndex]?.message.position
        ?? historyMessages[0].message.position + 1;

      for (const selectedMessage of selectedMessages) {
        const index = selectedMessages.indexOf(selectedMessage);
        updateMessageMutation.mutate({
          ...selectedMessage,
          position: (bottomMessagePosition - topMessagePosition) / (selectedMessages.length + 1) * (index + 1) + topMessagePosition,
        });
      }
    }
    else {
      const beforeMessage = historyMessages[adjustedIndex]?.message;
      const afterMessage = historyMessages[adjustedIndex - 1]?.message;
      const beforeMessageId = beforeMessage?.messageID ?? null;
      const afterMessageId = afterMessage?.messageID ?? null;
      if (beforeMessageId !== dragStartMessageIdRef.current && afterMessageId !== dragStartMessageIdRef.current) {
        tuanchat.chatController.moveMessage({
          messageId: dragStartMessageIdRef.current,
          beforeMessageId,
          afterMessageId,
        });
      }
    }
    dragStartMessageIdRef.current = -1;
    indicatorRef.current?.remove();
  };
  /**
   * 右键菜单
   */
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number } | null>(null);
  function handleDelete() {
    deleteMessageMutation.mutate(contextMenu?.messageId ?? -1);
  }
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    // 向上查找包含data-message-id属性的父元素
    const messageElement = target.closest("[data-message-id]");
    setContextMenu({ x: e.clientX, y: e.clientY, messageId: Number(messageElement?.getAttribute("data-message-id")) });
  }

  function handleBatchDelete() {
    for (const messageId of selectedMessageIds) {
      deleteMessageMutation.mutate(messageId);
    }
    updateSelectedMessageIds(new Set());
  }
  // 关闭右键菜单
  function closeContextMenu() {
    setContextMenu(null);
  }

  const renderMessages = useMemo(() => (historyMessages
  // .filter(chatMessageResponse => chatMessageResponse.message.content !== "")
    .map((chatMessageResponse, index) => {
      const isSelected = selectedMessageIds.has(chatMessageResponse.message.messageID);
      return ((
        <div
          key={chatMessageResponse.message.messageID}
          ref={index === historyMessages.length - 7 ? messageRef : (index === historyMessages.length - 1 ? topMessageRef : null)}
          className={`relative group transition-opacity ${isSelected ? "bg-info-content/40" : ""} -my-[5px] ${isDragging ? "pointer-events-auto" : ""}\``}
          data-message-id={chatMessageResponse.message.messageID}
          onClick={(e) => {
            if (isSelecting || e.ctrlKey) {
              toggleMessageSelection(chatMessageResponse.message.messageID);
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, index)}
          draggable={isSelecting}
          onDragStart={e => handleDragStart(e, index)}
          // onDragEnd={() => handleDragEnd()}
        >
          <div
            className={`absolute left-0 ${useChatBubbleStyle ? "bottom-[30px]" : "top-[30px]"}
                      -translate-x-full -translate-y-1/ opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-2 cursor-move`}
            draggable
            onDragStart={e => handleDragStart(e, index)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </div>
          <ChatBubble chatMessageResponse={chatMessageResponse} />
        </div>
      )
      );
    })), [handleDrop, historyMessages, isSelecting, messageRef, selectedMessageIds, useChatBubbleStyle]);

  return (
    <>
      {/* 这里是从下到上渲染的 */}
      <div
        className="card-body overflow-y-auto h-[60vh] flex flex-col-reverse"
        ref={chatFrameRef}
        onContextMenu={handleContextMenu}
        onClick={closeContextMenu}
      >
        {renderMessages}
        {selectedMessageIds.size > 0 && (
          <div className="sticky top-0 bg-base-300 p-2 shadow-sm z-10 flex justify-between items-center rounded">
            <span>{`已选择${selectedMessageIds.size} 条消息`}</span>
            <div className="gap-x-4 flex">
              <button
                className="btn btn-sm btn"
                onClick={() => updateSelectedMessageIds(new Set())}
                type="button"
              >
                取消
              </button>
              <button
                className="btn btn-sm btn-info"
                onClick={() => setIsForwardWindowOpen(true)}
                type="button"
              >
                转发
              </button>
              <button
                className="btn btn-sm btn-error"
                onClick={() => handleBatchDelete()}
                type="button"
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>
      <PopWindow isOpen={isForwardWindowOpen} onClose={() => setIsForwardWindowOpen(false)}>
        <ForwardWindow onClickRoom={roomId => handleForward(roomId)} handlePublishFeed={handlePublishFeed}></ForwardWindow>
      </PopWindow>
      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed bg-base-100 shadow-lg rounded-md z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <ul className="menu p-2 w-40">
            <li>
              <a onClick={(e) => {
                e.preventDefault();
                handleDelete();
                closeContextMenu();
              }}
              >
                删除
              </a>
            </li>
            <li>
              <a onClick={(e) => {
                e.preventDefault();
                toggleMessageSelection(contextMenu.messageId);
                closeContextMenu();
              }}
              >
                选择
              </a>
            </li>
            {(() => {
              const message = historyMessages.find(message => message.message.messageID === contextMenu.messageId);
              if (!message || message.message.messageType !== 2) {
                return null;
              }
              return (
                <li>
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      toggleBackground(contextMenu.messageId);
                      closeContextMenu();
                    }}
                  >
                    {
                      message?.message.extra?.imageMessage?.background ? "取消设置为背景" : "设为背景"
                    }
                  </a>
                </li>
              );
            })()}
          </ul>
        </div>
      )}
    </>
  );
}
