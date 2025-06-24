import type { VirtuosoHandle } from "react-virtuoso";
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  FeedRequest,
  Message,
} from "../../../api";
import { ChatBubble } from "@/components/chat/chatBubble";
import { RoomContext } from "@/components/chat/roomContext";
import { SpaceContext } from "@/components/chat/spaceContext";
import ForwardWindow from "@/components/chat/window/forwardWindow";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import React, { use, useCallback, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import {
  useDeleteMessageMutation,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";
import { usePublishFeedMutation } from "../../../api/hooks/FeedQueryHooks";

function Header({ context }: { context: { fetchNextPage: () => void; isFetching: boolean; isAtTopRef: React.RefObject<boolean> } }) {
  return (
    <div className="text-center">
      {
        context.isFetching
          ? "加载中"
          : "已经到顶了~(,,・ω・,,)"
      }
    </div>
  );
}

function ScrollSeekPlaceholder({ height }: { height: number }) {
  return (
    <div
      className="bg-base-200 rounded-lg my-1"
      style={{ height: height - 10 }} // 减去margin
    />
  );
}

export default function ChatFrame({ useChatBubbleStyle }:
{ useChatBubbleStyle: boolean }) {
  const globalContext = useGlobalContext();
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const roomId = roomContext.roomId ?? -1;
  const curRoleId = roomContext.curRoleId ?? -1;
  const curAvatarId = roomContext.curAvatarId ?? -1;

  const websocketUtils = useGlobalContext().websocketUtils;
  const send = websocketUtils.send;
  // const hasNewMessages = websocketUtils.messagesNumber[roomId];
  const [isForwardWindowOpen, setIsForwardWindowOpen] = useState(false);

  const sendMessageMutation = useSendMessageMutation(roomId);

  // Mutations
  // const moveMessageMutation = useMoveMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const publishFeedMutation = usePublishFeedMutation();
  const updateMessageMutation = useUpdateMessageMutation();
  /**
   * 获取历史消息
   * 分页获取消息
   * cursor用于获取当前的消息列表, 在往后端的请求中, 第一次发送null, 然后接受后端返回的cursor作为新的值
   */
  const historyMessages: ChatMessageResponse[] = useMemo(() => {
    return roomContext.historyMessages ?? [];
  }, [roomContext.historyMessages]);
  const messagesInfiniteQuery = roomContext.messageInfiniteQuery;
  const fetchNextPage = useCallback(() => {
    if (messagesInfiniteQuery?.hasNextPage && !messagesInfiniteQuery?.isFetching) {
      messagesInfiniteQuery?.fetchNextPage();
    }
  }, [messagesInfiniteQuery]);
  /**
   * 虚拟列表
   */
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  // 虚拟列表的index到historyMessage中的index的转换
  const INDEX_SHIFTER = 100000;
  const isAtBottomRef = useRef(false);
  const isAtTopRef = useRef(false);
  // const virtuosoIndexToNormalIndex = (virtuosoIndex: number) => {
  //   return historyMessages.length + virtuosoIndex - INDEX_SHIFTER;
  // };
  /**
   * 新消息提醒
   */
  const unreadMessageNumber = websocketUtils.unreadMessagesNumber[roomId] ?? 0;
  const updateUnreadMessagesNumber = websocketUtils.updateUnreadMessagesNumber;
  // useEffect(() => {
  //   sendNotificationWithGrant();
  // }, [historyMessages]);
  /**
   * scroll相关
   */
  const scrollToBottom = () => {
    virtuosoRef?.current?.scrollToIndex(historyMessages.length - 1);
    updateUnreadMessagesNumber(roomId, 0);
  };
  // useEffect(() => {
  //   if ((messageEntry?.isIntersecting) && !messagesInfiniteQuery?.isFetchingNextPage) {
  //     messagesInfiniteQuery?.fetchNextPage();
  //   }
  // }, [messageEntry?.isIntersecting, messagesInfiniteQuery?.isFetchingNextPage]);
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

  const constructForwardRequest = (forwardRoomId: number) => {
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
    return forwardMessageRequest;
  };
  function handleForward(forwardRoomId: number) {
    send(constructForwardRequest(forwardRoomId));
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
  async function handlePublishFeed({ title, description }: { title: string; description: string }) {
    sendMessageMutation.mutate({
      roomId,
      messageType: 1,
      roleId: curRoleId,
      avatarId: curAvatarId,
      content: "转发了以下消息到社区",
      body: {},
    }, { onSuccess: () => { sendMessageMutation.mutate(constructForwardRequest(roomId)); } });
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
  // 通用的处理消息移动的函数
  const handleMoveMessages = (
    targetIndex: number, // 将被移动到targetIndex对应的消息的下方
    messageIds: number[],
  ) => {
    const selectedMessages = Array.from(messageIds)
      .map(id => historyMessages.find(m => m.message.messageID === id)?.message)
      .filter((msg): msg is Message => msg !== undefined)
      .sort((a, b) => a.position - b.position);
    // 寻找到不位于，messageIds中且离dropPosition最近的消息
    let topMessageIndex: number = targetIndex;
    let bottomMessageIndex: number = targetIndex + 1;
    while (selectedMessageIds.has(historyMessages[topMessageIndex]?.message.messageID)) {
      topMessageIndex++;
    }
    while (selectedMessageIds.has(historyMessages[bottomMessageIndex]?.message.messageID)) {
      bottomMessageIndex--;
    }
    const topMessagePosition = historyMessages[topMessageIndex]?.message.position
      ?? historyMessages[0].message.position - 1;
    const bottomMessagePosition = historyMessages[bottomMessageIndex]?.message.position
      ?? historyMessages[historyMessages.length - 1].message.position + 1;

    for (const selectedMessage of selectedMessages) {
      const index = selectedMessages.indexOf(selectedMessage);
      updateMessageMutation.mutate({
        ...selectedMessage,
        position: (bottomMessagePosition - topMessagePosition) / (selectedMessages.length + 1) * (index + 1) + topMessagePosition,
      });
    }
  };

  const checkPosition = useCallback((e: React.DragEvent<HTMLDivElement>) => {
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
  }, []);
  const handleDragStart = useCallback ((e: React.DragEvent<HTMLDivElement>, index: number) => {
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
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, 0, 0);
    setTimeout(() => document.body.removeChild(clone));
  }, [historyMessages, isSelecting, selectedMessageIds.size]);
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

    const adjustedIndex = dropPositionRef.current === "after" ? dragEndIndex : dragEndIndex - 1;

    // 如果是多选状态，则对选中的所有消息进行移动
    if (isSelecting && selectedMessageIds.size > 0) {
      handleMoveMessages(adjustedIndex, Array.from(selectedMessageIds));
    }
    // else {
    //   handleMoveMessages();
    // }
    else {
      // 单条消息移动，额外判断是否移动到原来的位置
      const beforeMessage = historyMessages[adjustedIndex]?.message;
      const afterMessage = historyMessages[adjustedIndex - 1]?.message;
      const beforeMessageId = beforeMessage?.messageID ?? null;
      const afterMessageId = afterMessage?.messageID ?? null;
      if (beforeMessageId !== dragStartMessageIdRef.current && afterMessageId !== dragStartMessageIdRef.current) {
        handleMoveMessages(adjustedIndex, [dragStartMessageIdRef.current]);
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
  function handleEditMessage(messageId: number) {
    const target = document.querySelector(
      `[data-message-id="${messageId}"] .editable-field`,
    ) as HTMLElement;
    target.dispatchEvent(new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: target.offsetLeft + target.offsetWidth / 2,
      clientY: target.offsetTop + target.offsetHeight / 2,
    }));
  }
  // 关闭右键菜单
  function closeContextMenu() {
    setContextMenu(null);
  }

  /**
   * 预渲染
   */
  const renderMessage = (index: number, chatMessageResponse: ChatMessageResponse) => {
    const isSelected = selectedMessageIds.has(chatMessageResponse.message.messageID);
    // const normalIndex = virtuosoIndexToNormalIndex(index);
    return ((
      <div
        key={chatMessageResponse.message.messageID}
        // ref={(normalIndex === 4
        //   ? messageRef
        //   : null)}
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
        // draggable={isSelecting && (spaceContext.isSpaceOwner || chatMessageResponse.message.userId === globalContext.userId)}
        onDragStart={e => handleDragStart(e, index)}
        // onDragEnd={() => handleDragEnd()}
      >
        <div
          className={`absolute left-0 ${useChatBubbleStyle ? "bottom-[30px]" : "top-[30px]"}
                      -translate-x-full -translate-y-1/ opacity-0 transition-opacity flex items-center pr-2 cursor-move
                      ${(spaceContext.isSpaceOwner || chatMessageResponse.message.userId === globalContext.userId) ? "group-hover:opacity-100" : ""}`}
          // draggable={spaceContext.isSpaceOwner || chatMessageResponse.message.userId === globalContext.userId}
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
  };
  const renderedVirtuosoList = useMemo(() => {
    return (
      <div className="h-full flex-1">
        <Virtuoso
          data={historyMessages}
          firstItemIndex={INDEX_SHIFTER - historyMessages.length} // 使用这个技巧来在react-virtuoso中实现反向无限滚动
          initialTopMostItemIndex={historyMessages.length - 1}
          // alignToBottom
          followOutput={(isAtBottom: boolean) => {
            if (isAtBottom) {
              updateUnreadMessagesNumber(roomId, 0);
              return "smooth";
            }
            else {
              return false;
            }
          }}
          overscan={2000}
          ref={virtuosoRef}
          context={{
            fetchNextPage: () => messagesInfiniteQuery?.fetchNextPage(),
            isFetching: messagesInfiniteQuery?.isFetching || false,
            isAtTopRef: isAtBottomRef,
          }}
          itemContent={(index, chatMessageResponse) => renderMessage(index, chatMessageResponse)}
          atBottomStateChange={(atBottom) => {
            atBottom && updateUnreadMessagesNumber(roomId, 0);
            isAtBottomRef.current = atBottom;
          }}
          atTopStateChange={(atTop) => {
            atTop && fetchNextPage();
            isAtTopRef.current = atTop;
          }}
          components={{
            Header,
            ScrollSeekPlaceholder,
          }}
          scrollSeekConfiguration={{
            enter: velocity => Math.abs(velocity) > 600, // 滚动速度阈值
            exit: velocity => Math.abs(velocity) < 50,
          }}
          onWheel={(e) => {
            if (e.deltaY < 0 && isAtTopRef.current) {
              fetchNextPage();
            }
          }}
          atTopThreshold={1200}
          atBottomThreshold={200}
        />
      </div>
    );
  }, [fetchNextPage, historyMessages, messagesInfiniteQuery, roomId, updateUnreadMessagesNumber]);
  /**
   * 渲染
   */
  return (
    <div>
      {/* 这里是从下到上渲染的 */}
      <div
        className="ml-4 overflow-y-auto h-[60vh] flex flex-col relative"
        onContextMenu={handleContextMenu}
        onClick={closeContextMenu}
      >
        {selectedMessageIds.size > 0 && (
          <div className="absolute top-0 bg-base-300 w-full p-2 shadow-sm z-10 flex justify-between items-center rounded">
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
              {
                spaceContext.isSpaceOwner
                && (
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => handleBatchDelete()}
                    type="button"
                  >
                    删除
                  </button>
                )
              }
            </div>
          </div>
        )}
        {renderedVirtuosoList}
        {/* historyMessages.length > 2是为了防止一些奇怪的bug */}
        {(unreadMessageNumber > 0 && historyMessages.length > 2 && !isAtBottomRef.current) && (
          <div
            className="absolute bottom-4 self-end z-50 cursor-pointer"
            onClick={() => { scrollToBottom(); }}
          >
            <div className="btn btn-info gap-2 shadow-lg">
              <span>{unreadMessageNumber}</span>
              <span>条新消息</span>
            </div>
          </div>
        )}
      </div>
      <PopWindow isOpen={isForwardWindowOpen} onClose={() => setIsForwardWindowOpen(false)}>
        <ForwardWindow onClickRoom={roomId => handleForward(roomId)} handlePublishFeed={handlePublishFeed}></ForwardWindow>
      </PopWindow>
      {/* 右键菜单 */}
      {contextMenu && (() => {
        const message = historyMessages.find(message => message.message.messageID === contextMenu.messageId);
        return (
          <div
            className="fixed bg-base-100 shadow-lg rounded-md z-50"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            <ul className="menu p-2 w-40">
              {
                (spaceContext.isSpaceOwner || message?.message.userId === globalContext.userId)
                && (
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
                )
              }
              <li>
                <a onClick={(e) => {
                  e.preventDefault();
                  toggleMessageSelection(contextMenu.messageId);
                  closeContextMenu();
                }}
                >
                  多选
                </a>
              </li>
              <li>
                <a onClick={(e) => {
                  e.preventDefault();
                  roomContext.setReplyMessage && roomContext?.setReplyMessage(message?.message);
                  closeContextMenu();
                }}
                >
                  回复
                </a>
              </li>
              {
                (isSelecting) && (
                  <li>
                    <a onClick={(e) => {
                      e.preventDefault();
                      handleMoveMessages(
                        historyMessages.findIndex(message => message.message.messageID === contextMenu.messageId),
                        Array.from(selectedMessageIds),
                      );
                      closeContextMenu();
                    }}
                    >
                      将选中消息移动到此消息下方
                    </a>
                  </li>
                )
              }
              {(() => {
                if (message?.message.userId !== globalContext.userId && !spaceContext.isSpaceOwner) {
                  return null;
                }
                if (!message || message.message.messageType !== 2) {
                  return (
                    <li>
                      <a
                        onClick={(e) => {
                          e.preventDefault();
                          handleEditMessage(contextMenu.messageId);
                          closeContextMenu();
                        }}
                      >
                        编辑文本
                      </a>
                    </li>
                  );
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
        );
      })()}
    </div>
  );
}
