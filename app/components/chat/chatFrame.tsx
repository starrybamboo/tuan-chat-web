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
import ChatFrameMessageItem from "@/components/chat/chatFrameMessageItem";
import ChatFrameOverlays from "@/components/chat/chatFrameOverlays";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatFrameContextMenu from "@/components/chat/hooks/useChatFrameContextMenu";
import useChatFrameDragAndDrop from "@/components/chat/hooks/useChatFrameDragAndDrop";
import useChatFrameMessageActions from "@/components/chat/hooks/useChatFrameMessageActions";
import useChatFrameMessageClick from "@/components/chat/hooks/useChatFrameMessageClick";
import useChatFrameMessages from "@/components/chat/hooks/useChatFrameMessages";
import useChatFrameSelection from "@/components/chat/hooks/useChatFrameSelection";
import useChatFrameVisualEffects from "@/components/chat/hooks/useChatFrameVisualEffects";
import RoleChooser from "@/components/chat/input/roleChooser";
import ChatFrameContextMenu from "@/components/chat/room/contextMenu/chatFrameContextMenu";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { getImageSize } from "@/utils/getImgSize";
import {
  useDeleteMessageMutation,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";
import { useCreateEmojiMutation, useGetUserEmojisQuery } from "../../../api/hooks/emojiQueryHooks";

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

  const chatHistory = roomContext.chatHistory;
  const webSocketUtils = globalContext.websocketUtils;
  const send = (message: ChatMessageRequest) => webSocketUtils.send({ type: 3, data: message });

  const receivedMessages = useMemo(() => webSocketUtils.receivedMessages[roomId] ?? [], [roomId, webSocketUtils.receivedMessages]);

  const { historyMessages, threadHintMetaByMessageId } = useChatFrameMessages({
    messagesOverride,
    enableWsSync,
    roomId,
    chatHistory,
    receivedMessages,
  });

  const deleteMessage = useCallback((messageId: number) => {
    deleteMessageMutation.mutate(messageId, {
      onSuccess: () => {
        const targetMessage = historyMessages.find(m => m.message.messageId === messageId);
        if (targetMessage && roomContext.chatHistory) {
          const updatedMessage = {
            ...targetMessage,
            message: {
              ...targetMessage.message,
              status: 1,
            },
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedMessage);
        }
      },
    });
  }, [deleteMessageMutation, historyMessages, roomContext.chatHistory]);

  const isAtBottomRef = useRef(true);
  const lastAutoSyncUnreadRef = useRef<number | null>(null);
  const isAtTopRef = useRef(false);
  const virtuosoIndexToMessageIndex = useCallback((virtuosoIndex: number) => {
    return virtuosoIndex;
  }, []);
  const messageIndexToVirtuosoIndex = useCallback((messageIndex: number) => {
    return messageIndex - historyMessages.length + CHAT_VIRTUOSO_INDEX_SHIFTER;
  }, [historyMessages.length]);

  const unreadMessageNumber = enableUnreadIndicator
    ? (webSocketUtils.unreadMessagesNumber[roomId] ?? 0)
    : 0;
  const updateLastReadSyncId = webSocketUtils.updateLastReadSyncId;
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

  const { setCurrentVirtuosoIndex } = useChatFrameVisualEffects({
    enableEffects,
    historyMessages,
    onBackgroundUrlChange,
    onEffectChange,
    virtuosoIndexToMessageIndex,
  });

  const updateMessage = useCallback((message: Message) => {
    updateMessageMutation.mutate(message);
    const existingResponse = historyMessages.find(m => m.message.messageId === message.messageId);
    const newResponse = {
      ...existingResponse,
      message,
    };
    roomContext.chatHistory?.addOrUpdateMessage(newResponse as ChatMessageResponse);
  }, [updateMessageMutation, roomContext.chatHistory, historyMessages]);

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
    return (
      <ChatFrameMessageItem
        key={chatMessageResponse.message.messageId}
        chatMessageResponse={chatMessageResponse}
        isSelected={isSelected}
        isDragging={isDragging}
        canJumpToWebGAL={canJumpToWebGAL}
        useChatBubbleStyle={useChatBubbleStyle}
        movable={movable}
        isSelecting={isSelecting}
        threadHintMeta={threadHintMeta}
        onExecuteCommandRequest={onExecuteCommandRequest}
        onMessageClick={e => handleMessageClick(e, chatMessageResponse.message.messageId)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, indexInHistoryMessages)}
        onDragStart={e => handleDragStart(e, indexInHistoryMessages)}
        onDragEnd={handleDragEnd}
      />
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
