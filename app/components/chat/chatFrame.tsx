import type { VirtuosoHandle } from "react-virtuoso";
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  ImageMessage,
  Message,
} from "../../../api";
import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import React, { memo, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ChatFrameList from "@/components/chat/chatFrameList";
import ChatFrameOverlays from "@/components/chat/chatFrameOverlays";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatFrameContextMenu from "@/components/chat/hooks/useChatFrameContextMenu";
import useChatFrameDragAndDrop from "@/components/chat/hooks/useChatFrameDragAndDrop";
import useChatFrameMessageActions from "@/components/chat/hooks/useChatFrameMessageActions";
import useChatFrameMessageClick from "@/components/chat/hooks/useChatFrameMessageClick";
import useChatFrameSelection from "@/components/chat/hooks/useChatFrameSelection";
import RoleChooser from "@/components/chat/input/roleChooser";
import { ChatBubble } from "@/components/chat/message/chatBubble";
import ChatFrameContextMenu from "@/components/chat/room/contextMenu/chatFrameContextMenu";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { DraggableIcon } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { getImageSize } from "@/utils/getImgSize";
import {
  useDeleteMessageMutation,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";
import { useCreateEmojiMutation, useGetUserEmojisQuery } from "../../../api/hooks/emojiQueryHooks";
import { tuanchat } from "../../../api/instance";

const CHAT_VIRTUOSO_INDEX_SHIFTER = 100000;

/**
 * 聊天框（不带输入部分?
 * @param props 缁勪欢鍙傛暟
 * @param props.virtuosoRef 铏氭嫙鍒楄〃鐨?ref
 */
interface ChatFrameProps {
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  messagesOverride?: ChatMessageResponse[];
  enableWsSync?: boolean;
  enableEffects?: boolean;
  enableUnreadIndicator?: boolean;
  isMessageMovable?: (message: Message) => boolean;
  onBackgroundUrlChange?: (url: string | null) => void;
  onEffectChange?: (effectName: string | null) => void;
  onSendDocCard?: (payload: DocRefDragPayload) => Promise<void> | void;
  onExecuteCommandRequest?: (payload: {
    command: string;
    threadId?: number;
    requestMessageId: number;
  }) => void;
}

interface ThreadHintMeta {
  rootId: number;
  title: string;
  replyCount: number;
}

function ChatFrame(props: ChatFrameProps) {
  const {
    virtuosoRef,
    messagesOverride,
    enableWsSync = true,
    enableEffects = true,
    enableUnreadIndicator = true,
    isMessageMovable,
    onBackgroundUrlChange,
    onEffectChange,
    onSendDocCard,
    onExecuteCommandRequest,
  } = props;
  const globalContext = useGlobalContext();
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const setReplyMessage = useRoomUiStore(state => state.setReplyMessage);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const useChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const toggleUseChatBubbleStyle = useRoomPreferenceStore(state => state.toggleUseChatBubbleStyle);
  const roomId = roomContext.roomId ?? -1;
  const curRoleId = roomContext.curRoleId ?? -1;
  const curAvatarId = roomContext.curAvatarId ?? -1;

  // const hasNewMessages = websocketUtils.messagesNumber[roomId];
  const [isForwardWindowOpen, setIsForwardWindowOpen] = useState(false);
  const [isExportImageWindowOpen, setIsExportImageWindowOpen] = useState(false);

  const sendMessageMutation = useSendMessageMutation(roomId);

  // Mutations
  // const moveMessageMutation = useMoveMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const updateMessageMutation = useUpdateMessageMutation();

  const handleToggleNarrator = useCallback((messageId: number) => {
    if (!spaceContext.isSpaceOwner) {
      toast.error("只有KP可以切换旁白");
      return;
    }
    const message = roomContext.chatHistory?.messages.find(m => m.message.messageId === messageId)?.message;
    if (!message)
      return;

    const isNarrator = !message.roleId || message.roleId <= 0;

    if (isNarrator) {
      toastWindow(
        onClose => (
          <RoomContext value={roomContext}>
            <div className="flex flex-col items-center gap-4">
              <div>閫夋嫨瑙掕壊</div>
              <RoleChooser
                handleRoleChange={(role) => {
                  const newMessage = {
                    ...message,
                    roleId: role.roleId,
                    avatarId: roomContext.roomRolesThatUserOwn.find(r => r.roleId === role.roleId)?.avatarId ?? -1,
                  };
                  updateMessageMutation.mutate(newMessage, {
                    onSuccess: (response) => {
                      if (response?.data && roomContext.chatHistory) {
                        const updatedChatMessageResponse = {
                          ...roomContext.chatHistory.messages.find(m => m.message.messageId === messageId)!,
                          message: response.data,
                        };
                        roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);
                      }
                    },
                  });
                  onClose();
                }}
                className="menu bg-base-100 rounded-box z-1 p-2 shadow-sm overflow-y-auto"
              />
            </div>
          </RoomContext>
        ),
      );
    }
    else {
      const newMessage = {
        ...message,
        roleId: -1,
      };
      updateMessageMutation.mutate(newMessage, {
        onSuccess: (response) => {
          if (response?.data && roomContext.chatHistory) {
            const updatedChatMessageResponse = {
              ...roomContext.chatHistory.messages.find(m => m.message.messageId === messageId)!,
              message: response.data,
            };
            roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);
          }
        },
      });
    }
  }, [roomContext, spaceContext.isSpaceOwner, updateMessageMutation]);

  // 获取用户自定义表情列?
  const { data: emojisData } = useGetUserEmojisQuery();
  const emojiList = Array.isArray(emojisData?.data) ? emojisData.data : [];

  // 新增表情
  const createEmojiMutation = useCreateEmojiMutation();

  /**
   * 鑾峰彇鍘嗗彶娑堟伅
   * 鍒嗛〉鑾峰彇娑堟伅
   * cursor用于获取当前的消息列? 在往后端的请求中, 第一次发送null, 然后接受后端返回的cursor作为新的?
   */
  const chatHistory = roomContext.chatHistory;
  const webSocketUtils = globalContext.websocketUtils;
  const send = (message: ChatMessageRequest) => webSocketUtils.send({ type: 3, data: message });

  // 监听 WebSocket 接收到的消息
  const receivedMessages = useMemo(() => webSocketUtils.receivedMessages[roomId] ?? [], [roomId, webSocketUtils.receivedMessages]);
  // roomId ==> 上一次存储消息的时的receivedMessages[roomId].length
  const lastLengthMapRef = useRef<Record<number, number>>({});
  useEffect(() => {
    if (!enableWsSync) {
      return;
    }
    // 将wsUtils中缓存的消息存到indexDB中，这里霢要轮询等待indexDB初始化完成?
    // 如果在初始化之前就调用了这个函数，会出现初始消息无法加载的错误?
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    async function syncMessages() {
      const checkLoading = async (): Promise<void> => {
        if (isCancelled)
          return;

        if (chatHistory?.loading) {
          await new Promise<void>((resolve) => {
            timeoutId = setTimeout(() => {
              if (!isCancelled) {
                resolve();
              }
            }, 30);
          });
          // 递归棢查，直到loading完成或被取消
          await checkLoading();
        }
      };
      await checkLoading();

      // 如果已取消或chatHistory不存在，直接返回
      if (isCancelled || !chatHistory)
        return;
      const lastLength = lastLengthMapRef.current[roomId] ?? 0;
      if (lastLength < receivedMessages.length) {
        const newMessages = receivedMessages.slice(lastLength);

        // 补洞逻辑：检查新消息的第丢条是否与历史消息的最后一条连?
        const historyMsgs = chatHistory.messages;
        if (historyMsgs.length > 0 && newMessages.length > 0) {
          const lastHistoryMsg = historyMsgs[historyMsgs.length - 1];
          const firstNewMsg = newMessages[0];

          if (firstNewMsg.message.syncId > lastHistoryMsg.message.syncId + 1) {
            console.warn(`[ChatFrame] Detected gap between history (${lastHistoryMsg.message.syncId}) and new messages (${firstNewMsg.message.syncId}). Fetching missing messages...`);
            try {
              const missingMessagesRes = await tuanchat.chatController.getHistoryMessages({
                roomId,
                syncId: lastHistoryMsg.message.syncId + 1,
              });
              if (missingMessagesRes.data && missingMessagesRes.data.length > 0) {
                await chatHistory.addOrUpdateMessages(missingMessagesRes.data);
              }
            }
            catch (e) {
              console.error("[ChatFrame] Failed to fetch missing messages:", e);
            }
          }
        }

        await chatHistory.addOrUpdateMessages(newMessages);
        lastLengthMapRef.current[roomId] = receivedMessages.length;
      }
    }

    syncMessages();

    // 清理函数：取消异步操作和定时?
    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [chatHistory, enableWsSync, receivedMessages, roomId]);

  const historyMessages: ChatMessageResponse[] = useMemo(() => {
    if (messagesOverride) {
      return messagesOverride;
    }
    // Discord 风格：Thread 回复不出现在主消息流中，只在 Thread 面板中查?
    // - root锛歵hreadId === messageId锛堟樉绀猴級
    // - reply锛歵hreadId !== messageId锛堥殣钘忥級
    return (roomContext.chatHistory?.messages ?? []).filter((m) => {
      // Thread Root?0001）不在主消息流中单独显示：改为挂在原消息”下方的提示?
      if (m.message.messageType === MESSAGE_TYPE.THREAD_ROOT) {
        return false;
      }
      const { threadId, messageId } = m.message;
      if (!threadId) {
        return true;
      }
      return threadId === messageId;
    });
  }, [messagesOverride, roomContext.chatHistory?.messages]);

  const threadHintMetaByMessageId = useMemo(() => {
    // key: parentMessageId（被创建子区的那条原消息?
    const metaMap = new Map<number, ThreadHintMeta>();
    const all = roomContext.chatHistory?.messages ?? [];
    if (all.length === 0) {
      return metaMap;
    }

    // rootId -> replyCount
    const replyCountByRootId = new Map<number, number>();
    for (const item of all) {
      const { threadId, messageId } = item.message;
      if (threadId && threadId !== messageId) {
        replyCountByRootId.set(threadId, (replyCountByRootId.get(threadId) ?? 0) + 1);
      }
    }

    // parentMessageId -> latest root
    for (const item of all) {
      const mm = item.message;
      const isRoot = mm.messageType === MESSAGE_TYPE.THREAD_ROOT && mm.threadId === mm.messageId;
      const parentId = mm.replyMessageId;
      if (!isRoot || !parentId) {
        continue;
      }

      const title = (mm.extra as any)?.title || mm.content;
      const next: ThreadHintMeta = {
        rootId: mm.messageId,
        title,
        replyCount: replyCountByRootId.get(mm.messageId) ?? 0,
      };

      const prev = metaMap.get(parentId);
      // 极端情况下可能存在多?root：取 messageId 更新的那?
      if (!prev || next.rootId > prev.rootId) {
        metaMap.set(parentId, next);
      }
    }

    return metaMap;
  }, [roomContext.chatHistory?.messages]);

  // 删除消息（辑删除：更新本地消息状态为已删除）
  const deleteMessage = useCallback((messageId: number) => {
    deleteMessageMutation.mutate(messageId, {
      onSuccess: () => {
        // 找到要删除的消息，更新其 status ?1（已删除?
        const targetMessage = historyMessages.find(m => m.message.messageId === messageId);
        if (targetMessage && roomContext.chatHistory) {
          const updatedMessage = {
            ...targetMessage,
            message: {
              ...targetMessage.message,
              status: 1, // 閫昏緫鍒犻櫎鐘舵€?
            },
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedMessage);
        }
      },
    });
  }, [deleteMessageMutation, historyMessages, roomContext.chatHistory]);

  /**
   * 铏氭嫙鍒楄〃
   */
  // 虚拟列表的index到historyMessage中的index的转?
  const isAtBottomRef = useRef(true);
  const lastAutoSyncUnreadRef = useRef<number | null>(null);
  const isAtTopRef = useRef(false);
  const virtuosoIndexToMessageIndex = useCallback((virtuosoIndex: number) => {
    // return historyMessages.length + virtuosoIndex - CHAT_VIRTUOSO_INDEX_SHIFTER;
    return virtuosoIndex;
  }, []);
  const messageIndexToVirtuosoIndex = useCallback((messageIndex: number) => {
    return messageIndex - historyMessages.length + CHAT_VIRTUOSO_INDEX_SHIFTER;
  }, [historyMessages.length]);
  /**
   * 新消息提?
   */
  const unreadMessageNumber = enableUnreadIndicator
    ? (webSocketUtils.unreadMessagesNumber[roomId] ?? 0)
    : 0;
  const updateLastReadSyncId = webSocketUtils.updateLastReadSyncId;
  // 监听新消息，如果在底部，则设置群聊消息为已读?
  useEffect(() => {
    if (!enableUnreadIndicator) {
      return;
    }
    if (isAtBottomRef.current) {
      updateLastReadSyncId(roomId);
    }
  }, [enableUnreadIndicator, historyMessages, roomId, updateLastReadSyncId]);
  useEffect(() => {
    if (!enableUnreadIndicator) {
      lastAutoSyncUnreadRef.current = null;
      return;
    }
    if (unreadMessageNumber <= 0) {
      lastAutoSyncUnreadRef.current = null;
      return;
    }
    if (!isAtBottomRef.current) {
      return;
    }
    if (lastAutoSyncUnreadRef.current === unreadMessageNumber) {
      return;
    }
    lastAutoSyncUnreadRef.current = unreadMessageNumber;
    updateLastReadSyncId(roomId);
  }, [enableUnreadIndicator, roomId, unreadMessageNumber, updateLastReadSyncId]);
  /**
   * scroll鐩稿叧
   */
  const scrollToBottom = useCallback(() => {
    virtuosoRef?.current?.scrollToIndex(messageIndexToVirtuosoIndex(historyMessages.length - 1));
    if (enableUnreadIndicator) {
      updateLastReadSyncId(roomId);
    }
  }, [enableUnreadIndicator, historyMessages.length, messageIndexToVirtuosoIndex, roomId, updateLastReadSyncId, virtuosoRef]);
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
  }, [chatHistory?.loading, scrollToBottom]);

  /**
   * 背景图片随聊天记录改?
   * 注意：已删除的消息（status === 1）不应该显示背景图片
   */
  const imgNode = useMemo(() => {
    if (!enableEffects) {
      return [];
    }
    return historyMessages
      .map((msg, index) => {
        return { index, imageMessage: msg.message.extra?.imageMessage, status: msg.message.status };
      })
      .filter(item => item.imageMessage && item.imageMessage.background && item.status !== 1);
  }, [enableEffects, historyMessages]);

  /**
   * 特效随聊天记录改?
   * 注意：已删除的消息（status === 1）不应该显示特效
   */
  const effectNode = useMemo(() => {
    if (!enableEffects) {
      return [];
    }
    return historyMessages
      .map((msg, index) => {
        return { index, effectMessage: msg.message.extra?.effectMessage, status: msg.message.status };
      })
      .filter(item => item.effectMessage && item.effectMessage.effectName && item.status !== 1);
  }, [enableEffects, historyMessages]);

  const [currentVirtuosoIndex, setCurrentVirtuosoIndex] = useState(0);
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    onBackgroundUrlChange?.(enableEffects ? currentBackgroundUrl : null);
  }, [currentBackgroundUrl, enableEffects, onBackgroundUrlChange]);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);

  useEffect(() => {
    onEffectChange?.(enableEffects ? currentEffect : null);
  }, [currentEffect, enableEffects, onEffectChange]);

  useEffect(() => {
    if (!enableEffects) {
      return;
    }
    const currentMessageIndex = virtuosoIndexToMessageIndex(currentVirtuosoIndex);

    // Update Background URL
    let newBgUrl: string | null = null;

    // 找到朢后一个清除背景的位置
    let lastClearIndex = -1;
    for (const effect of effectNode) {
      if (effect.index <= currentMessageIndex && effect.effectMessage?.effectName === "clearBackground") {
        lastClearIndex = effect.index;
      }
    }

    // 从清除背景之后（或从头）弢始找朢新的背景图片
    for (const bg of imgNode) {
      if (bg.index <= currentMessageIndex && bg.index > lastClearIndex) {
        newBgUrl = bg.imageMessage?.url ?? null;
      }
      else if (bg.index > currentMessageIndex) {
        break;
      }
    }

    if (newBgUrl !== currentBackgroundUrl) {
      const id = setTimeout(() => setCurrentBackgroundUrl(newBgUrl), 0);
      return () => clearTimeout(id);
    }
  }, [enableEffects, currentVirtuosoIndex, imgNode, effectNode, virtuosoIndexToMessageIndex, currentBackgroundUrl]);

  useEffect(() => {
    if (!enableEffects) {
      return;
    }
    const currentMessageIndex = virtuosoIndexToMessageIndex(currentVirtuosoIndex);

    // Update Effect
    let newEffect: string | null = null;
    for (const effect of effectNode) {
      if (effect.index <= currentMessageIndex) {
        newEffect = effect.effectMessage?.effectName ?? null;
      }
      else {
        break;
      }
    }
    if (newEffect !== currentEffect) {
      setCurrentEffect(newEffect);
    }
  }, [enableEffects, currentVirtuosoIndex, effectNode, virtuosoIndexToMessageIndex, currentEffect]);

  const updateMessage = useCallback((message: Message) => {
    updateMessageMutation.mutate(message);
    // ?historyMessages 中找到完整的 ChatMessageResponse，保?messageMark 等字?
    const existingResponse = historyMessages.find(m => m.message.messageId === message.messageId);
    const newResponse = {
      ...existingResponse,
      message,
    };
    roomContext.chatHistory?.addOrUpdateMessage(newResponse as ChatMessageResponse);
  }, [updateMessageMutation, roomContext.chatHistory, historyMessages]);

  /**
   * 为什么要在这里加上一个这么一个莫名其妙的多余变量呢？
   * 目的是为了让背景图片从url到null的切换时也能触发transition的动画，如果不加，那么，动画部分的css就会变成这样?
   *         style={{
   *           backgroundImage: currentBackgroundUrl ? `url('${currentBackgroundUrl}')` : "none",
   *           opacity: currentBackgroundUrl ? 1 : 0,
   *         }}    // 错误代码?
   * 当currentBackgroundUrl从url变为null时，浏览器会因为backgroundImage已经变成了null，导致动画来不及播放，背景直接就消失?
   * 鑰屽姞涓婅繖涔堜竴缁檚tate鍚?
   *         style={{
   *           backgroundImage: displayedBgUrl ? `url('${displayedBgUrl}')` : "none",
   *           opacity: currentBackgroundUrl ? 1 : 0,
   *         }}   // 姝ｇ‘鐨?
   * 褰揷urrentBackgroundUrl 浠?url_A 鍙樹负 null鏃?
   * 此时，opacity 因为 currentBackgroundUrl ?null 而变?0，淡出动画开始?
   * 但我们故意不更新 displayedBgUrl！它依然保持睢 url_A 的?
   * 结果就是：背景图层虽然要变明了，但它?backgroundImage 样式里依然是上一张图片这样，动画就有了可以操作的视觉内容，能够平滑地将这张图片淡出，直到完全透明?
   */
  // 背景图渲染已提升?RoomWindow，此处仅负责计算并过 onBackgroundUrlChange 上报?

  /**
   * 娑堟伅閫夋嫨
   */
  const {
    selectedMessageIds,
    updateSelectedMessageIds,
    isSelecting,
    toggleMessageSelection,
    handleBatchDelete,
    handleEditMessage,
  } = useChatFrameSelection({ onDeleteMessage: deleteMessage });

  const handleMessageClick = useChatFrameMessageClick({
    isSelecting,
    toggleMessageSelection,
    onJumpToWebGAL: roomContext.jumpToMessageInWebGAL,
  });

  const clearSelection = useCallback(() => {
    updateSelectedMessageIds(new Set());
  }, [updateSelectedMessageIds]);

  const {
    handleForward,
    toggleBackground,
    toggleUnlockCg,
    generateForwardMessage,
  } = useChatFrameMessageActions({
    historyMessages,
    selectedMessageIds,
    roomId,
    curRoleId,
    curAvatarId,
    send,
    sendMessageAsync: sendMessageMutation.mutateAsync,
    updateMessage,
    setIsForwardWindowOpen,
    clearSelection,
  });

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
  const {
    isDragging,
    scrollerRef,
    isDocRefDragOver,
    updateDocRefDragOver,
    handleMoveMessages,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    sendDocCardFromDrop,
  } = useChatFrameDragAndDrop({
    historyMessages,
    isMessageMovable,
    updateMessage,
    roomId,
    spaceId: roomContext.spaceId ?? -1,
    curRoleId: roomContext.curRoleId ?? -1,
    curAvatarId: roomContext.curAvatarId ?? -1,
    curMemberType: roomContext.curMember?.memberType,
    isSpaceOwner: spaceContext.isSpaceOwner,
    onSendDocCard,
    send,
    virtuosoRef,
    isSelecting,
    selectedMessageIds,
  });

  /**
   * 鍙抽敭鑿滃崟
   */
  const { contextMenu, closeContextMenu, handleContextMenu } = useChatFrameContextMenu();

  function handleDelete() {
    deleteMessage(contextMenu?.messageId ?? -1);
  }

  // 鍏抽棴鍙抽敭鑿滃崟

  function toggleChatBubbleStyle() {
    toggleUseChatBubbleStyle();
    closeContextMenu();
  }

  // 处理回复消息
  function handleReply(message: Message) {
    setReplyMessage(message);
  }

  /**
   * @param index 虚拟列表中的index，为了实现反向滚动，进行了偏?
   * @param chatMessageResponse
   */
  const renderMessage = useCallback((index: number, chatMessageResponse: ChatMessageResponse) => {
    const isSelected = selectedMessageIds.has(chatMessageResponse.message.messageId);
    const baseDraggable = (roomContext.curMember?.memberType ?? 3) < 3;
    const movable = baseDraggable && (!isMessageMovable || isMessageMovable(chatMessageResponse.message));
    const indexInHistoryMessages = virtuosoIndexToMessageIndex(index);
    const canJumpToWebGAL = !!roomContext.jumpToMessageInWebGAL;
    const threadHintMeta = threadHintMetaByMessageId.get(chatMessageResponse.message.messageId);
    return ((
      <div
        key={chatMessageResponse.message.messageId}
        className={`
        pl-6 relative group transition-opacity ${isSelected ? "bg-info-content/40" : ""} ${isDragging ? "pointer-events-auto" : ""} ${canJumpToWebGAL ? "cursor-pointer hover:bg-base-200/50" : ""}`}
        data-message-id={chatMessageResponse.message.messageId}
        onClick={e => handleMessageClick(e, chatMessageResponse.message.messageId)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, indexInHistoryMessages)}
        draggable={isSelecting && movable}
        onDragStart={e => handleDragStart(e, indexInHistoryMessages)}
        onDragEnd={handleDragEnd}
      >
        {
          movable
          && (
            <div
              className={`absolute left-0 ${useChatBubbleStyle ? "top-[12px]" : "top-[30px]"}
                      opacity-0 transition-opacity flex items-center pr-2 cursor-move
                      group-hover:opacity-100 z-100`}
              draggable={movable}
              onDragStart={e => handleDragStart(e, indexInHistoryMessages)}
              onDragEnd={handleDragEnd}
            >
              <DraggableIcon className="size-6 "></DraggableIcon>
            </div>
          )
        }
        <ChatBubble
          chatMessageResponse={chatMessageResponse}
          useChatBubbleStyle={useChatBubbleStyle}
          threadHintMeta={threadHintMeta}
          onExecuteCommandRequest={onExecuteCommandRequest}
        />
      </div>
    )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMessageIds,
    roomContext.curMember?.memberType,
    roomContext.jumpToMessageInWebGAL,
    virtuosoIndexToMessageIndex,
    isDragging,
    isSelecting,
    useChatBubbleStyle,
    handleMessageClick,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragStart,
    handleDragEnd,
    isMessageMovable,
    threadHintMetaByMessageId,
  ]);

  if (chatHistory?.loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-base-200">
        <div className="flex flex-col items-center gap-2">
          {/* 加载动画 */}
          <span className="loading loading-spinner loading-lg text-info"></span>
          {/* 提示文字 */}
          <div className="text-center space-y-1">
            <h3 className="text-lg font-medium text-base-content">姝ｅ湪鑾峰彇鍘嗗彶娑堟伅</h3>
            <p className="text-sm text-base-content/70">璇风◢鍊?..</p>
          </div>
        </div>
      </div>
    );
  }
  /**
   * 娓叉煋
   */
  return (
    <div className="h-full relative">
      <ChatFrameList
        historyMessages={historyMessages}
        virtuosoRef={virtuosoRef}
        scrollerRef={scrollerRef}
        isAtBottomRef={isAtBottomRef}
        isAtTopRef={isAtTopRef}
        setCurrentVirtuosoIndex={setCurrentVirtuosoIndex}
        enableUnreadIndicator={enableUnreadIndicator}
        unreadMessageNumber={unreadMessageNumber}
        scrollToBottom={scrollToBottom}
        updateLastReadSyncId={updateLastReadSyncId}
        roomId={roomId}
        renderMessage={renderMessage}
        onContextMenu={handleContextMenu}
        selectedMessageIds={selectedMessageIds}
        updateSelectedMessageIds={updateSelectedMessageIds}
        setIsExportImageWindowOpen={setIsExportImageWindowOpen}
        setIsForwardWindowOpen={setIsForwardWindowOpen}
        handleBatchDelete={handleBatchDelete}
        isSpaceOwner={spaceContext.isSpaceOwner}
        isDocRefDragOver={isDocRefDragOver}
        updateDocRefDragOver={updateDocRefDragOver}
        onSendDocCardFromDrop={sendDocCardFromDrop}
      />
      <ChatFrameOverlays
        isForwardWindowOpen={isForwardWindowOpen}
        setIsForwardWindowOpen={setIsForwardWindowOpen}
        isExportImageWindowOpen={isExportImageWindowOpen}
        setIsExportImageWindowOpen={setIsExportImageWindowOpen}
        historyMessages={historyMessages}
        selectedMessageIds={selectedMessageIds}
        updateSelectedMessageIds={updateSelectedMessageIds}
        onForward={handleForward}
        generateForwardMessage={generateForwardMessage}
      />
      {/* 鍙抽敭鑿滃崟 */}
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
        onUnlockCg={toggleUnlockCg}
        onAddEmoji={handleAddEmoji}
        onInsertAfter={(messageId) => {
          setInsertAfterMessageId(messageId);
        }}
        onToggleNarrator={handleToggleNarrator}
      />
    </div>
  );
}

export default memo(ChatFrame);
