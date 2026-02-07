import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageResponse, Message } from "../../../api";
import React, { memo, use, useCallback, useEffect } from "react";
import ChatFrameLoadingState from "@/components/chat/chatFrameLoadingState";
import ChatFrameView from "@/components/chat/chatFrameView";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatFrameDragAndDrop from "@/components/chat/hooks/useChatFrameDragAndDrop";
import useChatFrameEmojiActions from "@/components/chat/hooks/useChatFrameEmojiActions";
import useChatFrameIndexing from "@/components/chat/hooks/useChatFrameIndexing";
import useChatFrameMessageActions from "@/components/chat/hooks/useChatFrameMessageActions";
import useChatFrameMessageMutations from "@/components/chat/hooks/useChatFrameMessageMutations";
import useChatFrameMessageRenderer from "@/components/chat/hooks/useChatFrameMessageRenderer";
import useChatFrameMessages from "@/components/chat/hooks/useChatFrameMessages";
import useChatFrameNarratorToggle from "@/components/chat/hooks/useChatFrameNarratorToggle";
import useChatFrameOverlayState from "@/components/chat/hooks/useChatFrameOverlayState";
import useChatFrameScrollState from "@/components/chat/hooks/useChatFrameScrollState";
import useChatFrameSelectionContext from "@/components/chat/hooks/useChatFrameSelectionContext";
import useChatFrameVisualEffects from "@/components/chat/hooks/useChatFrameVisualEffects";
import useChatFrameWebSocket from "@/components/chat/hooks/useChatFrameWebSocket";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { ANNOTATION_IDS, areAnnotationsEqual, hasAnnotation, normalizeAnnotations } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import {
  useDeleteMessageMutation,
  useSendMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";

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
  onBackgroundUrlChange?: (url: string | null) => void;
  onEffectChange?: (effectName: string | null) => void;
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
    onExecuteCommandRequest,
  } = props;
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const setReplyMessage = useRoomUiStore(state => state.setReplyMessage);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const toggleUseChatBubbleStyle = useRoomPreferenceStore(state => state.toggleUseChatBubbleStyle);
  const roomId = roomContext.roomId ?? -1;
  const curRoleId = roomContext.curRoleId ?? -1;
  const curAvatarId = roomContext.curAvatarId ?? -1;
  const isAvatarSamplerActive = useRoomUiStore(state => state.isAvatarSamplerActive);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const className = "avatar-sampler-active";
    if (isAvatarSamplerActive) {
      document.body.classList.add(className);
      return () => {
        document.body.classList.remove(className);
      };
    }
    document.body.classList.remove(className);
    return () => {};
  }, [isAvatarSamplerActive]);

  const {
    isForwardWindowOpen,
    isExportImageWindowOpen,
    setIsForwardWindowOpen,
    setIsExportImageWindowOpen,
  } = useChatFrameOverlayState();

  const sendMessageMutation = useSendMessageMutation(roomId);

  // Mutations
  const deleteMessageMutation = useDeleteMessageMutation();
  const updateMessageMutation = useUpdateMessageMutation();

  const { handleToggleNarrator } = useChatFrameNarratorToggle({
    roomContext,
    spaceContext,
    updateMessageMutation,
  });

  const { handleAddEmoji } = useChatFrameEmojiActions();
  const chatHistory = roomContext.chatHistory;
  const {
    send,
    receivedMessages,
    unreadMessagesNumber,
    updateLastReadSyncId,
  } = useChatFrameWebSocket(roomId);

  const { historyMessages, threadHintMetaByMessageId } = useChatFrameMessages({
    messagesOverride,
    enableWsSync,
    roomId,
    chatHistory,
    receivedMessages,
  });

  const { deleteMessage, updateMessage } = useChatFrameMessageMutations({
    historyMessages,
    roomContext,
    deleteMessageMutation,
    updateMessageMutation,
  });

  const handleOpenAnnotations = useCallback((messageId: number) => {
    const target = historyMessages.find(message => message.message.messageId === messageId);
    if (!target)
      return;
    const initialSelected = Array.isArray(target.message.annotations) ? target.message.annotations : [];
    openMessageAnnotationPicker({
      initialSelected,
      onChange: (next) => {
        const latest = historyMessages.find(message => message.message.messageId === messageId);
        if (!latest)
          return;
        const nextAnnotations = normalizeAnnotations(next);
        const annotationsChanged = !areAnnotationsEqual(latest.message.annotations, nextAnnotations);
        const isImageMessage = latest.message.messageType === MESSAGE_TYPE.IMG;
        const imageMessage = latest.message.extra?.imageMessage;
        const currentBackground = Boolean(imageMessage?.background);
        const nextBackground = isImageMessage
          ? hasAnnotation(nextAnnotations, ANNOTATION_IDS.BACKGROUND)
          : currentBackground;
        const backgroundChanged = Boolean(imageMessage) && nextBackground !== currentBackground;
        if (!annotationsChanged && !backgroundChanged) {
          return;
        }

        const nextMessage: Message = backgroundChanged && imageMessage
          ? {
              ...latest.message,
              annotations: nextAnnotations,
              extra: {
                ...latest.message.extra,
                imageMessage: {
                  ...imageMessage,
                  background: nextBackground,
                },
              },
            }
          : {
              ...latest.message,
              annotations: nextAnnotations,
            };
        updateMessage(nextMessage);
        if (roomContext.updateAndRerenderMessageInWebGAL) {
          roomContext.updateAndRerenderMessageInWebGAL({ ...latest, message: nextMessage }, false);
        }
      },
    });
  }, [historyMessages, roomContext, updateMessage]);

  const { virtuosoIndexToMessageIndex, messageIndexToVirtuosoIndex } = useChatFrameIndexing(historyMessages.length);

  const {
    isAtBottomRef,
    isAtTopRef,
    unreadMessageNumber,
    scrollToBottom,
  } = useChatFrameScrollState({
    enableUnreadIndicator,
    historyMessages,
    roomId,
    chatHistory,
    unreadMessagesNumber,
    updateLastReadSyncId,
    virtuosoRef,
    messageIndexToVirtuosoIndex,
  });

  const { setCurrentVirtuosoIndex } = useChatFrameVisualEffects({
    enableEffects,
    historyMessages,
    onBackgroundUrlChange,
    onEffectChange,
    virtuosoIndexToMessageIndex,
  });

  /**
   * 消息选择
   */
  const {
    selectedMessageIds,
    updateSelectedMessageIds,
    isSelecting,
    toggleMessageSelection,
    handleBatchDelete,
    handleEditMessage,
    contextMenu,
    closeContextMenu,
    handleContextMenu,
    clearSelection,
    handleDelete,
    handleReply,
    handleMessageClick,
  } = useChatFrameSelectionContext({
    deleteMessage,
    toggleUseChatBubbleStyle,
    setReplyMessage,
    onJumpToWebGAL: roomContext.jumpToMessageInWebGAL,
  });

  const {
    handleForward,
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

  /**
   * 消息拖拽
   */
  const {
    isDragging,
    scrollerRef,
    handleMoveMessages,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useChatFrameDragAndDrop({
    historyMessages,
    isMessageMovable,
    updateMessage,
    virtuosoRef,
    isSelecting,
    selectedMessageIds,
  });

  /**
   * 消息渲染
   */
  const baseDraggable = (roomContext.curMember?.memberType ?? 3) < 3;
  const canJumpToWebGAL = !!roomContext.jumpToMessageInWebGAL;

  const renderMessage = useChatFrameMessageRenderer({
    selectedMessageIds,
    isDragging,
    isSelecting,
    baseDraggable,
    canJumpToWebGAL,
    isMessageMovable,
    threadHintMetaByMessageId,
    onExecuteCommandRequest,
    onMessageClick: handleMessageClick,
    onToggleSelection: toggleMessageSelection,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    virtuosoIndexToMessageIndex,
  });
  if (chatHistory?.loading) {
    return <ChatFrameLoadingState />;
  }
  /**
   * 渲染
   */
  return (
    <ChatFrameView
      listProps={{
        historyMessages,
        virtuosoRef,
        scrollerRef,
        isAtBottomRef,
        isAtTopRef,
        setCurrentVirtuosoIndex,
        enableUnreadIndicator,
        unreadMessageNumber,
        scrollToBottom,
        updateLastReadSyncId,
        roomId,
        renderMessage,
        onContextMenu: handleContextMenu,
        selectedMessageIds,
        updateSelectedMessageIds,
        setIsExportImageWindowOpen,
        setIsForwardWindowOpen,
        handleBatchDelete,
        isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
      }}
      overlaysProps={{
        isForwardWindowOpen,
        setIsForwardWindowOpen,
        isExportImageWindowOpen,
        setIsExportImageWindowOpen,
        historyMessages,
        selectedMessageIds,
        updateSelectedMessageIds,
        onForward: handleForward,
        generateForwardMessage,
      }}
      contextMenuProps={{
        contextMenu,
        historyMessages,
        isSelecting,
        selectedMessageIds,
        onClose: closeContextMenu,
        onDelete: handleDelete,
        onToggleSelection: toggleMessageSelection,
        onReply: handleReply,
        onMoveMessages: handleMoveMessages,
        onEditMessage: handleEditMessage,
        onAddEmoji: handleAddEmoji,
        onOpenAnnotations: handleOpenAnnotations,
        onInsertAfter: setInsertAfterMessageId,
        onToggleNarrator: handleToggleNarrator,
      }}
    />
  );
}

export default memo(ChatFrame);
