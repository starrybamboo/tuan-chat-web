import React from "react";

import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { CommandInlineCompletion } from "@/components/chat/input/commandInlineCompletion";
import type { WebPokeComposerTarget } from "@/components/chat/room/useWebPokeComposer";

import AtMentionController from "@/components/atMentionController";
import { CHAT_COMPOSER_RESIZE_EVENT } from "@/components/chat/chatFrameEvents";
import { useVisibleClueFolderUnreadCount } from "@/components/chat/clues/clueUnread";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { getComposerAnnotations, setComposerAnnotations as persistComposerAnnotations } from "@/components/chat/infra/localDb/composerAnnotationsDb";
import ChatInputArea from "@/components/chat/input/chatInputArea";
import ChatToolbarFromStore from "@/components/chat/input/chatToolbarFromStore";
import CommandPanelFromStore from "@/components/chat/input/commandPanelFromStore";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import ChatAttachmentsPreviewFromStore from "@/components/chat/message/chatAttachmentsPreviewFromStore";
import RepliedMessage from "@/components/chat/message/preview/repliedMessage";
import RoomComposerHeader from "@/components/chat/room/roomComposerHeader";
import {
  getComposerInputModeClass,
  shouldCancelComposerModeWithEscape,
} from "@/components/chat/room/roomComposerInsertMode";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";
import { hasHostPrivileges } from "@/components/chat/utils/memberPermissions";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import { getFigurePositionFromAnnotations, hasClearFigureAnnotation, normalizeAnnotations, setFigurePositionAnnotation, toggleAnnotation } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { UserRole } from "../../../../api";

import { useGetRoleAvatarsQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

type RoomComposerPanelProps = {
  roomId: number;
  userId: number;
  webSocketUtils: any;

  handleSelectCommand: (cmdName: string) => void;
  commandInlineCompletion: CommandInlineCompletion | null;
  ruleId: number;

  handleMessageSubmit: () => Promise<void> | void;
  pokeTarget?: WebPokeComposerTarget | null;
  onCancelPoke: () => void;

  currentChatStatus: any;
  onChangeChatStatus: (status: any) => void;

  isSpectator: boolean;

  onToggleRealtimeRender: () => void;

  onSendEffect: (effectName: string) => void;
  onClearBackground: () => void;
  onClearFigure: () => void;
  onOpenFullMessageDiff?: () => void;
  isFullMessageDiffOpen?: boolean;

  /** KP（房主）权限标记，用于显示“停止全员BGM” */
  isKP?: boolean;
  /** 当前空间是否已归档，归档后仅 KP 可发言 */
  isSpaceArchived?: boolean;
  /** KP：停止全员BGM */
  onStopBgmForAll?: () => void;

  noRole: boolean;
  notMember: boolean;
  isSubmitting: boolean;

  curRoleId: number;
  curAvatarId: number;
  setCurRoleId: (roleId: number) => void;
  setCurAvatarId: (avatarId: number) => void;

  /** 输入框 @ 提及候选（应包含房间内全部可提及角色，含 NPC） */
  mentionRoles: UserRole[];
  /** 当前用户可切换的身份列表（玩家拥有角色 + NPC；旁白由 roleId=-1 表示） */
  selectableRoles: UserRole[];

  chatInputRef: React.RefObject<ChatInputAreaHandle | null>;
  atMentionRef: React.RefObject<AtMentionHandle | null>;

  onInputSync: (plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => void;
  onPasteFiles: (files: File[]) => void;

  onKeyDown: (e: React.KeyboardEvent) => void;
  onKeyUp: (e: React.KeyboardEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;

  onCompositionStart: () => void;
  onCompositionEnd: () => void;
}

function RoomComposerPanelImpl({
  roomId,
  userId,
  webSocketUtils,
  handleSelectCommand,
  commandInlineCompletion,
  ruleId,
  handleMessageSubmit,
  pokeTarget,
  onCancelPoke,
  currentChatStatus,
  onChangeChatStatus,
  isSpectator,
  onToggleRealtimeRender,
  onSendEffect,
  onClearBackground,
  onClearFigure,
  onOpenFullMessageDiff,
  isFullMessageDiffOpen,
  isKP,
  isSpaceArchived = false,
  onStopBgmForAll,
  noRole,
  notMember,
  isSubmitting,
  curRoleId,
  curAvatarId,
  setCurRoleId,
  setCurAvatarId,
  mentionRoles: mentionRolesProp,
  selectableRoles,
  chatInputRef,
  atMentionRef,
  onInputSync,
  onPasteFiles,
  onKeyDown,
  onKeyUp,
  onMouseDown,
  onCompositionStart,
  onCompositionEnd,
}: RoomComposerPanelProps) {
  const imgFilesCount = useChatComposerStore(state => state.imgFiles.length);
  const fileAttachmentsCount = useChatComposerStore(state => state.fileAttachments.length);
  const audioFile = useChatComposerStore(state => state.audioFile);
  const composerAnnotations = useChatComposerStore(state => state.annotations);
  const setComposerAnnotations = useChatComposerStore(state => state.setAnnotations);
  const composerRootRef = React.useRef<HTMLDivElement | null>(null);
  const composerAnnotationsLoadingKeyRef = React.useRef<string | null>(null);
  const screenSize = useScreenSize();
  const toolbarLayout: "inline" | "stacked" = screenSize === "sm" ? "stacked" : "inline";
  const spaceContext = React.use(SpaceContext);
  const clueUnreadCount = useVisibleClueFolderUnreadCount(spaceContext.spaceId);
  const spaceMembers = spaceContext.spaceMembers;
  const resolveDefaultFigurePosition = React.useCallback((role?: UserRole) => {
    if (!role) {
      return undefined;
    }
    const memberType = (spaceMembers ?? []).find(member => member.userId === role.userId)?.memberType;
    if (hasHostPrivileges(memberType)) {
      return "left";
    }
    if (memberType === 2) {
      return "right";
    }
    if (role.userId === userId && typeof isKP === "boolean") {
      return isKP ? "left" : "right";
    }
    return undefined;
  }, [isKP, spaceMembers, userId]);
  const mentionRoles = React.useMemo(() => {
    if (!isKP) {
      return mentionRolesProp;
    }
    const atAllRole: UserRole = {
      userId: -1,
      roleId: -9999,
      roleName: "检定请求",
      avatarId: -1,
      type: 0,
      extra: {
        mentionNote: "发送检定请求",
      },
    };
    return [atAllRole, ...mentionRolesProp];
  }, [isKP, mentionRolesProp]);
  const prevImgFilesCountRef = React.useRef(imgFilesCount);
  const prevFileAttachmentsCountRef = React.useRef(fileAttachmentsCount);
  const prevHasAudioRef = React.useRef(Boolean(audioFile));

  React.useEffect(() => {
    const prevImgFilesCount = prevImgFilesCountRef.current;
    const prevFileAttachmentsCount = prevFileAttachmentsCountRef.current;
    const prevHasAudio = prevHasAudioRef.current;

    const hasNewImages = imgFilesCount > prevImgFilesCount;
    const hasNewFiles = fileAttachmentsCount > prevFileAttachmentsCount;
    const hasNewAudio = Boolean(audioFile) && !prevHasAudio;

    // 移动端避免自动聚焦弹出光标/键盘
    if (screenSize !== "sm" && (hasNewImages || hasNewFiles || hasNewAudio)) {
      chatInputRef.current?.focus();
    }

    prevImgFilesCountRef.current = imgFilesCount;
    prevFileAttachmentsCountRef.current = fileAttachmentsCount;
    prevHasAudioRef.current = Boolean(audioFile);
  }, [audioFile, chatInputRef, fileAttachmentsCount, imgFilesCount, screenSize]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const target = composerRootRef.current;
    if (!target) {
      return;
    }
    const root = document.documentElement;
    const update = () => {
      const { height } = target.getBoundingClientRect();
      root.style.setProperty("--chat-composer-height", `${height}px`);
      window.dispatchEvent(new CustomEvent(CHAT_COMPOSER_RESIZE_EVENT, {
        detail: { height },
      }));
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => {
        window.removeEventListener("resize", update);
        root.style.removeProperty("--chat-composer-height");
      };
    }
    const observer = new ResizeObserver(() => update());
    observer.observe(target);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--chat-composer-height");
    };
  }, []);

  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const toggleWebgalLinkMode = useRoomPreferenceStore(state => state.toggleWebgalLinkMode);
  const autoReplyMode = useRoomPreferenceStore(state => state.autoReplyMode);
  const toggleAutoReplyMode = useRoomPreferenceStore(state => state.toggleAutoReplyMode);
  const runModeEnabled = useRoomPreferenceStore(state => state.runModeEnabled);
  const setRunModeEnabled = useRoomPreferenceStore(state => state.setRunModeEnabled);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const draftCustomRoleNameMap = useRoomPreferenceStore(state => state.draftCustomRoleNameMap);
  const setDraftCustomRoleNameForRole = useRoomPreferenceStore(state => state.setDraftCustomRoleNameForRole);

  const onToggleRunMode = React.useCallback(() => {
    if (runModeEnabled) {
      setRunModeEnabled(false);
      setSideDrawerState("none");
      return;
    }
    setRunModeEnabled(true);
    setSideDrawerState("map");
  }, [runModeEnabled, setRunModeEnabled, setSideDrawerState]);

  const currentRole = React.useMemo(() => {
    return selectableRoles.find(role => role.roleId === curRoleId);
  }, [curRoleId, selectableRoles]);

  const shouldWarmCurrentRoleAvatars = curRoleId > 0 && !isSpectator;
  const shouldLoadRoleAvatarsForFallback = shouldWarmCurrentRoleAvatars
    && curAvatarId <= 0
    && !currentRole?.avatarId;
  const roleAvatarsQuery = useGetRoleAvatarsQuery(curRoleId > 0 ? curRoleId : -1, {
    enabled: shouldWarmCurrentRoleAvatars,
  });
  const roleAvatars = React.useMemo(() => roleAvatarsQuery.data?.data ?? [], [roleAvatarsQuery.data?.data]);
  const hasRoleAvatarsLoaded = !shouldLoadRoleAvatarsForFallback || Boolean(roleAvatarsQuery.data);

  const displayRoleName = React.useMemo(() => getDisplayRoleName({
    roleId: curRoleId,
    roleName: currentRole?.roleName,
    draftRoleName: draftCustomRoleNameMap[curRoleId],
    isSpectator,
  }), [curRoleId, currentRole?.roleName, draftCustomRoleNameMap, isSpectator]);

  React.useEffect(() => {
    if (isSpectator || curRoleId <= 0) {
      return;
    }
    if (!hasRoleAvatarsLoaded && !currentRole?.avatarId) {
      return;
    }

    const avatarIds = roleAvatars
      .map(avatar => avatar.avatarId ?? -1)
      .filter(avatarId => avatarId > 0);
    const hasValidAvatar = curAvatarId > 0
      && (avatarIds.length === 0 || avatarIds.includes(curAvatarId));

    if (hasValidAvatar) {
      return;
    }

    const fallbackAvatarId = avatarIds[0] ?? currentRole?.avatarId ?? -1;
    if (fallbackAvatarId > 0 && fallbackAvatarId !== curAvatarId) {
      setCurAvatarId(fallbackAvatarId);
    }
  }, [
    curAvatarId,
    curRoleId,
    currentRole?.avatarId,
    hasRoleAvatarsLoaded,
    isSpectator,
    roleAvatars,
    setCurAvatarId,
  ]);

  const replyMessage = useRoomUiStore(state => state.replyMessage);
  const insertAfterMessageId = useRoomUiStore(state => state.insertAfterMessageId);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  React.useEffect(() => {
    if ((!insertAfterMessageId && !pokeTarget) || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (!shouldCancelComposerModeWithEscape(event)) {
        return;
      }
      event.preventDefault();
      if (pokeTarget) {
        onCancelPoke();
        return;
      }
      setInsertAfterMessageId(undefined);
    };

    window.addEventListener("keydown", handleEscape, true);
    return () => {
      window.removeEventListener("keydown", handleEscape, true);
    };
  }, [insertAfterMessageId, onCancelPoke, pokeTarget, setInsertAfterMessageId]);

  const inputDisabled = (isSpaceArchived && !isKP) || (noRole && !isKP && !notMember);
  const placeholderText = React.useMemo(() => {
    if (isSpaceArchived && !isKP) {
      return "当前空间已归档，仅主持人可发言";
    }
    if (notMember) {
      return "输入消息…（Shift+Enter 换行）";
    }
    if (noRole && !isKP) {
      return "请选择/拉入你的角色后再发送";
    }
    if (noRole && isKP) {
      return "旁白模式：输入内容…（Shift+Enter 换行）";
    }
    if (curAvatarId <= 0) {
      return "请选择角色立绘后发送…（Shift+Enter 换行）";
    }
    if (insertAfterMessageId) {
      return "插入消息中…（Shift+Enter 换行）";
    }
    return "输入消息…（Shift+Enter 换行）";
  }, [curAvatarId, insertAfterMessageId, isKP, isSpaceArchived, noRole, notMember]);
  const composerInputModeClass = getComposerInputModeClass({
    isInsertMode: Boolean(insertAfterMessageId),
    isPokeMode: Boolean(pokeTarget),
  });
  React.useEffect(() => {
    let isActive = true;
    const key = `${roomId}:${curRoleId}`;
    composerAnnotationsLoadingKeyRef.current = key;
    setComposerAnnotations([]);
    getComposerAnnotations({ roomId, roleId: curRoleId })
      .then((stored) => {
        if (!isActive) {
          return;
        }
        const defaultFigurePosition = resolveDefaultFigurePosition(currentRole);
        let next = normalizeAnnotations(stored ?? []);
        if (!hasClearFigureAnnotation(next) && !getFigurePositionFromAnnotations(next) && defaultFigurePosition) {
          next = setFigurePositionAnnotation(next, defaultFigurePosition);
        }
        setComposerAnnotations(next);
      })
      .finally(() => {
        if (!isActive) {
          return;
        }
        if (composerAnnotationsLoadingKeyRef.current === key) {
  composerAnnotationsLoadingKeyRef.current = null;
        }
      });
    return () => {
      isActive = false;
    };
  }, [curRoleId, currentRole, resolveDefaultFigurePosition, roomId, setComposerAnnotations]);

  React.useEffect(() => {
    if (isSpectator) {
      return;
    }
    const key = `${roomId}:${curRoleId}`;
    if (composerAnnotationsLoadingKeyRef.current === key) {
      return;
    }
    const next = normalizeAnnotations(composerAnnotations);
    persistComposerAnnotations({ roomId, roleId: curRoleId, annotations: next })
      .catch(() => {});
  }, [composerAnnotations, curRoleId, isSpectator, roomId]);

  const handleToggleComposerAnnotation = React.useCallback((id: string) => {
    setComposerAnnotations(toggleAnnotation(composerAnnotations, id));
  }, [composerAnnotations, setComposerAnnotations]);

  const handleOpenComposerAnnotations = React.useCallback(() => {
    openMessageAnnotationPicker({
      initialSelected: composerAnnotations,
      messageType: MESSAGE_TYPE.TEXT,
      onChange: (next) => {
        setComposerAnnotations(normalizeAnnotations(next));
      },
    });
  }, [composerAnnotations, setComposerAnnotations]);

  const toolbarCommonProps = React.useMemo(() => ({
    roomId,
    statusUserId: userId,
    statusWebSocketUtils: webSocketUtils,
    statusExcludeSelf: false,
    handleMessageSubmit,
    isInsertMode: Boolean(insertAfterMessageId),
    onCancelInsertMode: () => setInsertAfterMessageId(undefined),
    isPokeMode: Boolean(pokeTarget),
    onCancelPokeMode: onCancelPoke,
    currentChatStatus,
    onChangeChatStatus,
    isSpectator,
    onToggleRealtimeRender,
    onToggleWebgalLinkMode: toggleWebgalLinkMode,
    autoReplyMode,
    onToggleAutoReplyMode: toggleAutoReplyMode,
    runModeEnabled,
    runModeBadgeCount: clueUnreadCount,
    onToggleRunMode,
    onSendEffect,
    onClearBackground,
    onClearFigure,
    onOpenFullMessageDiff,
    isFullMessageDiffOpen,
    isKP,
    isSpaceArchived,
    onStopBgmForAll,
    noRole,
    notMember,
    isSubmitting,
    layout: toolbarLayout,
    showStatusBar: false,
  }), [
    autoReplyMode,
    currentChatStatus,
    handleMessageSubmit,
    insertAfterMessageId,
    isFullMessageDiffOpen,
    isKP,
    isSpaceArchived,
    isSpectator,
    isSubmitting,
    clueUnreadCount,
    noRole,
    notMember,
    onChangeChatStatus,
    onClearBackground,
    onClearFigure,
    onOpenFullMessageDiff,
    onCancelPoke,
    onSendEffect,
    onStopBgmForAll,
    setInsertAfterMessageId,
    onToggleRealtimeRender,
    runModeEnabled,
    roomId,
    toggleAutoReplyMode,
    toggleWebgalLinkMode,
    userId,
    webSocketUtils,
    onToggleRunMode,
    toolbarLayout,
  ]);
  const headerToolbarControls = (
    <ChatToolbarFromStore
      {...toolbarCommonProps}
      showWebgalLinkToggle={false}
      showRunModeToggle={false}
      showMainActions={false}
      showSendButton={false}
      showWebgalControls={true}
      showRunControls={true}
    />
  );
  const shouldShowHeaderToolbar = webgalLinkMode || runModeEnabled;

  const shouldShowComposerAnnotations = !isSpectator || composerAnnotations.length > 0;
  const composerAnnotationsBar = shouldShowComposerAnnotations
    ? (
        <MessageAnnotationsBar
          annotations={composerAnnotations}
          canEdit={!isSpectator}
          onToggle={handleToggleComposerAnnotation}
          onOpenPicker={handleOpenComposerAnnotations}
          showWhenEmpty={true}
          alwaysShowAddButton={true}
          showNormalModeAnnotationsOnly={false}
          compact={true}
          compactScroll={false}
          className="mt-0"
        />
      )
    : null;

  const headerToolbar = shouldShowHeaderToolbar ? headerToolbarControls : null;
  const [commandGhostPosition, setCommandGhostPosition] = React.useState<{
    left: number;
    top: number;
    lineHeight: number;
    maxWidth: number;
    font: string;
    letterSpacing: string;
  } | null>(null);
  const inputShellRef = React.useRef<HTMLDivElement | null>(null);
  const commandGhostRafRef = React.useRef<number | null>(null);
  const updateCommandGhostPosition = React.useCallback(() => {
    commandGhostRafRef.current = null;
    if (!commandInlineCompletion || inputDisabled) {
      setCommandGhostPosition(null);
      return;
    }

    const shell = inputShellRef.current;
    const editor = chatInputRef.current?.getRawElement();
    const caretRect = chatInputRef.current?.getCaretClientRect();
    if (!shell || !editor || !caretRect) {
      setCommandGhostPosition(null);
      return;
    }

    const shellRect = shell.getBoundingClientRect();
    const editorStyle = window.getComputedStyle(editor);
    const fontSize = Number.parseFloat(editorStyle.fontSize) || 14;
    const lineHeight = Number.parseFloat(editorStyle.lineHeight) || fontSize * 1.4;
    setCommandGhostPosition({
      left: caretRect.left - shellRect.left,
      top: caretRect.top - shellRect.top,
      lineHeight,
      maxWidth: Math.max(0, shellRect.right - caretRect.left - 8),
      font: editorStyle.font,
      letterSpacing: editorStyle.letterSpacing,
    });
  }, [chatInputRef, commandInlineCompletion, inputDisabled]);
  const scheduleCommandGhostPositionUpdate = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (commandGhostRafRef.current !== null) {
      return;
    }
    commandGhostRafRef.current = window.requestAnimationFrame(updateCommandGhostPosition);
  }, [updateCommandGhostPosition]);
  React.useLayoutEffect(() => {
    updateCommandGhostPosition();
  }, [updateCommandGhostPosition]);
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    document.addEventListener("selectionchange", scheduleCommandGhostPositionUpdate);
    window.addEventListener("resize", scheduleCommandGhostPositionUpdate);
    return () => {
      document.removeEventListener("selectionchange", scheduleCommandGhostPositionUpdate);
      window.removeEventListener("resize", scheduleCommandGhostPositionUpdate);
      if (commandGhostRafRef.current !== null) {
        window.cancelAnimationFrame(commandGhostRafRef.current);
        commandGhostRafRef.current = null;
      }
    };
  }, [scheduleCommandGhostPositionUpdate]);
  const handleInputSyncWithGhost = React.useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    onInputSync(plainText, inputTextWithoutMentions, roles);
    scheduleCommandGhostPositionUpdate();
  }, [onInputSync, scheduleCommandGhostPositionUpdate]);
  const handleKeyUpWithGhost = React.useCallback((event: React.KeyboardEvent) => {
    onKeyUp(event);
    scheduleCommandGhostPositionUpdate();
  }, [onKeyUp, scheduleCommandGhostPositionUpdate]);
  const handleMouseDownWithGhost = React.useCallback((event: React.MouseEvent) => {
    onMouseDown(event);
    scheduleCommandGhostPositionUpdate();
  }, [onMouseDown, scheduleCommandGhostPositionUpdate]);
  const handleCompositionEndWithGhost = React.useCallback(() => {
    onCompositionEnd();
    scheduleCommandGhostPositionUpdate();
  }, [onCompositionEnd, scheduleCommandGhostPositionUpdate]);
  const inputArea = (
    <div className="min-w-0 flex-1">
      <div
        ref={inputShellRef}
        className="relative"
      >
        <ChatInputArea
          ref={chatInputRef}
          inputScope="composer"
          onInputSync={handleInputSyncWithGhost}
          onPasteFiles={onPasteFiles}
          onKeyDown={onKeyDown}
          onKeyUp={handleKeyUpWithGhost}
          onMouseDown={handleMouseDownWithGhost}
          onScroll={scheduleCommandGhostPositionUpdate}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={handleCompositionEndWithGhost}
          disabled={inputDisabled}
          placeholder={placeholderText}
          className={`
            min-h-10
            ${composerInputModeClass}
            ${screenSize === "sm" ? "max-h-[30dvh]" : `max-h-[20dvh]`}
            overflow-y-auto min-w-0 flex-1
          `}
        />
        {commandInlineCompletion && commandGhostPosition && !inputDisabled
          ? (
              <span
                aria-hidden="true"
                className="
                  pointer-events-none absolute z-10 flex items-center gap-1.5
                  overflow-hidden whitespace-pre text-base-content/35
                "
                style={{
                  font: commandGhostPosition.font,
                  left: commandGhostPosition.left,
                  letterSpacing: commandGhostPosition.letterSpacing,
                  lineHeight: `${commandGhostPosition.lineHeight}px`,
                  maxWidth: commandGhostPosition.maxWidth,
                  top: commandGhostPosition.top,
                }}
              >
                <span>{commandInlineCompletion.suffix}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-base-content/25">
                  <span className="rounded border border-base-content/10 bg-base-content/[0.04] px-1 leading-3.5">
                    Tab
                  </span>
                  <span className="rounded border border-base-content/10 bg-base-content/[0.04] px-1 leading-3.5">
                    →
                  </span>
                </span>
              </span>
            )
          : null}
      </div>
    </div>
  );

  return (
    <div ref={composerRootRef} className="bg-transparent z-20" data-chat-composer-root="true">
      <div className={`
        relative flex-1 flex flex-col min-w-0 gap-2
        ${screenSize === "sm" ? `p-1.5` : `p-2`}
      `}>
        {!pokeTarget && (
          <CommandPanelFromStore
            handleSelectCommand={handleSelectCommand}
            ruleId={ruleId}
            className="
              absolute bottom-full w-full bg-base-200 rounded-md overflow-hidden
              z-10
            "
          />
        )}

        <div
          className="relative flex flex-col gap-2 rounded-md"
          onDragOver={(e) => {
            // 注意：部分浏览器在 dragover 阶段无法读取 getData 的自定义 MIME 内容。
            // 因此这里只基于 types 判定并 preventDefault，让 drop 一定能触发。
            // 具体 payload 在 onDrop 再读取。
            if (isFileDrag(e.dataTransfer)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={(e) => {
            if (!isFileDrag(e.dataTransfer))
              return;
            e.preventDefault();
            e.stopPropagation();
            addDroppedFilesToComposer(e.dataTransfer, roomId);
          }}
        >
          <ChatAttachmentsPreviewFromStore roomId={roomId} />

          {replyMessage && (
            <div className="p-2 pb-1">
              <RepliedMessage
                replyMessage={replyMessage}
                className="
                  flex flex-row gap-2 items-center bg-base-200 rounded-md
                  shadow-sm text-sm p-1
                "
              />
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-0">
              <div className="
                flex flex-col border border-base-300 rounded-xl bg-base-100/80
              ">
                <RoomComposerHeader
                  roomId={roomId}
                  userId={userId}
                  webSocketUtils={webSocketUtils}
                  isSpectator={isSpectator}
                  curRoleId={curRoleId}
                  curAvatarId={curAvatarId}
                  displayRoleName={displayRoleName}
                  setCurRoleId={setCurRoleId}
                  setCurAvatarId={setCurAvatarId}
                  setDraftCustomRoleNameForRole={setDraftCustomRoleNameForRole}
                  currentChatStatus={currentChatStatus}
                  onChangeChatStatus={onChangeChatStatus}
                  leftToolbar={composerAnnotationsBar}
                  headerToolbar={headerToolbar}
                />
                <div className="
                  flex flex-col
                  sm:flex-row
                  items-stretch
                  sm:items-start
                  p-2
                ">
                  {inputArea}

                  <div className="
                    w-full
                    sm:w-auto
                    flex justify-end
                    sm:block
                    mt-1
                    sm:mt-2
                  ">
                    <ChatToolbarFromStore
                      {...toolbarCommonProps}
                      showWebgalLinkToggle={true}
                      showRunModeToggle={true}
                      showWebgalControls={false}
                      showRunControls={false}
                    />
                  </div>
                </div>
              </div>

              <TextStyleToolbar
                chatInputRef={chatInputRef as any}
                className="px-2 pt-1"
              />
            </div>

            <AtMentionController
              ref={atMentionRef}
              chatInputRef={chatInputRef as any}
              allRoles={mentionRoles}
            >
            </AtMentionController>
          </div>
        </div>
      </div>
    </div>
  );
}

const RoomComposerPanel = React.memo(RoomComposerPanelImpl);
export default RoomComposerPanel;
