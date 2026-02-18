import type { ChatMessageResponse, Message } from "../../../../api";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import { buildAnnotationMap } from "@/components/chat/message/annotations/annotationCatalog";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import EditableMessageContent from "@/components/chat/message/editableMessageContent";
import AudioMessage from "@/components/chat/message/media/AudioMessage";
import ForwardMessage from "@/components/chat/message/preview/forwardMessage";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";
import WebgalChooseMessage from "@/components/chat/message/webgalChooseMessage";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomRoleSelectionStore } from "@/components/chat/stores/roomRoleSelectionStore";
import { useRoomUiStore, useRoomUiStoreApi } from "@/components/chat/stores/roomUiStore";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import BetterImg from "@/components/common/betterImg";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { BranchIcon, ChatBubbleEllipsesOutline, CommentOutline, Edit2Outline, EmojiIconWhite, InsertLineBelow, ListUnordered, MoreMenu, NarratorIcon, ScreenIcon } from "@/icons";
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
import { extractWebgalChoosePayload } from "@/types/webgalChoose";
import { extractWebgalVarPayload, formatWebgalVarSummary } from "@/types/webgalVar";
import { formatTimeSmartly } from "@/utils/dateUtil";
import { getScreenSize } from "@/utils/getScreenSize";
import { useSendMessageMutation, useUpdateMessageMutation } from "../../../../api/hooks/chatQueryHooks";
import { useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import DocCardMessage from "./docCard/docCardMessage";

interface CommandRequestPayload {
  command: string;
  allowAll?: boolean;
  allowedRoleIds?: number[];
}

const EFFECT_PREVIEW_DURATION_MS = 2000;

function ChatBubbleComponent({ chatMessageResponse, useChatBubbleStyle, threadHintMeta, onExecuteCommandRequest, onOpenThread, onToggleSelection, onEditWebgalChoose }: {
  /** 包含聊天消息内容、发送者等信息的数据对象 */
  chatMessageResponse: ChatMessageResponse;
  /** 控制是否应用气泡样式，默认为false */
  useChatBubbleStyle?: boolean;
  /** 当该消息被创建子区后，在其下方展示 Thread 提示条（主消息流“看起来只有一条”） */
  threadHintMeta?: { rootId: number; title: string; replyCount: number };
  /** 点击“检定请求”按钮后，触发外层执行（以点击者身份发送并执行指令） */
  onExecuteCommandRequest?: (payload: { command: string; threadId?: number; requestMessageId: number }) => void;
  onOpenThread?: (threadRootMessageId: number) => void;
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

  const updateMessageMutation = useUpdateMessageMutation();

  const userId = useGlobalContext().userId;

  const roomContext = use(RoomContext);
  const sendMessageMutation = useSendMessageMutation(roomContext.roomId ?? -1);
  const spaceContext = use(SpaceContext);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const setReplyMessage = useRoomUiStore(state => state.setReplyMessage);
  const roomUiStoreApi = useRoomUiStoreApi();
  const isAvatarSamplerActive = useRoomUiStore(state => state.isAvatarSamplerActive);
  const setAvatarSamplerActive = useRoomUiStore(state => state.setAvatarSamplerActive);
  const useChatBubbleStyleFromStore = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  useChatBubbleStyle = useChatBubbleStyle ?? useChatBubbleStyleFromStore;
  const setCurRoleIdForRoom = useRoomRoleSelectionStore(state => state.setCurRoleIdForRoom);
  const setCurAvatarIdForRole = useRoomRoleSelectionStore(state => state.setCurAvatarIdForRole);

  const isMobile = getScreenSize() === "sm";

  const isThreadRoot = message.messageType === MESSAGE_TYPE.THREAD_ROOT && message.threadId === message.messageId;

  const shouldShowThreadHint = !!threadHintMeta
    && !isThreadRoot
    // reply 不展示提示条（reply 也不会出现在主消息流，但 thread 面板里也无需显示）
    && (!message.threadId || message.threadId === message.messageId);

  const handleOpenThreadById = React.useCallback((rootId: number) => {
    // 打开 Thread 时，清除“插入消息”模式，避免错位。
    setInsertAfterMessageId(undefined);
    if (onOpenThread) {
      onOpenThread(rootId);
    }
    else {
      setThreadRootMessageId(rootId);
      setComposerTarget("thread");
      toast.error("当前页面未启用副窗口，无法打开子区");
    }
  }, [onOpenThread, setComposerTarget, setInsertAfterMessageId, setThreadRootMessageId]);

  const threadHintNode = shouldShowThreadHint
    ? (
        <div className="mt-2">
          <div
            className="w-full rounded-md border border-base-300 bg-base-200/60 px-3 py-2 cursor-pointer hover:bg-base-200 transition-colors border-l-4 border-l-info shadow-sm"
            onClick={() => handleOpenThreadById(threadHintMeta!.rootId)}
          >
            <div className="flex items-center gap-2 text-sm text-base-content/80">
              <ChatBubbleEllipsesOutline className="w-4 h-4 opacity-70" />
              <span className="badge badge-info badge-sm">子区</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-base-content/90 truncate">
                  {threadHintMeta!.title}
                </div>
                <div className="text-xs text-base-content/60">
                  {threadHintMeta!.replyCount}
                  {" "}
                  条消息
                  <span className="mx-1">·</span>
                  <button
                    type="button"
                    className="link link-hover text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenThreadById(threadHintMeta!.rootId);
                    }}
                  >
                    查看所有子区
                  </button>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenThreadById(threadHintMeta!.rootId);
                  }}
                >
                  打开
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    : null;

  // 角色名编辑状态
  const [isEditingRoleName, setIsEditingRoleName] = useState(false);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [isEditingContent, setIsEditingContent] = useState(false);
  const editInputRef = useRef<ChatInputAreaHandle | null>(null);

  // 判断是否为旁白（无角色）- 包括 roleId 为空/undefined/0/负数 的情况
  const isNarrator = !message.roleId || message.roleId <= 0;
  // 判断是否为黑屏文字
  const isIntroText = message.messageType === MESSAGE_TYPE.INTRO_TEXT;
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
  });

  // 更新消息并同步到本地缓存
  const updateMessageAndSync = useCallback((newMessage: Message) => {
    if (JSON.stringify(chatMessageResponse.message) !== JSON.stringify(newMessage)) {
      roomUiStoreApi.getState().pushMessageUndo({
        type: "update",
        before: chatMessageResponse.message,
        after: newMessage,
      });
    }
    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        // 更新成功后同步到本地 IndexedDB
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          // 如果 WebGAL 联动模式开启，则重渲染并跳转
          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
        }
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
      showWhenEmpty={true}
      alwaysShowAddButton={true}
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
  const threadActionLabel = (isThreadRoot || threadHintMeta?.rootId) ? "打开子区" : "创建子区";
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

  const handleCreateOrOpenThreadClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isThreadRoot) {
      handleOpenThreadById(message.messageId);
      return;
    }
    if (threadHintMeta?.rootId) {
      handleOpenThreadById(threadHintMeta.rootId);
      return;
    }
    const roomId = roomContext.roomId;
    if (!roomId) {
      toast.error("未找到roomId，无法创建子区");
      return;
    }
    const raw = (message.content ?? "").trim();
    const title = raw ? raw.slice(0, 20) : "子区";
    sendMessageMutation.mutate({
      roomId,
      messageType: MESSAGE_TYPE.THREAD_ROOT,
      roleId: roomContext.curRoleId,
      avatarId: roomContext.curAvatarId,
      content: title,
      replayMessageId: message.messageId,
      extra: { title },
    }, {
      onSuccess: (response) => {
        const created = response?.data;
        if (!created) {
          return;
        }
        roomContext.chatHistory?.addOrUpdateMessage({ message: created });
        handleOpenThreadById(created.messageId);
      },
      onError: () => {
        toast.error("创建子区失败");
      },
    });
  }, [
    handleOpenThreadById,
    isThreadRoot,
    message.content,
    message.messageId,
    roomContext.chatHistory,
    roomContext.curAvatarId,
    roomContext.curRoleId,
    roomContext.roomId,
    sendMessageMutation,
    threadHintMeta?.rootId,
  ]);

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
      className="absolute top-2 right-2 z-30 flex items-center gap-1 rounded-full border border-base-300/80 bg-base-200/95 px-1.5 py-1 shadow-lg backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-150 translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0"
    >
      <button
        type="button"
        className="btn btn-ghost btn-xs h-7 w-7 min-h-0 p-0 rounded-full text-base-content/70 hover:text-base-content hover:bg-base-300/70"
        onClick={handleCreateOrOpenThreadClick}
        title={threadActionLabel}
        aria-label={threadActionLabel}
      >
        <BranchIcon className="h-4 w-4" />
      </button>
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
      toast.error("只有KP可以取样旁白头像");
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
      openExpressionChooser(false);
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

  // 处理音频用途切换（语音/BGM/音效）
  const _handleAudioPurposeChange = useCallback((purpose: string) => {
    const soundMessage = message.extra?.soundMessage;
    if (!soundMessage)
      return;

    const newMessage = {
      ...message,
      extra: {
        ...message.extra,
        soundMessage: {
          ...soundMessage,
          purpose,
        },
      },
    };

    updateMessageAndSync(newMessage);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes || Number.isNaN(bytes)) {
      return "";
    }
    const units = ["B", "KB", "MB", "GB"] as const;
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(1)}${units[unitIndex]}`;
  };

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

    const commandRequest = extra?.commandRequest as CommandRequestPayload | undefined;
    const hasCommandRequest = message.messageType === MESSAGE_TYPE.COMMAND_REQUEST || Boolean(commandRequest);

    const bodyNode = (() => {
      if (hasDocCard) {
        return <DocCardMessage messageResponse={chatMessageResponse} />;
      }

      if (hasCommandRequest) {
        const commandText = String(commandRequest?.command ?? message.content ?? "").trim();
        const allowedRoleIds = Array.isArray(commandRequest?.allowedRoleIds)
          ? commandRequest!.allowedRoleIds!.filter(id => typeof id === "number")
          : [];
        const curRoleId = roomContext.curRoleId ?? -1;
        const isSpectator = (roomContext.curMember?.memberType ?? 3) >= 3;
        const noRole = curRoleId <= 0;
        const allowAll = Boolean(commandRequest?.allowAll);
        let disableReason = "";
        if (!commandText) {
          disableReason = "指令为空";
        }
        else if (!onExecuteCommandRequest) {
          disableReason = "当前无法执行";
        }
        else if (isSpectator) {
          disableReason = "观战不可执行";
        }
        else if (noRole && !spaceContext.isSpaceOwner) {
          disableReason = "旁白仅 KP 可用";
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
              className="editable-field whitespace-pre-wrap break-words"
              editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded-[8px] w-full"
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
        case MESSAGE_TYPE.IMG: {
          const imageMessage = extra?.imageMessage ?? extra;
          const imgUrl = typeof imageMessage?.url === "string" ? imageMessage.url : "";
          const imgWidth = typeof imageMessage?.width === "number" ? imageMessage.width : undefined;
          const imgHeight = typeof imageMessage?.height === "number" ? imageMessage.height : undefined;

          return (
            <div className="flex flex-col gap-1">
              {imgUrl
                ? (
                    <BetterImg
                      src={imgUrl}
                      size={{ width: imgWidth, height: imgHeight }}
                      className="rounded max-w-full max-h-[350px] h-auto"
                    />
                  )
                : (
                    <span className="text-xs text-base-content/60">[图片]</span>
                  )}
              {message.content && (
                <div className="text-sm text-base-content/80 whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
            </div>
          );
        }
        case MESSAGE_TYPE.FILE: {
          const fileMessage = extra?.fileMessage ?? extra;
          const fileUrl = typeof fileMessage?.url === "string" ? fileMessage.url : "";
          const fileName = fileMessage?.fileName || message.content || "文件";
          const sizeLabel = formatFileSize(fileMessage?.size);
          const contentNode = (
            <div className="flex items-center gap-2 min-w-0">
              <span className="badge badge-outline badge-xs">文件</span>
              <span className="truncate">{fileName}</span>
              {sizeLabel && <span className="text-[10px] text-base-content/50">{sizeLabel}</span>}
            </div>
          );

          return fileUrl
            ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link link-hover flex items-center gap-2"
                  onClick={event => event.stopPropagation()}
                >
                  {contentNode}
                </a>
              )
            : contentNode;
        }
        case MESSAGE_TYPE.VIDEO: {
          const videoMessage = extra?.videoMessage ?? extra?.fileMessage ?? extra;
          const videoUrl = typeof videoMessage?.url === "string" ? videoMessage.url : "";
          return (
            <div className="flex flex-col gap-2 min-w-0 w-full max-w-[420px]">
              {videoUrl
                ? (
                    <div className="relative overflow-hidden rounded-2xl border border-base-300/70 bg-base-200/40 shadow-sm">
                      <video
                        src={videoUrl}
                        controls={true}
                        preload="metadata"
                        className="block w-full max-h-[360px] bg-black object-contain"
                        onClick={event => event.stopPropagation()}
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
                      <span className="pointer-events-none badge badge-neutral badge-xs absolute top-2 left-2 opacity-90">视频</span>
                    </div>
                  )
                : (
                    <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 px-3 py-6 text-xs text-base-content/60 text-center">
                      [视频资源不可用]
                    </div>
                  )}
              {message.content && (
                <div className="text-sm text-base-content/80 whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
            </div>
          );
        }
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
        case MESSAGE_TYPE.SOUND: {
          const soundMessage = extra?.soundMessage ?? extra;
          const audioUrl = typeof soundMessage?.url === "string" ? soundMessage.url : "";
          const duration = soundMessage?.second ?? soundMessage?.duration;
          return (
            <div className="flex flex-col gap-2">
              {audioUrl
                ? (
                    <AudioMessage
                      url={audioUrl}
                      duration={typeof duration === "number" ? duration : undefined}
                      title={soundMessage?.fileName}
                    />
                  )
                : (
                    <span className="text-xs text-base-content/60">[语音]</span>
                  )}
              {message.content && (
                <div className="text-sm text-base-content/80 whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
            </div>
          );
        }
        case MESSAGE_TYPE.EFFECT: {
          const effectMessage = extra?.effectMessage;
          const effectName = effectMessage?.effectName || message.content || "特效";
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-info badge-xs">特效</span>
              <span className="opacity-70">{effectName}</span>
            </div>
          );
        }
        case MESSAGE_TYPE.WEBGAL_VAR: {
          const payload = extractWebgalVarPayload(message.extra);
          const summary = payload ? formatWebgalVarSummary(payload) : message.content;
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-secondary badge-xs">变量</span>
              <span className="break-words">{summary || "[变量]"}</span>
            </div>
          );
        }
        case MESSAGE_TYPE.WEBGAL_CHOOSE: {
          const payload = extractWebgalChoosePayload(message.extra);
          return <WebgalChooseMessage payload={payload} />;
        }
        case MESSAGE_TYPE.WEBGAL_COMMAND: {
          const commandText = message.content?.trim() || "";
          const displayText = commandText.startsWith("%") ? commandText : `%${commandText}`;
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-ghost badge-xs">WebGAL</span>
              <span className="font-mono break-words">{displayText}</span>
            </div>
          );
        }
        case MESSAGE_TYPE.SYSTEM:
          return (
            <div className="text-sm text-base-content/60 whitespace-pre-wrap break-words">
              {message.content || "[系统消息]"}
            </div>
          );
        default:
          return (
            <div className="text-sm text-base-content/80 whitespace-pre-wrap break-words">
              {message.content || "[未知消息]"}
            </div>
          );
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
      {useChatBubbleStyle
        ? (
            <div
              className="flex w-full items-start gap-1.5 sm:gap-3 py-1 sm:py-2 group relative"
              key={message.messageId}
            >
              {messageHoverToolbar}
              {/* Avatar */}
              <div
                className={`shrink-0 ${
                  isIntroText
                    ? "invisible cursor-default"
                    : (isAvatarSamplerActive ? "cursor-crosshair" : (canEdit ? "cursor-pointer" : "cursor-default"))
                }`}
                onClick={isIntroText ? undefined : handleAvatarClick}
              >
                {isNarrator
                  ? (
                      <div className={`flex items-center justify-center rounded-full bg-base-200/60 ${isMobile ? "w-10 h-10" : "w-12 h-12"}`}>
                        <NarratorIcon className="w-4 h-4 text-base-content/70" />
                      </div>
                    )
                  : (
                      <RoleAvatarComponent
                        avatarId={message.avatarId ?? 0}
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
                <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0 sm:pr-80 relative">
                  {!isIntroText && isEditingRoleName
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
                        !isIntroText && displayRoleName
                          ? (
                              <div className="relative flex items-center gap-2 min-w-0">
                                <span
                                  onClick={handleRoleNameClick}
                                  className={`block text-sm sm:text-sm font-medium text-base-content/85 pb-0.5 sm:pb-1 cursor-pointer transition-all duration-200 hover:text-primary truncate min-w-0 ${canEdit ? "hover:underline" : ""}`}
                                >
                                  {displayRoleName}
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
                  className="max-w-[calc(100vw-5rem)] sm:max-w-md break-words rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm sm:shadow bg-base-200 text-sm sm:text-sm lg:text-base transition-all duration-200 hover:shadow-lg hover:bg-base-300 cursor-pointer"
                  onClick={triggerEffectPreview}
                >
                  {renderedContent}
                  {threadHintNode}
                </div>
                {renderAnnotationsBar("max-w-[calc(100vw-5rem)] sm:max-w-md mt-1.5")}
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
                  className={`w-9 h-9 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-md overflow-hidden ${isIntroText ? "invisible cursor-default" : (canEdit ? "cursor-pointer" : "cursor-default")}`}
                  onClick={isIntroText ? undefined : handleAvatarClick}
                >
                  {isNarrator
                    ? (
                        <div className="w-full h-full flex items-center justify-center bg-base-200/60">
                          <NarratorIcon className="w-5 h-5 text-base-content/70" />
                        </div>
                      )
                    : (
                        <RoleAvatarComponent
                          avatarId={message.avatarId ?? 0}
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
                  {!isIntroText && isEditingRoleName
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
                        !isIntroText && displayRoleName
                          ? (
                              <div className="relative flex items-center gap-2 min-w-0">
                                <div
                                  className={`cursor-pointer text-sm sm:text-base font-semibold transition-all duration-200 hover:text-primary ${userId === message.userId ? "hover:underline" : ""} min-w-0 flex-shrink`}
                                  onClick={handleRoleNameClick}
                                >
                                  <div className="truncate">
                                    {`【${displayRoleName}】`}
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
                  className="transition-all duration-200 hover:bg-base-200/50 rounded-lg p-1.5 sm:p-2 cursor-pointer break-words text-sm sm:text-sm lg:text-base"
                  onClick={triggerEffectPreview}
                >
                  {renderedContent}
                  {threadHintNode}
                  {renderAnnotationsBar()}
                </div>
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
    && prevProps.threadHintMeta?.rootId === nextProps.threadHintMeta?.rootId
    && prevProps.threadHintMeta?.title === nextProps.threadHintMeta?.title
    && prevProps.threadHintMeta?.replyCount === nextProps.threadHintMeta?.replyCount
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
