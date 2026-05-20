import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../api";
import type { ClueFolderScope } from "@/components/chat/clues/clueRooms";
import type { GalPatchProposal, GalPatchProposalApplyOptions } from "@/components/chat/galgameAi";
import type { ChatFrameMessageScope } from "@/components/chat/hooks/useChatFrameMessages";
import type { WebgalChooseOptionDraft } from "@/components/chat/shared/webgal/webgalChooseDraft";

import { Check, X } from "@phosphor-icons/react";
import React, { memo, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import ChatFrameLoadingState from "@/components/chat/chatFrameLoadingState";
import ChatFrameView from "@/components/chat/chatFrameView";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { buildGalProposalMessagePreview, summarizeGalPatchProposalSelection } from "@/components/chat/galgameAi";
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
import { ANNOTATION_IDS, areAnnotationsEqual, hasAnnotation, normalizeAnnotations } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalChoosePayload } from "@/types/webgalChoose";
import {
  useBatchSendMessageMutation,
  useDeleteMessageMutation,
  useUpdateMessageMutation,
} from "../../../api/hooks/chatQueryHooks";

const EMPTY_REJECTED_GAL_PATCH_MESSAGE_IDS = new Set<string>();

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
  isCommandRequestConsumed?: (requestMessageId: number) => boolean;
  spaceName?: string;
  roomName?: string;
  baseArchiveCommitId?: number | null;
  sendMessageWithInsert?: (message: ChatMessageRequest) => Promise<Message | null>;
  onCopyMessageToClueFolder?: (message: Message, scope: ClueFolderScope) => void | Promise<void>;
  onExportPremiere?: (selectedMessages: ChatMessageResponse[]) => void | Promise<void>;
  showFullMessageDiff?: boolean;
  galPatchProposal?: GalPatchProposal | null;
  isApplyingGalPatchProposal?: boolean;
  onApplyGalPatchProposal?: (proposal: GalPatchProposal, options?: GalPatchProposalApplyOptions) => void | Promise<void>;
  onDiscardGalPatchProposal?: (proposal: GalPatchProposal) => void;
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
    isCommandRequestConsumed,
    spaceName,
    roomName,
    baseArchiveCommitId,
    onCopyMessageToClueFolder,
    onExportPremiere,
    showFullMessageDiff = false,
    galPatchProposal = null,
    isApplyingGalPatchProposal = false,
    onApplyGalPatchProposal,
    onDiscardGalPatchProposal,
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
  const [galPatchDecisionState, setGalPatchDecisionState] = useState<{
    proposalId: string | null;
    rejectedMessageIds: Set<string>;
  }>(() => ({
    proposalId: null,
    rejectedMessageIds: new Set(),
  }));
  const activeGalPatchProposalId = galPatchProposal?.proposalId ?? null;
  const rejectedGalPatchMessageIds = galPatchDecisionState.proposalId === activeGalPatchProposalId
    ? galPatchDecisionState.rejectedMessageIds
    : EMPTY_REJECTED_GAL_PATCH_MESSAGE_IDS;

  const batchSendMessageMutation = useBatchSendMessageMutation(roomId);

  // Mutations
  const deleteMessageMutation = useDeleteMessageMutation();
  const updateMessageMutation = useUpdateMessageMutation();

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
    messageScope,
    threadRootMessageId,
    enableWsSync,
    roomId,
    chatHistory,
    receivedMessages,
    currentUserId: roomContext.curMember?.userId,
    currentMemberType: roomContext.curMember?.memberType,
  });

  const { deleteMessage, updateMessage } = useChatFrameMessageMutations({
    historyMessages,
    roomContext,
    deleteMessageMutation,
    updateMessageMutation,
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
  const galProposalPreview = useMemo(() => buildGalProposalMessagePreview({
    historyMessages,
    proposal: galPatchProposal,
  }), [galPatchProposal, historyMessages]);
  const acceptedGalPatchMessageIds = useMemo(() => {
    if (!galProposalPreview) {
      return [];
    }
    return galProposalPreview.changedMessageIds.filter(messageId => !rejectedGalPatchMessageIds.has(messageId));
  }, [galProposalPreview, rejectedGalPatchMessageIds]);
  const galPatchSelectionSummary = useMemo(() => {
    if (!galPatchProposal || !galProposalPreview) {
      return null;
    }
    return summarizeGalPatchProposalSelection(galPatchProposal, acceptedGalPatchMessageIds);
  }, [acceptedGalPatchMessageIds, galPatchProposal, galProposalPreview]);
  const renderedHistoryMessages = galProposalPreview?.messages ?? historyMessages;
  const getRenderedBaseVersionMessage = useCallback((message: ChatMessageResponse) => {
    if (galProposalPreview) {
      return galProposalPreview.baseMessageByPreviewId.get(message.message.messageId) ?? null;
    }
    return getBaseVersionMessage(message);
  }, [galProposalPreview, getBaseVersionMessage]);
  const setGalPatchMessageAccepted = useCallback((messageId: string, accepted: boolean) => {
    setGalPatchDecisionState((current) => {
      const base = current.proposalId === activeGalPatchProposalId
        ? current.rejectedMessageIds
        : EMPTY_REJECTED_GAL_PATCH_MESSAGE_IDS;
      const next = new Set(base);
      if (accepted) {
        next.delete(messageId);
      }
      else {
        next.add(messageId);
      }
      return {
        proposalId: activeGalPatchProposalId,
        rejectedMessageIds: next,
      };
    });
  }, [activeGalPatchProposalId]);
  const acceptAllGalPatchMessages = useCallback(() => {
    setGalPatchDecisionState({
      proposalId: activeGalPatchProposalId,
      rejectedMessageIds: new Set(),
    });
  }, [activeGalPatchProposalId]);
  const rejectAllGalPatchMessages = useCallback(() => {
    if (!galProposalPreview) {
      return;
    }
    setGalPatchDecisionState({
      proposalId: activeGalPatchProposalId,
      rejectedMessageIds: new Set(galProposalPreview.changedMessageIds),
    });
  }, [activeGalPatchProposalId, galProposalPreview]);
  const getGalPatchLineAction = useCallback((message: ChatMessageResponse) => {
    if (!galProposalPreview) {
      return null;
    }
    const proposalMessageId = galProposalPreview.proposalMessageIdByPreviewId.get(message.message.messageId);
    if (!proposalMessageId) {
      return null;
    }
    const accepted = !rejectedGalPatchMessageIds.has(proposalMessageId);
    return (
      <GalPatchLineDecision
        accepted={accepted}
        onAccept={() => setGalPatchMessageAccepted(proposalMessageId, true)}
        onReject={() => setGalPatchMessageAccepted(proposalMessageId, false)}
      />
    );
  }, [galProposalPreview, rejectedGalPatchMessageIds, setGalPatchMessageAccepted]);
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

  const { virtuosoIndexToMessageIndex, messageIndexToVirtuosoIndex } = useChatFrameIndexing(renderedHistoryMessages.length);

  const {
    isAtBottomRef,
    isAtTopRef,
    unreadMessageNumber,
    scrollToBottom,
  } = useChatFrameScrollState({
    enableUnreadIndicator: enableUnreadIndicator && !galProposalPreview,
    historyMessages: renderedHistoryMessages,
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
  const orderedMessageIds = useMemo(
    () => historyMessages.map(message => message.message.messageId),
    [historyMessages],
  );

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
    orderedMessageIds,
    onJumpToWebGAL: roomContext.jumpToMessageInWebGAL,
  });

  const selectedMessages = useMemo(() => {
    return Array.from(selectedMessageIds)
      .map(id => historyMessages.find(m => m.message.messageId === id))
      .filter((msg): msg is ChatMessageResponse => msg !== undefined)
      .sort(compareChatMessageResponsesByOrder);
  }, [historyMessages, selectedMessageIds]);

  const handleReplySelection = useCallback(() => {
    if (selectedMessages.length !== 1) {
      toast.error("请选择 1 条消息进行回复");
      return;
    }
    setReplyMessage(selectedMessages[0].message);
    exitSelection();
  }, [exitSelection, selectedMessages, setReplyMessage]);

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

  const handleExportPremiere = useCallback(() => {
    if (!onExportPremiere)
      return;
    if (selectedMessages.length === 0) {
      toast.error("请选择要生成 PR 文件的消息");
      return;
    }
    void onExportPremiere(selectedMessages);
  }, [onExportPremiere, selectedMessages]);
  const handleApplyGalPatchProposal = useCallback(() => {
    if (!galPatchProposal) {
      return;
    }
    if (!onApplyGalPatchProposal) {
      toast.error("当前没有可用的 proposal 应用入口");
      return;
    }
    if (galProposalPreview && acceptedGalPatchMessageIds.length === 0) {
      toast.error("请至少接受一行改动");
      return;
    }
    void onApplyGalPatchProposal(galPatchProposal, galProposalPreview
      ? { acceptedMessageIds: acceptedGalPatchMessageIds }
      : undefined);
  }, [acceptedGalPatchMessageIds, galPatchProposal, galProposalPreview, onApplyGalPatchProposal]);

  const handleDiscardGalPatchProposal = useCallback(() => {
    if (!galPatchProposal || !onDiscardGalPatchProposal) {
      return;
    }
    onDiscardGalPatchProposal(galPatchProposal);
  }, [galPatchProposal, onDiscardGalPatchProposal]);

  const {
    handleForward,
  } = useChatFrameMessageActions({
    historyMessages,
    selectedMessageIds,
    curRoleId,
    curAvatarId,
    send,
    sendMessageWithInsert: props.sendMessageWithInsert,
    batchSendMessagesAsync: batchSendMessageMutation.mutateAsync,
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
    handleMoveMessages,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useChatFrameDragAndDrop({
    historyMessages,
    roomId,
    isMessageMovable,
    updateMessage,
    virtuosoRef,
    isSelecting,
    selectedMessageIds,
    canMoveMessagesInRoom,
  });

  /**
   * 消息渲染
   */
  const canJumpToWebGAL = !!roomContext.jumpToMessageInWebGAL;
  const isGalProposalPreviewActive = Boolean(galProposalPreview);
  const baseDraggable = !isGalProposalPreviewActive;

  const renderMessage = useChatFrameMessageRenderer({
    selectedMessageIds,
    isDragging,
    isSelecting,
    baseDraggable,
    canJumpToWebGAL: canJumpToWebGAL && !isGalProposalPreviewActive,
    getBaseVersionMessage: getRenderedBaseVersionMessage,
    showFullMessageDiff: isGalProposalPreviewActive || canRenderFullMessageDiff,
    showAddedMessageDiff: !isGalProposalPreviewActive,
    getMessageAction: isGalProposalPreviewActive ? getGalPatchLineAction : undefined,
    disableInsertAction: isGalProposalPreviewActive,
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
        historyMessages: renderedHistoryMessages,
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
        handleBatchDelete,
        isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
        isSelecting,
        onReplySelection: handleReplySelection,
        onSelectAll: handleSelectAll,
        onRegexFilter: () => setIsRegexSelectWindowOpen(true),
        onExportFile: handleExportFile,
        onExportPremiere: onExportPremiere ? handleExportPremiere : undefined,
        onCancelSelection: exitSelection,
        galPatchProposalToolbar: galPatchProposal
          ? {
              ...(galPatchSelectionSummary ?? galPatchProposal.summary),
              isApplying: isApplyingGalPatchProposal,
              onApply: handleApplyGalPatchProposal,
              onDiscard: onDiscardGalPatchProposal ? handleDiscardGalPatchProposal : undefined,
              onAcceptAll: galProposalPreview ? acceptAllGalPatchMessages : undefined,
              onRejectAll: galProposalPreview ? rejectAllGalPatchMessages : undefined,
            }
          : null,
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
        historyMessages,
        isSelecting,
        selectedMessageIds,
        onClose: closeContextMenu,
        onDelete: handleDelete,
        onToggleSelection: toggleMessageSelection,
        onReply: handleReply,
        onMoveMessages: handleMoveMessages,
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

const GalPatchLineDecision = memo(({
  accepted,
  onAccept,
  onReject,
}: {
  accepted: boolean;
  onAccept: () => void;
  onReject: () => void;
}) => {
  const handleAccept = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onAccept();
  }, [onAccept]);
  const handleReject = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onReject();
  }, [onReject]);

  return (
    <div className="inline-flex items-center rounded-md border border-base-300/70 bg-base-100/80 p-0.5 text-xs shadow-sm">
      <button
        type="button"
        className={`btn btn-xs h-6 min-h-0 gap-1 rounded-[5px] px-2 ${
          accepted
            ? "btn-success text-success-content"
            : "btn-ghost text-base-content/65 hover:bg-success/10 hover:text-success"
        }`}
        onClick={handleAccept}
        title="接受此行"
        aria-label="接受此行"
        aria-pressed={accepted}
      >
        <Check className="size-3.5" />
        接受
      </button>
      <button
        type="button"
        className={`btn btn-xs h-6 min-h-0 gap-1 rounded-[5px] px-2 ${
          accepted
            ? "btn-ghost text-base-content/65 hover:bg-error/10 hover:text-error"
            : "border-error/35 bg-error/10 text-error hover:bg-error/15"
        }`}
        onClick={handleReject}
        title="不接受此行"
        aria-label="不接受此行"
        aria-pressed={!accepted}
      >
        <X className="size-3.5" />
        不接受
      </button>
    </div>
  );
});

export default memo(ChatFrame);
