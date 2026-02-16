import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageResponse, Message } from "../../../api";
import type { ChatFrameMessageScope } from "@/components/chat/hooks/useChatFrameMessages";
import type { WebgalChooseOptionDraft } from "@/components/chat/shared/webgal/webgalChooseDraft";

import React, { memo, use, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ChatFrameLoadingState from "@/components/chat/chatFrameLoadingState";
import ChatFrameView from "@/components/chat/chatFrameView";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatFrameDragAndDrop from "@/components/chat/hooks/useChatFrameDragAndDrop";
import useChatFrameStickerActions from "@/components/chat/hooks/useChatFrameStickerActions";
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
import { createWebgalChooseOptionDraft } from "@/components/chat/shared/webgal/webgalChooseDraft";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { ANNOTATION_IDS, areAnnotationsEqual, hasAnnotation, normalizeAnnotations } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalChoosePayload } from "@/types/webgalChoose";
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
  messageScope?: ChatFrameMessageScope;
  threadRootMessageId?: number | null;
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
  onOpenThread?: (threadRootMessageId: number) => void;
  spaceName?: string;
  roomName?: string;
}

function ChatFrame(props: ChatFrameProps) {
  const {
    virtuosoRef,
    messagesOverride,
    messageScope = "main",
    threadRootMessageId,
    enableWsSync = true,
    enableEffects = true,
    enableUnreadIndicator = true,
    isMessageMovable,
    onBackgroundUrlChange,
    onEffectChange,
    onExecuteCommandRequest,
    onOpenThread,
    spaceName,
    roomName,
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
    isExportFileWindowOpen,
    isExportImageWindowOpen,
    isRegexSelectWindowOpen,
    setIsForwardWindowOpen,
    setIsExportFileWindowOpen,
    setIsExportImageWindowOpen,
    setIsRegexSelectWindowOpen,
  } = useChatFrameOverlayState();
  const [isWebgalChooseEditorOpen, setIsWebgalChooseEditorOpen] = useState(false);
  const [webgalChooseEditorOptions, setWebgalChooseEditorOptions] = useState<WebgalChooseOptionDraft[]>(() => [
    createWebgalChooseOptionDraft(),
  ]);
  const [webgalChooseEditorError, setWebgalChooseEditorError] = useState<string | null>(null);
  const [webgalChooseEditorMessageId, setWebgalChooseEditorMessageId] = useState<number | null>(null);

  const sendMessageMutation = useSendMessageMutation(roomId);

  // Mutations
  const deleteMessageMutation = useDeleteMessageMutation();
  const updateMessageMutation = useUpdateMessageMutation();

  const { handleToggleNarrator } = useChatFrameNarratorToggle({
    roomContext,
    spaceContext,
    updateMessageMutation,
  });

  const { handleAddSticker } = useChatFrameStickerActions();
  const chatHistory = roomContext.chatHistory;
  const {
    send,
    receivedMessages,
    unreadMessagesNumber,
    updateLastReadSyncId,
  } = useChatFrameWebSocket(roomId);

  const { historyMessages, threadHintMetaByMessageId } = useChatFrameMessages({
    messagesOverride,
    messageScope,
    threadRootMessageId,
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
  const updateWebgalChooseEditorOption = useCallback((index: number, key: keyof WebgalChooseOptionDraft, value: string) => {
    setWebgalChooseEditorOptions(prev => prev.map((option, idx) => (
      idx === index ? { ...option, [key]: value } : option
    )));
  }, []);

  const addWebgalChooseEditorOption = useCallback(() => {
    setWebgalChooseEditorOptions(prev => ([
      ...prev,
      createWebgalChooseOptionDraft(),
    ]));
  }, []);

  const removeWebgalChooseEditorOption = useCallback((index: number) => {
    setWebgalChooseEditorOptions(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)));
  }, []);

  const closeWebgalChooseEditor = useCallback(() => {
    setIsWebgalChooseEditorOpen(false);
    setWebgalChooseEditorError(null);
    setWebgalChooseEditorMessageId(null);
  }, []);

  const openWebgalChooseEditor = useCallback((messageId: number) => {
    const target = historyMessages.find(message => message.message.messageId === messageId);
    if (!target) {
      toast.error("未找到要编辑的消息");
      return;
    }
    if (target.message.messageType !== MESSAGE_TYPE.WEBGAL_CHOOSE) {
      toast.error("该消息不是选择类型");
      return;
    }
    const payload = extractWebgalChoosePayload(target.message.extra);
    if (!payload) {
      toast.error("未找到选择内容");
      return;
    }
    const nextOptions = payload.options.map(option => createWebgalChooseOptionDraft({
      text: option.text,
      code: option.code ?? "",
    }));
    setWebgalChooseEditorOptions(nextOptions.length ? nextOptions : [createWebgalChooseOptionDraft()]);
    setWebgalChooseEditorError(null);
    setWebgalChooseEditorMessageId(messageId);
    setIsWebgalChooseEditorOpen(true);
  }, [historyMessages]);

  const submitWebgalChooseEditor = useCallback(() => {
    const messageId = webgalChooseEditorMessageId;
    if (!messageId) {
      setWebgalChooseEditorError("未找到要编辑的消息");
      return;
    }
    const normalizedOptions = webgalChooseEditorOptions.map(option => ({
      text: option.text.trim(),
      code: option.code.trim(),
    }));
    if (normalizedOptions.length === 0) {
      setWebgalChooseEditorError("请至少添加一个选项");
      return;
    }
    if (normalizedOptions.some(option => !option.text)) {
      setWebgalChooseEditorError("选项文本不能为空");
      return;
    }
    const payload = {
      options: normalizedOptions.map(option => ({
        text: option.text,
        ...(option.code ? { code: option.code } : {}),
      })),
    };
    const target = historyMessages.find(message => message.message.messageId === messageId);
    if (!target) {
      setWebgalChooseEditorError("未找到要编辑的消息");
      return;
    }
    const baseExtra = target.message.extra && typeof target.message.extra === "object"
      ? target.message.extra
      : {};
    const nextMessage: Message = {
      ...target.message,
      extra: {
        ...baseExtra,
        webgalChoose: payload,
      } as Message["extra"],
    };
    updateMessage(nextMessage);
    if (roomContext.updateAndRerenderMessageInWebGAL) {
      roomContext.updateAndRerenderMessageInWebGAL({ ...target, message: nextMessage }, false);
    }
    closeWebgalChooseEditor();
  }, [
    closeWebgalChooseEditor,
    historyMessages,
    roomContext,
    updateMessage,
    webgalChooseEditorMessageId,
    webgalChooseEditorOptions,
  ]);

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
    exitSelection,
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

  const selectedMessages = useMemo(() => {
    return Array.from(selectedMessageIds)
      .map(id => historyMessages.find(m => m.message.messageId === id))
      .filter((msg): msg is ChatMessageResponse => msg !== undefined)
      .sort((a, b) => a.message.position - b.message.position);
  }, [historyMessages, selectedMessageIds]);

  const handleSelectAll = useCallback(() => {
    const next = new Set(historyMessages.map(message => message.message.messageId));
    updateSelectedMessageIds(next);
  }, [historyMessages, updateSelectedMessageIds]);

  const handleApplyRegexFilter = useCallback((matchedIds: Set<number>) => {
    if (matchedIds.size === 0) {
      toast.error("未命中过滤条件");
      return;
    }

    const nextSelection = new Set(selectedMessageIds);
    let removedCount = 0;
    for (const messageId of matchedIds) {
      if (nextSelection.delete(messageId)) {
        removedCount++;
      }
    }
    updateSelectedMessageIds(nextSelection);

    if (removedCount > 0) {
      toast.success(`已过滤 ${removedCount} 条消息`);
      return;
    }
    toast.error("命中消息不在当前已选范围");
  }, [selectedMessageIds, updateSelectedMessageIds]);

  const handleExportFile = useCallback(() => {
    if (selectedMessages.length === 0) {
      toast.error("请选择要导出的消息");
      return;
    }
    setIsExportFileWindowOpen(true);
  }, [selectedMessages.length, setIsExportFileWindowOpen]);

  const {
    handleForward,
  } = useChatFrameMessageActions({
    historyMessages,
    selectedMessageIds,
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
    onOpenThread,
    onEditWebgalChoose: openWebgalChooseEditor,
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
        setIsExportImageWindowOpen,
        setIsForwardWindowOpen,
        handleBatchDelete,
        isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
        isSelecting,
        onSelectAll: handleSelectAll,
        onRegexFilter: () => setIsRegexSelectWindowOpen(true),
        onExportFile: handleExportFile,
        onCancelSelection: exitSelection,
      }}
      overlaysProps={{
        isForwardWindowOpen,
        setIsForwardWindowOpen,
        isExportFileWindowOpen,
        setIsExportFileWindowOpen,
        isExportImageWindowOpen,
        setIsExportImageWindowOpen,
        isRegexSelectWindowOpen,
        setIsRegexSelectWindowOpen,
        historyMessages,
        selectedMessageIds,
        exitSelection,
        onForward: handleForward,
        onApplyRegexFilter: handleApplyRegexFilter,
        spaceName,
        roomName,
        webgalChooseEditor: {
          isOpen: isWebgalChooseEditorOpen,
          options: webgalChooseEditorOptions,
          error: webgalChooseEditorError,
          onChangeOption: updateWebgalChooseEditorOption,
          onAddOption: addWebgalChooseEditorOption,
          onRemoveOption: removeWebgalChooseEditorOption,
          onClose: closeWebgalChooseEditor,
          onSubmit: submitWebgalChooseEditor,
        },
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
        onAddEmoji: handleAddSticker,
        onOpenAnnotations: handleOpenAnnotations,
        onInsertAfter: setInsertAfterMessageId,
        onToggleNarrator: handleToggleNarrator,
        onOpenThread,
      }}
    />
  );
}

export default memo(ChatFrame);
