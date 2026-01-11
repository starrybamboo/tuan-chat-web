import type { UserRole } from "../../../../api";
import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import React from "react";
import AtMentionController from "@/components/atMentionController";
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

  /** KP（房主）权限标记，用于显示“停止全员BGM” */
  isKP?: boolean;
  /** KP：停止全员BGM */
  onStopBgmForAll?: () => void;

  noRole: boolean;
  notMember: boolean;
  isSubmitting: boolean;

  placeholderText: string;

  curRoleId: number;
  curAvatarId: number;
  setCurRoleId: (roleId: number) => void;
  setCurAvatarId: (avatarId: number) => void;

  roomRoles: UserRole[];

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
  isKP,
  onStopBgmForAll,
  noRole,
  notMember,
  isSubmitting,
  placeholderText,
  curRoleId,
  curAvatarId: _curAvatarId,
  setCurRoleId: _setCurRoleId,
  setCurAvatarId: _setCurAvatarId,
  roomRoles,
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

  const onToggleRunMode = React.useCallback(() => {
    setRunModeEnabled(!runModeEnabled);
  }, [runModeEnabled, setRunModeEnabled]);

  const onSetDefaultFigurePosition = React.useCallback((position: "left" | "center" | "right" | undefined) => {
    setDefaultFigurePositionForRole(curRoleId, position);
  }, [curRoleId, setDefaultFigurePositionForRole]);

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
    <div className="bg-transparent z-20">
      <div className="relative flex-1 flex flex-col min-w-0 gap-2">
        <CommandPanelFromStore
          handleSelectCommand={handleSelectCommand}
          ruleId={ruleId}
          className="absolute bottom-full w-full mb-2 bg-base-200 rounded-md overflow-hidden z-10"
        />

        <div
          className="flex flex-col gap-2 rounded-md  p-2"
          onDragOver={(e) => {
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

          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0 relative">
              {(webgalLinkMode || runModeEnabled) && (
                <div className="absolute right-2 -top-14 z-10">
                  <div className="flex items-start gap-2 bg-base-100/80 border border-base-300 rounded-md px-2 py-1 shadow-sm pointer-events-auto">
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
                      isKP={isKP}
                      onStopBgmForAll={onStopBgmForAll}
                      noRole={noRole}
                      notMember={notMember}
                      isSubmitting={isSubmitting}
                      layout="inline"
                      showStatusBar={false}
                      showWebgalLinkToggle={false}
                      showRunModeToggle={false}
                      showMainActions={false}
                      showSendButton={false}
                      showWebgalControls={true}
                      showRunControls={true}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 border border-base-300 rounded-xl bg-base-100/80 px-2 min-h-14">
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
                  className="min-h-10 max-h-[20dvh] overflow-y-auto flex-1 mt-2"
                />

                <div className="self-start">
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
                    isKP={isKP}
                    onStopBgmForAll={onStopBgmForAll}
                    noRole={noRole}
                    notMember={notMember}
                    isSubmitting={isSubmitting}
                    layout="inline"
                    showStatusBar={false}
                    showWebgalLinkToggle={true}
                    showRunModeToggle={true}
                    showWebgalControls={false}
                    showRunControls={false}
                  />
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
              allRoles={roomRoles}
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
