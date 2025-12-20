import type { VirtuosoHandle } from "react-virtuoso";
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  ImageMessage,
  Message,
} from "../../../api";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import RoleChooser from "@/components/chat/input/roleChooser";
import { ChatBubble } from "@/components/chat/message/chatBubble";
import ChatFrameContextMenu from "@/components/chat/room/contextMenu/chatFrameContextMenu";
import PixiOverlay from "@/components/chat/shared/components/pixiOverlay";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import ExportImageWindow from "@/components/chat/window/exportImageWindow";
import ForwardWindow from "@/components/chat/window/forwardWindow";
import { PopWindow } from "@/components/common/popWindow";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { DraggableIcon } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { getImageSize } from "@/utils/getImgSize";
import React, { memo, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Virtuoso } from "react-virtuoso";
import {
  useDeleteMessageMutation,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";
import { useCreateEmojiMutation, useGetUserEmojisQuery } from "../../../api/hooks/emojiQueryHooks";
import { tuanchat } from "../../../api/instance";

export const CHAT_VIRTUOSO_INDEX_SHIFTER = 100000;
function Header() {
  return (
    <div className="py-2">
      <div className="divider text-xs text-base-content/50 m-0">到顶</div>
    </div>
  );
}

/**
 * 聊天框（不带输入部分）
 * @param props 组件参数
 * @param props.virtuosoRef 虚拟列表的 ref
 */
interface ChatFrameProps {
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  messagesOverride?: ChatMessageResponse[];
  enableWsSync?: boolean;
  enableEffects?: boolean;
  enableUnreadIndicator?: boolean;
  isMessageMovable?: (message: Message) => boolean;
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
    const message = roomContext.chatHistory?.messages.find(m => m.message.messageId === messageId)?.message;
    if (!message)
      return;

    const isNarrator = !message.roleId || message.roleId <= 0;

    if (isNarrator) {
      toastWindow(
        onClose => (
          <RoomContext value={roomContext}>
            <div className="flex flex-col items-center gap-4">
              <div>选择角色</div>
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
  }, [roomContext, updateMessageMutation]);

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
  const send = (message: ChatMessageRequest) => webSocketUtils.send({ type: 3, data: message });

  // 监听 WebSocket 接收到的消息
  const receivedMessages = useMemo(() => webSocketUtils.receivedMessages[roomId] ?? [], [roomId, webSocketUtils.receivedMessages]);
  // roomId ==> 上一次存储消息的时候的receivedMessages[roomId].length
  const lastLengthMapRef = useRef<Record<number, number>>({});
  useEffect(() => {
    if (!enableWsSync) {
      return;
    }
    // 将wsUtils中缓存的消息存到indexDB中，这里需要轮询等待indexDB初始化完成。
    // 如果在初始化之前就调用了这个函数，会出现初始消息无法加载的错误。
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
          // 递归检查，直到loading完成或被取消
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

        // 补洞逻辑：检查新消息的第一条是否与历史消息的最后一条连续
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

    // 清理函数：取消异步操作和定时器
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
    // Discord 风格：Thread 回复不出现在主消息流中，只在 Thread 面板中查看
    // - root：threadId === messageId（显示）
    // - reply：threadId !== messageId（隐藏）
    return (roomContext.chatHistory?.messages ?? []).filter((m) => {
      // Thread Root（10001）不在主消息流中单独显示：改为挂在“原消息”下方的提示条
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
    // key: parentMessageId（被创建子区的那条原消息）
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
      // 极端情况下可能存在多个 root：取 messageId 更新的那个
      if (!prev || next.rootId > prev.rootId) {
        metaMap.set(parentId, next);
      }
    }

    return metaMap;
  }, [roomContext.chatHistory?.messages]);

  // 删除消息（逻辑删除：更新本地消息状态为已删除）
  const deleteMessage = useCallback((messageId: number) => {
    deleteMessageMutation.mutate(messageId, {
      onSuccess: () => {
        // 找到要删除的消息，更新其 status 为 1（已删除）
        const targetMessage = historyMessages.find(m => m.message.messageId === messageId);
        if (targetMessage && roomContext.chatHistory) {
          const updatedMessage = {
            ...targetMessage,
            message: {
              ...targetMessage.message,
              status: 1, // 逻辑删除状态
            },
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedMessage);
        }
      },
    });
  }, [deleteMessageMutation, historyMessages, roomContext.chatHistory]);

  /**
   * 虚拟列表
   */
  // 虚拟列表的index到historyMessage中的index的转换
  const isAtBottomRef = useRef(true);
  const isAtTopRef = useRef(false);
  const virtuosoIndexToMessageIndex = useCallback((virtuosoIndex: number) => {
    // return historyMessages.length + virtuosoIndex - CHAT_VIRTUOSO_INDEX_SHIFTER;
    return virtuosoIndex;
  }, []);
  const messageIndexToVirtuosoIndex = useCallback((messageIndex: number) => {
    return messageIndex - historyMessages.length + CHAT_VIRTUOSO_INDEX_SHIFTER;
  }, [historyMessages.length]);
  /**
   * 新消息提醒
   */
  const unreadMessageNumber = enableUnreadIndicator
    ? (webSocketUtils.unreadMessagesNumber[roomId] ?? 0)
    : 0;
  const updateLastReadSyncId = webSocketUtils.updateLastReadSyncId;
  // 监听新消息，如果在底部，则设置群聊消息为已读；
  useEffect(() => {
    if (!enableUnreadIndicator) {
      return;
    }
    if (isAtBottomRef.current) {
      updateLastReadSyncId(roomId);
    }
  }, [enableUnreadIndicator, historyMessages, roomId, updateLastReadSyncId]);
  /**
   * scroll相关
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
   * 背景图片随聊天记录而改变
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
   * 特效随聊天记录而改变
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
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);

  useEffect(() => {
    if (!enableEffects) {
      return;
    }
    const currentMessageIndex = virtuosoIndexToMessageIndex(currentVirtuosoIndex);

    // Update Background URL
    let newBgUrl: string | null = null;

    // 找到最后一个清除背景的位置
    let lastClearIndex = -1;
    for (const effect of effectNode) {
      if (effect.index <= currentMessageIndex && effect.effectMessage?.effectName === "clearBackground") {
        lastClearIndex = effect.index;
      }
    }

    // 从清除背景之后（或从头）开始找最新的背景图片
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
    // 从 historyMessages 中找到完整的 ChatMessageResponse，保留 messageMark 等字段
    const existingResponse = historyMessages.find(m => m.message.messageId === message.messageId);
    const newResponse = {
      ...existingResponse,
      message,
    };
    roomContext.chatHistory?.addOrUpdateMessage(newResponse as ChatMessageResponse);
  }, [updateMessageMutation, roomContext.chatHistory, historyMessages]);

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
    if (!enableEffects) {
      return;
    }
    if (currentBackgroundUrl) {
      const id = setTimeout(() => setDisplayedBgUrl(currentBackgroundUrl), 0);
      return () => clearTimeout(id);
    }
  }, [enableEffects, currentBackgroundUrl]);

  const backgroundLayerRef = useRef<HTMLDivElement | null>(null);
  const backgroundOverlayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!enableEffects) {
      return;
    }
    if (backgroundLayerRef.current) {
      backgroundLayerRef.current.style.backgroundImage = displayedBgUrl ? `url('${displayedBgUrl}')` : "none";
      backgroundLayerRef.current.style.opacity = currentBackgroundUrl ? "1" : "0";
    }
    if (backgroundOverlayRef.current) {
      backgroundOverlayRef.current.style.opacity = currentBackgroundUrl ? "1" : "0";
    }
  }, [enableEffects, displayedBgUrl, currentBackgroundUrl]);

  /**
   * 消息选择
   */
  const [selectedMessageIds, updateSelectedMessageIds] = useState<Set<number>>(new Set());
  const isSelecting = selectedMessageIds.size > 0;

  const toggleMessageSelection = useCallback((messageId: number) => {
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
  }, []);

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
        ...message.extra,
        imageMessage: {
          ...message.extra.imageMessage,
          background: !message.extra.imageMessage.background,
        },
      },
    });
  }

  function toggleUnlockCg(messageId: number) {
    const message = historyMessages.find(m => m.message.messageId === messageId)?.message;
    if (!message || message.messageType !== 2)
      return;

    const currentWebgal = message.webgal || {};
    const isUnlocked = !!currentWebgal.unlockCg;

    updateMessage({
      ...message,
      webgal: {
        ...currentWebgal,
        unlockCg: !isUnlocked,
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
  const handleMoveMessages = useCallback((
    targetIndex: number,
    messageIds: number[],
  ) => {
    const movableMessageIds = isMessageMovable
      ? messageIds.filter((id) => {
          const msg = historyMessages.find(m => m.message.messageId === id)?.message;
          return msg ? isMessageMovable(msg) : false;
        })
      : messageIds;

    if (movableMessageIds.length !== messageIds.length) {
      toast.error("部分消息不支持移动");
    }
    if (movableMessageIds.length === 0) {
      return;
    }

    const messageIdSet = new Set(movableMessageIds);
    const selectedMessages = Array.from(movableMessageIds)
      .map(id => historyMessages.find(m => m.message.messageId === id)?.message)
      .filter((msg): msg is Message => msg !== undefined)
      .sort((a, b) => a.position - b.position);
    // 寻找到不位于 messageIds 中且离 dropPosition 最近的消息
    let topMessageIndex: number = targetIndex;
    let bottomMessageIndex: number = targetIndex + 1;
    while (messageIdSet.has(historyMessages[topMessageIndex]?.message.messageId)) {
      topMessageIndex--;
    }
    while (messageIdSet.has(historyMessages[bottomMessageIndex]?.message.messageId)) {
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
  }, [historyMessages, isMessageMovable, updateMessage]);
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
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    checkPosition(e);
  }, [checkPosition]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    curDragOverMessageRef.current = null;
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, dragEndIndex: number) => {
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
  }, [isSelecting, selectedMessageIds, handleMoveMessages]);

  /**
   * 右键菜单
   */
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number } | null>(null);

  function handleDelete() {
    deleteMessage(contextMenu?.messageId ?? -1);
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
      deleteMessage(messageId);
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
    toggleUseChatBubbleStyle();
    closeContextMenu();
  }

  // 处理回复消息
  function handleReply(message: Message) {
    setReplyMessage(message);
  }

  /**
   * @param index 虚拟列表中的index，为了实现反向滚动，进行了偏移
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
        onClick={(e) => {
          // 检查点击目标是否是按钮或其子元素，如果是则不触发跳转
          const target = e.target as HTMLElement;
          const isButtonClick = target.closest("button") || target.closest("[role=\"button\"]") || target.closest(".btn");

          if (isSelecting || e.ctrlKey) {
            toggleMessageSelection(chatMessageResponse.message.messageId);
          }
          else if (roomContext.jumpToMessageInWebGAL && !isButtonClick) {
            // 如果实时渲染已激活且不是点击按钮，单击消息跳转到 WebGAL 对应位置
            roomContext.jumpToMessageInWebGAL(chatMessageResponse.message.messageId);
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, indexInHistoryMessages)}
        draggable={isSelecting && movable}
        onDragStart={e => handleDragStart(e, indexInHistoryMessages)}
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
            >
              <DraggableIcon className="size-6 "></DraggableIcon>
            </div>
          )
        }
        <ChatBubble
          chatMessageResponse={chatMessageResponse}
          useChatBubbleStyle={useChatBubbleStyle}
          threadHintMeta={threadHintMeta}
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
    toggleMessageSelection,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragStart,
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
            <h3 className="text-lg font-medium text-base-content">正在获取历史消息</h3>
            <p className="text-sm text-base-content/70">请稍候...</p>
          </div>
        </div>
      </div>
    );
  }
  /**
   * 渲染
   */
  return (
    <div className="h-full relative">
      {enableEffects && (
        <>
          {/* Background Image Layer */}
          <div
            ref={backgroundLayerRef}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
          />
          {/* Overlay for tint and blur */}
          <div
            ref={backgroundOverlayRef}
            className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-xs z-0 transition-opacity duration-500"
          />

          {/* Pixi Overlay */}
          <PixiOverlay effectName={currentEffect} />
        </>
      )}

      <div
        className="overflow-y-auto flex flex-col relative h-full"
        onContextMenu={handleContextMenu}
      >
        {selectedMessageIds.size > 0 && (
          <div
            className="absolute top-0 bg-base-300 w-full p-2 shadow-sm z-15 flex justify-between items-center rounded"
          >
            <span>{`已选择${selectedMessageIds.size} 条消息`}</span>
            <div className="gap-x-4 flex">
              <button
                className="btn btn-sm"
                onClick={() => updateSelectedMessageIds(new Set())}
                type="button"
              >
                取消
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setIsExportImageWindowOpen(true)}
                type="button"
              >
                生成图片
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
            firstItemIndex={0}
            initialTopMostItemIndex={historyMessages.length - 1}
            followOutput={true}
            overscan={10} // 不要设得太大，会导致rangeChange更新不及时
            ref={virtuosoRef}
            context={{
              isAtTopRef,
            }}
            rangeChanged={({ endIndex }) => {
              // Update state with the end-most visible item's index.
              setCurrentVirtuosoIndex((endIndex));
            }}
            itemContent={(index, chatMessageResponse) => renderMessage(index, chatMessageResponse)}
            atBottomStateChange={(atBottom) => {
              if (enableUnreadIndicator) {
                atBottom && updateLastReadSyncId(roomId);
              }
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
        {(enableUnreadIndicator && unreadMessageNumber > 0 && historyMessages.length > 2 && !isAtBottomRef.current) && (
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
      {/* 导出图片窗口 */}
      <PopWindow isOpen={isExportImageWindowOpen} onClose={() => setIsExportImageWindowOpen(false)}>
        <ExportImageWindow
          selectedMessages={Array.from(selectedMessageIds)
            .map(id => historyMessages.find(m => m.message.messageId === id))
            .filter((msg): msg is ChatMessageResponse => msg !== undefined)}
          onClose={() => {
            setIsExportImageWindowOpen(false);
            updateSelectedMessageIds(new Set());
          }}
        />
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
