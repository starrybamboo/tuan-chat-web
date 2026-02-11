import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse } from "../../../../api";

import type { RoomContextType } from "@/components/chat/core/roomContext";
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
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import useCommandExecutor from "@/components/common/dicer/cmdPre";
import { PremiereExporter } from "@/webGAL";
import { useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { toast } from "react-hot-toast";

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
  viewMode = false,
}: {
  roomId: number;
  spaceId: number;
  targetMessageId?: number | null;
  viewMode?: boolean;
}) {
  const spaceContext = use(SpaceContext);

  useEffect(() => {
    useBgmStore.getState().setActiveRoomId(roomId);
    return () => {
      useBgmStore.getState().setActiveRoomId(null);
    };
  }, [roomId]);

  const space = useGetSpaceInfoQuery(spaceId).data?.data;
  const room = useGetRoomInfoQuery(roomId).data?.data;
  const spaceHeaderOverride = useEntityHeaderOverrideStore(state => state.headers[`space:${spaceId}`]);
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

  const queryClient = useQueryClient();

  const handleExportPremiere = useCallback(async () => {
    if (!historyMessages || historyMessages.length === 0) {
      toast.error("没有可导出的消息");
      return;
    }

    const loadToastId = toast.loading("正在导出工程...");

    try {
      const exporter = new PremiereExporter({
        sequenceName: `Chat_${roomId}`,
      });
      
      // 头像获取回调
      const avatarCache = new Map<number, any>();
      const fetchAvatar = async (avatarId: number) => {
          if (avatarCache.has(avatarId)) return avatarCache.get(avatarId);

          // 1. 尝试从缓存获取
          const queryKey = ["getRoleAvatar", avatarId];
          const cached = queryClient.getQueryData<{ data: any }>(queryKey);
          if (cached?.data) {
              avatarCache.set(avatarId, cached.data);
              return cached.data;
          }

          // 2. 调用 API
          try {
              const res = await tuanchat.avatarController.getRoleAvatar(avatarId);
              if (res.data) {
                  avatarCache.set(avatarId, res.data);
                  // Optionally update query cache
                  queryClient.setQueryData(queryKey, res);
                  return res.data;
              }
          } catch (e) {
              console.warn(`Fetch avatar ${avatarId} failed`, e);
          }
          return null;
      };

      // 角色名获取回调
      const roleNameCache = new Map<number, string>();
      const fetchRoleName = async (roleId?: number) => {
          if (!roleId) return null;
          if (roleNameCache.has(roleId)) return roleNameCache.get(roleId);

          // 尝试从缓存获取
          const queryKey = ["getRole", roleId];
          const cached = queryClient.getQueryData<{ data: any }>(queryKey);
          if (cached?.data?.roleName) {
             roleNameCache.set(roleId, cached.data.roleName);
             return cached.data.roleName;
          }

          // 调用 API
          try {
              const res = await tuanchat.roleController.getRole(roleId);
              if (res.data?.roleName) {
                  roleNameCache.set(roleId, res.data.roleName);
                  queryClient.setQueryData(queryKey, res);
                  return res.data.roleName;
              }
          } catch (e) {
              console.warn(`Fetch role name ${roleId} failed`, e);
          }
          return null;
      };

      // 用户名获取回调 (Fallback)
      const userNameCache = new Map<number, string>();
      const fetchUserName = async (userId?: number) => {
          if (!userId) return null;
          if (userNameCache.has(userId)) return userNameCache.get(userId);

          const queryKey = ["getUser", userId];
          const cached = queryClient.getQueryData<{ data: any }>(queryKey);
          if (cached?.data?.username) { // UserInfoResponse usually has 'username' or 'name' or 'nickname'
              const name = cached.data.nickname || cached.data.username;
              userNameCache.set(userId, name);
              return name;
          }

          try {
              const res = await tuanchat.userController.getUserInfo(userId);
              // Check return type UserInfoResponse
              if (res.data) {
                  const name = res.data.nickname || res.data.username || "Unknown";
                  userNameCache.set(userId, name);
                  queryClient.setQueryData(queryKey, res);
                  return name;
              }
          } catch(e) {
              console.warn(`Fetch user ${userId} failed`, e);
          }
          return null;
      };

      await exporter.processMessages(historyMessages, fetchAvatar, fetchRoleName, fetchUserName);

      const xmlContent = exporter.generateXML();
      const downloadBlob = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      downloadBlob(xmlContent, `TuanChat_Export_${roomId}.xml`, "text/xml;charset=utf-8");

      const scriptContent = exporter.generateDownloadScript();
      downloadBlob(scriptContent, `download_assets_${roomId}.ps1`, "text/plain;charset=utf-8");

      const srtContent = exporter.generateSRT();
      downloadBlob(srtContent, `TuanChat_Subtitles_${roomId}.srt`, "text/plain;charset=utf-8");

      const nameSrtContent = exporter.generateNameSRT();
      downloadBlob(nameSrtContent, `TuanChat_Names_${roomId}.srt`, "text/plain;charset=utf-8");

      toast.success("导出成功！请查看下载的文件。", { id: loadToastId });
    }
    catch (e) {
      console.error(e);
      toast.error("导出失败，请检查控制台", { id: loadToastId });
    }
  }, [historyMessages, roomId, queryClient]);

  const roomName = roomHeaderOverride?.title ?? room?.name;
  const spaceName = spaceHeaderOverride?.title ?? space?.name;

  const chatFrameProps = React.useMemo(() => ({
    virtuosoRef,
    onBackgroundUrlChange: setBackgroundUrl,
    onEffectChange: setCurrentEffect,
    onExecuteCommandRequest: handleExecuteCommandRequest,
    spaceName,
    roomName,
  }), [
    handleExecuteCommandRequest,
    setBackgroundUrl,
    setCurrentEffect,
    roomName,
    spaceName,
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
          chatFrameProps={chatFrameProps}
          composerPanelProps={composerPanelProps}
          hideComposer={viewMode}
          onExportPremiere={handleExportPremiere}
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
  );
}

export default RoomWindow;
