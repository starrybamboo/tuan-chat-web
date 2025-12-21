import type { AtMentionHandle } from "@/components/atMentionController";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { UserRole } from "../../../../api";

import AtMentionController from "@/components/atMentionController";
import ChatStatusBar from "@/components/chat/chatStatusBar";
import AvatarSwitch from "@/components/chat/input/avatarSwitch";
import ChatInputArea from "@/components/chat/input/chatInputArea";
import ChatToolbarFromStore from "@/components/chat/input/chatToolbarFromStore";
import CommandPanelFromStore from "@/components/chat/input/commandPanelFromStore";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import ChatAttachmentsPreviewFromStore from "@/components/chat/message/chatAttachmentsPreviewFromStore";
import RepliedMessage from "@/components/chat/message/preview/repliedMessage";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { addDroppedFilesToComposer, isFileDrag } from "@/components/chat/utils/dndUpload";
import React from "react";

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
  noRole,
  notMember,
  isSubmitting,
  placeholderText,
  curRoleId,
  curAvatarId,
  setCurRoleId,
  setCurAvatarId,
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
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

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
    <div className="bg-base-100 px-3 py-2 rounded-lg flex flex-col">
      <div className="relative flex-1 flex flex-col min-w-0">
        <CommandPanelFromStore
          handleSelectCommand={handleSelectCommand}
          ruleId={ruleId}
          className="absolute bottom-full w-[100%] mb-2 bg-base-200 rounded-box shadow-md overflow-hidden z-10"
        />

        <ChatStatusBar roomId={roomId} userId={userId} webSocketUtils={webSocketUtils} excludeSelf={false} />

        <ChatToolbarFromStore
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
          noRole={noRole}
          notMember={notMember}
          isSubmitting={isSubmitting}
        />

        <div className="flex gap-2 items-stretch">
          <AvatarSwitch
            curRoleId={curRoleId}
            curAvatarId={curAvatarId}
            setCurAvatarId={setCurAvatarId}
            setCurRoleId={setCurRoleId}
          >
          </AvatarSwitch>

          <div
            className="text-sm w-full max-h-[20dvh] border border-base-300 rounded-[8px] flex focus-within:ring-0 focus-within:ring-info focus-within:border-info flex-col"
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
                  className="flex flex-row gap-2 items-center bg-base-200 rounded-box shadow-sm text-sm p-1"
                />
              </div>
            )}

            {threadRootMessageId && (
              <div className="p-2 pb-1">
                <div className="flex flex-row gap-2 items-center bg-base-200 rounded-box shadow-sm text-sm p-2 justify-between">
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
                    className="btn btn-xs btn-ghost flex-shrink-0"
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
                <div className="flex flex-row gap-2 items-center bg-info/20 rounded-box shadow-sm text-sm p-2 justify-between">
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
            />

            <TextStyleToolbar
              chatInputRef={chatInputRef as any}
              className="px-2 pb-1"
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
  );
}

const RoomComposerPanel = React.memo(RoomComposerPanelImpl);
export default RoomComposerPanel;
