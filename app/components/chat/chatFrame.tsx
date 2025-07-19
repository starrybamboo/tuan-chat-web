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
import { DraggableIcon } from "@/icons";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import {
  useDeleteMessageMutation,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";
import { usePublishFeedMutation } from "../../../api/hooks/FeedQueryHooks";

export const CHAT_VIRTUOSO_INDEX_SHIFTER = 100000;
function Header({ context }: { context:
{
  fetchNextPage: () => void;
  isFetching: boolean;
  isAtTopRef:
  React.RefObject<boolean>;
}; }) {
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

/**
 * 聊天框（不带输入部分）
 * @param useChatBubbleStyle 是否使用气泡样式
 * @param virtuosoRef 虚拟列表的ref
 * @constructor
 */
export default function ChatFrame({ useChatBubbleStyle, virtuosoRef }:
{ useChatBubbleStyle: boolean; virtuosoRef: React.RefObject<VirtuosoHandle | null> }) {
  const globalContext = useGlobalContext();
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const roomId = roomContext.roomId ?? -1;
  const curRoleId = roomContext.curRoleId ?? -1;
  const curAvatarId = roomContext.curAvatarId ?? -1;

  const websocketUtils = useGlobalContext().websocketUtils;
  const send = (message: ChatMessageRequest) => websocketUtils.send({ type: 3, data: message });
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
  const messagesInfiniteQuery = roomContext.messagesInfiniteQuery;
  const fetchNextPage = () => {
    if (messagesInfiniteQuery?.hasNextPage && !messagesInfiniteQuery?.isFetching) {
      messagesInfiniteQuery?.fetchNextPage();
    }
  };
  /**
   * 虚拟列表
   */
  // 虚拟列表的index到historyMessage中的index的转换
  const isAtBottomRef = useRef(true);
  const isAtTopRef = useRef(false);
  const virtuosoIndexToMessageIndex = (virtuosoIndex: number) => {
    return historyMessages.length + virtuosoIndex - CHAT_VIRTUOSO_INDEX_SHIFTER;
  };
  const messageIndexToVirtuosoIndex = (messageIndex: number) => {
    return messageIndex - historyMessages.length + CHAT_VIRTUOSO_INDEX_SHIFTER;
  };
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
    virtuosoRef?.current?.scrollToIndex(messageIndexToVirtuosoIndex(historyMessages.length - 1));
    updateUnreadMessagesNumber(roomId, 0);
  };
  useEffect(() => {
    if (messagesInfiniteQuery?.isFetchedAfterMount) {
      setTimeout(() => {
        scrollToBottom();
      }, 1000);
    }
  }, [messagesInfiniteQuery?.isFetchedAfterMount, roomId]);

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
      extra: {
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
      extra: { imageMessage: {
        ...message.extra.imageMessage,
        background: !message.extra.imageMessage.background,
      } },
    });
  }
  async function handlePublishFeed({ title, description }: { title: string; description: string }) {
    sendMessageMutation.mutate({
      roomId,
      messageType: 1,
      roleId: curRoleId,
      avatarId: curAvatarId,
      content: "转发了以下消息到社区",
      extra: {},
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
  /**
   * 通用的消息拖拽消息函数
   * @param targetIndex 将被移动到targetIndex对应的消息的下方
   * @param messageIds 要移动的消息租
   */
  const handleMoveMessages = (
    targetIndex: number,
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
  /**
   * 检查拖拽的位置
   */
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
  /**
   * 拖拽起始化
   */
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
    else {
      handleMoveMessages(adjustedIndex, [dragStartMessageIdRef.current]);
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
   * @param index 虚拟列表中的index，为了实现反向滚动，进行了偏移
   * @param chatMessageResponse
   */
  const renderMessage = (index: number, chatMessageResponse: ChatMessageResponse) => {
    const isSelected = selectedMessageIds.has(chatMessageResponse.message.messageID);
    const draggable = spaceContext.isSpaceOwner || chatMessageResponse.message.userId === globalContext.userId;
    const indexInHistoryMessages = virtuosoIndexToMessageIndex(index);
    return ((
      <div
        key={chatMessageResponse.message.messageID}
        className={`pl-6 relative group transition-opacity ${isSelected ? "bg-info-content/40" : ""} ${isDragging ? "pointer-events-auto" : ""}`}
        data-message-id={chatMessageResponse.message.messageID}
        onClick={(e) => {
          if (isSelecting || e.ctrlKey) {
            toggleMessageSelection(chatMessageResponse.message.messageID);
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, indexInHistoryMessages)}
        draggable={isSelecting && draggable}
        onDragStart={e => handleDragStart(e, indexInHistoryMessages)}
      >
        {
          draggable
          && (
            <div
              className={`absolute left-0 ${useChatBubbleStyle ? "bottom-[30px]" : "top-[30px]"}
                      opacity-0 transition-opacity flex items-center pr-2 cursor-move
                      group-hover:opacity-100 z-100`}
              draggable={draggable}
              onDragStart={e => handleDragStart(e, indexInHistoryMessages)}
            >
              <DraggableIcon className="size-6 "></DraggableIcon>
            </div>
          )
        }

        <ChatBubble chatMessageResponse={chatMessageResponse} />
      </div>
    )
    );
  };
  /**
   * 渲染
   */
  return (
    <div className="h-full">
      <div
        className="overflow-y-auto flex flex-col relative h-full"
        onContextMenu={handleContextMenu}
        onClick={closeContextMenu}
      >
        {selectedMessageIds.size > 0 && (
          <div
            className="absolute top-0 bg-base-300 w-full p-2 shadow-sm z-10 flex justify-between items-center rounded"
          >
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
        <div className="h-full flex-1">
          <Virtuoso
            data={historyMessages}
            firstItemIndex={CHAT_VIRTUOSO_INDEX_SHIFTER - historyMessages.length} // 使用这个技巧来在react-virtuoso中实现反向无限滚动
            initialTopMostItemIndex={historyMessages.length - 1}
            // alignToBottom
            followOutput={true}
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
              (atTop) && fetchNextPage();
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
