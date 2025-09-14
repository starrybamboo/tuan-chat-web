import type { VirtuosoHandle } from "react-virtuoso";
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  ImageMessage,
  Message,
} from "../../../api";
import { ChatBubble } from "@/components/chat/chatBubble";
import ChatFrameContextMenu from "@/components/chat/chatFrameContextMenu";
import { RoomContext } from "@/components/chat/roomContext";
import UserIdToName from "@/components/chat/smallComponents/userIdToName";
import { SpaceContext } from "@/components/chat/spaceContext";
import ForwardWindow from "@/components/chat/window/forwardWindow";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { DraggableIcon } from "@/icons";
import { getImageSize } from "@/utils/getImgSize";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Virtuoso } from "react-virtuoso";
import {
  useDeleteMessageMutation,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";
import { useCreateEmojiMutation, useGetUserEmojisQuery } from "../../../api/hooks/emojiQueryHooks";

export const CHAT_VIRTUOSO_INDEX_SHIFTER = 100000;
function Header() {
  return (
    <div className="text-center p-3">
      已经到顶了~(,,・ω・,,)
    </div>
  );
}

/**
 * 聊天框（不带输入部分）
 * @param useChatBubbleStyle 是否使用气泡样式
 * @param setUseChatBubbleStyle 设置气泡样式的函数
 * @param virtuosoRef 虚拟列表的ref
 * @constructor
 */
export default function ChatFrame({ useChatBubbleStyle, setUseChatBubbleStyle, virtuosoRef }:
{
  useChatBubbleStyle: boolean;
  setUseChatBubbleStyle: (value: boolean | ((prev: boolean) => boolean)) => void;
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
}) {
  const globalContext = useGlobalContext();
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const roomId = roomContext.roomId ?? -1;
  const curRoleId = roomContext.curRoleId ?? -1;
  const curAvatarId = roomContext.curAvatarId ?? -1;

  // const hasNewMessages = websocketUtils.messagesNumber[roomId];
  const [isForwardWindowOpen, setIsForwardWindowOpen] = useState(false);

  const sendMessageMutation = useSendMessageMutation(roomId);

  // Mutations
  // const moveMessageMutation = useMoveMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const updateMessageMutation = useUpdateMessageMutation();
  const updateMessage = (message: Message) => {
    updateMessageMutation.mutate(message);
    roomContext.chatHistory?.addOrUpdateMessage({ message });
  };

  // 获取用户自定义表情列表
  const { data: emojisData } = useGetUserEmojisQuery();
  const emojiList = Array.isArray(emojisData?.data) ? emojisData.data : [];

  // 新增表情
  const createEmojiMutation = useCreateEmojiMutation();
  /**
   * 获取历史消息
   * 分页获取消息
   * cursor用于获取当前的消息列表, 在往后端的请求中, 第一次发送null, 然后接受后端返回的cursor作为新的值
   */
  const chatHistory = roomContext.chatHistory;
  const webSocketUtils = globalContext.websocketUtils;
  // 当前房间成员的输入信息
  const roomChatStatues = (webSocketUtils.chatStatus[roomId] ?? [])
    .filter(status => status.status === "input" && status.userId !== globalContext.userId);
  const send = (message: ChatMessageRequest) => webSocketUtils.send({ type: 3, data: message });

  // 监听 WebSocket 接收到的消息
  const receivedMessages = useMemo(() => webSocketUtils.receivedMessages[roomId] ?? [], [roomId, webSocketUtils.receivedMessages]);
  // roomId ==> 上一次存储消息的时候的receivedMessages[roomId].length
  const lastLengthMapRef = useRef<Record<number, number>>({});
  useEffect(() => {
    const lastLength = lastLengthMapRef.current[roomId] ?? 0;
    if (lastLength < receivedMessages.length) {
      chatHistory?.addOrUpdateMessages(receivedMessages.slice(lastLength));
      lastLengthMapRef.current[roomId] = receivedMessages.length;
    }
  }, [chatHistory, receivedMessages, roomId]);

  const historyMessages: ChatMessageResponse[] = useMemo(() => {
    return roomContext.chatHistory?.messages ?? [];
  }, [roomContext.chatHistory?.messages]);
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
  const unreadMessageNumber = webSocketUtils.unreadMessagesNumber[roomId] ?? 0;
  const updateLastReadSyncId = webSocketUtils.updateLastReadSyncId;
  // 监听新消息，如果在底部，则设置群聊消息为已读；
  useEffect(() => {
    if (isAtBottomRef.current) {
      updateLastReadSyncId(roomId);
    }
  }, [historyMessages, roomId, updateLastReadSyncId]);
  /**
   * scroll相关
   */
  const scrollToBottom = () => {
    virtuosoRef?.current?.scrollToIndex(messageIndexToVirtuosoIndex(historyMessages.length - 1));
    updateLastReadSyncId(roomId);
  };
  useEffect(() => {
    let timer = null;
    if (chatHistory?.loading) {
      timer = setTimeout(() => {
        scrollToBottom();
      }, 1000);
    }
    return () => {
      if (timer)
        clearTimeout(timer);
    };
  }, [chatHistory?.loading]);

  /**
   * 背景图片随聊天记录而改变
   */
  const imgNode = useMemo(() => {
    return historyMessages
      .map((msg, index) => {
        return { index, imageMessage: msg.message.extra?.imageMessage };
      })
      .filter(item => item.imageMessage && item.imageMessage.background);
  }, [historyMessages]);

  const [currentVirtuosoIndex, setCurrentVirtuosoIndex] = useState(0);
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    // Convert the virtuoso index (which is shifted) to the actual array index.
    const currentMessageIndex = virtuosoIndexToMessageIndex(currentVirtuosoIndex);
    // Find the last background image that appears at or before the current scroll position.
    let newBgUrl: string | null = null;
    for (const bg of imgNode) {
      if (bg.index <= currentMessageIndex) {
        newBgUrl = bg.imageMessage?.url ?? null;
      }
      else {
        break;
      }
    }

    if (newBgUrl !== currentBackgroundUrl) {
      setCurrentBackgroundUrl(newBgUrl);
    }
  }, [currentVirtuosoIndex, imgNode, virtuosoIndexToMessageIndex, currentBackgroundUrl]);

  /**
   * 为什么要在这里加上一个这么一个莫名其妙的多余变量呢？
   * 目的是为了让背景图片从url到null的切换时也能触发transition的动画，如果不加，那么，动画部分的css就会变成这样：
   *         style={{
   *           backgroundImage: currentBackgroundUrl ? `url('${currentBackgroundUrl}')` : "none",
   *           opacity: currentBackgroundUrl ? 1 : 0,
   *         }}    // 错误代码！
   * 当currentBackgroundUrl从url变为null时，浏览器会因为backgroundImage已经变成了null，导致动画来不及播放，背景直接就消失了
   * 而加上这么一给state后
   *         style={{
   *           backgroundImage: displayedBgUrl ? `url('${displayedBgUrl}')` : "none",
   *           opacity: currentBackgroundUrl ? 1 : 0,
   *         }}   // 正确的
   * 当currentBackgroundUrl 从 url_A 变为 null时
   * 此时，opacity 因为 currentBackgroundUrl 是 null 而变为 0，淡出动画开始。
   * 但我们故意不更新 displayedBgUrl！它依然保持着 url_A 的值。
   * 结果就是：背景图层虽然要变透明了，但它的 backgroundImage 样式里依然是上一张图片。这样，动画就有了可以“操作”的视觉内容，能够平滑地将这张图片淡出，直到完全透明。
   */
  const [displayedBgUrl, setDisplayedBgUrl] = useState(currentBackgroundUrl);
  useEffect(() => {
    if (currentBackgroundUrl) {
      setDisplayedBgUrl(currentBackgroundUrl);
    }
  }, [currentBackgroundUrl]);

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
      .map(id => historyMessages.find(m => m.message.messageId === id))
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
    toast("已转发消息");
  }

  function toggleBackground(messageId: number) {
    const message = historyMessages.find(m => m.message.messageId === messageId)?.message;
    if (!message || !message.extra?.imageMessage)
      return;
    updateMessage({
      ...message,
      extra: {
        imageMessage: {
          ...message.extra.imageMessage,
          background: !message.extra.imageMessage.background,
        },
      },
    });
  }

  // 新增：生成转发消息并返回消息ID
  async function generateForwardMessage(): Promise<number | null> {
    // 发送提示信息
    const firstMessageResult = await sendMessageMutation.mutateAsync({
      roomId,
      messageType: 1,
      roleId: curRoleId,
      avatarId: curAvatarId,
      content: "转发了以下消息到社区",
      extra: {},
    });
    if (!firstMessageResult.success)
      return null;

    // 发送转发请求
    const forwardResult = await sendMessageMutation.mutateAsync(
      constructForwardRequest(roomId),
    );
    if (!forwardResult.success || !forwardResult.data)
      return null;

    // 清理状态
    setIsForwardWindowOpen(false);
    updateSelectedMessageIds(new Set());

    return forwardResult.data.messageId;
  }

  async function handleAddEmoji(imgMessage: ImageMessage) {
    if (emojiList.find(emoji => emoji.imageUrl === imgMessage.url)) {
      toast.error("该表情已存在");
      return;
    }
    const fileSize = imgMessage.size > 0
      ? imgMessage.size
      : (await getImageSize(imgMessage.url)).size;
    createEmojiMutation.mutate({
      name: imgMessage.fileName,
      imageUrl: imgMessage.url,
      fileSize,
      format: imgMessage.url.split(".").pop() || "webp",
    }, {
      onSuccess: () => {
        toast.success("表情添加成功");
      },
    });
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
      .map(id => historyMessages.find(m => m.message.messageId === id)?.message)
      .filter((msg): msg is Message => msg !== undefined)
      .sort((a, b) => a.position - b.position);
    // 寻找到不位于，messageIds中且离dropPosition最近的消息
    let topMessageIndex: number = targetIndex;
    let bottomMessageIndex: number = targetIndex + 1;
    while (selectedMessageIds.has(historyMessages[topMessageIndex]?.message.messageId)) {
      topMessageIndex--;
    }
    while (selectedMessageIds.has(historyMessages[bottomMessageIndex]?.message.messageId)) {
      bottomMessageIndex++;
    }
    const topMessagePosition = historyMessages[topMessageIndex]?.message.position
      ?? historyMessages[0].message.position - 1;
    const bottomMessagePosition = historyMessages[bottomMessageIndex]?.message.position
      ?? historyMessages[historyMessages.length - 1].message.position + 1;

    for (const selectedMessage of selectedMessages) {
      const index = selectedMessages.indexOf(selectedMessage);
      updateMessage({
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
    indicator.className = "drag-indicator absolute left-0 right-0 h-[2px] bg-info pointer-events-none";
    indicator.style.zIndex = "50";
    if (relativeY < rect.height / 2) {
      indicator.style.top = "-1px";
      indicator.style.bottom = "auto";
      dropPositionRef.current = "before";
    }
    else {
      indicator.style.top = "auto";
      indicator.style.bottom = "-1px";
      dropPositionRef.current = "after";
    }
    indicatorRef.current?.remove();
    curDragOverMessageRef.current?.appendChild(indicator);
    indicatorRef.current = indicator;
  }, []);
  /**
   * 拖拽起始化
   */
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    dragStartMessageIdRef.current = historyMessages[index].message.messageId;
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
  // 处理点击外部关闭菜单的逻辑
  useEffect(() => {
    if (contextMenu) {
      window.addEventListener("click", closeContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeContextMenu);
    };
  }, [contextMenu]); // 依赖于contextMenu状态

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

  // 切换消息样式
  function toggleChatBubbleStyle() {
    setUseChatBubbleStyle(prev => !prev);
    closeContextMenu();
  }

  // 处理回复消息
  function handleReply(message: Message) {
    roomContext.setReplyMessage && roomContext.setReplyMessage(message);
  }

  if (chatHistory?.loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-base-200">
        <div className="flex flex-col items-center gap-2">
          {/* 加载动画 */}
          <span className="loading loading-spinner loading-lg text-info"></span>
          {/* 提示文字 */}
          <div className="text-center space-y-1">
            <h3 className="text-lg font-medium text-base-content">正在获取历史消息</h3>
            <p className="text-sm text-base-content/70">请稍候...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * @param index 虚拟列表中的index，为了实现反向滚动，进行了偏移
   * @param chatMessageResponse
   */
  const renderMessage = (index: number, chatMessageResponse: ChatMessageResponse) => {
    const isSelected = selectedMessageIds.has(chatMessageResponse.message.messageId);
    const draggable = (roomContext.curMember?.memberType ?? 3) < 3;
    const indexInHistoryMessages = virtuosoIndexToMessageIndex(index);
    return ((
      <div
        key={chatMessageResponse.message.messageId}
        className={`
        pl-6 relative group transition-opacity ${isSelected ? "bg-info-content/40" : ""} ${isDragging ? "pointer-events-auto" : ""}`}
        data-message-id={chatMessageResponse.message.messageId}
        onClick={(e) => {
          if (isSelecting || e.ctrlKey) {
            toggleMessageSelection(chatMessageResponse.message.messageId);
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
              className={`absolute left-0 ${useChatBubbleStyle ? "top-[12px]" : "top-[30px]"}
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
    <div className="h-full relative">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{
          backgroundImage: displayedBgUrl ? `url('${displayedBgUrl}')` : "none",
          opacity: currentBackgroundUrl ? 1 : 0,
        }}
      />
      {/* Overlay for tint and blur */}
      <div
        className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-xs z-0 transition-opacity duration-500"
        style={{
          opacity: currentBackgroundUrl ? 1 : 0,
        }}
      />
      <div
        className="overflow-y-auto flex flex-col relative h-full"
        onContextMenu={handleContextMenu}
      >
        {selectedMessageIds.size > 0 && (
          <div
            className="absolute top-0 bg-base-300 w-full p-2 shadow-sm z-5 flex justify-between items-center rounded"
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
        {
          roomChatStatues.length > 0 && (
            <div className="absolute top-0 bg-base-100 w-full p-2 shadow-sm z-3 text-center rounded flex-shrink-0">
              {
                roomChatStatues
                  .map((status, index) => (
                    <span key={status.userId}>
                      <UserIdToName userId={status.userId} className="text-info"></UserIdToName>
                      {index === roomChatStatues.length - 1 ? " 正在输入..." : ", "}
                    </span>
                  ))
              }
            </div>
          )
        }
        <div className="h-full flex-1">
          <Virtuoso
            data={historyMessages}
            firstItemIndex={CHAT_VIRTUOSO_INDEX_SHIFTER - historyMessages.length} // 使用这个技巧来在react-virtuoso中实现反向无限滚动
            initialTopMostItemIndex={historyMessages.length - 1}
            followOutput={true}
            overscan={10} // 不要设得太大，会导致rangeChange更新不及时
            ref={virtuosoRef}
            context={{
              isAtTopRef: isAtBottomRef,
            }}
            rangeChanged={({ endIndex }) => {
              // Update state with the end-most visible item's index.
              setCurrentVirtuosoIndex((endIndex));
            }}
            itemContent={(index, chatMessageResponse) => renderMessage(index, chatMessageResponse)}
            atBottomStateChange={(atBottom) => {
              atBottom && updateLastReadSyncId(roomId);
              isAtBottomRef.current = atBottom;
            }}
            atTopStateChange={(atTop) => {
              isAtTopRef.current = atTop;
            }}
            components={{
              Header,
            }}
            atTopThreshold={1200}
            atBottomThreshold={200}
          />
        </div>
        {/* historyMessages.length > 2是为了防止一些奇怪的bug */}
        {(unreadMessageNumber > 0 && historyMessages.length > 2 && !isAtBottomRef.current) && (
          <div
            className="absolute bottom-4 self-end z-50 cursor-pointer"
            onClick={() => {
              scrollToBottom();
            }}
          >
            <div className="btn btn-info gap-2 shadow-lg">
              <span>{unreadMessageNumber}</span>
              <span>条新消息</span>
            </div>
          </div>
        )}
      </div>
      <PopWindow isOpen={isForwardWindowOpen} onClose={() => setIsForwardWindowOpen(false)}>
        <ForwardWindow
          onClickRoom={roomId => handleForward(roomId)}
          generateForwardMessage={generateForwardMessage}
        >
        </ForwardWindow>
      </PopWindow>
      {/* 右键菜单 */}
      <ChatFrameContextMenu
        contextMenu={contextMenu}
        historyMessages={historyMessages}
        isSelecting={isSelecting}
        selectedMessageIds={selectedMessageIds}
        useChatBubbleStyle={useChatBubbleStyle}
        onClose={closeContextMenu}
        onDelete={handleDelete}
        onToggleSelection={toggleMessageSelection}
        onReply={handleReply}
        onMoveMessages={handleMoveMessages}
        onToggleChatBubbleStyle={toggleChatBubbleStyle}
        onEditMessage={handleEditMessage}
        onToggleBackground={toggleBackground}
        onAddEmoji={handleAddEmoji}
      />
    </div>
  );
}
