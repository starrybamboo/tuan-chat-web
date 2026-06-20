import type { VirtuosoHandle } from "react-virtuoso";

import { patchInsertMessages } from "@tuanchat/query/chat";
import React, { memo, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import type { ClueFolderScope } from "@/components/chat/clues/clueRooms";
import type { WebgalChooseOptionDraft } from "@/components/chat/shared/webgal/webgalChooseDraft";
import type { MessageDisplayFilterConfig } from "@/components/chat/utils/messageDisplayFilter";

import ChatFrameLoadingState from "@/components/chat/chatFrameLoadingState";
import ChatFrameView from "@/components/chat/chatFrameView";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatFrameDragAndDrop from "@/components/chat/hooks/useChatFrameDragAndDrop";
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
import { getBaseMessageForVersionDiff, VERSION_STATE_MODIFIED } from "@/components/chat/message/diff/messageVersionDiff";
import useRoomBaseArchiveMessages from "@/components/chat/message/diff/useRoomBaseArchiveMessages";
import {
  toggleImageMessageBackground,
  toggleSoundMessageBgm,
} from "@/components/chat/room/contextMenu/messageMediaQuickActions";
import { compareChatMessageResponsesByOrder } from "@/components/chat/shared/messageOrder";
import { createWebgalChooseOptionDraft } from "@/components/chat/shared/webgal/webgalChooseDraft";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { canParticipateInRoom } from "@/components/chat/utils/memberPermissions";
import { collectMessageDisplayFilterEntries } from "@/components/chat/utils/messageDisplayFilter";
import { ANNOTATION_IDS, areAnnotationsEqual, hasAnnotation, normalizeAnnotations } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalChoosePayload } from "@/types/webgalChoose";
import { tuanchat } from "api/instance";

import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../api";

