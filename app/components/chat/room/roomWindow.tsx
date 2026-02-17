import { zip, strToU8 } from "fflate";
import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../../api";

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
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { createRoomUiStore, RoomUiStoreProvider } from "@/components/chat/stores/roomUiStore";
import useCommandExecutor from "@/components/common/dicer/cmdPre";
import { PremiereExporter } from "@/webGAL";
import { useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { toast } from "react-hot-toast";
import { useStore } from "zustand";

import { useGlobalContext } from "@/components/globalContextProvider";
import {
  useDeleteMessageMutation,
  useGetRoomInfoQuery,
  useGetSpaceInfoQuery,
  useSendMessageMutation,
  useSetSpaceExtraMutation,
  useUpdateMessageMutation,
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
  const deleteMessageMutation = useDeleteMessageMutation();
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
  const [isApplyingMessageHistory, setIsApplyingMessageHistory] = useState(false);
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

  const undoInProgressRef = useRef(false);
  const redoInProgressRef = useRef(false);

  const syncMessageAfterHistoryApply = useCallback((nextMessage: Message) => {
    chatHistory?.addOrUpdateMessage({ message: nextMessage } as ChatMessageResponse);
  }, [chatHistory]);

  const handleUndoLastMessageAction = useCallback(async () => {
    if (undoInProgressRef.current || redoInProgressRef.current) {
      return;
    }

    const action = roomUiStore.getState().popMessageUndo();
    if (!action) {
      toast("没有可撤销的消息操作", { icon: "ℹ️" });
      return;
    }

    undoInProgressRef.current = true;
    setIsApplyingMessageHistory(true);
    roomUiStore.getState().setApplyingMessageUndo(true);

    try {
      if (action.type === "send") {
        const messageId = action.after.messageId;
        const response = await deleteMessageMutation.mutateAsync(messageId);
        const localTarget = chatHistory?.messages.find(m => m.message.messageId === messageId)?.message;
        const fallbackDeleted = {
          ...(localTarget ?? action.after),
          status: 1,
        };
        syncMessageAfterHistoryApply(response?.data ?? fallbackDeleted);
        roomUiStore.getState().restoreMessageRedo(action);
        toast.success("已撤销发送");
        return;
      }

      if (action.type === "delete") {
        const response = await updateMessageMutation.mutateAsync(action.before);
        syncMessageAfterHistoryApply(response?.data ?? action.before);
        roomUiStore.getState().restoreMessageRedo(action);
        toast.success("已撤销删除");
        return;
      }

      const response = await updateMessageMutation.mutateAsync(action.before);
      syncMessageAfterHistoryApply(response?.data ?? action.before);
      roomUiStore.getState().restoreMessageRedo(action);
      toast.success("已撤销修改");
    }
    catch (error) {
      console.error("撤销消息操作失败", error);
      roomUiStore.getState().restoreMessageUndo(action);
      toast.error("撤销失败，请稍后重试");
    }
    finally {
      roomUiStore.getState().setApplyingMessageUndo(false);
      setIsApplyingMessageHistory(false);
      undoInProgressRef.current = false;
    }
  }, [deleteMessageMutation, roomUiStore, syncMessageAfterHistoryApply, updateMessageMutation]);

  const handleRedoLastMessageAction = useCallback(async () => {
    if (undoInProgressRef.current || redoInProgressRef.current) {
      return;
    }

    const action = roomUiStore.getState().popMessageRedo();
    if (!action) {
      toast("没有可回退的消息操作", { icon: "ℹ️" });
      return;
    }

    redoInProgressRef.current = true;
    setIsApplyingMessageHistory(true);
    roomUiStore.getState().setApplyingMessageUndo(true);

    try {
      if (action.type === "send") {
        const response = await updateMessageMutation.mutateAsync({
          ...action.after,
          status: 0,
        });
        syncMessageAfterHistoryApply(response?.data ?? { ...action.after, status: 0 });
        roomUiStore.getState().restoreMessageUndo(action);
        toast.success("已回退发送");
        return;
      }

      if (action.type === "delete") {
        const messageId = action.before.messageId;
        const response = await deleteMessageMutation.mutateAsync(messageId);
        const localTarget = chatHistory?.messages.find(m => m.message.messageId === messageId)?.message;
        const fallbackDeleted = {
          ...(localTarget ?? action.before),
          status: 1,
        };
        syncMessageAfterHistoryApply(response?.data ?? fallbackDeleted);
        roomUiStore.getState().restoreMessageUndo(action);
        toast.success("已回退删除");
        return;
      }

      const response = await updateMessageMutation.mutateAsync(action.after);
      syncMessageAfterHistoryApply(response?.data ?? action.after);
      roomUiStore.getState().restoreMessageUndo(action);
      toast.success("已回退修改");
    }
    catch (error) {
      console.error("回退消息操作失败", error);
      roomUiStore.getState().restoreMessageRedo(action);
      toast.error("回退失败，请稍后重试");
    }
    finally {
      roomUiStore.getState().setApplyingMessageUndo(false);
      setIsApplyingMessageHistory(false);
      redoInProgressRef.current = false;
    }
  }, [chatHistory, deleteMessageMutation, roomUiStore, syncMessageAfterHistoryApply, updateMessageMutation]);

  useEffect(() => {
    const handleGlobalUndoKeyDown = (event: KeyboardEvent) => {
      const isUndoShortcut = (event.ctrlKey || event.metaKey)
        && !event.shiftKey
        && event.key.toLowerCase() === "z";
      const isRedoShortcutByY = (event.ctrlKey || event.metaKey)
        && !event.shiftKey
        && event.key.toLowerCase() === "y";
      const isRedoShortcutByShiftZ = (event.ctrlKey || event.metaKey)
        && event.shiftKey
        && event.key.toLowerCase() === "z";
      const isRedoShortcut = isRedoShortcutByY || isRedoShortcutByShiftZ;
      if (!isUndoShortcut && !isRedoShortcut) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        const isEditableTarget = target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA";
        if (isEditableTarget) {
          if (target.closest(".editable-field")) {
            return;
          }
          const isChatInput = target.classList.contains("chatInputTextarea");
          const hasInputText = useChatInputUiStore.getState().plainText.trim().length > 0;
          if (!isChatInput || hasInputText) {
            return;
          }
        }
      }

      event.preventDefault();
      event.stopPropagation();
      if (isUndoShortcut) {
        void handleUndoLastMessageAction();
        return;
      }
      void handleRedoLastMessageAction();
    };

    window.addEventListener("keydown", handleGlobalUndoKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalUndoKeyDown, true);
    };
  }, [handleRedoLastMessageAction, handleUndoLastMessageAction]);

  const queryClient = useQueryClient();

  const handleExportPremiere = useCallback(async () => {
    if (!historyMessages || historyMessages.length === 0) {
      toast.error("没有可导出的消息");
      return;
    }

    // Updated UI Flow: Defaults to ZIP Export
    // const exportModeZip = window.confirm("选择导出模式：\n\n[确定] = 导出 ZIP 整合包（推荐，含 XML + 图片素材 + 可选语音）。\n[取消] = 仅导出 XML 工程文件（需手动运行脚本下载素材）。");
    const exportModeZip = true;
    
    let ttsApiUrl: string | undefined;
    
    const useVoice = window.confirm("是否生成 AI 语音？\n\n[确定] = 生成语音（需配置 API）。\n[取消] = 不生成语音（仅含图片和字幕）。");
    if (useVoice) {
        const key = window.prompt("请输入 TTS API 地址", "http://127.0.0.1:9000");
        if (key) ttsApiUrl = key;
    }

    const loadToastId = toast.loading("正在处理导出...");

    try {
      const exporter = new PremiereExporter({
        sequenceName: `Chat_${roomId}`,
        ttsApiUrl,
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
      // 角色参考音频回调
      const roleVocalCache = new Map<number, File | undefined>();

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

      const fetchRoleRefVocal = async (roleId: number) => {
          if (roleVocalCache.has(roleId)) return roleVocalCache.get(roleId);
          
          try {
              // Get Role Info first
              let roleData: any = null;
              const queryKey = ["getRole", roleId];
              const cached = queryClient.getQueryData<{ data: any }>(queryKey);
              
              if (cached?.data) roleData = cached.data;
              else {
                  const res = await tuanchat.roleController.getRole(roleId);
                  if (res.data) {
                      roleData = res.data;
                      queryClient.setQueryData(queryKey, res);
                  }
              }

              if (roleData?.voiceUrl) {
                  // Fetch the file
                  const fileRes = await fetch(roleData.voiceUrl);
                  const blob = await fileRes.blob();
                  const file = new File([blob], "ref.wav", { type: blob.type });
                  roleVocalCache.set(roleId, file);
                  return file;
              }
          } catch (e) {
              console.warn(`Fetch role vocal ${roleId} failed`, e);
          }
          roleVocalCache.set(roleId, undefined);
          return undefined;
      };

      // 用户名获取回调 (Fallback)
      const userNameCache = new Map<number, string>();
      const fetchUserName = async (userId?: number) => {
          if (!userId) return null;
          if (userNameCache.has(userId)) return userNameCache.get(userId);

          const queryKey = ["getUser", userId];
          const cached = queryClient.getQueryData<{ data: any }>(queryKey);
          if (cached?.data?.username) { // UserInfoResponse usually has 'username' or 'name' or 'nickname'
              const name = cached.data.username;
              userNameCache.set(userId, name);
              return name;
          }

          try {
              const res = await tuanchat.userController.getUserInfo(userId);
              // Check return type UserInfoResponse
              if (res.data) {
                  const name = res.data.username || "Unknown";
                  userNameCache.set(userId, name);
                  queryClient.setQueryData(queryKey, res);
                  return name;
              }
          } catch(e) {
              console.warn(`Fetch user ${userId} failed`, e);
          }
          return null;
      };

      // 新增 Role Info Fetcher (for ID comparison)
      const fetchRole = async (roleId: number) => {
          const queryKey = ["getRole", roleId];
          const cached = queryClient.getQueryData<{ data: any }>(queryKey);
          if (cached?.data) return cached.data;
          try {
             // Reuse existing RoleController API
             const res = await tuanchat.roleController.getRole(roleId);
             if (res.data) {
                 queryClient.setQueryData(queryKey, res);
                 return res.data;
             }
          } catch {}
          return undefined;
      };

      await exporter.processMessages(
        historyMessages,
        fetchAvatar,
        fetchRoleName,
        fetchUserName,
        fetchRoleRefVocal,
        fetchRole,
        backgroundUrl ?? undefined,
      );

      if (exportModeZip) {
          // --- ZIP Export Mode ---
          const xmlContent = exporter.generateXML();
          const srtContent = exporter.generateSRT();
          const nameSrtContent = exporter.generateNameSRT();

          const zipData: Record<string, Uint8Array> = {};
          zipData[`TuanChat_Export_${roomId}.xml`] = strToU8(xmlContent);
          zipData[`TuanChat_Subtitles_${roomId}.srt`] = strToU8(srtContent);
          zipData[`TuanChat_Names_${roomId}.srt`] = strToU8(nameSrtContent);
          
          // Add generated Voice assets
          for (const [name, data] of Object.entries(exporter.generatedAudioAssets)) {
              zipData[`assets/${name}`] = data;
          }

          // Add Platform Image Assets (Sprites, Backgrounds)
          const resources = exporter.getResources().filter(r => r.type === "image" || r.type === "video");
          if (resources.length > 0) {
              const fetchResult = await Promise.allSettled(resources.map(async (r) => {
                  try {
                       const res = await fetch(r.url, { mode: 'cors' });
                       if (!res.ok) throw new Error(`Fetch ${r.url} failed: ${res.status}`);
                       const blob = await res.blob();
                       return { name: r.name, data: new Uint8Array(await blob.arrayBuffer()) };
                  } catch (e) {
                      console.error(e);
                      return null; 
                  }
              }));
              
              for (const item of fetchResult) {
                  if (item.status === 'fulfilled' && item.value) {
                      zipData[`assets/${item.value.name}`] = item.value.data;
                  }
              }
          }

          // Generate Script fallback
          // If we want to guarantee the user can download assets if they fail in zip.
          // But Zip should work if domains are correct.
          // The script is only needed for XML Only mode.

          zip(zipData, (err, data) => {
              if (err) {
                  console.error(err);
                  toast.error("压缩失败");
                  return;
              }
              const blob = new Blob([data], { type: "application/zip" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `TuanChat_Export_${roomId}.zip`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success("导出成功！", { id: loadToastId });
          });
      } else {
          // --- XML Only Mode (Legacy) ---
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
    }
    catch (e) {
      console.error(e);
      toast.error("导出失败，请检查控制台", { id: loadToastId });
    }
  }, [historyMessages, roomId, queryClient, backgroundUrl]);

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

  const canUndo = useStore(roomUiStore, state => state.messageUndoStack.length > 0);
  const canRedo = useStore(roomUiStore, state => state.messageRedoStack.length > 0);

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
            onExportPremiere={handleExportPremiere}
            onUndo={handleUndoLastMessageAction}
            onRedo={handleRedoLastMessageAction}
            canUndo={canUndo}
            canRedo={canRedo}
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
        {isApplyingMessageHistory && (
          <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="正在处理消息操作">
            <div className="modal-box max-w-sm text-center">
              <div className="flex items-center justify-center gap-3">
                <span className="loading loading-spinner loading-md"></span>
                <span className="font-medium">正在处理，请稍候…</span>
              </div>
            </div>
          </div>
        )}
      </RoomContext>
    </RoomUiStoreProvider>
  );
}

export default RoomWindow;
