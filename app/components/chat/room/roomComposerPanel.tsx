import type { UserRole } from "../../../../api";
import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import React from "react";
import AtMentionController from "@/components/atMentionController";
import ChatStatusBar from "@/components/chat/chatStatusBar";
import AvatarDropdownContent from "@/components/chat/input/avatarDropdownContent";
import AvatarSwitch from "@/components/chat/input/avatarSwitch";
import ChatInputArea from "@/components/chat/input/chatInputArea";
import ChatToolbarFromStore from "@/components/chat/input/chatToolbarFromStore";
import CommandPanelFromStore from "@/components/chat/input/commandPanelFromStore";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import ChatAttachmentsPreviewFromStore from "@/components/chat/message/chatAttachmentsPreviewFromStore";
import RepliedMessage from "@/components/chat/message/preview/repliedMessage";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { NarratorIcon } from "@/icons";
import { useGetRoleAvatarsQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

export interface RoomComposerPanelProps {
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
  onOpenImportChatText?: () => void;

  /** KP（房主）权限标记，用于显示“停止全员BGM” */
  isKP?: boolean;
  /** KP：停止全员BGM */
  onStopBgmForAll?: () => void;

  noRole: boolean;
  notMember: boolean;
  isSubmitting: boolean;

  placeholderText: string;

  /** 拖拽投放文档引用后直接发送文档卡片消息 */
  onSendDocCard?: (payload: DocRefDragPayload) => Promise<void> | void;

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

  inputDisabled: boolean;
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
  onOpenImportChatText,
  isKP,
  onStopBgmForAll,
  noRole,
  notMember,
  isSubmitting,
  placeholderText,
  onSendDocCard,
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
  inputDisabled,
}: RoomComposerPanelProps) {
  const imgFilesCount = useChatComposerStore(state => state.imgFiles.length);
  const audioFile = useChatComposerStore(state => state.audioFile);
  const composerRootRef = React.useRef<HTMLDivElement | null>(null);
  const [isDocRefDragOver, setIsDocRefDragOver] = React.useState(false);
  const isDocRefDragOverRef = React.useRef(false);
  const updateDocRefDragOver = React.useCallback((next: boolean) => {
    if (isDocRefDragOverRef.current === next)
      return;
    isDocRefDragOverRef.current = next;
    setIsDocRefDragOver(next);
  }, []);
  const screenSize = useScreenSize();
  const toolbarLayout = screenSize === "sm" ? "stacked" : "inline";
  const isMobile = screenSize === "sm";
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
        mentionNote: "发送检定按钮",
      },
    };
    return [atAllRole, ...mentionRolesProp];
  }, [isKP, mentionRolesProp]);

  const prevImgFilesCountRef = React.useRef(imgFilesCount);
  const prevHasAudioRef = React.useRef(Boolean(audioFile));

  React.useEffect(() => {
    const prevImgFilesCount = prevImgFilesCountRef.current;
    const prevHasAudio = prevHasAudioRef.current;

    const hasNewImages = imgFilesCount > prevImgFilesCount;
    const hasNewAudio = Boolean(audioFile) && !prevHasAudio;

    if (hasNewImages || hasNewAudio) {
      chatInputRef.current?.focus();
    }

    prevImgFilesCountRef.current = imgFilesCount;
    prevHasAudioRef.current = Boolean(audioFile);
  }, [audioFile, chatInputRef, imgFilesCount]);

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

  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const toggleWebgalLinkMode = useRoomPreferenceStore(state => state.toggleWebgalLinkMode);

  const autoReplyMode = useRoomPreferenceStore(state => state.autoReplyMode);
  const toggleAutoReplyMode = useRoomPreferenceStore(state => state.toggleAutoReplyMode);

  const runModeEnabled = useRoomPreferenceStore(state => state.runModeEnabled);
  const setRunModeEnabled = useRoomPreferenceStore(state => state.setRunModeEnabled);

  const dialogNotend = useRoomPreferenceStore(state => state.dialogNotend);
  const toggleDialogNotend = useRoomPreferenceStore(state => state.toggleDialogNotend);
  const dialogConcat = useRoomPreferenceStore(state => state.dialogConcat);
  const toggleDialogConcat = useRoomPreferenceStore(state => state.toggleDialogConcat);

  const defaultFigurePosition = useRoomPreferenceStore(state => state.defaultFigurePositionMap[curRoleId]);
  const setDefaultFigurePositionForRole = useRoomPreferenceStore(state => state.setDefaultFigurePositionForRole);
  const draftCustomRoleNameMap = useRoomPreferenceStore(state => state.draftCustomRoleNameMap);
  const setDraftCustomRoleNameForRole = useRoomPreferenceStore(state => state.setDraftCustomRoleNameForRole);

  const onToggleRunMode = React.useCallback(() => {
    setRunModeEnabled(!runModeEnabled);
  }, [runModeEnabled, setRunModeEnabled]);

  const onSetDefaultFigurePosition = React.useCallback((position: "left" | "center" | "right" | undefined) => {
    setDefaultFigurePositionForRole(curRoleId, position);
  }, [curRoleId, setDefaultFigurePositionForRole]);

  const currentRole = React.useMemo(() => {
    return selectableRoles.find(role => role.roleId === curRoleId);
  }, [curRoleId, selectableRoles]);

  const roleAvatarsQuery = useGetRoleAvatarsQuery(curRoleId > 0 ? curRoleId : -1);
  const roleAvatars = React.useMemo(() => roleAvatarsQuery.data?.data ?? [], [roleAvatarsQuery.data?.data]);
  const hasRoleAvatarsLoaded = Boolean(roleAvatarsQuery.data);

  const displayRoleName = React.useMemo(() => {
    if (isSpectator) {
      return "观战";
    }
    // -1 表示旁白：不显示名称，但保持占位（渲染层处理）
    if (curRoleId < 0) {
      return "";
    }
    // 0 表示未选择角色
    if (curRoleId === 0) {
      return "未选择角色";
    }
    const draftName = draftCustomRoleNameMap[curRoleId]?.trim();
    return draftName || currentRole?.roleName || "未选择角色";
  }, [curRoleId, currentRole?.roleName, draftCustomRoleNameMap, isSpectator]);

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editingName, setEditingName] = React.useState("");
  const [isAvatarPopoverOpen, setIsAvatarPopoverOpen] = React.useState(false);
  const avatarPopoverRef = React.useRef<HTMLDivElement | null>(null);
  const showSelfStatus = Boolean(currentChatStatus && !isSpectator);
  const showOtherStatus = React.useMemo(() => {
    const raw = (webSocketUtils?.chatStatus?.[roomId] ?? []) as { userId: number; status: "input" | "wait" | "leave" | "idle" }[];
    if (!raw.length) {
      return false;
    }
    const others = userId != null ? raw.filter(s => s.userId !== userId) : raw;
    return others.some(s => s.status === "input" || s.status === "wait" || s.status === "leave");
  }, [roomId, userId, webSocketUtils?.chatStatus]);

  React.useEffect(() => {
    setIsEditingName(false);
    setEditingName("");
  }, [curRoleId, isSpectator]);

  React.useEffect(() => {
    if (isSpectator) {
      setIsAvatarPopoverOpen(false);
    }
  }, [isSpectator]);

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

  React.useEffect(() => {
    if (!isAvatarPopoverOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (avatarPopoverRef.current?.contains(target)) {
        return;
      }
      const modalRoot = document.getElementById("modal-root");
      if (modalRoot?.contains(target)) {
        return;
      }
      setIsAvatarPopoverOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isAvatarPopoverOpen]);

  const replyMessage = useRoomUiStore(state => state.replyMessage);
  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const insertAfterMessageId = useRoomUiStore(state => state.insertAfterMessageId);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);

  const onInsertWebgalCommandPrefix = React.useCallback(() => {
    const inputHandle = chatInputRef.current;
    if (!inputHandle)
      return;

    const currentText = inputHandle.getPlainText() ?? "";
    const nextText = currentText.startsWith("%") ? currentText : `%${currentText}`;

    inputHandle.setContent(nextText);
    inputHandle.focus();
    inputHandle.triggerSync();
  }, [chatInputRef]);

  return (
    <div ref={composerRootRef} className="bg-transparent z-20">
      <div className="relative flex-1 flex flex-col min-w-0 gap-2 p-2">
        <CommandPanelFromStore
          handleSelectCommand={handleSelectCommand}
          ruleId={ruleId}
          className="absolute bottom-full w-full mb-2 bg-base-200 rounded-md overflow-hidden z-10"
        />

        <div
          className="relative flex flex-col gap-2 rounded-md"
          onDragOver={(e) => {
            // 注意：部分浏览器在 dragover 阶段无法读取 getData 的自定义 MIME 内容。
            // 因此这里仅基于 types 判定并 preventDefault，让 drop 一定能触发；
            // 具体 payload 在 onDrop 再读取。
            if (isDocRefDrag(e.dataTransfer)) {
              updateDocRefDragOver(true);
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              return;
            }
            updateDocRefDragOver(false);

            if (isFileDrag(e.dataTransfer)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDragLeave={() => {
            updateDocRefDragOver(false);
          }}
          onDrop={(e) => {
            updateDocRefDragOver(false);
            const docRef = getDocRefDragData(e.dataTransfer);
            if (docRef) {
              e.preventDefault();
              e.stopPropagation();
              void onSendDocCard?.(docRef);
              return;
            }

            if (!isFileDrag(e.dataTransfer))
              return;
            e.preventDefault();
            e.stopPropagation();
            addDroppedFilesToComposer(e.dataTransfer);
          }}
        >
          {isDocRefDragOver && (
            <div className="pointer-events-none absolute inset-0 z-20 rounded-md border-2 border-primary/60 bg-primary/5 flex items-center justify-center">
              <div className="px-3 py-2 rounded bg-base-100/80 border border-primary/20 text-sm font-medium text-primary shadow-sm">
                松开发送文档卡片
              </div>
            </div>
          )}
          <ChatAttachmentsPreviewFromStore />

          {replyMessage && (
            <div className="p-2 pb-1">
              <RepliedMessage
                replyMessage={replyMessage}
                className="flex flex-row gap-2 items-center bg-base-200 rounded-md shadow-sm text-sm p-1"
              />
            </div>
          )}

          {threadRootMessageId && (
            <div className="p-2 pb-1">
              <div className="flex flex-row gap-2 items-center bg-base-200 rounded-md shadow-sm text-sm p-2 justify-between">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="join">
                    <button
                      type="button"
                      className={`btn btn-xs join-item ${composerTarget === "main" ? "btn-info" : "btn-ghost"}`}
                      onClick={() => setComposerTarget("main")}
                    >
                      主区
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs join-item ${composerTarget === "thread" ? "btn-info" : "btn-ghost"}`}
                      onClick={() => setComposerTarget("thread")}
                    >
                      子区
                    </button>
                  </div>
                  <span className="text-xs text-base-content/60 truncate">
                    🧵
                    {threadRootMessageId}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-xs btn-ghost shrink-0"
                  onClick={() => {
                    setComposerTarget("main");
                    setThreadRootMessageId(undefined);
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          )}

          {insertAfterMessageId && (
            <div className="p-2 pb-1">
              <div className="flex flex-row gap-2 items-center bg-info/20 rounded-md shadow-sm text-sm p-2 justify-between">
                <span className="text-info-content">📍 将在消息后插入</span>
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
                <div className="w-full border-b border-base-300 px-2 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div ref={avatarPopoverRef} className="relative shrink-0">
                        <button
                          type="button"
                          className={`flex items-center justify-center leading-none ${isSpectator ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                          aria-haspopup="dialog"
                          aria-expanded={isAvatarPopoverOpen}
                          onClick={() => {
                            if (isSpectator) {
                              return;
                            }
                            setIsAvatarPopoverOpen(prev => !prev);
                          }}
                        >
                          {curRoleId <= 0
                            ? (
                                curAvatarId > 0
                                  ? (
                                      <RoleAvatarComponent
                                        avatarId={curAvatarId}
                                        width={8}
                                        isRounded={true}
                                        withTitle={false}
                                        stopPopWindow={true}
                                        useDefaultAvatarFallback={false}
                                        alt="旁白"
                                      />
                                    )
                                  : (
                                      <div className="size-8 rounded-full bg-base-300 flex items-center justify-center shrink-0">
                                        <NarratorIcon className="size-5 text-base-content/60" />
                                      </div>
                                    )
                              )
                            : (
                                <RoleAvatarComponent
                                  avatarId={curAvatarId}
                                  roleId={curRoleId}
                                  width={8}
                                  isRounded={true}
                                  withTitle={false}
                                  stopPopWindow={true}
                                  alt={displayRoleName || "无头像"}
                                />
                              )}
                        </button>
                        {isAvatarPopoverOpen && !isSpectator && (
                          <div className="absolute left-0 bottom-full mb-2 z-50 flex items-stretch">
                            <div className="w-[92vw] md:w-120 min-w-100 max-w-[92vw] rounded-box bg-base-100 border border-base-300 shadow-lg p-2 self-stretch flex flex-col">
                              <div className="flex-1 min-h-0">
                                <AvatarDropdownContent
                                  roleId={curRoleId}
                                  onAvatarChange={setCurAvatarId}
                                  onRoleChange={setCurRoleId}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          {!isEditingName && (
                            <div
                              className={`text-sm font-medium truncate ${isSpectator || curRoleId <= 0 ? "text-base-content/50 select-none" : "cursor-text"}`}
                              title={isSpectator || curRoleId <= 0 ? undefined : "点击编辑显示名称"}
                              onClick={(e) => {
                                if (isSpectator || curRoleId <= 0) {
                                  return;
                                }
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingName(displayRoleName);
                                setIsEditingName(true);
                              }}
                            >
                              {displayRoleName || "\u00A0"}
                            </div>
                          )}
                          {isEditingName && (
                            <input
                              className="input input-xs input-bordered bg-base-200 border-base-300 px-2 shadow-sm focus:outline-none focus:border-info w-full max-w-48"
                              value={editingName}
                              autoFocus
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsEditingName(false);
                                  setEditingName("");
                                }
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDraftCustomRoleNameForRole(curRoleId, editingName);
                                  setIsEditingName(false);
                                }
                              }}
                              onBlur={() => {
                                setDraftCustomRoleNameForRole(curRoleId, editingName);
                                setIsEditingName(false);
                              }}
                              placeholder={currentRole?.roleName || ""}
                            />
                          )}
                        </div>
                        {showSelfStatus && <span className="h-3 w-px bg-base-content/30" aria-hidden />}
                        {showSelfStatus && (
                          <ChatStatusBar
                            roomId={roomId}
                            userId={userId}
                            webSocketUtils={webSocketUtils}
                            excludeSelf={true}
                            showGrouped={false}
                            currentChatStatus={currentChatStatus}
                            onChangeChatStatus={onChangeChatStatus}
                            isSpectator={isSpectator}
                            compact={true}
                            className="shrink-0"
                          />
                        )}
                        {showOtherStatus && <span className="h-3 w-px bg-base-content/30" aria-hidden />}
                        {showOtherStatus && (
                          <ChatStatusBar
                            roomId={roomId}
                            userId={userId}
                            webSocketUtils={webSocketUtils}
                            excludeSelf={true}
                            showGrouped={true}
                            showGroupDivider={false}
                            isSpectator={isSpectator}
                            compact={true}
                            className="shrink-0"
                          />
                        )}
                      </div>
                    </div>
                    {(webgalLinkMode || runModeEnabled) && (
                      <div className="flex items-start gap-2">
                        <ChatToolbarFromStore
                          roomId={roomId}
                          statusUserId={userId}
                          statusWebSocketUtils={webSocketUtils}
                          statusExcludeSelf={false}
                          sideDrawerState={sideDrawerState}
                          setSideDrawerState={setSideDrawerState}
                          handleMessageSubmit={handleMessageSubmit}
                          onAIRewrite={onAIRewrite}
                          currentChatStatus={currentChatStatus}
                          onChangeChatStatus={onChangeChatStatus}
                          isSpectator={isSpectator}
                          onToggleRealtimeRender={onToggleRealtimeRender}
                          onToggleWebgalLinkMode={toggleWebgalLinkMode}
                          onInsertWebgalCommandPrefix={onInsertWebgalCommandPrefix}
                          autoReplyMode={autoReplyMode}
                          onToggleAutoReplyMode={toggleAutoReplyMode}
                          runModeEnabled={runModeEnabled}
                          onToggleRunMode={onToggleRunMode}
                          defaultFigurePosition={defaultFigurePosition}
                          onSetDefaultFigurePosition={onSetDefaultFigurePosition}
                          dialogNotend={dialogNotend}
                          onToggleDialogNotend={toggleDialogNotend}
                          dialogConcat={dialogConcat}
                          onToggleDialogConcat={toggleDialogConcat}
                          onSendEffect={onSendEffect}
                          onClearBackground={onClearBackground}
                          onClearFigure={onClearFigure}
                          onSetWebgalVar={onSetWebgalVar}
                          isKP={isKP}
                          onStopBgmForAll={onStopBgmForAll}
                          noRole={noRole}
                          notMember={notMember}
                          isSubmitting={isSubmitting}
                          layout={toolbarLayout}
                          showStatusBar={false}
                          showWebgalLinkToggle={false}
                          showRunModeToggle={false}
                          showMainActions={false}
                          showSendButton={false}
                          showWebgalControls={true}
                          showRunControls={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-start p-2">
                  {isMobile
                    ? (
                        <div className="flex items-end gap-2">
                          <ChatInputArea
                            ref={chatInputRef}
                            onInputSync={onInputSync}
                            onPasteFiles={onPasteFiles}
                            onKeyDown={onKeyDown}
                            onKeyUp={onKeyUp}
                            onMouseDown={onMouseDown}
                            onCompositionStart={onCompositionStart}
                            onCompositionEnd={onCompositionEnd}
                            disabled={inputDisabled}
                            placeholder={placeholderText}
                            className="min-h-10 max-h-[20dvh] overflow-y-auto min-w-0 flex-1"
                          />
                          <AvatarSwitch
                            curRoleId={curRoleId}
                            curAvatarId={curAvatarId}
                            setCurAvatarId={setCurAvatarId}
                            setCurRoleId={setCurRoleId}
                            layout="horizontal"
                            dropdownPosition="top"
                            dropdownAlign="end"
                            showName={false}
                            avatarWidth={8}
                          />
                        </div>
                      )
                    : (
                        <ChatInputArea
                          ref={chatInputRef}
                          onInputSync={onInputSync}
                          onPasteFiles={onPasteFiles}
                          onKeyDown={onKeyDown}
                          onKeyUp={onKeyUp}
                          onMouseDown={onMouseDown}
                          onCompositionStart={onCompositionStart}
                          onCompositionEnd={onCompositionEnd}
                          disabled={inputDisabled}
                          placeholder={placeholderText}
                          className="min-h-10 max-h-[20dvh] overflow-y-auto min-w-0 flex-1"
                        />
                      )}

                  <div className="w-full sm:w-auto flex justify-end sm:block mb-1 sm:mb-0 mt-0 sm:mt-2">
                    <ChatToolbarFromStore
                      roomId={roomId}
                      statusUserId={userId}
                      statusWebSocketUtils={webSocketUtils}
                      statusExcludeSelf={false}
                      sideDrawerState={sideDrawerState}
                      setSideDrawerState={setSideDrawerState}
                      handleMessageSubmit={handleMessageSubmit}
                      onAIRewrite={onAIRewrite}
                      currentChatStatus={currentChatStatus}
                      onChangeChatStatus={onChangeChatStatus}
                      isSpectator={isSpectator}
                      onToggleRealtimeRender={onToggleRealtimeRender}
                      onToggleWebgalLinkMode={toggleWebgalLinkMode}
                      onInsertWebgalCommandPrefix={onInsertWebgalCommandPrefix}
                      autoReplyMode={autoReplyMode}
                      onToggleAutoReplyMode={toggleAutoReplyMode}
                      runModeEnabled={runModeEnabled}
                      onToggleRunMode={onToggleRunMode}
                      defaultFigurePosition={defaultFigurePosition}
                      onSetDefaultFigurePosition={onSetDefaultFigurePosition}
                      dialogNotend={dialogNotend}
                      onToggleDialogNotend={toggleDialogNotend}
                      dialogConcat={dialogConcat}
                      onToggleDialogConcat={toggleDialogConcat}
                      onSendEffect={onSendEffect}
                      onClearBackground={onClearBackground}
                      onClearFigure={onClearFigure}
                      onSetWebgalVar={onSetWebgalVar}
                      onOpenImportChatText={onOpenImportChatText}
                      isKP={isKP}
                      onStopBgmForAll={onStopBgmForAll}
                      noRole={noRole}
                      notMember={notMember}
                      isSubmitting={isSubmitting}
                      layout={toolbarLayout}
                      showStatusBar={false}
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
