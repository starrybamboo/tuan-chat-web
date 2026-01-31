import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse, SpaceMember, UserRole } from "../../../../api";

import type { AtMentionHandle } from "@/components/atMentionController";
import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import React, { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
// hooks (local)
import RealtimeRenderOrchestrator from "@/components/chat/core/realtimeRenderOrchestrator";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatInputStatus from "@/components/chat/hooks/useChatInputStatus";
import { useChatHistory } from "@/components/chat/infra/indexedDB/useChatHistory";
import RoomSideDrawerGuards from "@/components/chat/room/roomSideDrawerGuards";
import RoomWindowLayout from "@/components/chat/room/roomWindowLayout";
import RoomWindowOverlays from "@/components/chat/room/roomWindowOverlays";
import useAiRewrite from "@/components/chat/room/useAiRewrite";
import useChatInputHandlers from "@/components/chat/room/useChatInputHandlers";
import useChatMessageSubmit from "@/components/chat/room/useChatMessageSubmit";
import useRealtimeRenderControls from "@/components/chat/room/useRealtimeRenderControls";
import useRoomCommandRequests from "@/components/chat/room/useRoomCommandRequests";
import useRoomImportActions from "@/components/chat/room/useRoomImportActions";
import useRoomMessageActions from "@/components/chat/room/useRoomMessageActions";
import useRoomMessageScroll from "@/components/chat/room/useRoomMessageScroll";
import useRoomRoleState from "@/components/chat/room/useRoomRoleState";
import { useBgmStore } from "@/components/chat/stores/bgmStore";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import useCommandExecutor from "@/components/common/dicer/cmdPre";

import { useGlobalContext } from "@/components/globalContextProvider";
import {
  useAddRoomRoleMutation,
  useGetMemberListQuery,
  useGetRoomInfoQuery,
  useGetSpaceInfoQuery,
  useSendMessageMutation,
  useSetSpaceExtraMutation,
  useUpdateMessageMutation,
} from "../../../../api/hooks/chatQueryHooks";
import { MessageType } from "../../../../api/wsModels";

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

  const chatInputRef = useRef<ChatInputAreaHandle>(null);
  const atMentionRef = useRef<AtMentionHandle>(null);

  const resetChatInputUi = useChatInputUiStore(state => state.reset);
  const resetChatComposer = useChatComposerStore(state => state.reset);

  const handleInputAreaChange = useCallback((plainText: string, inputTextWithoutMentions: string, roles: UserRole[]) => {
    useChatInputUiStore.getState().setSnapshot({
      plainText,
      textWithoutMentions: inputTextWithoutMentions,
      mentionedRoles: roles,
    });
    atMentionRef.current?.onInput();
  }, []);

  /**
   */
  const setInputText = (text: string) => {
    chatInputRef.current?.setContent(text);
    chatInputRef.current?.triggerSync();
  };

  const {
    llmMessageRef,
    originalTextBeforeRewriteRef,
    setLLMMessage,
    insertLLMMessageIntoText,
    handleQuickRewrite,
  } = useAiRewrite({ chatInputRef, setInputText });

  useEffect(() => {
    resetChatInputUi();
    resetChatComposer();
    return () => {
      resetChatInputUi();
      resetChatComposer();
    };
  }, [resetChatInputUi, resetChatComposer, roomId]);

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

  const [isRenderWindowOpen, setIsRenderWindowOpen] = useSearchParamsState<boolean>("renderPop", false);
  const [isImportChatTextOpen, setIsImportChatTextOpen] = useSearchParamsState<boolean>("importChatTextPop", false);

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
  const membersQuery = useGetMemberListQuery(roomId);
  const spaceMembers = useMemo(() => {
    return spaceContext.spaceMembers ?? [];
  }, [spaceContext.spaceMembers]);
  const members: SpaceMember[] = useMemo(() => {
    const members = membersQuery.data?.data ?? [];
    return members.map((member) => {
      const spaceMember = spaceMembers.find(m => m.userId === member.userId);
      return {
        ...member,
        ...spaceMember,
      };
    });
  }, [membersQuery.data?.data, spaceMembers]);

  const curMember = useMemo(() => {
    return members.find(member => member.userId === userId);
  }, [members, userId]);
  const chatHistory = useChatHistory(roomId);
  const historyMessages: ChatMessageResponse[] = chatHistory?.messages;

  const mainHistoryMessages = useMemo(() => {
    return (historyMessages ?? []).filter((m) => {
      if (m.message.messageType === MessageType.THREAD_ROOT) {
        return false;
      }
      const threadId = m.message.threadId;
      return !threadId || threadId === m.message.messageId;
    });
  }, [historyMessages]);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { scrollToGivenMessage } = useRoomMessageScroll({
    targetMessageId,
    historyMessages,
    mainHistoryMessages,
    isHistoryLoading: chatHistory?.loading,
    virtuosoRef,
  });

  const roomContext: RoomContextType = useMemo((): RoomContextType => {
    return {
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
    };
  }, [roomId, members, curMember, roomRolesThatUserOwn, curRoleId, curAvatarId, spaceId, chatHistory, scrollToGivenMessage, isRealtimeRenderActive, jumpToMessageInWebGAL, updateAndRerenderMessageInWebGAL, rerenderHistoryInWebGAL]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);

  const isSpectator = (curMember?.memberType ?? 3) >= 3;

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

  /**
   * AI闂佹彃绉撮崯鎾绘晬閸絾鐝撶憸浼翠憾椤ｂ晝鎲撮崼顒傜
   */
  const handleSelectCommand = (cmdName: string) => {
    const prefixChar = useChatInputUiStore.getState().plainText[0] || "."; // 濮掓稒顭堥缁樼▔?.
    setInputText(`${prefixChar}${cmdName} `);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const notMember = ((members.find(member => member.userId === userId)?.memberType ?? 3) >= 3);
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
    handleClueSend,
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
    send,
    sendMessageWithInsert,
    ensureRuntimeAvatarIdForRole,
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
  const [isRoleHandleOpen, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({ roomId, roleIdList: [roleId] }, {
      onSettled: () => { toast("添加角色成功"); },
    });
  };

  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const placeholderText = (() => {
    const isKP = spaceContext.isSpaceOwner;
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
  })();

  const handleSendEffect = useCallback((effectName: string) => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: `[特效: ${effectName}]`,
      messageType: MessageType.EFFECT,
      extra: {
        effectName,
      },
    });
  }, [roomId, send]);

  const handleClearBackground = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[清除背景]",
      messageType: MessageType.EFFECT,
      extra: {
        effectName: "clearBackground",
      },
    });
    toast.success("已清除背景");
  }, [roomId, send]);

  const handleClearFigure = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[清除立绘]",
      messageType: MessageType.EFFECT,
      extra: {
        effectName: "clearFigure",
      },
    });
    if (isRealtimeRenderActive) {
      clearRealtimeFigure();
    }
    toast.success("已清除立绘");
  }, [clearRealtimeFigure, isRealtimeRenderActive, roomId, send]);

  const handleStopBgmForAll = useCallback(() => {
    send({
      roomId,
      roleId: undefined,
      avatarId: undefined,
      content: "[停止全员BGM]",
      messageType: MessageType.SYSTEM,
      extra: {},
    });
    toast.success("已发送停止全员BGM");
  }, [roomId, send]);

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [displayedBgUrl, setDisplayedBgUrl] = useState<string | null>(null);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);

  useEffect(() => {
    if (backgroundUrl) {
      const id = setTimeout(() => setDisplayedBgUrl(backgroundUrl), 0);
      return () => clearTimeout(id);
    }
  }, [backgroundUrl]);

  const roomName = roomHeaderOverride?.title ?? room?.name;

  const chatFrameProps = {
    virtuosoRef,
    onBackgroundUrlChange: setBackgroundUrl,
    onEffectChange: setCurrentEffect,
    onExecuteCommandRequest: handleExecuteCommandRequest,
    onSendDocCard: handleSendDocCard,
  };

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
    isKP: spaceContext.isSpaceOwner,
    onStopBgmForAll: handleStopBgmForAll,
    noRole,
    notMember,
    isSubmitting,
    placeholderText,
    onSendDocCard: handleSendDocCard,
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
    inputDisabled: notMember && noRole,
  };

  const handleImportChatItems = useCallback(async (items: Array<{
    roleId: number;
    content: string;
    speakerName?: string;
    figurePosition?: string;
  }>, onProgress?: (sent: number, total: number) => void) => {
    await handleImportChatText(items.map(i => ({
      roleId: i.roleId,
      content: i.content,
      speakerName: i.speakerName,
      figurePosition: i.figurePosition,
    })), onProgress);
  }, [handleImportChatText]);

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
        onClueSend={handleClueSend}
      />
      <RoomWindowOverlays
        isImportChatTextOpen={isImportChatTextOpen}
        setIsImportChatTextOpen={setIsImportChatTextOpen}
        isKP={Boolean(spaceContext.isSpaceOwner)}
        availableRoles={roomRolesThatUserOwn}
        onImportChatText={handleImportChatItems}
        onOpenRoleAddWindow={() => setIsRoleAddWindowOpen(true)}
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
