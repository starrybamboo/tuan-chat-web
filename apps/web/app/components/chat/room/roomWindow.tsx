import type { VirtuosoHandle } from "react-virtuoso";
import { appToast } from "@/components/common/appToast/appToast";

import { useQueryClient } from "@tanstack/react-query";
import { patchInsertMessages } from "@tuanchat/query/chat";
import { fetchUserInfoWithCache } from "@tuanchat/query/users";
import React, { use, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoomContextType } from "@/components/chat/core/roomContext";

// hooks (local)
import { useClueFolderActions } from "@/components/chat/clues/useClueFolderActions";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatInputStatus from "@/components/chat/hooks/useChatInputStatus";
import { useChatHistory } from "@/components/chat/infra/localDb/useChatHistory";
import { resolveCommandInlineCompletion } from "@/components/chat/input/commandInlineCompletion";
import { resolveMessageDiffBaseCommitId } from "@/components/chat/message/diff/messageVersionDiff";
import {
  buildMessageHistoryPatchRequest,
  getMessageHistoryPatchFallbackMessage,
} from "@/components/chat/room/messageHistoryMutation";
import { handleRoomMessageHistoryShortcutEvent } from "@/components/chat/room/messageHistoryShortcuts";
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
import { compareChatMessageResponsesByOrder, compareMessagesByOrder } from "@/components/chat/shared/messageOrder";
import { StateRuntimeProvider } from "@/components/chat/state/stateRuntimeContext";
import { useAudioMessageAutoPlayStore } from "@/components/chat/stores/audioMessageAutoPlayStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { createRoomUiStore, RoomUiStoreProvider } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { applyUploadedReplayAssetManifest } from "@/components/chat/utils/importRglAssetManifestApply";
import {
  buildReplayAssetUploadFileMap,
  buildUploadedReplayAssetManifest,
  createReplayAssetManifestUploadDepsFromUploadUtils,
  findReplayLocalAssetManifestFile,
  readReplayAssetManifestJsonFile,
} from "@/components/chat/utils/importRglAssetManifestUpload";
import { applyReplayMaterialPackageImport, buildReplayMaterialPackageFromAssetManifest } from "@/components/chat/utils/importRglMaterialManifest";
import { applyReplayRoleAvatarImportPlan, buildReplayRoleAvatarImportPlanFromAssetManifest } from "@/components/chat/utils/importRglRoleManifest";
import {
  refreshRglMaterialImportSourceCaches,
  refreshRglRoleAvatarImportSourceCaches,
  rglMaterialImportPackagesQueryKey,
} from "@/components/chat/utils/importRglSourceCache";
import { hasHostPrivileges } from "@/components/chat/utils/memberPermissions";
import { ConfirmDialog, confirm } from "@/components/common/ConfirmDialog";
import useCommandExecutor from "@/components/common/dicer/cmdPre";
import { useGlobalUserId, useGlobalWebSocket } from "@/components/globalContextProvider";
import { resolveRoleVoiceUrl } from "@/components/Role/roleVoiceMedia";
import { copyBytesToBlobPart } from "@/utils/media/blobParts";
import { UploadUtils } from "@/utils/media/UploadUtils";
import { tuanchat } from "api/instance";

import type { ChatMessageRequest, ChatMessageResponse, Message, SpaceMaterialPackageResponse } from "../../../../api";

import {
  roomNpcRoleQueryKey,
  roomRoleQueryKey,
  useGetRoomInfoQuery,
  useGetSpaceInfoQuery,
  usePatchMessagesMutation,
  useSendMessageMutation,
} from "../../../../api/hooks/chatQueryHooks";
import { useRepositoryDetailByIdQuery } from "../../../../api/hooks/repositoryQueryHooks";
import { fetchRoleAvatarWithCache, fetchRoleAvatarsWithCache, fetchRoleWithCache } from "../../../../api/hooks/RoleAndAvatarHooks";

const RGL_IMPORT_MATERIAL_PAGE_SIZE = 100;

async function fetchAllSpaceMaterialPackagesForRglImport(spaceId: number): Promise<SpaceMaterialPackageResponse[]> {
  if (!Number.isFinite(spaceId) || spaceId <= 0) {
    throw new Error("未找到当前空间，无法解析素材包");
  }

  const packages: SpaceMaterialPackageResponse[] = [];
  let pageNo = 1;
  for (let guard = 0; guard < 100; guard += 1) {
    const response = await tuanchat.spaceMaterialPackageController.pagePackages({
      spaceId,
      pageNo,
      pageSize: RGL_IMPORT_MATERIAL_PAGE_SIZE,
    });
    if (!response.success) {
      throw new Error(response.errMsg?.trim() || "加载空间素材包失败");
    }

    const page = response.data;
    packages.push(...(page?.list ?? []));
    if (page?.isLast || !page?.list?.length) {
      return packages;
    }
    pageNo = (page.pageNo ?? pageNo) + 1;
  }

  throw new Error("空间素材包分页过多，已停止导入解析");
}

async function findSpaceMaterialPackageByExactNameForRglImport(
  spaceId: number,
  name: string,
): Promise<Pick<SpaceMaterialPackageResponse, "spacePackageId"> | null> {
  const matches = (await fetchAllSpaceMaterialPackagesForRglImport(spaceId))
    .filter(item => item.name?.trim() === name);
  if (matches.length > 1) {
    throw new Error(`存在多个同名局内素材包：${name}`);
  }
  return matches[0]?.spacePackageId ? { spacePackageId: matches[0].spacePackageId } : null;
}

const RealtimeRenderOrchestrator = React.lazy(() => import("@/components/chat/core/realtimeRenderOrchestrator"));
const DOC_ROOM_TYPE = 4;

