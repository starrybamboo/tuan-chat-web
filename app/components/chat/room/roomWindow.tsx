import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse } from "../../../../api";

import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { ChatFrameMessageScope } from "@/components/chat/hooks/useChatFrameMessages";
import React, { use, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
// hooks (local)
import RealtimeRenderOrchestrator from "@/components/chat/core/realtimeRenderOrchestrator";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatInputStatus from "@/components/chat/hooks/useChatInputStatus";
import { useChatHistory } from "@/components/chat/infra/indexedDB/useChatHistory";
import RoomDocRefDropLayer from "@/components/chat/room/roomDocRefDropLayer";
import RoomSideDrawerGuards from "@/components/chat/room/roomSideDrawerGuards";
import RoomWindowLayout from "@/components/chat/room/roomWindowLayout";
import RoomWindowOverlays from "@/components/chat/room/roomWindowOverlays";
import useChatInputHandlers from "@/components/chat/room/useChatInputHandlers";
import useChatMessageSubmit from "@/components/chat/room/useChatMessageSubmit";
import useRealtimeRenderControls from "@/components/chat/room/useRealtimeRenderControls";
import useRoomCommandRequests from "@/components/chat/room/useRoomCommandRequests";
import useRoomEffectsController from "@/components/chat/room/useRoomEffectsController";
import useRoomImportActions from "@/components/chat/room/useRoomImportActions";
import useRoomInputController from "@/components/chat/room/useRoomInputController";
import useRoomMainHistoryMessages from "@/components/chat/room/useRoomMainHistoryMessages";
import useRoomMemberState from "@/components/chat/room/useRoomMemberState";
import useRoomMessageActions from "@/components/chat/room/useRoomMessageActions";
import useRoomMessageScroll from "@/components/chat/room/useRoomMessageScroll";
import useRoomOverlaysController from "@/components/chat/room/useRoomOverlaysController";
import useRoomRoleState from "@/components/chat/room/useRoomRoleState";
import { useBgmStore } from "@/components/chat/stores/bgmStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { createRoomUiStore, RoomUiStoreProvider } from "@/components/chat/stores/roomUiStore";
import useCommandExecutor from "@/components/common/dicer/cmdPre";

import { useGlobalContext } from "@/components/globalContextProvider";
import {
  useGetRoomInfoQuery,
  useGetSpaceInfoQuery,
  useSendMessageMutation,
  useSetSpaceExtraMutation,
} from "../../../../api/hooks/chatQueryHooks";

function RoomWindow({
  roomId,
  spaceId,
  targetMessageId,
  messageScope = "main",
  threadRootMessageId,
  viewMode = false,
  hideSecondaryPanels = false,
  onCloseSubWindow,
  onOpenThread,
}: {
  roomId: number;
  spaceId: number;
  targetMessageId?: number | null;
  messageScope?: ChatFrameMessageScope;
  threadRootMessageId?: number | null;
  viewMode?: boolean;
  hideSecondaryPanels?: boolean;
  onCloseSubWindow?: () => void;
  onOpenThread?: (threadRootMessageId: number) => void;
}) {
  const spaceContext = use(SpaceContext);
  const roomUiStoreRef = useRef<ReturnType<typeof createRoomUiStore> | null>(null);
  if (!roomUiStoreRef.current) {
    roomUiStoreRef.current = createRoomUiStore();
  }
  const roomUiStore = roomUiStoreRef.current;

  useEffect(() => {
    useBgmStore.getState().setActiveRoomId(roomId);
    return () => {
      useBgmStore.getState().setActiveRoomId(null);
    };
  }, [roomId]);

  const space = useGetSpaceInfoQuery(spaceId).data?.data;
  const room = useGetRoomInfoQuery(roomId).data?.data;
  const roomHeaderOverride = useEntityHeaderOverrideStore(state => state.headers[`room:${roomId}`]);

  const globalContext = useGlobalContext();
  const userId = globalContext.userId;
  const webSocketUtils = globalContext.websocketUtils;
  const send = useCallback((message: ChatMessageRequest) => {
    webSocketUtils.send({ type: 3, data: message });
  }, [webSocketUtils]);

  const sendMessageMutation = useSendMessageMutation(roomId);
  const setSpaceExtraMutation = useSetSpaceExtraMutation();

  const {
    chatInputRef,
    atMentionRef,
    handleInputAreaChange,
    handleSelectCommand,
    setInputText,
    llmMessageRef,
    originalTextBeforeRewriteRef,
    setLLMMessage,
    insertLLMMessageIntoText,
    handleQuickRewrite,
  } = useRoomInputController({ roomId });

  useLayoutEffect(() => {
    const ui = roomUiStore.getState();
    ui.reset();
    if (messageScope === "thread" && threadRootMessageId) {
      ui.setThreadRootMessageId(threadRootMessageId);
      ui.setComposerTarget("thread");
    }
    else {
      ui.setThreadRootMessageId(undefined);
      ui.setComposerTarget("main");
    }
  }, [messageScope, roomId, roomUiStore, threadRootMessageId]);

  const {
    roomAllRoles,
    roomRolesThatUserOwn,
    curRoleId,
    setCurRoleId,
    curAvatarId,
    setCurAvatarId,
    ensureRuntimeAvatarIdForRole,
  } = useRoomRoleState({
    roomId,
    userId,
    isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
  });

  // RealtimeRender controls
  const {
    isRealtimeRenderActive,
    handleRealtimeRenderApiChange,
    handleToggleRealtimeRender,
    jumpToMessageInWebGAL,
    updateAndRerenderMessageInWebGAL,
    rerenderHistoryInWebGAL,
    clearFigure: clearRealtimeFigure,
  } = useRealtimeRenderControls();
  const {
    backgroundUrl,
    displayedBgUrl,
    currentEffect,
    setBackgroundUrl,
    setCurrentEffect,
    handleSendEffect,
    handleClearBackground,
    handleClearFigure,
    handleStopBgmForAll,
  } = useRoomEffectsController({
    roomId,
    send,
    isRealtimeRenderActive,
    clearRealtimeFigure,
  });
  const {
    members,
    curMember,
    isSpectator,
    notMember,
  } = useRoomMemberState({
    roomId,
    userId,
    spaceMembers: spaceContext.spaceMembers,
  });
  const chatHistory = useChatHistory(roomId);
  const historyMessages: ChatMessageResponse[] = chatHistory?.messages;

  const mainHistoryMessages = useRoomMainHistoryMessages({
    historyMessages,
  });

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const { scrollToGivenMessage } = useRoomMessageScroll({
    targetMessageId,
    historyMessages,
    mainHistoryMessages,
    isHistoryLoading: chatHistory?.loading,
    virtuosoRef,
  });

  const roomContext = React.useMemo((): RoomContextType => ({
    roomId,
    roomMembers: members,
    curMember,
    roomRolesThatUserOwn,
    curRoleId,
    curAvatarId,
    spaceId,
    chatHistory,
    scrollToGivenMessage,
    jumpToMessageInWebGAL: isRealtimeRenderActive ? jumpToMessageInWebGAL : undefined,
    updateAndRerenderMessageInWebGAL: isRealtimeRenderActive ? updateAndRerenderMessageInWebGAL : undefined,
    rerenderHistoryInWebGAL: isRealtimeRenderActive ? rerenderHistoryInWebGAL : undefined,
  }), [
    chatHistory,
    curAvatarId,
    curMember,
    curRoleId,
    isRealtimeRenderActive,
    jumpToMessageInWebGAL,
    members,
    rerenderHistoryInWebGAL,
    roomId,
    roomRolesThatUserOwn,
    scrollToGivenMessage,
    spaceId,
    updateAndRerenderMessageInWebGAL,
  ]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

  const { myStatus: myStatue, handleManualStatusChange } = useChatInputStatus({
    roomId,
    userId,
    webSocketUtils,
    isSpectator,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const noRole = curRoleId <= 0;

  const {
    containsCommandRequestAllToken,
    stripCommandRequestAllToken,
    extractFirstCommandText,
    handleExecuteCommandRequest,
  } = useRoomCommandRequests({
    isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
    notMember,
    noRole,
    isSubmitting,
    commandExecutor,
  });

  const { sendMessageWithInsert, handleSetWebgalVar, handleSendWebgalChoose } = useRoomMessageActions({
    roomId,
    spaceId,
    spaceExtra: space?.extra,
    isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
    curRoleId,
    isSubmitting,
    notMember,
    mainHistoryMessages,
    send,
    sendMessage: sendMessageMutation.mutateAsync,
    addOrUpdateMessage: chatHistory?.addOrUpdateMessage,
    ensureRuntimeAvatarIdForRole,
    setSpaceExtra: setSpaceExtraMutation.mutateAsync,
    roomUiStoreApi: roomUiStore,
  });
  const { handleMessageSubmit } = useChatMessageSubmit({
    roomId,
    spaceId,
    spaceExtra: space?.extra,
    isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
    curRoleId,
    notMember,
    noRole,
    isSubmitting,
    setIsSubmitting,
    sendMessageWithInsert,
    ensureRuntimeAvatarIdForRole,
    commandExecutor,
    containsCommandRequestAllToken,
    stripCommandRequestAllToken,
    extractFirstCommandText,
    setInputText,
    setSpaceExtra: setSpaceExtraMutation.mutateAsync,
    roomUiStoreApi: roomUiStore,
  });
  const {
    handleImportChatText,
    handleSendDocCard,
  } = useRoomImportActions({
    roomId,
    spaceId,
    isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
    curRoleId,
    notMember,
    isSubmitting,
    setIsSubmitting,
    roomContext,
    sendMessageWithInsert,
    ensureRuntimeAvatarIdForRole,
    roomUiStoreApi: roomUiStore,
  });
  const {
    isImportChatTextOpen,
    setIsImportChatTextOpen,
    isRoleHandleOpen,
    setIsRoleAddWindowOpen,
    isRenderWindowOpen,
    setIsRenderWindowOpen,
    handleAddRole,
    handleImportChatItems,
    openRoleAddWindow,
  } = useRoomOverlaysController({
    roomId,
    handleImportChatText,
  });

  const {
    handlePasteFiles,
    handleKeyDown,
    handleKeyUp,
    handleMouseDown,
    onCompositionStart,
    onCompositionEnd,
  } = useChatInputHandlers({
    atMentionRef,
    handleMessageSubmit,
    handleQuickRewrite,
    insertLLMMessageIntoText,
    llmMessageRef,
    originalTextBeforeRewriteRef,
    setInputText,
    setLLMMessage,
  });
  const roomName = roomHeaderOverride?.title ?? room?.name;
  const spaceName = space?.name;

  const chatFrameProps = React.useMemo(() => ({
    virtuosoRef,
    onBackgroundUrlChange: setBackgroundUrl,
    onEffectChange: setCurrentEffect,
    onExecuteCommandRequest: handleExecuteCommandRequest,
    onOpenThread,
    spaceName,
    roomName,
    messageScope,
    threadRootMessageId,
  }), [
    handleExecuteCommandRequest,
    onOpenThread,
    setBackgroundUrl,
    setCurrentEffect,
    roomName,
    spaceName,
    messageScope,
    threadRootMessageId,
    virtuosoRef,
  ]);

  const composerPanelProps = {
    roomId,
    userId: Number(userId),
    webSocketUtils,
    handleSelectCommand,
    ruleId: space?.ruleId ?? -1,
    handleMessageSubmit,
    onAIRewrite: handleQuickRewrite,
    currentChatStatus: myStatue as any,
    onChangeChatStatus: handleManualStatusChange,
    isSpectator,
    onToggleRealtimeRender: handleToggleRealtimeRender,
    onSendEffect: handleSendEffect,
    onClearBackground: handleClearBackground,
    onClearFigure: handleClearFigure,
    onSetWebgalVar: handleSetWebgalVar,
    onSendWebgalChoose: handleSendWebgalChoose,
    isKP: spaceContext.isSpaceOwner,
    onStopBgmForAll: handleStopBgmForAll,
    noRole,
    notMember,
    isSubmitting,
    curRoleId,
    curAvatarId,
    setCurRoleId,
    setCurAvatarId,
    mentionRoles: roomAllRoles,
    selectableRoles: roomRolesThatUserOwn,
    chatInputRef: chatInputRef as any,
    atMentionRef: atMentionRef as any,
    onInputSync: handleInputAreaChange,
    onPasteFiles: handlePasteFiles,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onMouseDown: handleMouseDown,
    onCompositionStart,
    onCompositionEnd,
  };

  return (
    <RoomUiStoreProvider store={roomUiStore}>
      <RoomContext value={roomContext}>
        <RoomSideDrawerGuards spaceId={spaceId} />
        <RealtimeRenderOrchestrator
          spaceId={spaceId}
          spaceName={spaceName}
          roomId={roomId}
          room={room}
          roles={roomAllRoles}
          historyMessages={mainHistoryMessages}
          chatHistoryLoading={!!chatHistory?.loading}
          onApiChange={handleRealtimeRenderApiChange}
        />
        <RoomDocRefDropLayer onSendDocCard={handleSendDocCard}>
          <RoomWindowLayout
            roomId={roomId}
            roomName={roomName}
            toggleLeftDrawer={spaceContext.toggleLeftDrawer}
            onCloseSubWindow={onCloseSubWindow}
            backgroundUrl={backgroundUrl}
            displayedBgUrl={displayedBgUrl}
            currentEffect={currentEffect}
            chatFrameProps={chatFrameProps}
            composerPanelProps={composerPanelProps}
            hideComposer={viewMode}
            hideSecondaryPanels={hideSecondaryPanels}
            chatAreaComposerTarget={messageScope === "thread" ? "thread" : "main"}
          />
        </RoomDocRefDropLayer>
        {!viewMode && (
          <RoomWindowOverlays
            isImportChatTextOpen={isImportChatTextOpen}
            setIsImportChatTextOpen={setIsImportChatTextOpen}
            isKP={Boolean(spaceContext.isSpaceOwner)}
            availableRoles={roomRolesThatUserOwn}
            onImportChatText={handleImportChatItems}
            onOpenRoleAddWindow={openRoleAddWindow}
            isRoleHandleOpen={isRoleHandleOpen}
            setIsRoleAddWindowOpen={setIsRoleAddWindowOpen}
            handleAddRole={handleAddRole}
            isRenderWindowOpen={isRenderWindowOpen}
            setIsRenderWindowOpen={setIsRenderWindowOpen}
          />
        )}
      </RoomContext>
    </RoomUiStoreProvider>
  );
}

export default RoomWindow;
