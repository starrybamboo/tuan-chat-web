import type { ChatMessageResponse, Message } from "../../../../api";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { getNextSyncedSoundMessagePurpose } from "@/components/chat/infra/audioMessage/audioMessagePurpose";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import { buildAnnotationMap } from "@/components/chat/message/annotations/annotationCatalog";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import EditableMessageContent from "@/components/chat/message/editableMessageContent";
import MessageContentRenderer from "@/components/chat/message/messageContentRenderer";
import ForwardMessage from "@/components/chat/message/preview/forwardMessage";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";
import RoomJumpMessage from "@/components/chat/message/roomJump/roomJumpMessage";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomRoleSelectionStore } from "@/components/chat/stores/roomRoleSelectionStore";
import { useRoomUiStore, useRoomUiStoreApi } from "@/components/chat/stores/roomUiStore";
import { isObserverLike } from "@/components/chat/utils/memberPermissions";
import { isOutOfCharacterSpeech } from "@/components/chat/utils/outOfCharacterSpeech";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import { extractRoomJumpPayload } from "@/components/chat/utils/roomJump";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { useGlobalContext } from "@/components/globalContextProvider";
import { CommentOutline, Edit2Outline, EmojiIconWhite, InsertLineBelow, ListUnordered, MoreMenu, NarratorIcon, ScreenIcon } from "@/icons";
import {
  ANNOTATION_IDS,
  areAnnotationsEqual,
  getEffectDurationMs,
  hasAnnotation,
  normalizeAnnotations,
  setAnnotation,
  toggleAnnotation,
} from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { formatTimeSmartly } from "@/utils/dateUtil";
import { getScreenSize } from "@/utils/getScreenSize";
import { isRoleNotFoundApiError } from "@/utils/roleApiError";
import { countTextEnhanceVisibleLength, formatTextEnhanceVisibleLength } from "@/utils/textEnhanceMetrics";
import { areRealtimeRenderMessagesEquivalent } from "@/webGAL/realtimeRenderMessageDelta";
import { useUpdateMessageMutation } from "../../../../api/hooks/chatQueryHooks";
import { useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import { useGetUserInfoQuery } from "../../../../api/hooks/UserHooks";
import DocCardMessage from "./docCard/docCardMessage";
import {
  CHAT_MESSAGE_ANNOTATIONS_CLASS,
  CHAT_MESSAGE_BUBBLE_BASE_CLASS,
  CHAT_MESSAGE_HOVER_TOOLBAR_CLASS,
  CHAT_MESSAGE_META_ROW_CLASS,
  CHAT_MESSAGE_ROW_CLASS,
} from "./messageCardStyle";

interface CommandRequestPayload {
  command: string;
  allowAll?: boolean;
  allowedRoleIds?: number[];
}

const EFFECT_PREVIEW_DURATION_MS = 2000;

function ChatBubbleComponent({ chatMessageResponse, useChatBubbleStyle, onExecuteCommandRequest, onToggleSelection, onEditWebgalChoose }: {
  /** 包含聊天消息内容、发送者等信息的数据对象 */
  chatMessageResponse: ChatMessageResponse;
  /** 控制是否应用气泡样式，默认为false */
  useChatBubbleStyle?: boolean;
  /** 点击“检定请求”按钮后，触发外层执行（以点击者身份发送并执行指令） */
  onExecuteCommandRequest?: (payload: { command: string; threadId?: number; requestMessageId: number }) => void;
  onToggleSelection?: (messageId: number) => void;
  onEditWebgalChoose?: (messageId: number) => void;
}) {
  const message = chatMessageResponse.message;
  const annotations = useMemo(() => {
    const base = normalizeAnnotations(message.annotations);
    if (message.messageType === MESSAGE_TYPE.IMG && message.extra?.imageMessage?.background) {
      return base.includes(ANNOTATION_IDS.BACKGROUND) ? base : [...base, ANNOTATION_IDS.BACKGROUND];
    }
    return base;
  }, [message.annotations, message.extra?.imageMessage?.background, message.messageType]);
  const effectPreview = useMemo(() => {
    const annotationMap = buildAnnotationMap();
    for (const id of annotations) {
      const def = annotationMap.get(id);
      if (def?.category === "特效" && def.iconUrl) {
        const duration = getEffectDurationMs(id) ?? EFFECT_PREVIEW_DURATION_MS;
        return { iconUrl: def.iconUrl, durationMs: duration };
      }
    }
    return null;
  }, [annotations]);
  const effectIconUrl = effectPreview?.iconUrl ?? null;
  const [effectPreviewVisible, setEffectPreviewVisible] = useState(false);
  const [effectPreviewToken, setEffectPreviewToken] = useState(0);
  const effectPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerEffectPreview = useCallback(() => {
    if (!effectIconUrl) {
      return;
    }
    setEffectPreviewVisible(true);
    setEffectPreviewToken(Date.now());
    if (effectPreviewTimerRef.current) {
      clearTimeout(effectPreviewTimerRef.current);
    }
    effectPreviewTimerRef.current = setTimeout(() => {
      setEffectPreviewVisible(false);
    }, effectPreview?.durationMs ?? EFFECT_PREVIEW_DURATION_MS);
  }, [effectIconUrl, effectPreview?.durationMs]);
  useEffect(() => () => {
    if (effectPreviewTimerRef.current) {
      clearTimeout(effectPreviewTimerRef.current);
    }
  }, []);
  const useRoleRequest = useGetRoleQuery(chatMessageResponse.message.roleId ?? 0);
  const role = useRoleRequest.data?.data;
  const roleDeleted = isRoleNotFoundApiError(useRoleRequest.error);

  const updateMessageMutation = useUpdateMessageMutation();

  const userId = useGlobalContext().userId;

  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const setReplyMessage = useRoomUiStore(state => state.setReplyMessage);
  const roomUiStoreApi = useRoomUiStoreApi();
  const isAvatarSamplerActive = useRoomUiStore(state => state.isAvatarSamplerActive);
  const setAvatarSamplerActive = useRoomUiStore(state => state.setAvatarSamplerActive);
  const useChatBubbleStyleFromStore = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  useChatBubbleStyle = useChatBubbleStyle ?? useChatBubbleStyleFromStore;
  const setCurRoleIdForRoom = useRoomRoleSelectionStore(state => state.setCurRoleIdForRoom);
  const setCurAvatarIdForRole = useRoomRoleSelectionStore(state => state.setCurAvatarIdForRole);

  const isMobile = getScreenSize() === "sm";

  // 角色名编辑状态
  const [isEditingRoleName, setIsEditingRoleName] = useState(false);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [isEditingContent, setIsEditingContent] = useState(false);
  const editInputRef = useRef<ChatInputAreaHandle | null>(null);

  // 判断是否为旁白（无角色）- 包括 roleId 为空/undefined/0/负数 的情况
  const isNarrator = !message.roleId || message.roleId <= 0;
  // 判断是否为黑屏文字
  const isIntroText = message.messageType === MESSAGE_TYPE.INTRO_TEXT;
  const isStateEventMessage = message.messageType === MESSAGE_TYPE.STATE_EVENT;
  const createTime = message.createTime;
  const updateTime = message.updateTime;
  const parseTimeToMs = (time?: string | number | null) => {
    if (time == null) {
      return undefined;
    }
    if (typeof time === "number") {
      return Number.isFinite(time) ? time : undefined;
    }
    const normalized = time.includes("-") ? time.replace(/-/g, "/") : time;
    const parsed = new Date(normalized).getTime();
    return Number.isNaN(parsed) ? undefined : parsed;
  };
  const createTimeMs = parseTimeToMs(createTime);
  const updateTimeMs = parseTimeToMs(updateTime);
  const isEdited = Boolean(createTimeMs && updateTimeMs && updateTimeMs > createTimeMs);
  const displayTime = (isEdited ? updateTime : createTime) ?? updateTime ?? createTime;
  const formattedTime = displayTime ? formatTimeSmartly(displayTime) : "";
  // 获取自定义角色名（如果有）
  const customRoleName = message.customRoleName as string | undefined;
  // 获取黑屏文字的 hold 设置
  const introHold = hasAnnotation(annotations, ANNOTATION_IDS.INTRO_HOLD);
  // 获取显示的角色名（黑屏文字不显示）
  const displayRoleName = getDisplayRoleName({
    roleId: message.roleId,
    roleName: role?.roleName,
    customRoleName,
    isIntroText,
    fallback: roleDeleted ? "角色已删除" : "未选择角色",
  });
  const roomContentAlertThreshold = useRealtimeRenderStore(state => state.roomContentAlertThreshold);
  const messageContent = (message.content ?? "").toString();
  const messageContentLength = countTextEnhanceVisibleLength(messageContent);
  const isOutOfCharacterTextMessage = message.messageType === MESSAGE_TYPE.TEXT
    && isOutOfCharacterSpeech(message.content);
  const shouldUseUserAvatar = isOutOfCharacterTextMessage;
  const outOfCharacterUserQuery = useGetUserInfoQuery(message.userId, {
    enabled: isOutOfCharacterTextMessage && message.userId > 0,
  });
  const outOfCharacterUser = outOfCharacterUserQuery.data?.data;
  const speakerDisplayName = isOutOfCharacterTextMessage
    ? (outOfCharacterUser?.username?.trim() || `用户${message.userId}`)
    : displayRoleName;
  const showRoleNameEditor = !isIntroText && !isOutOfCharacterTextMessage && isEditingRoleName;
  const chatMessageMetaRowClass = isOutOfCharacterTextMessage
    ? "flex items-center gap-2 w-full min-w-0 relative"
    : CHAT_MESSAGE_META_ROW_CLASS;
  const outOfCharacterBadge = isOutOfCharacterTextMessage
    ? (
        <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-warning/45 bg-warning/18 px-2.5 py-1 text-[11px] leading-none font-semibold tracking-[0.08em] text-warning shadow-sm">
          场外
        </span>
      )
    : null;
  const isThresholdTrackedMessageType = (message.messageType === MESSAGE_TYPE.TEXT
    || message.messageType === MESSAGE_TYPE.INTRO_TEXT) && message.roleId !== 2;
  const shouldTrackRoomContentThreshold = webgalLinkMode && roomContentAlertThreshold > 0;
  const isMessageOverRoomContentThreshold = shouldTrackRoomContentThreshold
    && isThresholdTrackedMessageType
    && messageContentLength > roomContentAlertThreshold;
  const thresholdCounterText = `${formatTextEnhanceVisibleLength(messageContentLength)}/${formatTextEnhanceVisibleLength(roomContentAlertThreshold)}`;

  // 更新消息并同步到本地缓存
  const updateMessageAndSync = useCallback((newMessage: Message) => {
    const hasChanges = JSON.stringify(chatMessageResponse.message) !== JSON.stringify(newMessage);
    if (!hasChanges) {
      return;
    }

    roomUiStoreApi.getState().pushMessageUndo({
      type: "update",
      before: chatMessageResponse.message,
      after: newMessage,
    });

    const optimisticResponse = {
      ...chatMessageResponse,
      message: newMessage,
    };
    roomContext.chatHistory?.addOrUpdateMessage(optimisticResponse);
    if (roomContext.updateAndRerenderMessageInWebGAL) {
      roomContext.updateAndRerenderMessageInWebGAL(chatMessageResponse, optimisticResponse, false);
    }

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        const committedResponse = {
          ...chatMessageResponse,
          message: response?.data ?? newMessage,
        };
        roomContext.chatHistory?.addOrUpdateMessage(committedResponse);
        if (
          roomContext.updateAndRerenderMessageInWebGAL
          && !areRealtimeRenderMessagesEquivalent(optimisticResponse.message, committedResponse.message)
        ) {
          roomContext.updateAndRerenderMessageInWebGAL(optimisticResponse, committedResponse, false);
        }
      },
      onError: (error) => {
        console.error("更新消息失败", error);
        roomContext.chatHistory?.addOrUpdateMessage(chatMessageResponse);
        if (roomContext.updateAndRerenderMessageInWebGAL) {
          roomContext.updateAndRerenderMessageInWebGAL(optimisticResponse, chatMessageResponse, false);
        }
        toast.error("更新消息失败，已恢复原内容");
      },
    });
  }, [chatMessageResponse, roomContext, roomUiStoreApi, updateMessageMutation]);

  function handleExpressionChange(avatarId: number) {
    const newMessage: Message = {
      ...message,
      avatarId,
    };
    updateMessageAndSync(newMessage);
  }

  function handleRoleChange(new_roleId: number) {
    const newMessage: Message = {
      ...message,
      roleId: new_roleId,
      avatarId: roomContext.roomRolesThatUserOwn.find(role => role.roleId === new_roleId)?.avatarId ?? -1,
    };
    updateMessageAndSync(newMessage);
  }

  const canEdit = userId === message.userId || spaceContext.isSpaceOwner;

  const handleUpdateAnnotations = useCallback((next: string[]) => {
    const nextAnnotations = normalizeAnnotations(next);
    const annotationsChanged = !areAnnotationsEqual(message.annotations, nextAnnotations);
    if (message.messageType === MESSAGE_TYPE.IMG && message.extra?.imageMessage) {
      const nextBackground = hasAnnotation(nextAnnotations, ANNOTATION_IDS.BACKGROUND);
      const currentBackground = Boolean(message.extra.imageMessage.background);
      if (!annotationsChanged && nextBackground === currentBackground) {
        return;
      }
      if (nextBackground !== currentBackground) {
        updateMessageAndSync({
          ...message,
          annotations: nextAnnotations,
          extra: {
            ...message.extra,
            imageMessage: {
              ...message.extra.imageMessage,
              background: nextBackground,
            },
          },
        });
        return;
      }
    }
    if (message.messageType === MESSAGE_TYPE.SOUND && message.extra?.soundMessage) {
      const nextPurpose = getNextSyncedSoundMessagePurpose({
        previousAnnotations: message.annotations,
        nextAnnotations,
        currentPurpose: message.extra.soundMessage.purpose,
      });
      const currentPurpose = typeof message.extra.soundMessage.purpose === "string"
        ? message.extra.soundMessage.purpose.trim().toLowerCase()
        : undefined;
      const purposeChanged = currentPurpose !== nextPurpose;
      if (!annotationsChanged && !purposeChanged) {
        return;
      }
      updateMessageAndSync({
        ...message,
        annotations: nextAnnotations,
        extra: {
          ...message.extra,
          soundMessage: {
            ...message.extra.soundMessage,
            ...(nextPurpose ? { purpose: nextPurpose } : { purpose: undefined }),
          },
        },
      });
      return;
    }
    if (!annotationsChanged) {
      return;
    }
    updateMessageAndSync({
      ...message,
      annotations: nextAnnotations,
    });
  }, [message, updateMessageAndSync]);

  const handleToggleAnnotation = useCallback((id: string) => {
    handleUpdateAnnotations(toggleAnnotation(annotations, id));
  }, [annotations, handleUpdateAnnotations]);

  const handleOpenAnnotations = useCallback(() => {
    openMessageAnnotationPicker({
      initialSelected: annotations,
      onChange: handleUpdateAnnotations,
    });
  }, [annotations, handleUpdateAnnotations]);

  const renderAnnotationsBar = (className?: string) => (
    <MessageAnnotationsBar
      annotations={annotations}
      canEdit={canEdit}
      onToggle={handleToggleAnnotation}
      onOpenPicker={handleOpenAnnotations}
      showWhenEmpty={webgalLinkMode}
      alwaysShowAddButton={webgalLinkMode}
      showAddButton={webgalLinkMode}
      showNormalModeAnnotationsOnly={!webgalLinkMode}
      compact={isMobile}
      className={className}
    />
  );

  const canEditContent = canEdit
    && (message.messageType === MESSAGE_TYPE.TEXT || message.messageType === MESSAGE_TYPE.INTRO_TEXT);
  const canShowTextStyleToolbar = isEditingContent
    && canEdit
    && (message.messageType === MESSAGE_TYPE.TEXT || message.messageType === MESSAGE_TYPE.INTRO_TEXT || message.messageType === MESSAGE_TYPE.DICE);
  const textStyleToolbar = canShowTextStyleToolbar
    ? (
        <TextStyleToolbar
          chatInputRef={editInputRef}
          visible={canShowTextStyleToolbar}
          className="text-style-toolbar"
        />
      )
    : null;
  const shouldIgnoreEditBlur = useCallback((target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) {
      return false;
    }
    return Boolean(element.closest(".text-style-toolbar") || element.closest(".modal"));
  }, []);

  const handleReplyClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setReplyMessage(message);
  }, [message, setReplyMessage]);

  const handleToggleSelectionClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleSelection?.(message.messageId);
  }, [message.messageId, onToggleSelection]);

  const handleInsertAfterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setInsertAfterMessageId(message.messageId);
  }, [message.messageId, setInsertAfterMessageId]);

  const handleOpenAnnotationsClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleOpenAnnotations();
  }, [handleOpenAnnotations]);

  const handleToggleIntroText = useCallback(() => {
    if (!canEdit)
      return;

    const newMessageType = isIntroText ? MESSAGE_TYPE.TEXT : MESSAGE_TYPE.INTRO_TEXT;
    const newMessage = {
      ...message,
      messageType: newMessageType,
    } as Message;

    updateMessageAndSync(newMessage);
  }, [canEdit, isIntroText, message, updateMessageAndSync]);

  const handleToggleIntroTextClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleToggleIntroText();
  }, [handleToggleIntroText]);

  const handleEditMessageClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window === "undefined") {
      return;
    }
    const target = document.querySelector(
      `[data-message-id="${message.messageId}"] .editable-field`,
    ) as HTMLElement | null;
    if (!target) {
      return;
    }
    target.dispatchEvent(new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: target.offsetLeft + target.offsetWidth / 2,
      clientY: target.offsetTop + target.offsetHeight / 2,
    }));
  }, [message.messageId]);

  const handleEditWebgalChooseClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onEditWebgalChoose?.(message.messageId);
  }, [message.messageId, onEditWebgalChoose]);

  const handleOpenContextMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window === "undefined") {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.right,
      clientY: rect.bottom,
    }));
  }, []);

  const messageHoverToolbar = (
    <div
      className={CHAT_MESSAGE_HOVER_TOOLBAR_CLASS}
    >
      {onToggleSelection && (
        <button
          type="button"
          className="btn btn-ghost btn-xs h-7 w-7 min-h-0 p-0 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/70"
          onClick={handleToggleSelectionClick}
          title="多选"
          aria-label="多选"
        >
          <ListUnordered className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-xs h-7 w-7 min-h-0 p-0 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/70"
        onClick={handleReplyClick}
        title="回复"
        aria-label="回复"
      >
        <CommentOutline className="h-4 w-4" />
      </button>
      {canEdit && (
        <button
          type="button"
          className="btn btn-ghost btn-xs h-7 w-7 min-h-0 p-0 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/70"
          onClick={handleOpenAnnotationsClick}
          title="添加标注"
          aria-label="添加标注"
        >
          <EmojiIconWhite className="h-4 w-4" />
        </button>
      )}
      {canEdit && (message.messageType === MESSAGE_TYPE.TEXT || message.messageType === MESSAGE_TYPE.INTRO_TEXT) && (
        <button
          type="button"
          className="btn btn-ghost btn-xs h-7 w-7 min-h-0 p-0 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/70"
          onClick={handleToggleIntroTextClick}
          title={isIntroText ? "转为对话" : "转为黑屏"}
          aria-label={isIntroText ? "转为对话" : "转为黑屏"}
        >
          <ScreenIcon className="h-4 w-4 text-black" />
        </button>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-xs h-7 w-7 min-h-0 p-0 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/70"
        onClick={handleInsertAfterClick}
        title="在此处插入消息"
        aria-label="在此处插入消息"
      >
        <InsertLineBelow className="h-4 w-4" />
      </button>
      {canEditContent && (
        <button
          type="button"
          className="btn btn-ghost btn-xs h-7 w-7 min-h-0 p-0 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/70"
          onClick={handleEditMessageClick}
          title="编辑"
          aria-label="编辑"
        >
          <Edit2Outline className="h-4 w-4" />
        </button>
      )}
      {canEdit && message.messageType === MESSAGE_TYPE.WEBGAL_CHOOSE && onEditWebgalChoose && (
        <button
          type="button"
          className="btn btn-ghost btn-xs h-7 w-7 min-h-0 p-0 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/70"
          onClick={handleEditWebgalChooseClick}
          title="编辑选择"
          aria-label="编辑选择"
        >
          <Edit2Outline className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-xs h-7 w-7 min-h-0 p-0 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/70"
        onClick={handleOpenContextMenu}
        title="更多"
        aria-label="更多"
      >
        <MoreMenu className="h-4 w-4" />
      </button>
    </div>
  );

  const handleAvatarSample = useCallback(() => {
    const roomId = roomContext.roomId ?? -1;
    const targetRoleId = message.roleId ?? 0;
    const targetAvatarId = message.avatarId ?? -1;
    if (roomId <= 0) {
      toast.error("未找到房间，无法取样");
      return;
    }
    if (targetRoleId === 0 || targetAvatarId <= 0) {
      toast.error("该消息没有可取样的头像");
      return;
    }
    if (targetRoleId <= 0 && !spaceContext.isSpaceOwner) {
      toast.error("只有主持人可以取样旁白头像");
      return;
    }
    if (targetRoleId > 0 && !roomContext.roomRolesThatUserOwn.some(role => role.roleId === targetRoleId)) {
      toast.error("该角色不可用");
      return;
    }
    setCurRoleIdForRoom(roomId, targetRoleId);
    setCurAvatarIdForRole(targetRoleId, targetAvatarId);
    setAvatarSamplerActive(false);
  }, [
    message.avatarId,
    message.roleId,
    roomContext.roomId,
    roomContext.roomRolesThatUserOwn,
    setAvatarSamplerActive,
    setCurAvatarIdForRole,
    setCurRoleIdForRoom,
    spaceContext.isSpaceOwner,
  ]);

  const openExpressionChooser = (fullScreen: boolean) => {
    toastWindow(
      onClose => (
        <RoomContext value={roomContext}>
          <div className={fullScreen ? "flex h-full min-h-0 flex-col" : "flex flex-col"}>
            <ExpressionChooser
              roleId={message.roleId ?? -1}
              handleExpressionChange={(avatarId) => {
                handleExpressionChange(avatarId);
                onClose();
              }}
              handleRoleChange={(roleId) => {
                handleRoleChange(roleId);
                onClose();
              }}
              onRequestClose={onClose}
              defaultFullscreen={fullScreen}
              fullscreenLayoutMode={fullScreen ? "fill" : "dialog"}
              onRequestFullscreen={(next) => {
                onClose();
                openExpressionChooser(next);
              }}
            />
          </div>
        </RoomContext>
      ),
      { fullScreen },
    );
  };

  function handleAvatarClick(event?: React.MouseEvent<HTMLDivElement>) {
    if (isAvatarSamplerActive) {
      event?.preventDefault();
      event?.stopPropagation();
      handleAvatarSample();
      return;
    }
    if (canEdit) {
      // 打开表情选择器的 toast 窗口
      openExpressionChooser(isMobile);
    }
  }

  const handleContentUpdate = useCallback((content: string) => {
    if (message.content !== content) {
      updateMessageAndSync({
        ...message,
        content,
      });
    }
  }, [message, updateMessageAndSync]);

  const handleDiceContentUpdate = useCallback((content: string) => {
    if (message.content === content && (message.extra as any)?.diceResult?.result === content) {
      return;
    }
    updateMessageAndSync({
      ...message,
      content,
      extra: {
        ...message.extra,
        diceResult: { result: content },
      },
    });
  }, [message, updateMessageAndSync]);

  // 处理角色名编辑
  function handleRoleNameClick() {
    if (canEdit) {
      // 无需联动模式：点击角色名直接进入自定义名字编辑
      setEditingRoleName(customRoleName || role?.roleName || "");
      setIsEditingRoleName(true);
    }
    else {
      // 不可编辑时，@角色
      const roleName = role?.roleName?.trim() || "Undefined";
      const inputElement = document.querySelector(".chatInputTextarea") as HTMLTextAreaElement;
      if (inputElement) {
        const currentText = inputElement.value;
        const atText = `@${roleName} `;
        if (!currentText.includes(atText)) {
          inputElement.value = currentText + atText;
          inputElement.focus();
          const event = new Event("input", { bubbles: true });
          inputElement.dispatchEvent(event);
        }
      }
    }
  }

  // 保存自定义角色名
  function handleRoleNameSave() {
    const trimmedName = editingRoleName.trim();
    const newMessage = {
      ...message,
      customRoleName: trimmedName || undefined, // 空字符串时清除自定义名称
    } as Message;

    updateMessageAndSync(newMessage);
    setIsEditingRoleName(false);
  }

  // 处理黑屏文字 -hold 设置切换
  function _handleToggleIntroHold() {
    if (!canEdit || !isIntroText)
      return;

    const nextAnnotations = setAnnotation(annotations, ANNOTATION_IDS.INTRO_HOLD, !introHold);
    const newMessage = {
      ...message,
      annotations: nextAnnotations,
    } as Message;

    updateMessageAndSync(newMessage);
  }

  const handleReplyPreviewClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!message.replyMessageId) {
      return;
    }
    roomContext.scrollToGivenMessage?.(message.replyMessageId);
  }, [message.replyMessageId, roomContext]);

  const renderedContent = (() => {
    if (message.status === 1) {
      return <span className="text-xs text-base-content/60">[原消息已删除]</span>;
    }

    const replyNode = message.replyMessageId
      ? (
          <button
            type="button"
            className="mb-1 flex flex-col gap-0.5 rounded-md border border-base-300/60 bg-base-100/70 px-2 py-1 text-left text-xs text-base-content/70 hover:bg-base-200/70"
            onClick={handleReplyPreviewClick}
          >
            <span className="text-[10px] text-base-content/50">回复</span>
            <PreviewMessage message={message.replyMessageId} className="block" withMediaPreview />
          </button>
        )
      : null;

    const extra = message.extra as any;
    const docCardPayload = extra?.docCard;
    const hasDocCard = message.messageType === MESSAGE_TYPE.DOC_CARD || Boolean(docCardPayload);
    const roomJumpPayload = extractRoomJumpPayload(message.extra);
    const hasRoomJump = message.messageType === MESSAGE_TYPE.ROOM_JUMP || Boolean(roomJumpPayload);

    const commandRequest = extra?.commandRequest as CommandRequestPayload | undefined;
    const hasCommandRequest = message.messageType === MESSAGE_TYPE.COMMAND_REQUEST || Boolean(commandRequest);

    const bodyNode = (() => {
      if (hasDocCard) {
        return <DocCardMessage messageResponse={chatMessageResponse} />;
      }

      if (hasRoomJump) {
        return <RoomJumpMessage messageResponse={chatMessageResponse} />;
      }

      if (hasCommandRequest) {
        const commandText = String(commandRequest?.command ?? message.content ?? "").trim();
        const allowedRoleIds = Array.isArray(commandRequest?.allowedRoleIds)
          ? commandRequest!.allowedRoleIds!.filter(id => typeof id === "number")
          : [];
        const curRoleId = roomContext.curRoleId ?? -1;
        const isSpectator = isObserverLike(roomContext.curMember?.memberType);
        const noRole = curRoleId <= 0;
        const allowAll = Boolean(commandRequest?.allowAll);
        let disableReason = "";
        if (!commandText) {
          disableReason = "指令为空";
        }
        else if (!onExecuteCommandRequest) {
          disableReason = "当前无法执行";
        }
        else if (noRole && !spaceContext.isSpaceOwner && !isSpectator) {
          disableReason = "旁白仅主持可用";
        }
        else if (allowedRoleIds.length > 0 && !allowedRoleIds.includes(curRoleId)) {
          disableReason = "当前角色不可执行";
        }
        const hintText = disableReason || "点击此进行检定";
        const handleCommandRequestClick = (event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          if (disableReason) {
            toast.error(disableReason);
            return;
          }
          onExecuteCommandRequest?.({
            command: commandText,
            threadId: message.threadId ?? undefined,
            requestMessageId: message.messageId,
          });
        };

        return (
          <button
            type="button"
            className={`w-full rounded-md border border-base-300 bg-base-100/80 px-3 py-2 text-left transition ${
              disableReason ? "opacity-60 cursor-not-allowed" : "hover:border-info/60 hover:bg-base-200/80"
            }`}
            onClick={handleCommandRequestClick}
            aria-disabled={Boolean(disableReason)}
            title={hintText}
          >
            <div className="flex items-center gap-2 text-xs text-base-content/70">
              <span className="badge badge-info badge-xs">检定请求</span>
              {allowAll && <span className="text-[10px] text-base-content/50">全员</span>}
            </div>
            <div className="mt-1 text-sm font-mono break-words">
              {commandText || "[空指令]"}
            </div>
            <div className="mt-1 text-[10px] text-base-content/50">
              {hintText}
            </div>
          </button>
        );
      }

      switch (message.messageType) {
        case MESSAGE_TYPE.TEXT:
          return (
            <EditableMessageContent
              content={message.content}
              onCommit={handleContentUpdate}
              className={`editable-field whitespace-pre-wrap break-words ${isOutOfCharacterTextMessage ? "italic text-base-content/80" : ""}`}
              editorClassName={`min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded-[8px] w-full ${isOutOfCharacterTextMessage ? "italic text-base-content/80" : ""}`}
              onEditingChange={setIsEditingContent}
              editInputRef={editInputRef}
              shouldIgnoreBlur={shouldIgnoreEditBlur}
              canEdit={canEditContent}
            />
          );
        case MESSAGE_TYPE.INTRO_TEXT:
          return (
            <div className="rounded-lg bg-black text-white px-3 py-2 shadow-inner">
              <EditableMessageContent
                content={message.content}
                onCommit={handleContentUpdate}
                className="editable-field whitespace-pre-wrap break-words text-white"
                editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded-[8px] w-full text-white"
                onEditingChange={setIsEditingContent}
                editInputRef={editInputRef}
                shouldIgnoreBlur={shouldIgnoreEditBlur}
                canEdit={canEditContent}
              />
            </div>
          );
        case MESSAGE_TYPE.FORWARD:
          return <ForwardMessage messageResponse={chatMessageResponse} />;
        case MESSAGE_TYPE.DICE: {
          const diceResult = extra?.diceResult;
          const result = diceResult?.result || message.content || "";
          return (
            <div className="relative text-sm">
              <span className="badge badge-accent badge-xs absolute top-0 right-0">骰娘</span>
              <div className="pr-10 pt-1">
                <EditableMessageContent
                  content={result}
                  onCommit={handleDiceContentUpdate}
                  className="editable-field whitespace-pre-wrap break-words"
                  editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded-[8px] w-full"
                  onEditingChange={setIsEditingContent}
                  editInputRef={editInputRef}
                  shouldIgnoreBlur={shouldIgnoreEditBlur}
                  canEdit={canEdit}
                />
              </div>
            </div>
          );
        }
        default:
          return <MessageContentRenderer message={message} annotations={annotations} cacheKeyBase={`chat:${message.messageId}`} />;
      }
    })();

    if (replyNode) {
      return (
        <div className="flex flex-col gap-1">
          {replyNode}
          {bodyNode}
        </div>
      );
    }

    return bodyNode;
  })();

  return (
    <div>
      {textStyleToolbar}
      {isStateEventMessage
        ? (
            <div
              className="group relative flex w-full justify-center py-0.5 sm:py-1"
              key={message.messageId}
            >
              {messageHoverToolbar}
              <div className="flex w-full max-w-4xl items-start justify-center gap-1.5 px-1.5 sm:px-3">
                <div className="min-w-0 max-w-full shrink">
                  {renderedContent}
                </div>
                <div className="pt-px text-[10px] leading-5 text-base-content/32">
                  {isEdited && <span className="text-warning/70 mr-1">(已编辑)</span>}
                  {formattedTime}
                </div>
              </div>
            </div>
          )
        : useChatBubbleStyle
          ? (
              <div
                className={CHAT_MESSAGE_ROW_CLASS}
                key={message.messageId}
              >
                {messageHoverToolbar}
                {/* Avatar */}
                <div
                  className={`shrink-0 ${
                    isIntroText
                      ? "invisible cursor-default"
                      : shouldUseUserAvatar
                        ? "cursor-default"
                        : (isAvatarSamplerActive ? "cursor-crosshair" : (canEdit ? "cursor-pointer" : "cursor-default"))
                  }`}
                  onClick={isIntroText || shouldUseUserAvatar ? undefined : handleAvatarClick}
                >
                  {shouldUseUserAvatar
                    ? (
                        <UserAvatarByUser
                          user={{ userId: message.userId }}
                          width={isMobile ? 10 : 12}
                          isRounded={true}
                          stopToastWindow={true}
                          clickEnterProfilePage={false}
                        />
                      )
                    : isNarrator
                      ? (
                          <div className={`flex items-center justify-center rounded-full bg-base-200/60 ${isMobile ? "w-10 h-10" : "w-12 h-12"}`}>
                            <NarratorIcon className="w-4 h-4 text-base-content/70" />
                          </div>
                        )
                      : (
                          <RoleAvatarComponent
                            avatarId={message.avatarId ?? 0}
                            avatarUrl={message.avatarUrl}
                            avatarThumbUrl={message.avatarThumbUrl}
                            roleId={message.roleId ?? undefined}
                            width={isMobile ? 10 : 12}
                            isRounded={true}
                            withTitle={false}
                            stopToastWindow={true}
                            useDefaultAvatarFallback={false}
                          />
                        )}
                </div>
                <div className="flex flex-col items-start">
                  <div className={chatMessageMetaRowClass}>
                    {showRoleNameEditor
                      ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              className="input input-xs input-bordered w-32 bg-base-200 border-base-300 px-2 shadow-sm focus:outline-none focus:border-info"
                              value={editingRoleName}
                              onChange={e => setEditingRoleName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleRoleNameSave();
                                if (e.key === "Escape")
                                  setIsEditingRoleName(false);
                              }}
                              placeholder="输入角色名"
                              autoFocus
                            />
                            <button type="button" className="btn btn-xs btn-primary" onClick={handleRoleNameSave}>✓</button>
                            <button type="button" className="btn btn-xs btn-ghost" onClick={() => setIsEditingRoleName(false)}>✕</button>
                          </div>
                        )
                      : (
                          !isIntroText && speakerDisplayName
                            ? (
                                <div className="relative flex items-center gap-2 min-w-0 flex-1">
                                  {outOfCharacterBadge}
                                  <span
                                    onClick={isOutOfCharacterTextMessage ? undefined : handleRoleNameClick}
                                    className={`block flex-1 min-w-0 truncate text-sm sm:text-sm pb-0.5 sm:pb-1 transition-all duration-200 ${
                                      isOutOfCharacterTextMessage
                                        ? "font-semibold text-warning/95 cursor-default"
                                        : `font-medium text-base-content/85 cursor-pointer hover:text-primary ${canEdit ? "hover:underline" : ""}`
                                    }`}
                                  >
                                    {speakerDisplayName}
                                  </span>
                                  {effectPreviewVisible && effectIconUrl && (
                                    <img
                                      src={`${effectIconUrl}?t=${effectPreviewToken}`}
                                      alt=""
                                      className="pointer-events-none absolute left-full -top-2 sm:-top-3 ml-2 w-16 h-16 sm:w-20 sm:h-20 object-contain scale-150 origin-left"
                                    />
                                  )}
                                </div>
                              )
                            : (
                                effectPreviewVisible && effectIconUrl
                                  ? (
                                      <img
                                        src={`${effectIconUrl}?t=${effectPreviewToken}`}
                                        alt=""
                                        className="pointer-events-none absolute left-2 -top-2 sm:-top-3 w-16 h-16 sm:w-20 sm:h-20 object-contain scale-150 origin-left"
                                      />
                                    )
                                  : null
                              )
                        )}
                    <span className="hidden sm:inline text-xs text-base-content/50 ml-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100 shrink-0">
                      {isEdited && <span className="text-warning mr-1">(已编辑)</span>}
                      {formattedTime}
                    </span>
                  </div>
                  <div
                    className={`${CHAT_MESSAGE_BUBBLE_BASE_CLASS} cursor-pointer ${
                      isOutOfCharacterTextMessage
                        ? "border-2 border-dashed border-warning/45 bg-warning/12 text-base-content/90 shadow-none hover:bg-warning/18 hover:shadow-none"
                        : "bg-base-200 hover:shadow-lg hover:bg-base-300"
                    } ${isMessageOverRoomContentThreshold ? "outline outline-1 outline-warning/70" : ""}`}
                    onClick={triggerEffectPreview}
                  >
                    {renderedContent}
                    {isMessageOverRoomContentThreshold && (
                      <div className="mt-1 flex justify-end">
                        <span className="rounded px-1 text-[11px] leading-4 font-medium bg-warning/20 text-warning shadow-sm">
                          {thresholdCounterText}
                        </span>
                      </div>
                    )}
                  </div>
                  {renderAnnotationsBar(CHAT_MESSAGE_ANNOTATIONS_CLASS)}
                </div>
              </div>
            )
          : (
              <div
                className="flex w-full py-1.5 sm:py-2 relative"
                key={message.messageId}
              >
                {messageHoverToolbar}
                {/* 圆角矩形头像 */}
                <div className="shrink-0 pr-2 sm:pr-3">
                  <div
                    className={`w-9 h-9 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-md overflow-hidden ${
                      isIntroText
                        ? "invisible cursor-default"
                        : shouldUseUserAvatar
                          ? "cursor-default"
                          : (canEdit ? "cursor-pointer" : "cursor-default")
                    }`}
                    onClick={isIntroText || shouldUseUserAvatar ? undefined : handleAvatarClick}
                  >
                    {shouldUseUserAvatar
                      ? (
                          <UserAvatarByUser
                            user={{ userId: message.userId }}
                            width={isMobile ? 10 : 20}
                            isRounded={false}
                            stopToastWindow={true}
                            clickEnterProfilePage={false}
                          />
                        )
                      : isNarrator
                        ? (
                            <div className="w-full h-full flex items-center justify-center bg-base-200/60">
                              <NarratorIcon className="w-5 h-5 text-base-content/70" />
                            </div>
                          )
                        : (
                            <RoleAvatarComponent
                              avatarId={message.avatarId ?? 0}
                              avatarUrl={message.avatarUrl}
                              avatarThumbUrl={message.avatarThumbUrl}
                              roleId={message.roleId ?? undefined}
                              width={isMobile ? 10 : 20}
                              isRounded={false}
                              withTitle={false}
                              stopToastWindow={true}
                              useDefaultAvatarFallback={false}
                            >
                            </RoleAvatarComponent>
                          )}
                  </div>
                </div>
                {/* 消息内容 */}
                <div className="flex-1 min-w-0 p-0.5 sm:p-1 pr-2 sm:pr-5">
                  {/* 角色名 */}
                  <div className="flex items-center w-full gap-2 sm:pr-80 relative">
                    {showRoleNameEditor
                      ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              className="input input-sm input-bordered w-40 bg-base-200 border-base-300 px-3 shadow-sm focus:outline-none focus:border-info"
                              value={editingRoleName}
                              onChange={e => setEditingRoleName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleRoleNameSave();
                                if (e.key === "Escape")
                                  setIsEditingRoleName(false);
                              }}
                              placeholder="输入角色名"
                              autoFocus
                            />
                            <button type="button" className="btn btn-sm btn-primary" onClick={handleRoleNameSave}>✓</button>
                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setIsEditingRoleName(false)}>✕</button>
                          </div>
                        )
                      : (
                          !isIntroText && speakerDisplayName
                            ? (
                                <div className="relative flex items-center gap-2 min-w-0 flex-1">
                                  {outOfCharacterBadge}
                                  <div
                                    className={`text-sm sm:text-base min-w-0 flex-1 transition-all duration-200 ${
                                      isOutOfCharacterTextMessage
                                        ? "font-semibold text-warning/95 cursor-default"
                                        : `font-semibold cursor-pointer hover:text-primary ${userId === message.userId ? "hover:underline" : ""}`
                                    }`}
                                    onClick={isOutOfCharacterTextMessage ? undefined : handleRoleNameClick}
                                  >
                                    <div className="block min-w-0 truncate">
                                      {isOutOfCharacterTextMessage ? speakerDisplayName : `【${speakerDisplayName}】`}
                                    </div>
                                  </div>
                                  {effectPreviewVisible && effectIconUrl && (
                                    <img
                                      src={`${effectIconUrl}?t=${effectPreviewToken}`}
                                      alt=""
                                      className="pointer-events-none absolute left-full -top-2 sm:-top-3 ml-2 w-16 h-16 sm:w-20 sm:h-20 object-contain scale-150 origin-left"
                                    />
                                  )}
                                </div>
                              )
                            : (
                                effectPreviewVisible && effectIconUrl
                                  ? (
                                      <img
                                        src={`${effectIconUrl}?t=${effectPreviewToken}`}
                                        alt=""
                                        className="pointer-events-none absolute left-2 -top-2 sm:-top-3 w-16 h-16 sm:w-20 sm:h-20 object-contain scale-150 origin-left"
                                      />
                                    )
                                  : null
                              )
                        )}
                    <div className="text-xs text-base-content/50 pt-1 ml-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100 shrink-0">
                      {isEdited && <span className="text-warning mr-1">(已编辑)</span>}
                      {formattedTime}
                    </div>
                  </div>
                  <div
                    className={`relative transition-all duration-200 rounded-lg p-1.5 sm:p-2 cursor-pointer break-words text-base sm:text-sm lg:text-base ${
                      isOutOfCharacterTextMessage
                        ? "border-2 border-dashed border-warning/40 bg-warning/10 text-base-content/90"
                        : "hover:bg-base-200/50"
                    } ${isMessageOverRoomContentThreshold ? "outline outline-1 outline-warning/70" : ""}`}
                    onClick={triggerEffectPreview}
                  >
                    {renderedContent}
                    {isMessageOverRoomContentThreshold && (
                      <div className="mt-1 flex justify-end">
                        <span className="rounded px-1 text-[11px] leading-4 font-medium bg-warning/20 text-warning shadow-sm">
                          {thresholdCounterText}
                        </span>
                      </div>
                    )}
                  </div>
                  {renderAnnotationsBar("mt-1.5")}
                </div>
              </div>
            )}
    </div>
  );
}