function RoomWindow({
  roomId,
  spaceId,
  targetMessageId,
  viewMode = false,
  hideSecondaryPanels = false,
  onCloseSubWindow,
}: {
  roomId: number;
  spaceId: number;
  targetMessageId?: number | null;
  viewMode?: boolean;
  hideSecondaryPanels?: boolean;
  onCloseSubWindow?: () => void;
}) {
  const spaceContext = use(SpaceContext);
  const roomUiStoreRef = useRef<ReturnType<typeof createRoomUiStore> | null>(null);
  if (!roomUiStoreRef.current) {
    roomUiStoreRef.current = createRoomUiStore();
  }
  const roomUiStore = roomUiStoreRef.current;
  const queryClient = useQueryClient();
  const rglAssetUploadUtilsRef = useRef(new UploadUtils());

  useEffect(() => {
    useAudioMessageAutoPlayStore.getState().setActiveRoomId(roomId);
    return () => {
      useAudioMessageAutoPlayStore.getState().setActiveRoomId(null);
    };
  }, [roomId]);

  const spaceQuery = useGetSpaceInfoQuery(spaceId);
  const roomQuery = useGetRoomInfoQuery(roomId);
  const space = spaceQuery.data?.data;
  const room = roomQuery.data?.data;
  const commandInputText = useChatInputUiStore(state => state.plainText);
  const repositoryId = typeof space?.repositoryId === "number" && Number.isFinite(space.repositoryId)
    ? space.repositoryId
    : 0;
  const repositoryQuery = useRepositoryDetailByIdQuery(repositoryId);
  const baseArchiveCommitIdForMessageDiff = resolveMessageDiffBaseCommitId({
    parentCommitId: space?.parentCommitId,
    repositoryCommitId: repositoryQuery.data?.data?.commitId,
  });
  const [isFullMessageDiffOpen, setIsFullMessageDiffOpen] = useState(false);
  const [roomContentMode, setRoomContentMode] = useState<"room" | "doc">("room");

  useEffect(() => {
    if (room?.roomId !== roomId) {
      return;
    }
    setRoomContentMode(room.roomType === DOC_ROOM_TYPE ? "doc" : "room");
  }, [room?.roomId, room?.roomType, roomId]);

  const userId = useGlobalUserId();
  const webSocketUtils = useGlobalWebSocket();

  const sendMessageMutation = useSendMessageMutation(roomId);
  const patchMessagesMutation = usePatchMessagesMutation(roomId);
  const insertMessagesWithPatch = useCallback((messages: ChatMessageRequest[], options?: Parameters<typeof patchInsertMessages>[2]) => {
    return patchInsertMessages(tuanchat, messages, options);
  }, []);

  const {
    chatInputRef,
    atMentionRef,
    handleInputAreaChange,
    handleSelectCommand,
    setInputText,
  } = useRoomInputController({ roomId });
  const ruleId = space?.ruleId ?? -1;
  const commandInlineCompletion = React.useMemo(() => {
    return resolveCommandInlineCompletion({ text: commandInputText, ruleId });
  }, [commandInputText, ruleId]);
  const acceptCommandInlineCompletion = useCallback(() => {
    if (!commandInlineCompletion) {
      return false;
    }
    const textAroundCursor = chatInputRef.current?.getTextAroundCursor();
    if (!textAroundCursor || textAroundCursor.after.length > 0) {
      return false;
    }
    setInputText(commandInlineCompletion.completedText);
    return true;
  }, [chatInputRef, commandInlineCompletion, setInputText]);

  useLayoutEffect(() => {
    roomUiStore.getState().reset();
  }, [roomId, roomUiStore]);

  const {
    members,
    curMember,
    isSpectator,
    notMember,
    isMemberDataReady: _isMemberDataReady,
  } = useRoomMemberState({
    roomId,
    userId,
    spaceMembers: spaceContext.spaceMembers,
  });
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
    isSpectator,
  });
  const { copyMessageToClueFolder } = useClueFolderActions({
    currentUserId: userId,
    fallbackRoleId: curRoleId,
    hasHostPrivileges: Boolean(spaceContext.isSpaceOwner),
    spaceId,
    spaceMembers: spaceContext.spaceMembers,
  });

  // RealtimeRender controls
  const {
    isRealtimeRenderActive,
    shouldMountRealtimeRender,
    handleRealtimeRenderApiChange,
    handleToggleRealtimeRender,
    jumpToMessageInWebGAL,
    updateAndRerenderMessageInWebGAL,
    rerenderHistoryInWebGAL,
    clearFigure: clearRealtimeFigure,
  } = useRealtimeRenderControls();
  const chatHistory = useChatHistory(roomId);
  const historyMessages: ChatMessageResponse[] = chatHistory?.messages;

  const mainHistoryMessages = useRoomMainHistoryMessages({
    historyMessages,
  });
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const setWebgalOpen = useSideDrawerStore(state => state.setWebgalOpen);
  const initialDocMessages = React.useMemo(() => {
    return mainHistoryMessages
      .map(item => item.message)
      .filter((item): item is Message => Boolean(item));
  }, [mainHistoryMessages]);
  const lastNonEmptyRoomMessagesRef = useRef<ChatMessageResponse[]>([]);
  useEffect(() => {
    if (mainHistoryMessages.length > 0) {
      lastNonEmptyRoomMessagesRef.current = mainHistoryMessages;
    }
  }, [mainHistoryMessages]);
  const handleRemoteDocMessagesSaved = useCallback(async (messages: Message[]) => {
    const roomMessages = messages
      .filter(message => message.roomId === roomId)
      .sort(compareMessagesByOrder)
      .map(message => ({ message }) as ChatMessageResponse);
    if (roomMessages.length === 0) {
      console.warn("[RoomWindow] skip merging room cache because doc patch returned no changed room messages", {
        roomId,
        returnedMessages: messages.length,
      });
      return;
    }
    await chatHistory?.addOrUpdateMessages(roomMessages);
    const mergedById = new Map<number, ChatMessageResponse>();
    for (const item of chatHistory?.messages.length ? chatHistory.messages : lastNonEmptyRoomMessagesRef.current) {
      if (typeof item.message?.messageId === "number") {
        mergedById.set(item.message.messageId, item);
      }
    }
    for (const item of roomMessages) {
      mergedById.set(item.message.messageId, item);
    }
    lastNonEmptyRoomMessagesRef.current = [...mergedById.values()].sort(compareChatMessageResponsesByOrder);
  }, [chatHistory, roomId]);
  const canViewDocContent = Boolean(spaceContext.isSpaceOwner || hasHostPrivileges(curMember?.memberType));
  const handleToggleRoomContentMode = useCallback(() => {
    setSideDrawerState("none");
    setWebgalOpen(false);
    setRoomContentMode(mode => (mode === "doc" ? "room" : "doc"));
  }, [setSideDrawerState, setWebgalOpen]);
  const visibleRoleIdsForStateDrawer = React.useMemo(() => {
    if (sideDrawerState !== "combat" && sideDrawerState !== "initiative" && sideDrawerState !== "state") {
      return undefined;
    }
    return roomAllRoles.map(role => role.roleId).filter(roleId => roleId > 0);
  }, [roomAllRoles, sideDrawerState]);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const { scrollToGivenMessage } = useRoomMessageScroll({
    targetMessageId,
    historyMessages,
    mainHistoryMessages,
    isHistoryLoading: chatHistory?.loading,
    virtuosoRef,
  });
  const sendMessageWithInsertRef = useRef<((message: ChatMessageRequest) => Promise<Message | null>) | null>(null);
  const sendMessageWithInsertFromRef = useCallback(async (message: ChatMessageRequest) => {
    if (!sendMessageWithInsertRef.current) {
      return null;
    }
    return await sendMessageWithInsertRef.current(message);
  }, []);
  const executeCommandRef = useRef<RoomContextType["executeCommand"] | null>(null);
  const executeCommandFromRef = useCallback<NonNullable<RoomContextType["executeCommand"]>>((payload) => {
    return executeCommandRef.current?.(payload);
  }, []);

  const roomContext = React.useMemo((): RoomContextType => ({
    roomId,
    roomMembers: members,
    curMember,
    roomRolesThatUserOwn,
    roomAllRoles,
    curRoleId,
    curAvatarId,
    spaceId,
    chatHistory,
    scrollToGivenMessage,
    jumpToMessageInWebGAL: isRealtimeRenderActive ? jumpToMessageInWebGAL : undefined,
    updateAndRerenderMessageInWebGAL: isRealtimeRenderActive ? updateAndRerenderMessageInWebGAL : undefined,
    rerenderHistoryInWebGAL: isRealtimeRenderActive ? rerenderHistoryInWebGAL : undefined,
    sendMessageWithInsert: sendMessageWithInsertFromRef,
    executeCommand: executeCommandFromRef,
  }), [
    chatHistory,
    curAvatarId,
    curMember,
    curRoleId,
    isRealtimeRenderActive,
    jumpToMessageInWebGAL,
    members,
    rerenderHistoryInWebGAL,
    roomAllRoles,
    roomId,
    roomRolesThatUserOwn,
    executeCommandFromRef,
    sendMessageWithInsertFromRef,
    scrollToGivenMessage,
    spaceId,
    updateAndRerenderMessageInWebGAL,
  ]);
  const commandExecutor = useCommandExecutor(curRoleId, space?.ruleId ?? -1, roomContext);
  executeCommandRef.current = async (payload) => {
    return await commandExecutor(payload);
  };

  const { myStatus: myStatue, handleManualStatusChange } = useChatInputStatus({
    roomId,
    userId,
    webSocketUtils,
    isSpectator,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingMessageHistory, setIsApplyingMessageHistory] = useState(false);
  const [isReloadingAllMessages, setIsReloadingAllMessages] = useState(false);
  const noRole = curRoleId <= 0;
  const isSpaceArchived = Boolean(space?.archived || space?.status === 2);

  const {
    containsCommandRequestAllToken,
    stripCommandRequestAllToken,
    extractFirstCommandText,
    isCommandRequestConsumed,
    handleExecuteCommandRequest,
  } = useRoomCommandRequests({
    roomId,
    userId: Number(userId ?? 0),
    isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
    notMember,
    noRole,
    isSubmitting,
    commandExecutor,
  });

  const {
    discardLocalOptimisticMessages,
    insertLocalOptimisticMessages,
    sendMessageBatchWithLocalOptimistic,
    sendMessageWithInsert,
    sendMessageBatch,
  } = useRoomMessageActions({
    currentUserId: Number(userId ?? 0),
    mainHistoryMessages,
    sendMessage: sendMessageMutation.mutateAsync,
    insertMessages: insertMessagesWithPatch,
    addOrUpdateMessage: chatHistory?.addOrUpdateMessage,
    addOrUpdateMessages: chatHistory?.addOrUpdateMessages,
    removeMessageById: chatHistory?.removeMessageById,
    replaceMessageById: chatHistory?.replaceMessageById,
    roomUiStoreApi: roomUiStore,
  });
  sendMessageWithInsertRef.current = sendMessageWithInsert;
  const {
    backgroundUrl,
    combatVisualActive,
    displayedBgUrl,
    currentEffect,
    setBackgroundUrl,
    setCombatVisualActive,
    setCurrentEffect,
    handleSendEffect,
    handleClearBackground,
    handleClearFigure,
    handleStopBgmForAll,
  } = useRoomEffectsController({
    roomId,
    sendMessageWithInsert,
    isRealtimeRenderActive,
    clearRealtimeFigure,
  });
  const { handleMessageSubmit } = useChatMessageSubmit({
    roomId,
    spaceId,
    isSpaceOwner: Boolean(spaceContext.isSpaceOwner),
    isSpaceArchived,
    curRoleId,
    ruleId: space?.ruleId ?? -1,
    notMember,
    noRole,
    isSubmitting,
    setIsSubmitting,
    discardLocalOptimisticMessages,
    insertLocalOptimisticMessages,
    sendMessageBatchWithLocalOptimistic,
    sendMessageWithInsert,
    sendMessageBatch,
    ensureRuntimeAvatarIdForRole,
    commandExecutor,
    containsCommandRequestAllToken,
    stripCommandRequestAllToken,
    extractFirstCommandText,
    setInputText,
    queryClient,
    roomUiStoreApi: roomUiStore,
  });
  const {
    handleImportChatText,
    handleSendClueCard,
    handleSendDocCard,
    handleSendMaterialItem,
    handleSendRoomJump,
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
    sendMessageBatch,
    ensureRuntimeAvatarIdForRole,
    queryClient,
    roomUiStoreApi: roomUiStore,
  });
  const {
    isImportChatTextOpen,
    setIsImportChatTextOpen,
    isRoleHandleOpen,
    setIsRoleAddWindowOpen,
    isNpcRoleHandleOpen,
    setIsNpcRoleAddWindowOpen,
    handleAddRole,
    handleAddNpcRole,
    handleImportChatItems,
    openRoleAddWindow,
    openNpcAddWindow,
  } = useRoomOverlaysController({
    roomId,
    handleImportChatText,
  });
  const loadRglRoleAvatarSources = useCallback(async () => {
    const roleIds = Array.from(new Set(
      roomAllRoles
        .map(role => role.roleId)
        .filter(roleId => typeof roleId === "number" && Number.isFinite(roleId) && roleId > 0),
    ));
    const avatarEntries = await Promise.all(roleIds.map(async (roleId) => {
      const avatars = (await fetchRoleAvatarsWithCache(queryClient, roleId)).data ?? [];
      return [roleId, avatars] as const;
    }));
    return Object.fromEntries(avatarEntries);
  }, [queryClient, roomAllRoles]);

  const loadRglImportSources = useCallback(async () => {
    const avatarsByRoleId = await loadRglRoleAvatarSources();
    const materialPackages = await queryClient.fetchQuery({
      queryKey: rglMaterialImportPackagesQueryKey(spaceId),
      queryFn: () => fetchAllSpaceMaterialPackagesForRglImport(spaceId),
      staleTime: 10_000,
    });

    return {
      avatarsByRoleId,
      materialPackages,
    };
  }, [loadRglRoleAvatarSources, queryClient, spaceId]);

  const handleImportRglLocalAssets = useCallback(async (files: FileList) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) {
      throw new Error("未选择本地素材目录");
    }

    const manifestFile = findReplayLocalAssetManifestFile(selectedFiles);
    const rawManifest = await readReplayAssetManifestJsonFile(manifestFile, "本地素材清单");
    const uploadedManifest = await buildUploadedReplayAssetManifest(rawManifest, createReplayAssetManifestUploadDepsFromUploadUtils({
      filesByPath: buildReplayAssetUploadFileMap(selectedFiles),
      uploadUtils: rglAssetUploadUtilsRef.current,
    }));
    const applied = await applyUploadedReplayAssetManifest(uploadedManifest, {
      spaceId,
      loadRoleSources: async () => ({
        roles: roomAllRoles,
        avatarsByRoleId: await loadRglRoleAvatarSources(),
      }),
      materialDeps: {
        findPackageByExactName: findSpaceMaterialPackageByExactNameForRglImport,
        createPackage: request => tuanchat.spaceMaterialPackageController.createPackage(request),
        updatePackage: request => tuanchat.spaceMaterialPackageController.updatePackage(request),
      },
      roleDeps: {
        roomId,
        addRoomRole: request => tuanchat.roomRoleController.addRole(request),
        createRole: request => tuanchat.roleController.createRole(request),
        setRoleAvatar: request => tuanchat.avatarController.setRoleAvatar(request),
        updateRole: request => tuanchat.roleController.updateRole(request),
        updateRoleAvatar: request => tuanchat.avatarController.updateRoleAvatar(request),
      },
    });
    if (applied.material) {
      await refreshRglMaterialImportSourceCaches(queryClient, spaceId);
    }
    if (applied.role) {
      await refreshRglRoleAvatarImportSourceCaches(queryClient, applied.role.entries);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomRoleQueryKey(roomId) }),
        queryClient.invalidateQueries({ queryKey: roomNpcRoleQueryKey(roomId) }),
        queryClient.invalidateQueries({ queryKey: ["getUserRoles"] }),
        queryClient.invalidateQueries({ queryKey: ["getUserRolesByType"] }),
        queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] }),
      ]);
    }

    return {
      ...(applied.material ? { material: applied.material } : {}),
      ...(applied.role ? { role: applied.role.stats } : {}),
    };
  }, [loadRglRoleAvatarSources, queryClient, roomAllRoles, roomId, spaceId]);

  const handleImportRglMaterialAssets = useCallback(async (file: File) => {
    if (!file) {
      throw new Error("未选择通用素材 manifest");
    }

    const rawManifest = await readReplayAssetManifestJsonFile(file, "通用素材 manifest");
    const replayPackage = buildReplayMaterialPackageFromAssetManifest(rawManifest);
    const result = await applyReplayMaterialPackageImport(spaceId, replayPackage, {
      findPackageByExactName: findSpaceMaterialPackageByExactNameForRglImport,
      createPackage: request => tuanchat.spaceMaterialPackageController.createPackage(request),
      updatePackage: request => tuanchat.spaceMaterialPackageController.updatePackage(request),
    });

    await refreshRglMaterialImportSourceCaches(queryClient, spaceId);
    return result;
  }, [queryClient, spaceId]);

  const handleImportRglRoleAssets = useCallback(async (file: File) => {
    if (!file) {
      throw new Error("未选择角色素材 manifest");
    }

    const rawManifest = await readReplayAssetManifestJsonFile(file, "角色素材 manifest");
    const avatarsByRoleId = await loadRglRoleAvatarSources();
    const plan = buildReplayRoleAvatarImportPlanFromAssetManifest(rawManifest, {
      roles: roomAllRoles,
      avatarsByRoleId,
    });
    const result = await applyReplayRoleAvatarImportPlan(plan, {
      roomId,
      addRoomRole: request => tuanchat.roomRoleController.addRole(request),
      createRole: request => tuanchat.roleController.createRole(request),
      setRoleAvatar: request => tuanchat.avatarController.setRoleAvatar(request),
      updateRole: request => tuanchat.roleController.updateRole(request),
      updateRoleAvatar: request => tuanchat.avatarController.updateRoleAvatar(request),
    });

    await refreshRglRoleAvatarImportSourceCaches(queryClient, result.entries);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: roomRoleQueryKey(roomId) }),
      queryClient.invalidateQueries({ queryKey: roomNpcRoleQueryKey(roomId) }),
      queryClient.invalidateQueries({ queryKey: ["getUserRoles"] }),
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByType"] }),
      queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] }),
    ]);

    return result.stats;
  }, [loadRglRoleAvatarSources, queryClient, roomAllRoles, roomId]);
  const [importInitialRawText, setImportInitialRawText] = useState<string | undefined>();
  const [pendingImportTextPaste, setPendingImportTextPaste] = useState<{
    insertAsPlainText: () => void;
    text: string;
  } | null>(null);
  const canImportChatText = Boolean(spaceContext.isSpaceOwner);

  useEffect(() => {
    if (!canImportChatText && isImportChatTextOpen) {
      setIsImportChatTextOpen(false);
      setImportInitialRawText(undefined);
    }
  }, [canImportChatText, isImportChatTextOpen, setIsImportChatTextOpen]);

  const handleSetImportChatTextOpen = useCallback((isOpen: boolean) => {
    if (isOpen && !canImportChatText) {
      appToast.error("只有 KP 可以导入对话");
      return;
    }
    setIsImportChatTextOpen(isOpen);
    if (!isOpen) {
      setImportInitialRawText(undefined);
    }
  }, [canImportChatText, setIsImportChatTextOpen]);
  const handleRequestDocImportTextPaste = useCallback((text: string, insertAsPlainText: () => void) => {
    if (!canImportChatText) {
      insertAsPlainText();
      return;
    }
    setPendingImportTextPaste({
      insertAsPlainText,
      text,
    });
  }, [canImportChatText]);
  const handleUseDocPasteAsPlainText = useCallback(() => {
    const pending = pendingImportTextPaste;
    setPendingImportTextPaste(null);
    pending?.insertAsPlainText();
  }, [pendingImportTextPaste]);
  const handleImportDocPasteText = useCallback(() => {
    const pending = pendingImportTextPaste;
    if (!pending) {
      return;
    }
    if (!canImportChatText) {
      setPendingImportTextPaste(null);
      pending.insertAsPlainText();
      return;
    }
    setImportInitialRawText(pending.text);
    setPendingImportTextPaste(null);
    setIsImportChatTextOpen(true);
  }, [canImportChatText, pendingImportTextPaste, setIsImportChatTextOpen]);

  const {
    handlePasteFiles,
    handleKeyDown,
    handleKeyUp,
    handleMouseDown,
    onCompositionStart,
    onCompositionEnd,
    requestMessageSubmit,
  } = useChatInputHandlers({
    acceptCommandCompletion: acceptCommandInlineCompletion,
    atMentionRef,
    handleMessageSubmit,
    roomId,
  });

  const undoInProgressRef = useRef(false);
  const redoInProgressRef = useRef(false);

  const syncMessageAfterHistoryApply = useCallback((nextMessage: Message) => {
    chatHistory?.addOrUpdateMessage({ message: nextMessage } as ChatMessageResponse);
  }, [chatHistory]);

  const applyMessageHistoryPatch = useCallback(async (action: Parameters<typeof buildMessageHistoryPatchRequest>[0], operationCause: "redo" | "undo") => {
    const request = buildMessageHistoryPatchRequest(action, operationCause);
    const response = await patchMessagesMutation.mutateAsync(request);
    const currentMessage = action.type === "send"
      ? historyMessages?.find(m => m.message.messageId === action.after.messageId)?.message
      : historyMessages?.find(m => m.message.messageId === action.before.messageId)?.message;
    return response?.data?.[0] ?? getMessageHistoryPatchFallbackMessage(action, operationCause, currentMessage);
  }, [historyMessages, patchMessagesMutation]);

  const handleUndoLastMessageAction = useCallback(async () => {
    if (undoInProgressRef.current || redoInProgressRef.current) {
      return;
    }

    const action = roomUiStore.getState().popMessageUndo();
    if (!action) {
      appToast.info("没有可撤销的消息操作", { icon: "ℹ️" });
      return;
    }

    undoInProgressRef.current = true;
    setIsApplyingMessageHistory(true);
    roomUiStore.getState().setApplyingMessageUndo(true);

    try {
      if (action.type === "send") {
        const message = await applyMessageHistoryPatch(action, "undo");
        syncMessageAfterHistoryApply(message);
        roomUiStore.getState().restoreMessageRedo(action);
        appToast.success("已撤销发送");
        return;
      }

      if (action.type === "delete") {
        const message = await applyMessageHistoryPatch(action, "undo");
        syncMessageAfterHistoryApply(message);
        roomUiStore.getState().restoreMessageRedo(action);
        appToast.success("已撤销删除");
        return;
      }

      const message = await applyMessageHistoryPatch(action, "undo");
      syncMessageAfterHistoryApply(message);
      roomUiStore.getState().restoreMessageRedo(action);
      appToast.success("已撤销修改");
    }
    catch (error) {
      console.error("撤销消息操作失败", error);
      roomUiStore.getState().restoreMessageUndo(action);
      appToast.error("撤销失败，请稍后重试");
    }
    finally {
      roomUiStore.getState().setApplyingMessageUndo(false);
      setIsApplyingMessageHistory(false);
      undoInProgressRef.current = false;
    }
  }, [applyMessageHistoryPatch, roomUiStore, syncMessageAfterHistoryApply]);

  const handleRedoLastMessageAction = useCallback(async () => {
    if (undoInProgressRef.current || redoInProgressRef.current) {
      return;
    }

    const action = roomUiStore.getState().popMessageRedo();
    if (!action) {
      appToast.info("没有可重做的消息操作", { icon: "ℹ️" });
      return;
    }

    redoInProgressRef.current = true;
    setIsApplyingMessageHistory(true);
    roomUiStore.getState().setApplyingMessageUndo(true);

    try {
      if (action.type === "send") {
        const message = await applyMessageHistoryPatch(action, "redo");
        syncMessageAfterHistoryApply(message);
        roomUiStore.getState().restoreMessageUndo(action);
        appToast.success("已重做发送");
        return;
      }

      if (action.type === "delete") {
        const message = await applyMessageHistoryPatch(action, "redo");
        syncMessageAfterHistoryApply(message);
        roomUiStore.getState().restoreMessageUndo(action);
        appToast.success("已重做删除");
        return;
      }

      const message = await applyMessageHistoryPatch(action, "redo");
      syncMessageAfterHistoryApply(message);
      roomUiStore.getState().restoreMessageUndo(action);
      appToast.success("已重做修改");
    }
    catch (error) {
      console.error("重做消息操作失败", error);
      roomUiStore.getState().restoreMessageRedo(action);
      appToast.error("重做失败，请稍后重试");
    }
    finally {
      roomUiStore.getState().setApplyingMessageUndo(false);
      setIsApplyingMessageHistory(false);
      redoInProgressRef.current = false;
    }
  }, [applyMessageHistoryPatch, roomUiStore, syncMessageAfterHistoryApply]);

  useEffect(() => {
    const handleGlobalUndoKeyDown = (event: KeyboardEvent) => {
      handleRoomMessageHistoryShortcutEvent(event, {
        onRedo: () => {
          void handleRedoLastMessageAction();
        },
        onUndo: () => {
          void handleUndoLastMessageAction();
        },
      });
    };

    window.addEventListener("keydown", handleGlobalUndoKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalUndoKeyDown, true);
    };
  }, [handleRedoLastMessageAction, handleUndoLastMessageAction]);

  const handleClearAndReloadAllMessages = useCallback(async () => {
    if (!chatHistory || isReloadingAllMessages) {
      return;
    }

    setIsReloadingAllMessages(true);
    const toastId = appToast.loading("正在清空本地消息并重新拉取...");
    try {
      await chatHistory.clearHistory();
      const response = await tuanchat.chatController.getHistoryMessages({
        roomId,
        syncId: 0,
      });
      const fullMessages = Array.isArray(response?.data)
        ? response.data as ChatMessageResponse[]
        : [];
      if (fullMessages.length > 0) {
        await chatHistory.addOrUpdateMessages(fullMessages);
      }
      roomUiStore.getState().clearMessageUndo();
      roomUiStore.getState().clearMessageRedo();
      const successText = fullMessages.length > 0
        ? `已重新拉取 ${fullMessages.length} 条消息`
        : "已完成重拉，当前房间暂无历史消息";
      appToast.success(successText, { id: toastId });
    }
    catch (error) {
      console.error("清空并重拉房间消息失败", error);
      appToast.error("清空并重拉失败，请稍后重试", { id: toastId });
    }
    finally {
      setIsReloadingAllMessages(false);
    }
  }, [chatHistory, isReloadingAllMessages, roomId, roomUiStore]);

  const handleExportPremiere = useCallback(async (selectedMessages: ChatMessageResponse[]) => {
    const exportMessages = [...selectedMessages].sort(compareChatMessageResponsesByOrder);
    if (exportMessages.length === 0) {
      appToast.error("请选择要生成 PR 文件的消息");
      return;
    }

    // Updated UI Flow: Defaults to ZIP Export
    // const exportModeZip = window.confirm("选择导出模式：\n\n[确定] = 导出 ZIP 整合包（推荐，含 XML + 图片素材 + 可选语音）。\n[取消] = 仅导出 XML 工程文件（需手动运行脚本下载素材）。");
    const exportModeZip = true;

    let ttsApiUrl: string | undefined;

    const useVoice = await confirm({ title: "生成 AI 语音", description: "是否生成 AI 语音？\n\n确认 = 生成语音（需配置 API）。\n取消 = 不生成语音（仅含图片和字幕）。", variant: "info" });
    if (useVoice) {
      // eslint-disable-next-line no-alert
      const key = window.prompt("请输入 TTS API 地址", "http://127.0.0.1:9000");
      if (key)
        ttsApiUrl = key;
    }

    const loadToastId = appToast.loading("正在处理导出...");

    try {
      const [{ PremiereExporter }, { strToU8, zip }] = await Promise.all([
        import("@/webGAL"),
        import("fflate"),
      ]);
      const exporter = new PremiereExporter({
        sequenceName: `Chat_${roomId}`,
        ttsApiUrl,
      });

      // 头像获取回调
      const avatarCache = new Map<number, any>();
      const fetchAvatar = async (avatarId: number) => {
        if (avatarCache.has(avatarId))
          return avatarCache.get(avatarId);

        // 1. 尝试从缓存获取
        const queryKey = ["getRoleAvatar", avatarId];
        const cached = queryClient.getQueryData<{ data: any }>(queryKey);
        if (cached?.data) {
          avatarCache.set(avatarId, cached.data);
          return cached.data;
        }

        try {
          const res = await fetchRoleAvatarWithCache(queryClient, avatarId);
          if (res.data) {
            avatarCache.set(avatarId, res.data);
            return res.data;
          }
        }
        catch (e) {
          console.warn(`Fetch avatar ${avatarId} failed`, e);
        }
        return null;
      };

      // 角色名获取回调
      const roleNameCache = new Map<number, string>();
      // 角色参考音频回调
      const roleVocalCache = new Map<number, File | undefined>();

      const fetchRoleName = async (roleId?: number) => {
        if (!roleId)
          return null;
        if (roleNameCache.has(roleId))
          return roleNameCache.get(roleId);

        // 尝试从缓存获取
        const queryKey = ["getRole", roleId];
        const cached = queryClient.getQueryData<{ data: any }>(queryKey);
        if (cached?.data?.roleName) {
          roleNameCache.set(roleId, cached.data.roleName);
          return cached.data.roleName;
        }

        try {
          const res = await fetchRoleWithCache(queryClient, roleId);
          if (res.data?.roleName) {
            roleNameCache.set(roleId, res.data.roleName);
            return res.data.roleName;
          }
        }
        catch (e) {
          console.warn(`Fetch role name ${roleId} failed`, e);
        }
        return null;
      };

      const fetchRoleRefVocal = async (roleId: number) => {
        if (roleVocalCache.has(roleId))
          return roleVocalCache.get(roleId);

        try {
          // Get Role Info first
          let roleData: any = null;
          const queryKey = ["getRole", roleId];
          const cached = queryClient.getQueryData<{ data: any }>(queryKey);

          if (cached?.data) {
            roleData = cached.data;
          }
          else {
            const res = await fetchRoleWithCache(queryClient, roleId);
            if (res.data) {
              roleData = res.data;
            }
          }

          const roleVoiceUrl = resolveRoleVoiceUrl(roleData);
          if (roleVoiceUrl) {
            // Fetch the file
            const fileRes = await fetch(roleVoiceUrl);
            const blob = await fileRes.blob();
            const file = new File([blob], "ref.wav", { type: blob.type });
            roleVocalCache.set(roleId, file);
            return file;
          }
        }
        catch (e) {
          console.warn(`Fetch role vocal ${roleId} failed`, e);
        }
        roleVocalCache.set(roleId, undefined);
        return undefined;
      };

      // 用户名获取回调 (Fallback)
      const userNameCache = new Map<number, string>();
      const fetchUserName = async (userId?: number) => {
        if (!userId)
          return null;
        if (userNameCache.has(userId))
          return userNameCache.get(userId);

        const queryKey = ["getUserInfo", userId];
        const cached = queryClient.getQueryData<{ data: any }>(queryKey);
        if (cached?.data?.username) { // UserInfoResponse usually has 'username' or 'name' or 'nickname'
          const name = cached.data.username;
          userNameCache.set(userId, name);
          return name;
        }

        try {
          const res = await fetchUserInfoWithCache(queryClient, tuanchat, userId);
          // Check return type UserInfoResponse
          if (res.data) {
            const name = res.data.username || "Unknown";
            userNameCache.set(userId, name);
            return name;
          }
        }
        catch (e) {
          console.warn(`Fetch user ${userId} failed`, e);
        }
        return null;
      };

      // 新增 Role Info Fetcher (for ID comparison)
      const fetchRole = async (roleId: number) => {
        const queryKey = ["getRole", roleId];
        const cached = queryClient.getQueryData<{ data: any }>(queryKey);
        if (cached?.data)
          return cached.data;
        try {
          // Reuse existing RoleController API
          const res = await fetchRoleWithCache(queryClient, roleId);
          if (res.data) {
            return res.data;
          }
        }
        catch {}
        return undefined;
      };

      await exporter.processMessages(
        exportMessages,
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
              const res = await fetch(r.url, { mode: "cors" });
              if (!res.ok)
                throw new Error(`Fetch ${r.url} failed: ${res.status}`);
              const blob = await res.blob();
              return { name: r.name, data: new Uint8Array(await blob.arrayBuffer()) };
            }
            catch (e) {
              console.error(e);
              return null;
            }
          }));

          for (const item of fetchResult) {
            if (item.status === "fulfilled" && item.value) {
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
            appToast.error("压缩失败");
            return;
          }
          const blob = new Blob([copyBytesToBlobPart(data)], { type: "application/zip" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `TuanChat_Export_${roomId}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          appToast.success("导出成功！", { id: loadToastId });
        });
      }
      else {
        // --- XML Only Mode ---
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

        appToast.success("导出成功！请查看下载的文件。", { id: loadToastId });
      }
    }
    catch (e) {
      console.error(e);
      appToast.error("导出失败，请检查控制台", { id: loadToastId });
    }
  }, [roomId, queryClient, backgroundUrl]);

  const roomName = room?.name;
  const spaceName = space?.name;

  const chatFrameProps = React.useMemo(() => ({
    virtuosoRef,
    onBackgroundUrlChange: setBackgroundUrl,
    onCombatVisualActiveChange: setCombatVisualActive,
    onEffectChange: setCurrentEffect,
    onExecuteCommandRequest: handleExecuteCommandRequest,
    isCommandRequestConsumed,
    spaceName,
    roomName,
    baseArchiveCommitId: baseArchiveCommitIdForMessageDiff,
    sendMessageWithInsert,
    onCopyMessageToClueFolder: copyMessageToClueFolder,
    onExportPremiere: handleExportPremiere,
    showFullMessageDiff: isFullMessageDiffOpen,
  }), [
    handleExecuteCommandRequest,
    handleExportPremiere,
    isFullMessageDiffOpen,
    isCommandRequestConsumed,
    setBackgroundUrl,
    setCombatVisualActive,
    setCurrentEffect,
    roomName,
    spaceName,
    baseArchiveCommitIdForMessageDiff,
    copyMessageToClueFolder,
    sendMessageWithInsert,
    virtuosoRef,
  ]);

  const composerPanelProps = {
    roomId,
    userId: Number(userId),
    webSocketUtils,
    handleSelectCommand,
    commandInlineCompletion,
    ruleId,
    handleMessageSubmit: requestMessageSubmit,
    currentChatStatus: myStatue as any,
    onChangeChatStatus: handleManualStatusChange,
    isSpectator,
    onToggleRealtimeRender: handleToggleRealtimeRender,
    onSendEffect: handleSendEffect,
    onClearBackground: handleClearBackground,
    onClearFigure: handleClearFigure,
    onOpenFullMessageDiff: () => setIsFullMessageDiffOpen(value => !value),
    isFullMessageDiffOpen,
    isKP: spaceContext.isSpaceOwner,
    isSpaceArchived,
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
        <RoomSideDrawerGuards />
        <StateRuntimeProvider
          messages={mainHistoryMessages}
          ruleId={space?.ruleId ?? -1}
          currentRoleId={curRoleId}
          visibleRoleIds={visibleRoleIdsForStateDrawer}
        >
          {shouldMountRealtimeRender && (
            <React.Suspense fallback={null}>
              <RealtimeRenderOrchestrator
                spaceId={spaceId}
                spaceName={spaceName}
                ruleId={space?.ruleId ?? -1}
                roomId={roomId}
                room={room}
                roles={roomAllRoles}
                historyMessages={mainHistoryMessages}
                chatHistoryLoading={!!chatHistory?.loading}
                onApiChange={handleRealtimeRenderApiChange}
              />
            </React.Suspense>
          )}
          <RoomDocRefDropLayer
            onSendClueCard={handleSendClueCard}
            onSendDocCard={handleSendDocCard}
            onSendMaterialItem={handleSendMaterialItem}
            onSendRoomJump={handleSendRoomJump}
          >
            <RoomWindowLayout
              spaceId={spaceId}
              roomId={roomId}
              roomName={roomName}
              room={room}
              contentMode={roomContentMode}
              onToggleContentMode={handleToggleRoomContentMode}
              canViewDocContent={canViewDocContent}
              chatHistory={chatHistory}
              initialDocMessages={initialDocMessages}
              onRequestDocImportTextPaste={handleRequestDocImportTextPaste}
              onRemoteDocMessagesSaved={handleRemoteDocMessagesSaved}
              toggleLeftDrawer={spaceContext.toggleLeftDrawer}
              onCloseSubWindow={onCloseSubWindow}
              backgroundUrl={backgroundUrl}
              combatVisualActive={combatVisualActive}
              displayedBgUrl={displayedBgUrl}
              currentEffect={currentEffect}
              chatFrameProps={chatFrameProps}
              composerPanelProps={composerPanelProps}
              hideComposer={viewMode}
              hideSecondaryPanels={hideSecondaryPanels}
              onClearAndReloadAllMessages={handleClearAndReloadAllMessages}
              isReloadingAllMessages={isReloadingAllMessages}
            />
          </RoomDocRefDropLayer>
          {!viewMode && (
            <RoomWindowOverlays
              isImportChatTextOpen={canImportChatText && isImportChatTextOpen}
              setIsImportChatTextOpen={handleSetImportChatTextOpen}
              availableRoles={roomAllRoles}
              importInitialRawText={importInitialRawText}
              loadRglImportSources={loadRglImportSources}
              onImportRglLocalAssets={handleImportRglLocalAssets}
              onImportRglMaterialAssets={handleImportRglMaterialAssets}
              onImportRglRoleAssets={handleImportRglRoleAssets}
              onImportChatText={handleImportChatItems}
              onOpenRoleAddWindow={openRoleAddWindow}
              onOpenNpcAddWindow={spaceContext.isSpaceOwner ? openNpcAddWindow : undefined}
              isRoleHandleOpen={isRoleHandleOpen}
              setIsRoleAddWindowOpen={setIsRoleAddWindowOpen}
              handleAddRole={handleAddRole}
              isNpcRoleHandleOpen={isNpcRoleHandleOpen}
              setIsNpcRoleAddWindowOpen={setIsNpcRoleAddWindowOpen}
              handleAddNpcRole={handleAddNpcRole}
            />
          )}
          <ConfirmDialog
            open={Boolean(pendingImportTextPaste)}
            onOpenChange={handleUseDocPasteAsPlainText}
            title="检测到可导入记录"
            description="这段文本看起来像聊天记录。要按导入记录处理，还是作为普通文本粘贴到文档里？"
            confirmLabel="按导入记录处理"
            cancelLabel="普通粘贴"
            variant="info"
            onConfirm={handleImportDocPasteText}
          />
          {isApplyingMessageHistory && (
            <div className="modal modal-open" role="dialog" aria-modal="true" aria-busy="true" aria-label="正在处理消息操作">
              <div className="modal-box max-w-sm text-center">
                <div className="flex items-center justify-center gap-3">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="font-medium" role="status" aria-live="polite">正在处理，请稍候…</span>
                </div>
              </div>
            </div>
          )}
        </StateRuntimeProvider>
      </RoomContext>
    </RoomUiStoreProvider>
  );
}

export default RoomWindow;