import {
  useDeleteMessageMutation,
  usePatchMessagesMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";

/**
 * 聊天框（不带输入部分）
 * @param props 组件参数
 * @param props.virtuosoRef 虚拟列表的 ref
 */
type ChatFrameProps = {
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  messagesOverride?: ChatMessageResponse[];
  enableWsSync?: boolean;
  enableEffects?: boolean;
  enableUnreadIndicator?: boolean;
  isMessageMovable?: (message: Message) => boolean;
  onBackgroundUrlChange?: (url: string | null) => void;
  onCombatVisualActiveChange?: (active: boolean) => void;
  onEffectChange?: (effectName: string | null) => void;
  onExecuteCommandRequest?: (payload: {
    command: string;
    requestMessageId: number;
  }) => void;
  isCommandRequestConsumed?: (requestMessageId: number) => boolean;
  spaceName?: string;
  roomName?: string;
  baseArchiveCommitId?: number | null;
  sendMessageWithInsert?: (message: ChatMessageRequest) => Promise<Message | null>;
  onCopyMessageToClueFolder?: (message: Message, scope: ClueFolderScope) => void | Promise<void>;
  onExportPremiere?: (selectedMessages: ChatMessageResponse[]) => void | Promise<void>;
  showFullMessageDiff?: boolean;
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
    onCombatVisualActiveChange,
    onEffectChange,
    onExecuteCommandRequest,
    isCommandRequestConsumed,
    spaceName,
    roomName,
    baseArchiveCommitId,
    onCopyMessageToClueFolder,
    onExportPremiere,
    showFullMessageDiff = false,
  } = props;
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const setReplyMessage = useRoomUiStore(state => state.setReplyMessage);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const toggleUseChatBubbleStyle = useRoomPreferenceStore(state => state.toggleUseChatBubbleStyle);
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const roomId = roomContext.roomId ?? -1;
  const curRoleId = roomContext.curRoleId ?? -1;
  const curAvatarId = roomContext.curAvatarId ?? -1;
  const isAvatarSamplerActive = useRoomUiStore(state => state.isAvatarSamplerActive);
  const visibleVirtuosoRangeRef = useRef({ startIndex: 0, endIndex: 0 });
  const previousWebgalLinkModeRef = useRef(webgalLinkMode);
  const [webgalModeEntryAnimation, setWebgalModeEntryAnimation] = useState<{
    token: number;
    startIndex: number;
    endIndex: number;
  } | null>(null);

  const handleVisibleRangeChange = useCallback((range: { startIndex: number; endIndex: number }) => {
    visibleVirtuosoRangeRef.current = range;
  }, []);

  useEffect(() => {
    const wasEnabled = previousWebgalLinkModeRef.current;
    previousWebgalLinkModeRef.current = webgalLinkMode;

    if (!webgalLinkMode) {
      setWebgalModeEntryAnimation(null);
      return;
    }
    if (wasEnabled) {
      return;
    }

    const { startIndex, endIndex } = visibleVirtuosoRangeRef.current;
    if (endIndex < startIndex) {
      return;
    }
    setWebgalModeEntryAnimation({
      token: Date.now(),
      startIndex,
      endIndex,
    });
    const clearTimer = window.setTimeout(() => {
      setWebgalModeEntryAnimation(null);
    }, 520);
    return () => window.clearTimeout(clearTimer);
  }, [webgalLinkMode]);

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
    isMessageFilterWindowOpen,
    setIsForwardWindowOpen,
    setIsExportFileWindowOpen,
    setIsExportImageWindowOpen,
    setIsMessageFilterWindowOpen,
  } = useChatFrameOverlayState();
  const [isWebgalChooseEditorOpen, setIsWebgalChooseEditorOpen] = useState(false);
  const [webgalChooseEditorOptions, setWebgalChooseEditorOptions] = useState<WebgalChooseOptionDraft[]>(() => [
    createWebgalChooseOptionDraft(),
  ]);
  const [webgalChooseEditorError, setWebgalChooseEditorError] = useState<string | null>(null);
  const [webgalChooseEditorMessageId, setWebgalChooseEditorMessageId] = useState<number | null>(null);
  const [messageDisplayFilter, setMessageDisplayFilter] = useState<MessageDisplayFilterConfig | null>(null);

  // Mutations
  const deleteMessageMutation = useDeleteMessageMutation();
  const updateMessageMutation = useUpdateMessageMutation();
  const patchMessagesMutation = usePatchMessagesMutation(roomId);
  const insertMessagesWithPatch = useCallback((messages: ChatMessageRequest[]) => {
    return patchInsertMessages(tuanchat, messages);
  }, []);

  const { handleToggleNarrator } = useChatFrameNarratorToggle({
    roomContext,
    spaceContext,
    updateMessageMutation,
  });

  const chatHistory = roomContext.chatHistory;
  const {
    send,
    receivedMessages,
    unreadMessagesNumber,
    updateLastReadSyncId,
  } = useChatFrameWebSocket(roomId);

  const { historyMessages } = useChatFrameMessages({
    messagesOverride,
    enableWsSync,
    roomId,
    chatHistory,
    receivedMessages,
    currentUserId: roomContext.curMember?.userId,
    currentMemberType: roomContext.curMember?.memberType,
  });

  const {
    deleteMessage,
    deleteMessages,
    updateMessage,
    updateMessages,
  } = useChatFrameMessageMutations({
    historyMessages,
    roomContext,
    deleteMessageMutation,
    updateMessageMutation,
    patchMessagesMutation,
  });
  const shouldLoadBaseArchiveMessages = useMemo(() => {
    return Boolean(baseArchiveCommitId)
      && (showFullMessageDiff
        || historyMessages.some(message =>
          message.message.versionState === VERSION_STATE_MODIFIED
          && typeof message.message.inheritedArchiveMessageId === "number"
          && Number.isFinite(message.message.inheritedArchiveMessageId),
        ));
  }, [baseArchiveCommitId, historyMessages, showFullMessageDiff]);
  const {
    baseMessageByArchiveId,
    loading: isBaseArchiveMessagesLoading,
  } = useRoomBaseArchiveMessages(
    roomId,
    baseArchiveCommitId,
    shouldLoadBaseArchiveMessages,
  );
  const canRenderFullMessageDiff = showFullMessageDiff
    && (!shouldLoadBaseArchiveMessages || !isBaseArchiveMessagesLoading);
  const getBaseVersionMessage = useCallback((message: ChatMessageResponse) => {
    if (canRenderFullMessageDiff) {
      const inheritedArchiveMessageId = message.message.inheritedArchiveMessageId;
      return typeof inheritedArchiveMessageId === "number" && Number.isFinite(inheritedArchiveMessageId)
        ? (baseMessageByArchiveId.get(inheritedArchiveMessageId) ?? null)
        : null;
    }
    return getBaseMessageForVersionDiff(message, baseMessageByArchiveId);
  }, [baseMessageByArchiveId, canRenderFullMessageDiff]);
  const isMessageFilterActive = messageDisplayFilter !== null;
  const visibleHistoryMessageEntries = useMemo(() => {
    return collectMessageDisplayFilterEntries(historyMessages, messageDisplayFilter);
  }, [historyMessages, messageDisplayFilter]);
  const visibleHistoryMessages = useMemo(
    () => visibleHistoryMessageEntries.map(entry => entry.message),
    [visibleHistoryMessageEntries],
  );
  const visibleHistorySourceIndices = useMemo(
    () => visibleHistoryMessageEntries.map(entry => entry.sourceIndex),
    [visibleHistoryMessageEntries],
  );
  const virtuosoIndexToRenderedMessageIndex = useCallback((virtuosoIndex: number) => {
    return visibleHistorySourceIndices[virtuosoIndex] ?? virtuosoIndex;
  }, [visibleHistorySourceIndices]);
  const isMessageFilterHidingMessages = isMessageFilterActive
    && visibleHistoryMessages.length !== historyMessages.length;
  const getRenderedBaseVersionMessage = useCallback((message: ChatMessageResponse) => {
    return getBaseVersionMessage(message);
  }, [getBaseVersionMessage]);
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
      roomContext.updateAndRerenderMessageInWebGAL(target, { ...target, message: nextMessage }, false);
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
      messageType: target.message.messageType,
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
          roomContext.updateAndRerenderMessageInWebGAL(latest, { ...latest, message: nextMessage }, false);
        }
      },
    });
  }, [historyMessages, roomContext, updateMessage]);

  const applyContextMenuMessageUpdate = useCallback((
    messageId: number,
    buildNextMessage: (message: Message) => Message | null,
  ) => {
    const target = historyMessages.find(message => message.message.messageId === messageId);
    if (!target) {
      return;
    }
    const nextMessage = buildNextMessage(target.message);
    if (!nextMessage) {
      return;
    }
    updateMessage(nextMessage);
    if (roomContext.updateAndRerenderMessageInWebGAL) {
      void roomContext.updateAndRerenderMessageInWebGAL(target, { ...target, message: nextMessage }, false);
    }
  }, [historyMessages, roomContext, updateMessage]);

  const handleToggleBackground = useCallback((messageId: number) => {
    applyContextMenuMessageUpdate(messageId, toggleImageMessageBackground);
  }, [applyContextMenuMessageUpdate]);

  const handleToggleBgm = useCallback((messageId: number) => {
    applyContextMenuMessageUpdate(messageId, toggleSoundMessageBgm);
  }, [applyContextMenuMessageUpdate]);

  const { virtuosoIndexToMessageIndex, messageIndexToVirtuosoIndex } = useChatFrameIndexing();

  const {
    isAtBottomRef,
    isAtTopRef,
    unreadMessageNumber,
    scrollToBottom,
  } = useChatFrameScrollState({
    enableUnreadIndicator,
    historyMessages: visibleHistoryMessages,
    roomId,
    chatHistory,
    unreadMessagesNumber,
    updateLastReadSyncId,
    virtuosoRef,
    messageIndexToVirtuosoIndex,
    suppressInitialAutoScroll: isMessageFilterHidingMessages,
  });

  const { setCurrentVirtuosoIndex } = useChatFrameVisualEffects({
    enableEffects,
    // 筛选只改变列表显示，不应把背景、战斗态、特效的故事状态一起过滤掉。
    historyMessages,
    onBackgroundUrlChange,
    onCombatVisualActiveChange,
    onEffectChange,
    virtuosoIndexToMessageIndex: virtuosoIndexToRenderedMessageIndex,
  });

  /**
   * 消息选择
   */
  const orderedMessageIds = useMemo(
    () => visibleHistoryMessages.map(message => message.message.messageId),
    [visibleHistoryMessages],
  );

  const {
    selectedMessageIds,
    updateSelectedMessageIds,
    isSelecting,
    isSelectionToolbarVisible,
    exitSelection,
    toggleMessageSelection,
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
    deleteMessages,
    toggleUseChatBubbleStyle,
    setReplyMessage,
    orderedMessageIds,
    onJumpToWebGAL: roomContext.jumpToMessageInWebGAL,
  });

  useEffect(() => {
    if (selectedMessageIds.size === 0) {
      return;
    }

    const visibleMessageIds = new Set(visibleHistoryMessages.map(message => message.message.messageId));
    const nextSelection = new Set<number>();
    for (const messageId of selectedMessageIds) {
      if (visibleMessageIds.has(messageId)) {
        nextSelection.add(messageId);
      }
    }

    if (nextSelection.size !== selectedMessageIds.size) {
      updateSelectedMessageIds(nextSelection);
    }
  }, [selectedMessageIds, updateSelectedMessageIds, visibleHistoryMessages]);

  const selectedMessages = useMemo(() => {
    return Array.from(selectedMessageIds)
      .map(id => historyMessages.find(m => m.message.messageId === id))
      .filter((msg): msg is ChatMessageResponse => msg !== undefined)
      .sort(compareChatMessageResponsesByOrder);
  }, [historyMessages, selectedMessageIds]);

  const handleSelectAll = useCallback(() => {
    const next = new Set(visibleHistoryMessages.map(message => message.message.messageId));
    updateSelectedMessageIds(next);
  }, [updateSelectedMessageIds, visibleHistoryMessages]);

  const handleChangeMessageFilter = useCallback((filter: MessageDisplayFilterConfig | null) => {
    setMessageDisplayFilter(filter);
  }, []);

  const handleExportFile = useCallback(() => {
    if (selectedMessages.length === 0) {
      toast.error("请选择要导出的消息");
      return;
    }
    setIsExportFileWindowOpen(true);
  }, [selectedMessages.length, setIsExportFileWindowOpen]);

  const handleExportPremiere = useCallback(() => {
    if (!onExportPremiere)
      return;
    if (selectedMessages.length === 0) {
      toast.error("请选择要生成 PR 文件的消息");
      return;
    }
    void onExportPremiere(selectedMessages);
  }, [onExportPremiere, selectedMessages]);
  const {
    handleForwardToRooms,
  } = useChatFrameMessageActions({
    historyMessages,
    selectedMessageIds,
    curRoleId,
    curAvatarId,
    send,
    sendMessageWithInsert: props.sendMessageWithInsert,
    insertMessages: insertMessagesWithPatch,
    updateMessage,
    setIsForwardWindowOpen,
    clearSelection,
  });

  /**
   * 消息拖拽
   */
  const canMoveMessagesInRoom = canParticipateInRoom(roomContext.curMember?.memberType);
  const {
    isDragging,
    scrollerRef,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useChatFrameDragAndDrop({
    historyMessages: visibleHistoryMessages,
    roomId,
    isMessageMovable,
    updateMessages,
    virtuosoRef,
    isSelecting,
    selectedMessageIds,
    canMoveMessagesInRoom,
  });

  /**
   * 消息渲染
   */
  const canJumpToWebGAL = !!roomContext.jumpToMessageInWebGAL;

  const renderMessage = useChatFrameMessageRenderer({
    selectedMessageIds,
    isDragging,
    isSelecting,
    baseDraggable: true,
    canJumpToWebGAL,
    getBaseVersionMessage: getRenderedBaseVersionMessage,
    showFullMessageDiff: canRenderFullMessageDiff,
    isMessageMovable,
    onExecuteCommandRequest,
    isCommandRequestConsumed,
    onEditWebgalChoose: openWebgalChooseEditor,
    onMessageClick: handleMessageClick,
    onToggleSelection: toggleMessageSelection,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    virtuosoIndexToMessageIndex,
    webgalModeEntryAnimation,
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
        historyMessages: visibleHistoryMessages,
        virtuosoRef,
        scrollerRef,
        isAtBottomRef,
        isAtTopRef,
        setCurrentVirtuosoIndex,
        onVisibleRangeChange: handleVisibleRangeChange,
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
        isSelectionToolbarVisible,
        onSelectAll: handleSelectAll,
        onExportFile: handleExportFile,
        onExportPremiere: onExportPremiere ? handleExportPremiere : undefined,
        onCancelSelection: exitSelection,
        isMessageFilterActive,
        currentMessageFilter: messageDisplayFilter,
        totalMessageCount: historyMessages.length,
        onOpenMessageFilter: () => setIsMessageFilterWindowOpen(true),
      }}
      overlaysProps={{
        isForwardWindowOpen,
        setIsForwardWindowOpen,
        isExportFileWindowOpen,
        setIsExportFileWindowOpen,
        isExportImageWindowOpen,
        setIsExportImageWindowOpen,
        isMessageFilterWindowOpen,
        setIsMessageFilterWindowOpen,
        historyMessages,
        filterSourceMessages: historyMessages,
        currentMessageFilter: messageDisplayFilter,
        scrollerRef,
        selectedMessageIds,
        exitSelection,
        onForward: handleForwardToRooms,
        onChangeMessageFilter: handleChangeMessageFilter,
        currentSpaceId: roomContext.spaceId ?? -1,
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
        historyMessages: visibleHistoryMessages,
        selectedMessageIds,
        onClose: closeContextMenu,
        onDelete: handleDelete,
        onToggleSelection: toggleMessageSelection,
        onReply: handleReply,
        onEditMessage: handleEditMessage,
        onToggleBackground: handleToggleBackground,
        onToggleBgm: handleToggleBgm,
        onOpenAnnotations: handleOpenAnnotations,
        onInsertAfter: setInsertAfterMessageId,
        onCopyMessageToClueFolder,
        onToggleNarrator: handleToggleNarrator,
      }}
    />
  );
}

export default memo(ChatFrame);
