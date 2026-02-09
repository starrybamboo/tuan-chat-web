import type { ChatMessageResponse, Message } from "../../../../api";
import type { FigureAnimationSettings, FigurePosition } from "@/types/voiceRenderTypes";
import React, { use, useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";
import RoleChooser from "@/components/chat/input/roleChooser";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import AudioMessage from "@/components/chat/message/media/AudioMessage";
import ForwardMessage from "@/components/chat/message/preview/forwardMessage";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";
import { VoiceRenderPanel } from "@/components/chat/message/voiceRenderPanel";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import BetterImg from "@/components/common/betterImg";
import { EditableField } from "@/components/common/editableField";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import { BranchIcon, ChatBubbleEllipsesOutline, CommentOutline, Edit2Outline, EmojiIconWhite, InsertLineBelow, ListUnordered, MoreMenu, NarratorIcon, ScreenIcon } from "@/icons";
import {
  ANNOTATION_IDS,
  areAnnotationsEqual,
  getFigurePositionFromAnnotationId,
  getFigurePositionFromAnnotations,
  hasAnnotation,
  isFigurePositionAnnotationId,
  normalizeAnnotations,
  setAnnotation,
  setFigurePositionAnnotation,
} from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalVarPayload, formatWebgalVarSummary } from "@/types/webgalVar";
import { formatTimeSmartly } from "@/utils/dateUtil";
import { getScreenSize } from "@/utils/getScreenSize";
import { useSendMessageMutation, useUpdateMessageMutation } from "../../../../api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery, useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import DocCardMessage from "./docCard/docCardMessage";

interface CommandRequestPayload {
  command: string;
  allowAll?: boolean;
  allowedRoleIds?: number[];
}

const EMPTY_ANNOTATIONS: string[] = [];

