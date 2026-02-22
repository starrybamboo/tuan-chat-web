import type { UserRole } from "../../../../api";
import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { WebgalChoosePayload } from "@/types/webgalChoose";

import React from "react";
import AtMentionController from "@/components/atMentionController";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { getComposerAnnotations, setComposerAnnotations as persistComposerAnnotations } from "@/components/chat/infra/indexedDB/composerAnnotationsDb";
import ChatInputArea from "@/components/chat/input/chatInputArea";
import ChatToolbarFromStore from "@/components/chat/input/chatToolbarFromStore";
import CommandPanelFromStore from "@/components/chat/input/commandPanelFromStore";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import ChatAttachmentsPreviewFromStore from "@/components/chat/message/chatAttachmentsPreviewFromStore";
import RepliedMessage from "@/components/chat/message/preview/repliedMessage";
import RoomComposerHeader from "@/components/chat/room/roomComposerHeader";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import { getFigurePositionFromAnnotations, hasClearFigureAnnotation, normalizeAnnotations, setFigurePositionAnnotation, toggleAnnotation } from "@/types/messageAnnotations";
import { countTextEnhanceVisibleLength, formatTextEnhanceVisibleLength } from "@/utils/textEnhanceMetrics";
import { useGetRoleAvatarsQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

interface RoomComposerPanelProps {
  roomId: number;
  userId: number;
  webSocketUtils: any;

  handleSelectCommand: (cmdName: string) => void;
  ruleId: number;

  handleMessageSubmit: () => Promise<void> | void;
  onAIRewrite: (prompt: string) => void;

  currentChatStatus: any;
  onChangeChatStatus: (status: any) => void;

  isSpectator: boolean;

  onToggleRealtimeRender: () => void;

  onSendEffect: (effectName: string) => void;
  onClearBackground: () => void;
  onClearFigure: () => void;
  onSetWebgalVar: (key: string, expr: string) => Promise<void> | void;
  onSendWebgalChoose: (payload: WebgalChoosePayload) => Promise<void> | void;
  onOpenImportChatText?: () => void;

  /** KP（房主）权限标记，用于显示“停止全员BGM” */
  isKP?: boolean;
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
  ruleId,
  handleMessageSubmit,
  onAIRewrite,
  currentChatStatus,
  onChangeChatStatus,
  isSpectator,
  onToggleRealtimeRender,
  onSendEffect,
  onClearBackground,
  onClearFigure,
  onSetWebgalVar,
  onSendWebgalChoose,
  onOpenImportChatText,
  isKP,
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
  const spaceMembers = spaceContext.spaceMembers;
  const resolveDefaultFigurePosition = React.useCallback((role?: UserRole) => {
    if (!role) {
      return undefined;
    }
    const memberType = (spaceMembers ?? []).find(member => member.userId === role.userId)?.memberType;
    if (memberType === 1) {
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

    if (hasNewImages || hasNewFiles || hasNewAudio) {
      chatInputRef.current?.focus();
    }

    prevImgFilesCountRef.current = imgFilesCount;
    prevFileAttachmentsCountRef.current = fileAttachmentsCount;
    prevHasAudioRef.current = Boolean(audioFile);
  }, [audioFile, chatInputRef, fileAttachmentsCount, imgFilesCount]);

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
  const draftCustomRoleNameMap = useRoomPreferenceStore(state => state.draftCustomRoleNameMap);
  const setDraftCustomRoleNameForRole = useRoomPreferenceStore(state => state.setDraftCustomRoleNameForRole);

  const onToggleRunMode = React.useCallback(() => {
    setRunModeEnabled(!runModeEnabled);
  }, [runModeEnabled, setRunModeEnabled]);

  const currentRole = React.useMemo(() => {
    return selectableRoles.find(role => role.roleId === curRoleId);
  }, [curRoleId, selectableRoles]);

  const roleAvatarsQuery = useGetRoleAvatarsQuery(curRoleId > 0 ? curRoleId : -1);
  const roleAvatars = React.useMemo(() => roleAvatarsQuery.data?.data ?? [], [roleAvatarsQuery.data?.data]);
  const hasRoleAvatarsLoaded = Boolean(roleAvatarsQuery.data);

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
  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const insertAfterMessageId = useRoomUiStore(state => state.insertAfterMessageId);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const inputDisabled = notMember && noRole;
  const placeholderText = React.useMemo(() => {
    if (notMember) {
      return "观战模式下无法发送消息";
    }
    if (noRole && !isKP) {
      return "请选择/拉入你的角色后再发送";
    }
    if (noRole && isKP) {
      return "旁白模式：输入内容…（Shift+Enter 换行，Tab 触发 AI）";
    }
    if (curAvatarId <= 0) {
      return "请选择角色立绘后发送…（Shift+Enter 换行，Tab 触发 AI）";
    }
    if (threadRootMessageId && composerTarget === "thread") {
      return "线程回复中…（Shift+Enter 换行，Tab 触发 AI）";
    }
    return "输入消息…（Shift+Enter 换行，Tab 触发 AI）";
  }, [composerTarget, curAvatarId, isKP, noRole, notMember, threadRootMessageId]);
  const inputPlainText = useChatInputUiStore(state => state.plainText);
  const inputTextLength = React.useMemo(() => countTextEnhanceVisibleLength(inputPlainText), [inputPlainText]);
  const roomContentAlertThreshold = useRealtimeRenderStore(state => state.roomContentAlertThreshold);
  const shouldShowThresholdHint = webgalLinkMode && roomContentAlertThreshold > 0;
  const thresholdCounterText = `${formatTextEnhanceVisibleLength(inputTextLength)}/${formatTextEnhanceVisibleLength(roomContentAlertThreshold)}`;
  const isMessageOverThreshold = shouldShowThresholdHint && inputTextLength > roomContentAlertThreshold;

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
    onAIRewrite,
    currentChatStatus,
    onChangeChatStatus,
    isSpectator,
    onToggleRealtimeRender,
    onToggleWebgalLinkMode: toggleWebgalLinkMode,
    autoReplyMode,
    onToggleAutoReplyMode: toggleAutoReplyMode,
    runModeEnabled,
    onToggleRunMode,
    onSendEffect,
    onClearBackground,
    onClearFigure,
    onSetWebgalVar,
    onSendWebgalChoose,
    isKP,
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
    isKP,
    isSpectator,
    isSubmitting,
    noRole,
    notMember,
    onAIRewrite,
    onChangeChatStatus,
    onClearBackground,
    onClearFigure,
    onSendEffect,
    onSetWebgalVar,
    onSendWebgalChoose,
    onStopBgmForAll,
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
  const headerToolbarControls = (webgalLinkMode || runModeEnabled)
    ? (
        <ChatToolbarFromStore
          {...toolbarCommonProps}
          showWebgalLinkToggle={false}
          showRunModeToggle={false}
          showMainActions={false}
          showSendButton={false}
          showWebgalControls={true}
          showRunControls={true}
        />
      )
    : null;

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
          compact={screenSize === "sm"}
          className="mt-0"
        />
      )
    : null;

  const headerToolbar = headerToolbarControls ?? null;
  const inputArea = (
    <div className="min-w-0 flex-1">
      <div className="relative">
        <ChatInputArea
          ref={chatInputRef}
          inputScope="composer"
          onInputSync={onInputSync}
          onPasteFiles={onPasteFiles}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onMouseDown={onMouseDown}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          disabled={inputDisabled}
          placeholder={placeholderText}
          className={`min-h-10 ${screenSize === "sm" ? "max-h-[30dvh]" : "max-h-[20dvh]"} overflow-y-auto min-w-0 flex-1 ${isMessageOverThreshold ? "outline outline-1 outline-warning/70" : ""}`}
        />
        {shouldShowThresholdHint && !isMessageOverThreshold && (
          <div className="pointer-events-none absolute right-2 bottom-1 rounded px-1 text-[11px] leading-4 bg-base-200/80 text-base-content/60">
            {thresholdCounterText}
          </div>
        )}
      </div>
      {shouldShowThresholdHint && isMessageOverThreshold && (
        <div className="mt-1 flex justify-end">
          <span className="rounded px-1 text-[11px] leading-4 font-medium bg-warning/20 text-warning shadow-sm">
            {thresholdCounterText}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div ref={composerRootRef} className="bg-transparent z-20">
      <div className={`relative flex-1 flex flex-col min-w-0 gap-2 ${screenSize === "sm" ? "p-1.5" : "p-2"}`}>
        <CommandPanelFromStore
          handleSelectCommand={handleSelectCommand}
          ruleId={ruleId}
          className="absolute bottom-full w-full mb-2 bg-base-200 rounded-md overflow-hidden z-10"
        />

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
            addDroppedFilesToComposer(e.dataTransfer);
          }}
        >
          <ChatAttachmentsPreviewFromStore />

          {replyMessage && (
            <div className="p-2 pb-1">
              <RepliedMessage
                replyMessage={replyMessage}
                className="flex flex-row gap-2 items-center bg-base-200 rounded-md shadow-sm text-sm p-1"
              />
            </div>
          )}

          {insertAfterMessageId && (
            <div className="p-2 pb-1">
              <div className="flex flex-row gap-2 items-center bg-info/20 border border-info/40 rounded-md shadow-sm text-sm p-2 justify-between">
                <span className="text-base-content/90 font-medium">将插入到消息后</span>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setInsertAfterMessageId(undefined)}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col border border-base-300 rounded-xl bg-base-100/80">
                <RoomComposerHeader
                  roomId={roomId}
                  userId={userId}
                  webSocketUtils={webSocketUtils}
                  isSpectator={isSpectator}
                  curRoleId={curRoleId}
                  curAvatarId={curAvatarId}
                  displayRoleName={displayRoleName}
                  currentRoleName={currentRole?.roleName}
                  setCurRoleId={setCurRoleId}
                  setCurAvatarId={setCurAvatarId}
                  setDraftCustomRoleNameForRole={setDraftCustomRoleNameForRole}
                  currentChatStatus={currentChatStatus}
                  onChangeChatStatus={onChangeChatStatus}
                  leftToolbar={composerAnnotationsBar}
                  headerToolbar={headerToolbar}
                />
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-start p-2">
                  {inputArea}

                  <div className="w-full sm:w-auto flex justify-end sm:block mb-1 sm:mb-0 mt-0 sm:mt-2">
                    <ChatToolbarFromStore
                      {...toolbarCommonProps}
                      onOpenImportChatText={onOpenImportChatText}
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