// 使用 React.memo 优化性能,避免不必要的重新渲染
// 只在 chatMessageResponse 的内容真正变化时才重新渲染
export const ChatBubble = React.memo(ChatBubbleComponent, (prevProps, nextProps) => {
  // 自定义比较函数:只比较消息的关键属性
  const prevMsg = prevProps.chatMessageResponse.message;
  const nextMsg = nextProps.chatMessageResponse.message;

  // 如果消息ID不同,肯定需要重新渲染
  if (prevMsg.messageId !== nextMsg.messageId) {
    return false;
  }

  // 检查所有可能影响渲染的属性
  const isEqual = (
    prevMsg.content === nextMsg.content
    && prevMsg.avatarId === nextMsg.avatarId
    && prevMsg.roleId === nextMsg.roleId
    && prevMsg.updateTime === nextMsg.updateTime
    && prevMsg.messageType === nextMsg.messageType
    && prevMsg.status === nextMsg.status
    && prevMsg.replyMessageId === nextMsg.replyMessageId
    && prevProps.useChatBubbleStyle === nextProps.useChatBubbleStyle
  );

  // 如果基础属性不相等,直接返回 false
  if (!isEqual) {
    return false;
  }

  const prevAnnotations = prevMsg.annotations ?? [];
  const nextAnnotations = nextMsg.annotations ?? [];
  if (prevAnnotations.length !== nextAnnotations.length) {
    return false;
  }
  for (let i = 0; i < prevAnnotations.length; i += 1) {
    if (prevAnnotations[i] !== nextAnnotations[i]) {
      return false;
    }
  }

  // 深度比较 extra 对象
  if (prevMsg.extra === nextMsg.extra) {
    // 继续检查 webgal
  }
  else if (!prevMsg.extra || !nextMsg.extra) {
    return false;
  }
  else {
    // 比较 extra 的关键属性
    const prevExtra = prevMsg.extra;
    const nextExtra = nextMsg.extra;

    if (prevExtra.imageMessage !== nextExtra.imageMessage) {
      if (!prevExtra.imageMessage || !nextExtra.imageMessage) {
        return false;
      }
      if (prevExtra.imageMessage.url !== nextExtra.imageMessage.url
        || prevExtra.imageMessage.background !== nextExtra.imageMessage.background
        || prevExtra.imageMessage.width !== nextExtra.imageMessage.width
        || prevExtra.imageMessage.height !== nextExtra.imageMessage.height) {
        return false;
      }
    }

    if (prevExtra.fileMessage !== nextExtra.fileMessage) {
      if (!prevExtra.fileMessage && !nextExtra.fileMessage) {
        // 都没有,继续检查其他属性
      }
      else if (!prevExtra.fileMessage || !nextExtra.fileMessage) {
        return false;
      }
      else if (prevExtra.fileMessage.url !== nextExtra.fileMessage.url) {
        return false;
      }
    }

    if (JSON.stringify(prevExtra.forwardMessage) !== JSON.stringify(nextExtra.forwardMessage)) {
      return false;
    }

    if (JSON.stringify(prevExtra.soundMessage) !== JSON.stringify(nextExtra.soundMessage)) {
      return false;
    }

    if (JSON.stringify((prevExtra as any).videoMessage) !== JSON.stringify((nextExtra as any).videoMessage)) {
      return false;
    }

    if (JSON.stringify(prevExtra.diceResult) !== JSON.stringify(nextExtra.diceResult)) {
      return false;
    }

    if (JSON.stringify((prevExtra as any).commandRequest) !== JSON.stringify((nextExtra as any).commandRequest)) {
      return false;
    }
  }

  // 检查 webgal 设置
  const prevWebgal = prevMsg.webgal as any;
  const nextWebgal = nextMsg.webgal as any;
  if (JSON.stringify(prevWebgal) !== JSON.stringify(nextWebgal)) {
    return false;
  }

  return true;
});

ChatBubble.displayName = "ChatBubble";