function ChatBubbleComponent({ chatMessageResponse, useChatBubbleStyle, threadHintMeta, onExecuteCommandRequest, onToggleSelection }: {
  /** 包含聊天消息内容、发送者等信息的数据对象 */
  chatMessageResponse: ChatMessageResponse;
  /** 控制是否应用气泡样式，默认为false */
  useChatBubbleStyle?: boolean;
  /** 当该消息被创建子区后，在其下方展示 Thread 提示条（主消息流“看起来只有一条”） */
  threadHintMeta?: { rootId: number; title: string; replyCount: number };
  /** 点击“检定请求”按钮后，触发外层执行（以点击者身份发送并执行指令） */
  onExecuteCommandRequest?: (payload: { command: string; threadId?: number; requestMessageId: number }) => void;
  onToggleSelection?: (messageId: number) => void;
}) {
  const message = chatMessageResponse.message;
  const annotations = useMemo(() => {
    const base = Array.isArray(message.annotations)
      ? (message.annotations ?? EMPTY_ANNOTATIONS)
      : EMPTY_ANNOTATIONS;
    if (message.messageType === MESSAGE_TYPE.IMG && message.extra?.imageMessage?.background) {
      return base.includes(ANNOTATION_IDS.BACKGROUND) ? base : [...base, ANNOTATION_IDS.BACKGROUND];
    }
    return base;
  }, [message.annotations, message.extra?.imageMessage?.background, message.messageType]);
  const useRoleRequest = useGetRoleQuery(chatMessageResponse.message.roleId ?? 0);
  // 获取头像详情（包含 avatarTitle）
  const avatarQuery = useGetRoleAvatarQuery(message.avatarId ?? 0);
  const avatar = avatarQuery.data?.data;

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
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const setSubDrawerState = useSideDrawerStore(state => state.setSubState);
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const useChatBubbleStyleFromStore = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  useChatBubbleStyle = useChatBubbleStyle ?? useChatBubbleStyleFromStore;

  const isMobile = getScreenSize() === "sm";

  const isThreadRoot = message.messageType === MESSAGE_TYPE.THREAD_ROOT && message.threadId === message.messageId;
  const threadTitle = (message.extra as any)?.title || message.content;
  const threadReplyCount = useMemo(() => {
    if (!isThreadRoot) {
      return 0;
    }
    const allMessages = roomContext.chatHistory?.messages ?? [];
    return allMessages.filter(m => m.message.threadId === message.messageId && m.message.messageId !== message.messageId).length;
  }, [isThreadRoot, message.messageId, roomContext.chatHistory?.messages]);

  const shouldShowThreadHint = !!threadHintMeta
    && !isThreadRoot
    // reply 不展示提示条（reply 也不会出现在主消息流，但 thread 面板里也无需显示）
    && (!message.threadId || message.threadId === message.messageId);

  const handleOpenThreadById = React.useCallback((rootId: number) => {
    // 打开 Thread 时，清除“插入消息”模式，避免错位。
    setInsertAfterMessageId(undefined);
    setThreadRootMessageId(rootId);
    setComposerTarget("thread");
    // Thread 以右侧 SubWindow 展示
    setSideDrawerState("thread");
    setSubDrawerState("none");
  }, [setComposerTarget, setInsertAfterMessageId, setSideDrawerState, setSubDrawerState, setThreadRootMessageId]);

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

  const handleOpenThreadRoot = React.useCallback(() => {
    if (!isThreadRoot) {
      return;
    }
    // 打开 Thread 时，清除“插入消息”模式，避免错位。
    setInsertAfterMessageId(undefined);
    setThreadRootMessageId(message.messageId);
    setComposerTarget("thread");
    // Thread 以右侧 SubWindow 展示
    setSideDrawerState("thread");
    setSubDrawerState("none");
  }, [isThreadRoot, message.messageId, setComposerTarget, setInsertAfterMessageId, setSideDrawerState, setSubDrawerState, setThreadRootMessageId]);

  // 角色名编辑状态
  const [isEditingRoleName, setIsEditingRoleName] = useState(false);
  const [editingRoleName, setEditingRoleName] = useState("");

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
  const voiceRenderSettings = (message.webgal as any)?.voiceRenderSettings as {
    emotionVector?: number[];
    figureAnimation?: FigureAnimationSettings;
  } | undefined;
  const figurePosition = getFigurePositionFromAnnotations(annotations);
  const dialogNotend = hasAnnotation(annotations, ANNOTATION_IDS.DIALOG_NOTEND);
  const dialogConcat = hasAnnotation(annotations, ANNOTATION_IDS.DIALOG_CONCAT);
  // 获取显示的角色名（黑屏文字不显示）
  const displayRoleName = isIntroText
    ? ""
    : (customRoleName || role?.roleName?.trim() || (isNarrator ? "" : "Undefined"));

  // 更新消息并同步到本地缓存
  const updateMessageAndSync = useCallback((newMessage: Message) => {
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
  }, [chatMessageResponse, roomContext, updateMessageMutation]);

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
    if (isFigurePositionAnnotationId(id)) {
      const alreadySelected = annotations.includes(id);
      const nextPosition = alreadySelected ? undefined : getFigurePositionFromAnnotationId(id);
      handleUpdateAnnotations(setFigurePositionAnnotation(annotations, nextPosition));
      return;
    }
    const has = annotations.includes(id);
    const next = has ? annotations.filter(item => item !== id) : [...annotations, id];
    handleUpdateAnnotations(next);
  }, [annotations, handleUpdateAnnotations]);

  const handleOpenAnnotations = useCallback(() => {
    openMessageAnnotationPicker({
      initialSelected: annotations,
      onChange: handleUpdateAnnotations,
    });
  }, [annotations, handleUpdateAnnotations]);

  const annotationsBar = (
    <MessageAnnotationsBar
      annotations={annotations}
      canEdit={canEdit}
      onToggle={handleToggleAnnotation}
      onOpenPicker={handleOpenAnnotations}
    />
  );

  const canEditContent = canEdit
    && (message.messageType === MESSAGE_TYPE.TEXT || message.messageType === MESSAGE_TYPE.INTRO_TEXT);
  const threadActionLabel = (isThreadRoot || threadHintMeta?.rootId) ? "打开子区" : "创建子区";

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
        roomContext.chatHistory?.addOrUpdateMessage({ message: created, messageMark: [] });
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

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
        }
      },
    });
  }, [canEdit, chatMessageResponse, isIntroText, message, roomContext, updateMessageMutation]);

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

  function handleAvatarClick() {
    if (canEdit) {
      // 打开表情选择器的 toast 窗口
      toastWindow(
        onClose => (
          <RoomContext value={roomContext}>
            <div className="flex flex-col">
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
              />
            </div>
          </RoomContext>
        ),
      );
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

  // 处理语音渲染设置更新
  function handleVoiceRenderSettingsChange(
    emotionVector: number[],
    figurePosition: FigurePosition,
    notend: boolean,
    concat: boolean,
    figureAnimation?: FigureAnimationSettings,
  ) {
    console.warn("[ChatBubble] 保存语音渲染设置:", {
      messageId: message.messageId,
      figurePosition,
      figurePositionType: typeof figurePosition,
    });

    // 判断情感向量是否改变（用于决定是否重新生成 TTS）
    const oldEmotionVector = message.webgal?.voiceRenderSettings?.emotionVector;
    const emotionVectorChanged = JSON.stringify(emotionVector) !== JSON.stringify(oldEmotionVector);

    const nextAnnotations = setFigurePositionAnnotation(
      setAnnotation(
        setAnnotation(annotations, ANNOTATION_IDS.DIALOG_NOTEND, notend),
        ANNOTATION_IDS.DIALOG_CONCAT,
        concat,
      ),
      figurePosition,
    );

    const prevVoiceRenderSettings = (message.webgal as any)?.voiceRenderSettings ?? {};
    const {
      notend: _legacyNotend,
      concat: _legacyConcat,
      figurePosition: _legacyPosition,
      ...restVoiceRenderSettings
    } = prevVoiceRenderSettings as Record<string, unknown>;

    const newMessage = {
      ...message,
      annotations: nextAnnotations,
      webgal: {
        ...message.webgal,
        voiceRenderSettings: {
          ...restVoiceRenderSettings,
          emotionVector,
          figureAnimation,
        },
      },
    } as Message;

    console.warn("[ChatBubble] 准备发送的消息:", JSON.stringify(newMessage.webgal?.voiceRenderSettings, null, 2));

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
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, emotionVectorChanged);
          }
        }
      },
    });
  }

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

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          // 如果 WebGAL 联动模式开启，则重渲染
          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
        }
      },
    });
  }, [chatMessageResponse, message, roomContext, updateMessageMutation]);

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

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
        }
      },
    });
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

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        if (response?.data && roomContext.chatHistory) {
          const updatedChatMessageResponse = {
            ...chatMessageResponse,
            message: response.data,
          };
          roomContext.chatHistory.addOrUpdateMessage(updatedChatMessageResponse);

          if (roomContext.updateAndRerenderMessageInWebGAL) {
            roomContext.updateAndRerenderMessageInWebGAL(updatedChatMessageResponse, false);
          }
        }
      },
    });
  }

  // 切换旁白状态
  function handleToggleNarrator() {
    if (!canEdit)
      return;

    if (isNarrator) {
      // 如果当前是旁白，切换回普通角色 -> 打开角色选择器
      toastWindow(
        onClose => (
          <RoomContext value={roomContext}>
            <div className="flex flex-col items-center gap-4">
              <div>选择角色</div>
              <RoleChooser
                handleRoleChange={(role) => {
                  handleRoleChange(role.roleId);
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
      // 如果当前是普通角色，切换为旁白 -> roleId 设为 -1
      const newMessage = {
        ...message,
        roleId: -1,
      };
      updateMessageAndSync(newMessage);
    }
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
            <PreviewMessage message={message.replyMessageId} className="block" />
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
            <EditableField
              content={message.content}
              handleContentUpdate={handleContentUpdate}
              className="editable-field whitespace-pre-wrap break-words"
              canEdit={canEditContent}
            />
          );
        case MESSAGE_TYPE.INTRO_TEXT:
          return (
            <div className="rounded-lg bg-black text-white px-3 py-2 shadow-inner">
              <EditableField
                content={message.content}
                handleContentUpdate={handleContentUpdate}
                className="editable-field whitespace-pre-wrap break-words text-white"
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
                      className="rounded max-w-full"
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
        case MESSAGE_TYPE.FORWARD:
          return <ForwardMessage messageResponse={chatMessageResponse} />;
        case MESSAGE_TYPE.DICE: {
          const diceResult = extra?.diceResult;
          const result = diceResult?.result || message.content || "";
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="badge badge-accent badge-xs">骰子</span>
              <span className="break-words">{result || "[骰子]"}</span>
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

  // Thread Root（Discord 风格提示条）
  if (isThreadRoot) {
    const creatorName = displayRoleName || role?.roleName?.trim() || "";
    return (
      <div className="w-full py-1.5 sm:py-2 group">
        <div
          className="w-full rounded-md border border-base-300 bg-base-200/40 px-2 sm:px-3 py-1.5 sm:py-2 cursor-pointer hover:bg-base-200 transition-colors"
          onClick={handleOpenThreadRoot}
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm text-base-content/80">
            <ChatBubbleEllipsesOutline className="w-3 h-3 sm:w-4 sm:h-4 opacity-70" />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-base-content/90">{creatorName || "某人"}</span>
              <span className="mx-1">开始了一个子区：</span>
              <span className="font-medium text-base-content/90 truncate">{threadTitle}</span>
              <button
                type="button"
                className="ml-2 link link-hover text-xs sm:text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenThreadRoot();
                }}
              >
                查看所有子区
              </button>
            </div>
            <div className="text-xs text-base-content/50 shrink-0">{formattedTime}</div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md bg-base-100/70 border border-base-300 px-2 py-0.5 sm:py-1">
              <RoleAvatarComponent
                avatarId={message.avatarId ?? 0}
                roleId={message.roleId ?? undefined}
                width={6}
                isRounded={true}
                withTitle={false}
                stopPopWindow={true}
                useDefaultAvatarFallback={false}
              />
              <div className="text-sm text-base-content/80 max-w-[60vw] sm:max-w-[360px] truncate">
                {threadTitle}
              </div>
              <div className="text-xs text-base-content/60 shrink-0">
                {threadReplyCount}
                {" "}
                条消息
              </div>
            </div>
          </div>
        </div>
        {annotationsBar}
      </div>
    );
  }

  return (
    <div>
      {useChatBubbleStyle
        ? (
            <div
              className="flex w-full items-start gap-1.5 sm:gap-3 py-1 sm:py-2 group relative"
              key={message.messageId}
            >
              {messageHoverToolbar}
              {/* Avatar */}
              <div
                className={`shrink-0 ${isIntroText ? "invisible cursor-default" : (canEdit ? "cursor-pointer" : "cursor-default")}`}
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
                        stopPopWindow={true}
                        useDefaultAvatarFallback={false}
                      />
                    )}
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0 sm:pr-80">
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
                              <span
                                onClick={handleRoleNameClick}
                                className={`block text-sm sm:text-sm font-medium text-base-content/85 pb-0.5 sm:pb-1 cursor-pointer transition-all duration-200 hover:text-primary truncate min-w-0 ${canEdit ? "hover:underline" : ""}`}
                              >
                                {displayRoleName}
                              </span>
                            )
                          : null
                      )}
                  <span className="hidden sm:inline text-xs text-base-content/50 ml-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100 shrink-0">
                    {isEdited && <span className="text-warning mr-1">(已编辑)</span>}
                    {formattedTime}
                  </span>
                </div>
                <div
                  className="max-w-[calc(100vw-5rem)] sm:max-w-md break-words rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm sm:shadow bg-base-200 text-sm sm:text-sm lg:text-base transition-all duration-200 hover:shadow-lg hover:bg-base-300 cursor-pointer"
                >
                  {renderedContent}
                  {threadHintNode}
                  {annotationsBar}
                  {/* 内嵌语音渲染设置面板 - 文本消息显示 */}
                  {message.messageType === MESSAGE_TYPE.TEXT && (
                    <VoiceRenderPanel
                      emotionVector={voiceRenderSettings?.emotionVector}
                      figurePosition={figurePosition}
                      avatarTitle={avatar?.avatarTitle}
                      notend={dialogNotend}
                      concat={dialogConcat}
                      figureAnimation={voiceRenderSettings?.figureAnimation}
                      onChange={handleVoiceRenderSettingsChange}
                      canEdit={canEdit}
                      isIntroText={isIntroText}
                      onToggleIntroText={canEdit && webgalLinkMode ? handleToggleIntroText : undefined}
                      onToggleNarrator={canEdit && webgalLinkMode ? handleToggleNarrator : undefined}
                    />
                  )}
                </div>
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
                          stopPopWindow={true}
                          useDefaultAvatarFallback={false}
                        >
                        </RoleAvatarComponent>
                      )}
                </div>
              </div>
              {/* 消息内容 */}
              <div className="flex-1 min-w-0 p-0.5 sm:p-1 pr-2 sm:pr-5">
                {/* 角色名 */}
                <div className="flex items-center w-full gap-2 sm:pr-80">
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
                              <div
                                className={`cursor-pointer text-sm sm:text-base font-semibold transition-all duration-200 hover:text-primary ${userId === message.userId ? "hover:underline" : ""} min-w-0 flex-shrink`}
                                onClick={handleRoleNameClick}
                              >
                                <div className="truncate">
                                  {`【${displayRoleName}】`}
                                </div>
                              </div>
                            )
                          : null
                      )}
                  <div className="text-xs text-base-content/50 pt-1 ml-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100 shrink-0">
                    {isEdited && <span className="text-warning mr-1">(已编辑)</span>}
                    {formattedTime}
                  </div>
                </div>
                <div className="transition-all duration-200 hover:bg-base-200/50 rounded-lg p-1.5 sm:p-2 cursor-pointer break-words text-sm sm:text-sm lg:text-base">
                  {renderedContent}
                  {threadHintNode}
                  {annotationsBar}
                  {/* 内嵌语音渲染设置面板 - 文本消息显示 */}
                  {message.messageType === MESSAGE_TYPE.TEXT && (
                    <VoiceRenderPanel
                      emotionVector={voiceRenderSettings?.emotionVector}
                      figurePosition={figurePosition}
                      avatarTitle={avatar?.avatarTitle}
                      notend={dialogNotend}
                      concat={dialogConcat}
                      figureAnimation={voiceRenderSettings?.figureAnimation}
                      onChange={handleVoiceRenderSettingsChange}
                      canEdit={canEdit}
                      isIntroText={isIntroText}
                      onToggleIntroText={canEdit && webgalLinkMode ? handleToggleIntroText : undefined}
                      onToggleNarrator={canEdit && webgalLinkMode ? handleToggleNarrator : undefined}
                    />
                  )}
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
