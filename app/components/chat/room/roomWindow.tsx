import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse } from "../../../../api";

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
import useRoomChatFrameProps from "@/components/chat/room/useRoomChatFrameProps";
import useRoomCommandRequests from "@/components/chat/room/useRoomCommandRequests";
import getRoomComposerPanelProps from "@/components/chat/room/useRoomComposerPanelProps";
import useRoomContextValue from "@/components/chat/room/useRoomContextValue";
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
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import useCommandExecutor from "@/components/common/dicer/cmdPre";

import { useGlobalContext } from "@/components/globalContextProvider";
import {
  useGetRoomInfoQuery,
  useGetSpaceInfoQuery,
  useSendMessageMutation,
  useSetSpaceExtraMutation,
  useUpdateMessageMutation,
} from "../../../../api/hooks/chatQueryHooks";

function RoomWindow({ roomId, spaceId, targetMessageId }: { roomId: number; spaceId: number; targetMessageId?: number | null }) {
  const spaceContext = use(SpaceContext);

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
  const updateMessageMutation = useUpdateMessageMutation();
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
    useRoomUiStore.getState().reset();
  }, [roomId]);

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
    isSpaceOwner: spaceContext.isSpaceOwner,
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

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { scrollToGivenMessage } = useRoomMessageScroll({
    targetMessageId,
    historyMessages,
    mainHistoryMessages,
    isHistoryLoading: chatHistory?.loading,
    virtuosoRef,
  });

  const roomContext = useRoomContextValue({
    roomId,
    roomMembers: members,
    curMember,
    roomRolesThatUserOwn,
    curRoleId,
    curAvatarId,
    spaceId,
    chatHistory,
    scrollToGivenMessage,
    isRealtimeRenderActive,
    jumpToMessageInWebGAL,
    updateAndRerenderMessageInWebGAL,
    rerenderHistoryInWebGAL,
  });
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

  const { myStatus: myStatue, handleManualStatusChange } = useChatInputStatus({
    roomId,
    userId,
    webSocketUtils,
    inputTextSource: {
      get: () => useChatInputUiStore.getState().plainText,
      subscribe: (listener) => {
        return useChatInputUiStore.subscribe((state, prev) => {
          if (state.plainText !== prev.plainText) {
            listener(state.plainText);
          }
        });
      },
    },
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
    isSpaceOwner: spaceContext.isSpaceOwner,
    notMember,
    noRole,
    isSubmitting,
    commandExecutor,
  });

  const { sendMessageWithInsert, handleSetWebgalVar } = useRoomMessageActions({
    roomId,
    spaceId,
    spaceExtra: space?.extra,
    isSpaceOwner: spaceContext.isSpaceOwner,
    curRoleId,
    isSubmitting,
    notMember,
    mainHistoryMessages,
    send,
    sendMessage: sendMessageMutation.mutateAsync,
    updateMessage: updateMessageMutation.mutateAsync,
    addOrUpdateMessage: chatHistory?.addOrUpdateMessage,
    ensureRuntimeAvatarIdForRole,
    setSpaceExtra: setSpaceExtraMutation.mutateAsync,
  });
  const { handleMessageSubmit } = useChatMessageSubmit({
    roomId,
    spaceId,
    spaceExtra: space?.extra,
    isSpaceOwner: spaceContext.isSpaceOwner,
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
  });
  const {
    handleImportChatText,
    handleSendDocCard,
  } = useRoomImportActions({
    roomId,
    spaceId,
    isSpaceOwner: spaceContext.isSpaceOwner,
    curRoleId,
    notMember,
    isSubmitting,
    setIsSubmitting,
    roomContext,
    sendMessageWithInsert,
    ensureRuntimeAvatarIdForRole,
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
  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const roomName = roomHeaderOverride?.title ?? room?.name;

  const chatFrameProps = useRoomChatFrameProps({
    virtuosoRef,
    onBackgroundUrlChange: setBackgroundUrl,
    onEffectChange: setCurrentEffect,
    onExecuteCommandRequest: handleExecuteCommandRequest,
  });

  const composerPanelProps = getRoomComposerPanelProps({
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
    composerTarget,
    threadRootMessageId,
  });

  return (
    <RoomContext value={roomContext}>
      <RoomSideDrawerGuards spaceId={spaceId} />
      <RealtimeRenderOrchestrator
        spaceId={spaceId}
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
          backgroundUrl={backgroundUrl}
          displayedBgUrl={displayedBgUrl}
          currentEffect={currentEffect}
          composerTarget={composerTarget}
          setComposerTarget={setComposerTarget}
          chatFrameProps={chatFrameProps}
          composerPanelProps={composerPanelProps}
        />
      </RoomDocRefDropLayer>
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
    </RoomContext>
  );
}

export default RoomWindow;
