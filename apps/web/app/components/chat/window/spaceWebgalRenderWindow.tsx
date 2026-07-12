import { useQueryClient } from "@tanstack/react-query";
import { fetchRoleAvatarListsBatchWithCache } from "@tuanchat/query/metadata";
import {
  useGetSpaceInfoQuery,
  useGetUserRoomsQuery,
} from "api/hooks/chatQueryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { WebgalPublishJobStatus } from "@/webGAL/publishClient";

import { buildWebGALEditorUrl } from "@/components/chat/shared/webgal/webgalPreviewUrls";
import {
  DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD,
  MAX_ROOM_CONTENT_ALERT_THRESHOLD,
  MIN_ROOM_CONTENT_ALERT_THRESHOLD,
  useRealtimeRenderStore,
} from "@/components/chat/stores/realtimeRenderStore";
import { appToast } from "@/components/common/appToast/appToast";
import { DEFAULT_VOICEBOX_API_URL } from "@/tts/engines/voicebox/api";
import launchWebGal, { appendWebgalLaunchHints } from "@/utils/launchWebGal";
import { UploadUtils } from "@/utils/media/UploadUtils";
import { pollPort } from "@/utils/pollPort";
import { getWebgalPublishJob, startWebgalPublish } from "@/webGAL/publishClient";
import { renderWebgalPublishPackage } from "@/webGAL/publishRenderer";
import { buildSpaceWebgalInputSnapshot } from "@/webGAL/spaceWebgalSnapshot";
import { getTerreBaseUrl, getTerreHealthcheckUrl } from "@/webGAL/terreConfig";
import useRealtimeRender from "@/webGAL/useRealtimeRender";

import type { ChatMessageResponse, RoleAvatar, UserRole } from "../../../../api";
import type { BatchProgress, CollapsibleSectionKey, RenderableRoom, RoomRenderState, SpaceWebgalSettingsTab } from "./spaceWebgalRenderWindowParts";

import { tuanchat } from "../../../../api/instance";
import { SpaceWebgalRenderWindowHeader } from "./spaceWebgalRenderWindowHeader";
import { SpaceWebgalBatchStatusPanel } from "./spaceWebgalRenderWindowPanels";
import {
  COLLAPSIBLE_SECTION_KEYS,
  DEFAULT_SECTION_EXPANDED,
  getErrorMessage,
  isRenderableRoom,
  sortMessagesForRender,
} from "./spaceWebgalRenderWindowParts";
import { SpaceWebgalRenderWindowSettings } from "./spaceWebgalRenderWindowSettings";

type SpaceWebgalRenderWindowProps = {
  spaceId: number;
}

const ROOM_BATCH_LIMIT = 100;

async function fetchRoomRoleGroupsBatch(roomIds: number[]) {
  const groups = {} as NonNullable<Awaited<ReturnType<typeof tuanchat.roomRoleController.roomAllRoleBatch>>["data"]>;
  for (let offset = 0; offset < roomIds.length; offset += ROOM_BATCH_LIMIT) {
    const response = await tuanchat.roomRoleController.roomAllRoleBatch({
      roomIds: roomIds.slice(offset, offset + ROOM_BATCH_LIMIT),
    });
    if (!response.success) {
      throw new Error(response.errMsg || "批量获取房间角色失败");
    }
    Object.assign(groups, response.data);
  }
  return groups;
}

async function fetchRoomHistoriesBatch(roomIds: number[]) {
  const histories = {} as NonNullable<Awaited<ReturnType<typeof tuanchat.chatController.getHistoryMessagesBatch>>["data"]>;
  for (let offset = 0; offset < roomIds.length; offset += ROOM_BATCH_LIMIT) {
    const response = await tuanchat.chatController.getHistoryMessagesBatch({
      roomIds: roomIds.slice(offset, offset + ROOM_BATCH_LIMIT),
      syncId: 0,
    });
    if (!response.success) {
      throw new Error(response.errMsg || "批量获取房间消息失败");
    }
    Object.assign(histories, response.data);
  }
  return histories;
}

export default function SpaceWebgalRenderWindow({ spaceId }: SpaceWebgalRenderWindowProps) {
  const spaceInfoQuery = useGetSpaceInfoQuery(spaceId);
  const roomsQuery = useGetUserRoomsQuery(spaceId);
  const queryClient = useQueryClient();
  const rooms = useMemo(() => {
    return roomsQuery.data?.data?.rooms ?? [];
  }, [roomsQuery.data?.data?.rooms]);
  const workflowRoomMap = useMemo(() => {
    return spaceInfoQuery.data?.data?.roomMap;
  }, [spaceInfoQuery.data?.data?.roomMap]);
  const renderableRooms = useMemo(() => rooms.filter(isRenderableRoom), [rooms]);
  const spaceName = spaceInfoQuery.data?.data?.name;
  const ruleId = spaceInfoQuery.data?.data?.ruleId ?? -1;

  const ensureHydrated = useRealtimeRenderStore(state => state.ensureHydrated);
  const setRealtimeRenderQueryClient = useRealtimeRenderStore(state => state.setQueryClient);
  const ttsEnabled = useRealtimeRenderStore(state => state.ttsEnabled);
  const setTtsEnabled = useRealtimeRenderStore(state => state.setTtsEnabled);
  const ttsApiUrl = useRealtimeRenderStore(state => state.ttsApiUrl);
  const setTtsApiUrl = useRealtimeRenderStore(state => state.setTtsApiUrl);
  const ttsVoiceId = useRealtimeRenderStore(state => state.ttsVoiceId);
  const setTtsVoiceId = useRealtimeRenderStore(state => state.setTtsVoiceId);
  const ttsInstruct = useRealtimeRenderStore(state => state.ttsInstruct);
  const setTtsInstruct = useRealtimeRenderStore(state => state.setTtsInstruct);
  const miniAvatarEnabled = useRealtimeRenderStore(state => state.miniAvatarEnabled);
  const setMiniAvatarEnabled = useRealtimeRenderStore(state => state.setMiniAvatarEnabled);
  const autoFigureEnabled = useRealtimeRenderStore(state => state.autoFigureEnabled);
  const setAutoFigureEnabled = useRealtimeRenderStore(state => state.setAutoFigureEnabled);
  const roomContentAlertThreshold = useRealtimeRenderStore(state => state.roomContentAlertThreshold);
  const setRoomContentAlertThreshold = useRealtimeRenderStore(state => state.setRoomContentAlertThreshold);
  const terrePortOverride = useRealtimeRenderStore(state => state.terrePortOverride);
  const setTerrePortOverride = useRealtimeRenderStore(state => state.setTerrePortOverride);
  const terrePort = useRealtimeRenderStore(state => state.terrePort);
  const gameConfig = useRealtimeRenderStore(state => state.gameConfig);
  const setGameConfig = useRealtimeRenderStore(state => state.setGameConfig);
  const setRealtimeRuntime = useRealtimeRenderStore(state => state.setRuntime);
  const resetRealtimeRuntime = useRealtimeRenderStore(state => state.resetRuntime);
  const uploadUtilsRef = useRef(new UploadUtils());
  const titleImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const startupLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const typingSoundSeFileInputRef = useRef<HTMLInputElement | null>(null);

  const [allRoomRoles, setAllRoomRoles] = useState<UserRole[]>([]);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [isTitleImageUploading, setIsTitleImageUploading] = useState(false);
  const [isStartupLogoUploading, setIsStartupLogoUploading] = useState(false);
  const [isTypingSoundSeUploading, setIsTypingSoundSeUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [roomRenderStateMap, setRoomRenderStateMap] = useState<Record<number, RoomRenderState>>({});
  const [ttsApiInput, setTtsApiInput] = useState("");
  const [ttsInstructInput, setTtsInstructInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [packageNameInput, setPackageNameInput] = useState("");
  const [figureDefaultEnterDurationInput, setFigureDefaultEnterDurationInput] = useState("");
  const [figureDefaultExitDurationInput, setFigureDefaultExitDurationInput] = useState("");
  const [typingSoundIntervalInput, setTypingSoundIntervalInput] = useState("");
  const [typingSoundPunctuationPauseInput, setTypingSoundPunctuationPauseInput] = useState("");
  const [typingSoundDetailExpanded, setTypingSoundDetailExpanded] = useState(false);
  const [terrePortInput, setTerrePortInput] = useState("");
  const [terrePortError, setTerrePortError] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<SpaceWebgalSettingsTab>("render");
  const [roomContentAlertThresholdInput, setRoomContentAlertThresholdInput] = useState("");
  const [renderPortExpanded, setRenderPortExpanded] = useState(false);
  const [sectionExpandedMap, setSectionExpandedMap] = useState<Record<CollapsibleSectionKey, boolean>>(DEFAULT_SECTION_EXPANDED);
  const [publishStatus, setPublishStatus] = useState<WebgalPublishJobStatus | null>(null);
  const publishPollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRealtimeRenderQueryClient(queryClient);
  }, [queryClient, setRealtimeRenderQueryClient]);

  useEffect(() => {
    void ensureHydrated(spaceId);
  }, [ensureHydrated, spaceId]);

  useEffect(() => {
    setTtsApiInput(ttsApiUrl);
  }, [ttsApiUrl]);

  useEffect(() => {
    setTtsInstructInput(ttsInstruct);
  }, [ttsInstruct]);

  useEffect(() => {
    setDescriptionInput(gameConfig.description);
  }, [gameConfig.description]);

  useEffect(() => {
    setPackageNameInput(gameConfig.packageName);
  }, [gameConfig.packageName]);

  useEffect(() => {
    setFigureDefaultEnterDurationInput(String(gameConfig.figureDefaultEnterDuration));
  }, [gameConfig.figureDefaultEnterDuration]);

  useEffect(() => {
    setFigureDefaultExitDurationInput(String(gameConfig.figureDefaultExitDuration));
  }, [gameConfig.figureDefaultExitDuration]);

  useEffect(() => {
    setTypingSoundIntervalInput(String(gameConfig.typingSoundInterval));
  }, [gameConfig.typingSoundInterval]);

  useEffect(() => {
    setTypingSoundPunctuationPauseInput(String(gameConfig.typingSoundPunctuationPause));
  }, [gameConfig.typingSoundPunctuationPause]);

  useEffect(() => {
    setTerrePortInput(terrePortOverride ? String(terrePortOverride) : "");
    setTerrePortError(null);
  }, [terrePortOverride]);

  useEffect(() => {
    setRoomContentAlertThresholdInput(String(roomContentAlertThreshold));
  }, [roomContentAlertThreshold]);

  useEffect(() => {
    setRoomRenderStateMap((prev) => {
      const next: Record<number, RoomRenderState> = {};
      for (const room of renderableRooms) {
        const previous = prev[room.roomId];
        next[room.roomId] = previous ?? {
          status: "idle",
          messageCount: 0,
        };
      }
      return next;
    });
  }, [renderableRooms]);

  const realtimeTTSConfig = useMemo(() => ({
    enabled: ttsEnabled,
    engine: "voicebox" as const,
    apiUrl: ttsApiUrl.trim() || DEFAULT_VOICEBOX_API_URL,
    voiceId: ttsVoiceId,
    language: "zh" as const,
    instruct: ttsInstruct.trim() || undefined,
    modelSize: "0.6B" as const,
  }), [ttsApiUrl, ttsEnabled, ttsInstruct, ttsVoiceId]);

  const realtimeRender = useRealtimeRender({
    spaceId,
    spaceName,
    ruleId,
    workflowRoomMap,
    roles: allRoomRoles,
    rooms: renderableRooms,
    ttsConfig: realtimeTTSConfig,
    miniAvatarEnabled,
    autoFigureEnabled,
    gameConfig,
  });
  const {
    status: realtimeStatus,
    initProgress: realtimeInitProgress,
    isActive: isRealtimeActive,
    previewUrl: realtimePreviewUrl,
    start: startRealtimeRender,
    stop: stopRealtimeRender,
    renderHistory: renderHistoryToRoom,
    resetScene: resetRoomScene,
    switchRoom,
    updateRoleCache: updateRealtimeRoleCache,
    updateRooms: updateRealtimeRooms,
  } = realtimeRender;

  useEffect(() => {
    setRealtimeRuntime({
      status: realtimeStatus,
      initProgress: realtimeInitProgress,
      isActive: isRealtimeActive,
      previewUrl: realtimePreviewUrl,
    });
  }, [
    isRealtimeActive,
    realtimeInitProgress,
    realtimePreviewUrl,
    realtimeStatus,
    setRealtimeRuntime,
  ]);

  useEffect(() => {
    return () => {
      stopRealtimeRender();
      resetRealtimeRuntime();
      if (publishPollingTimeoutRef.current) {
        clearTimeout(publishPollingTimeoutRef.current);
      }
    };
  }, [resetRealtimeRuntime, stopRealtimeRender]);

  const pollPublishJob = useCallback((jobId: string) => {
    if (publishPollingTimeoutRef.current) {
      clearTimeout(publishPollingTimeoutRef.current);
    }
    publishPollingTimeoutRef.current = setTimeout(async () => {
      try {
        const nextStatus = await getWebgalPublishJob(jobId);
        setPublishStatus(nextStatus);
        if (nextStatus.status === "success") {
          appToast.success("WebGAL 已发布到 Cloudflare Pages", { id: "space-webgal-publish" });
          return;
        }
        if (nextStatus.status === "failed") {
          appToast.error(`发布失败：${nextStatus.errorMessage || "请稍后重试"}`, { id: "space-webgal-publish" });
          return;
        }
        pollPublishJob(jobId);
      }
      catch (error) {
        appToast.error(`查询发布状态失败：${getErrorMessage(error)}`, { id: "space-webgal-publish" });
      }
    }, 2000);
  }, []);

  const loadAllRoomRoles = useCallback(async (targetRooms: RenderableRoom[]): Promise<UserRole[]> => {
    const roleMap = new Map<number, UserRole>();
    const groups = await fetchRoomRoleGroupsBatch(targetRooms.map(room => room.roomId));
    Object.entries(groups).forEach(([roomIdKey, group]) => {
      const roomId = Number(roomIdKey);
      queryClient.setQueryData(["roomRoles", roomId], { success: true, data: group });
      queryClient.setQueryData(["roomRole", roomId], { success: true, data: group.baseRoles ?? [] });
      queryClient.setQueryData(["roomNpcRole", roomId], { success: true, data: group.npcRoles ?? [] });
      (group.allRoles ?? []).forEach((role) => {
        if (role.roleId && role.roleId > 0) {
          roleMap.set(role.roleId, role);
        }
      });
    });
    return Array.from(roleMap.values());
  }, [queryClient]);

  const handlePublish = useCallback(async () => {
    if (publishStatus?.status === "pending" || publishStatus?.status === "running") {
      return;
    }
    if (renderableRooms.length === 0) {
      appToast.info("当前空间没有可发布的房间");
      return;
    }

    appToast.loading("正在整理 WebGAL 发布包...", { id: "space-webgal-publish" });
    try {
      await ensureHydrated(spaceId);

      const mergedRoles = await loadAllRoomRoles(renderableRooms);
      const roleAvatarMap = new Map<number, RoleAvatar>();
      const roleIds = mergedRoles.map(role => role.roleId).filter((roleId): roleId is number => Boolean(roleId && roleId > 0));
      const avatarsByRoleId = await fetchRoleAvatarListsBatchWithCache(queryClient, tuanchat, roleIds);
      Object.values(avatarsByRoleId).forEach((avatars) => {
        avatars.forEach((avatar) => {
          const avatarId = Number(avatar.avatarId ?? 0);
          if (Number.isFinite(avatarId) && avatarId > 0) {
            roleAvatarMap.set(avatarId, avatar);
          }
        });
      });

      const messagesByRoomId: Record<number, ChatMessageResponse[]> = {};
      const histories = await fetchRoomHistoriesBatch(renderableRooms.map(room => room.roomId));
      renderableRooms.forEach((room) => {
        messagesByRoomId[room.roomId] = sortMessagesForRender(
          histories[String(room.roomId)] ?? [],
        ).filter(message => message.message.status !== 1);
      });

      const primaryCoverAvatarFileId = Number(
        spaceInfoQuery.data?.data?.avatarFileId
        ?? renderableRooms[0]?.avatarFileId
        ?? 0,
      ) || undefined;
      const publishSnapshot = buildSpaceWebgalInputSnapshot({
        spaceId,
        spaceName,
        workflowRoomMap,
        rooms: renderableRooms,
        messagesByRoomId,
        roles: mergedRoles,
        avatars: Array.from(roleAvatarMap.values()),
        gameConfig,
        coverAvatarFileId: primaryCoverAvatarFileId,
      });
      const publishPackage = await renderWebgalPublishPackage(publishSnapshot);

      appToast.loading("正在上传到 Cloudflare Pages...", { id: "space-webgal-publish" });
      const status = await startWebgalPublish({
        spaceId,
        packageData: {
          entrypoint: publishPackage.entrypoint,
          files: publishPackage.files.map(file => ({
            path: file.path,
            content: file.content,
            contentType: file.contentType,
            contentEncoding: file.contentEncoding,
          })),
        },
      });
      setPublishStatus(status);
      if (status.status === "success") {
        appToast.success("WebGAL 已发布到 Cloudflare Pages", { id: "space-webgal-publish" });
        return;
      }
      if (status.status === "failed") {
        appToast.error(`发布失败：${status.errorMessage || "请稍后重试"}`, { id: "space-webgal-publish" });
        return;
      }
      pollPublishJob(status.jobId);
    }
    catch (error) {
      appToast.error(`发布失败：${getErrorMessage(error)}`, { id: "space-webgal-publish" });
    }
  }, [
    ensureHydrated,
    gameConfig,
    loadAllRoomRoles,
    pollPublishJob,
    publishStatus?.status,
    queryClient,
    renderableRooms,
    spaceId,
    spaceInfoQuery.data?.data?.avatarFileId,
    spaceName,
    workflowRoomMap,
  ]);

  const handleStartRealtimeRender = useCallback(async (): Promise<boolean> => {
    if (realtimeStatus === "initializing") {
      return false;
    }
    if (isRealtimeActive) {
      return true;
    }

    await ensureHydrated(spaceId);
    const launchResult = await launchWebGal({
      gameDir: `realtime_${spaceId}`,
    });
    const electronEnv = launchResult.runtime === "electron";
    if (electronEnv && !launchResult.ok) {
      appToast.error(appendWebgalLaunchHints(launchResult.error || "WebGAL 启动失败"), { id: "space-webgal-init" });
      return false;
    }
    if (electronEnv && typeof launchResult.port === "number" && Number.isFinite(launchResult.port)) {
      // Electron 启动成功后，强制对齐到主进程实际监听端口，避免连接到历史端口。
      setTerrePortOverride(launchResult.port);
    }

    appToast.loading("正在启动 WebGAL...", { id: "space-webgal-init" });
    try {
      if (!electronEnv) {
        await pollPort(
          getTerreHealthcheckUrl(),
          20_000,
          200,
        );
      }

      appToast.loading("正在初始化空间渲染器...", { id: "space-webgal-init" });
      const success = await startRealtimeRender();
      if (!success) {
        appToast.error(appendWebgalLaunchHints("WebGAL 渲染器启动失败"), { id: "space-webgal-init" });
        return false;
      }
      appToast.success("WebGAL 渲染器已启动", { id: "space-webgal-init" });
      return true;
    }
    catch (error) {
      const message = appendWebgalLaunchHints(
        error instanceof Error && error.message
          ? `WebGAL 启动失败：${error.message}`
          : "WebGAL 启动超时",
      );
      appToast.error(message, { id: "space-webgal-init" });
      return false;
    }
  }, [ensureHydrated, isRealtimeActive, realtimeStatus, setTerrePortOverride, spaceId, startRealtimeRender]);

  const handleStopRealtimeRender = useCallback(() => {
    stopRealtimeRender();
    resetRealtimeRuntime();
    appToast.success("已停止空间 WebGAL 渲染");
  }, [resetRealtimeRuntime, stopRealtimeRender]);

  const handleRenderAllRooms = useCallback(async () => {
    if (isBatchRendering) {
      return;
    }
    if (renderableRooms.length === 0) {
      appToast.info("当前空间没有可渲染的房间");
      return;
    }

    setIsBatchRendering(true);
    setBatchProgress({
      current: 0,
      total: renderableRooms.length,
    });

    let successCount = 0;
    try {
      const started = await handleStartRealtimeRender();
      if (!started) {
        return;
      }

      const mergedRoles = await loadAllRoomRoles(renderableRooms);
      setAllRoomRoles(mergedRoles);
      if (mergedRoles.length > 0) {
        updateRealtimeRoleCache(mergedRoles);
      }
      updateRealtimeRooms(renderableRooms);
      const histories = await fetchRoomHistoriesBatch(renderableRooms.map(room => room.roomId));

      for (let index = 0; index < renderableRooms.length; index += 1) {
        const room = renderableRooms[index];
        const roomId = room.roomId;
        const roomName = room.name?.trim() || `房间#${roomId}`;
        setBatchProgress({
          current: index + 1,
          total: renderableRooms.length,
          roomName,
        });
        setRoomRenderStateMap(prev => ({
          ...prev,
          [roomId]: {
            status: "rendering",
            messageCount: prev[roomId]?.messageCount ?? 0,
          },
        }));

        try {
          const messages = sortMessagesForRender(
            histories[String(roomId)] ?? [],
          ).filter(message => message.message.status !== 1);

          await resetRoomScene(roomId);
          await renderHistoryToRoom(messages, roomId);

          setRoomRenderStateMap(prev => ({
            ...prev,
            [roomId]: {
              status: "success",
              messageCount: messages.length,
            },
          }));
          successCount += 1;
        }
        catch (error) {
          setRoomRenderStateMap(prev => ({
            ...prev,
            [roomId]: {
              status: "error",
              messageCount: prev[roomId]?.messageCount ?? 0,
              errorMessage: getErrorMessage(error),
            },
          }));
        }
      }

      if (renderableRooms[0]) {
        await switchRoom(renderableRooms[0].roomId);
      }
      appToast.success(`空间渲染完成：${successCount}/${renderableRooms.length} 个房间`);
    }
    finally {
      setIsBatchRendering(false);
      setBatchProgress(null);
    }
  }, [handleStartRealtimeRender, isBatchRendering, loadAllRoomRoles, renderHistoryToRoom, renderableRooms, resetRoomScene, switchRoom, updateRealtimeRoleCache, updateRealtimeRooms]);

  const handleToggleRealtimeRender = useCallback(() => {
    if (isRealtimeActive) {
      handleStopRealtimeRender();
      return;
    }
    void handleRenderAllRooms();
  }, [handleRenderAllRooms, handleStopRealtimeRender, isRealtimeActive]);

  const handleSaveTtsApi = useCallback(() => {
    setTtsApiUrl(ttsApiInput.trim());
    setTtsInstruct(ttsInstructInput.trim());
    appToast.success("VoiceBox 配音设置已保存");
  }, [setTtsApiUrl, setTtsInstruct, ttsApiInput, ttsInstructInput]);

  const handleSaveDescription = useCallback(() => {
    setGameConfig({ description: descriptionInput.trim() });
    appToast.success("游戏简介已保存");
  }, [descriptionInput, setGameConfig]);

  const handleSavePackageName = useCallback(() => {
    setGameConfig({ packageName: packageNameInput.trim() });
    appToast.success("游戏包名已保存");
  }, [packageNameInput, setGameConfig]);

  const handleSaveFigureDefaultEnterDuration = useCallback(() => {
    const parsed = Number(figureDefaultEnterDurationInput.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      appToast.error("请输入大于等于 0 的毫秒数");
      return;
    }
    const normalized = Math.max(0, Math.min(5000, Math.floor(parsed)));
    setGameConfig({ figureDefaultEnterDuration: normalized });
    setFigureDefaultEnterDurationInput(String(normalized));
    appToast.success("立绘默认入场时长已保存");
  }, [figureDefaultEnterDurationInput, setGameConfig]);

  const handleSaveFigureDefaultExitDuration = useCallback(() => {
    const parsed = Number(figureDefaultExitDurationInput.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      appToast.error("请输入大于等于 0 的毫秒数");
      return;
    }
    const normalized = Math.max(0, Math.min(5000, Math.floor(parsed)));
    setGameConfig({ figureDefaultExitDuration: normalized });
    setFigureDefaultExitDurationInput(String(normalized));
    appToast.success("立绘默认出场时长已保存");
  }, [figureDefaultExitDurationInput, setGameConfig]);

  const handleSaveTypingSoundInterval = useCallback(() => {
    const parsed = Number(typingSoundIntervalInput.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      appToast.error("请输入大于 0 的数字");
      return;
    }
    const normalized = Math.max(0.1, Math.min(20, Number(parsed.toFixed(2))));
    setGameConfig({ typingSoundInterval: normalized });
    setTypingSoundIntervalInput(String(normalized));
    appToast.success("打字音频率已保存");
  }, [setGameConfig, typingSoundIntervalInput]);

  const handleSaveTypingSoundPunctuationPause = useCallback(() => {
    const parsed = Number(typingSoundPunctuationPauseInput.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      appToast.error("请输入大于等于 0 的毫秒数");
      return;
    }
    const normalized = Math.max(0, Math.min(5000, Math.floor(parsed)));
    setGameConfig({ typingSoundPunctuationPause: normalized });
    setTypingSoundPunctuationPauseInput(String(normalized));
    appToast.success("标点停顿已保存");
  }, [setGameConfig, typingSoundPunctuationPauseInput]);

  const handlePickTypingSoundSe = useCallback(() => {
    if (isTypingSoundSeUploading) {
      return;
    }
    typingSoundSeFileInputRef.current?.click();
  }, [isTypingSoundSeUploading]);

  const handleTypingSoundSeFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("audio/")) {
      appToast.error("请上传音频文件");
      return;
    }

    setIsTypingSoundSeUploading(true);
    appToast.loading("正在上传打字音效...", { id: "space-webgal-typing-se-upload" });
    try {
      const uploadedAudio = await uploadUtilsRef.current.uploadAudioOriginalAsset(file, 1);
      setGameConfig({
        typingSoundSeUrl: "",
        typingSoundSeFileId: uploadedAudio.fileId,
        typingSoundSeMediaType: uploadedAudio.mediaType,
      });
      appToast.success("打字音效上传成功", { id: "space-webgal-typing-se-upload" });
    }
    catch (error) {
      appToast.error(`打字音效上传失败：${getErrorMessage(error)}`, { id: "space-webgal-typing-se-upload" });
    }
    finally {
      setIsTypingSoundSeUploading(false);
    }
  }, [setGameConfig]);

  const handleClearTypingSoundSe = useCallback(() => {
    setGameConfig({ typingSoundSeUrl: "", typingSoundSeFileId: undefined, typingSoundSeMediaType: undefined });
    if (typingSoundSeFileInputRef.current) {
      typingSoundSeFileInputRef.current.value = "";
    }
    appToast.success("打字音效已恢复默认");
  }, [setGameConfig]);

  const handlePickTitleImage = useCallback(() => {
    if (isTitleImageUploading) {
      return;
    }
    titleImageFileInputRef.current?.click();
  }, [isTitleImageUploading]);

  const handleTitleImageFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      appToast.error("请上传图片文件");
      return;
    }

    setIsTitleImageUploading(true);
    appToast.loading("正在上传标题背景图...", { id: "space-webgal-title-image-upload" });
    try {
      const uploadedImage = await uploadUtilsRef.current.uploadDualImage(file, 1);
      setGameConfig({
        titleImageUrl: "",
        titleImageFileId: uploadedImage.fileId,
        originalTitleImageUrl: "",
        originalTitleImageFileId: uploadedImage.fileId,
      });
      appToast.success("标题背景图上传成功", { id: "space-webgal-title-image-upload" });
    }
    catch (error) {
      appToast.error(`标题背景图上传失败：${getErrorMessage(error)}`, { id: "space-webgal-title-image-upload" });
    }
    finally {
      setIsTitleImageUploading(false);
    }
  }, [setGameConfig]);

  const handleClearTitleImage = useCallback(() => {
    setGameConfig({
      titleImageUrl: "",
      titleImageFileId: undefined,
      originalTitleImageUrl: "",
      originalTitleImageFileId: undefined,
    });
    if (titleImageFileInputRef.current) {
      titleImageFileInputRef.current.value = "";
    }
    appToast.success("标题背景图已清空");
  }, [setGameConfig]);

  const handlePickStartupLogo = useCallback(() => {
    if (isStartupLogoUploading) {
      return;
    }
    startupLogoFileInputRef.current?.click();
  }, [isStartupLogoUploading]);

  const handleStartupLogoFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      appToast.error("请上传图片文件");
      return;
    }

    setIsStartupLogoUploading(true);
    appToast.loading("正在上传启动图...", { id: "space-webgal-startup-logo-upload" });
    try {
      const uploadedImage = await uploadUtilsRef.current.uploadDualImage(file, 1);
      setGameConfig({
        startupLogoUrl: "",
        startupLogoFileId: uploadedImage.fileId,
        originalStartupLogoUrl: "",
        originalStartupLogoFileId: uploadedImage.fileId,
      });
      appToast.success("启动图上传成功", { id: "space-webgal-startup-logo-upload" });
    }
    catch (error) {
      appToast.error(`启动图上传失败：${getErrorMessage(error)}`, { id: "space-webgal-startup-logo-upload" });
    }
    finally {
      setIsStartupLogoUploading(false);
    }
  }, [setGameConfig]);

  const handleClearStartupLogo = useCallback(() => {
    setGameConfig({
      startupLogoUrl: "",
      startupLogoFileId: undefined,
      originalStartupLogoUrl: "",
      originalStartupLogoFileId: undefined,
    });
    if (startupLogoFileInputRef.current) {
      startupLogoFileInputRef.current.value = "";
    }
    appToast.success("启动图已清空");
  }, [setGameConfig]);

  const handleSaveTerrePort = useCallback(() => {
    const trimmedPort = terrePortInput.trim();
    if (!trimmedPort) {
      setTerrePortOverride(null);
      setTerrePortError(null);
      appToast.success("已改为默认 Terre 端口");
      return;
    }

    const parsed = Number(trimmedPort);
    const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : Number.NaN;
    if (!Number.isFinite(normalized) || normalized < 1 || normalized > 65535) {
      setTerrePortError("端口必须是 1-65535 的整数");
      return;
    }
    setTerrePortError(null);
    setTerrePortOverride(normalized);
    appToast.success("Terre 端口已保存");
  }, [setTerrePortOverride, terrePortInput]);

  const handleTerrePortInputChange = useCallback((value: string) => {
    setTerrePortInput(value);
    setTerrePortError(null);
  }, []);

  const handleSaveRoomContentAlertThreshold = useCallback(() => {
    const trimmedValue = roomContentAlertThresholdInput.trim();
    if (!trimmedValue) {
      setRoomContentAlertThreshold(DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD);
      setRoomContentAlertThresholdInput(String(DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD));
      appToast.success("房间内容阈值已恢复推荐值");
      return;
    }

    const parsed = Number(trimmedValue);
    const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : Number.NaN;
    if (!Number.isFinite(normalized) || normalized < MIN_ROOM_CONTENT_ALERT_THRESHOLD || normalized > MAX_ROOM_CONTENT_ALERT_THRESHOLD) {
      appToast.error(`请输入 ${MIN_ROOM_CONTENT_ALERT_THRESHOLD}-${MAX_ROOM_CONTENT_ALERT_THRESHOLD} 的整数`);
      return;
    }

    setRoomContentAlertThreshold(normalized);
    setRoomContentAlertThresholdInput(String(normalized));
    appToast.success("房间内容阈值已保存");
  }, [roomContentAlertThresholdInput, setRoomContentAlertThreshold]);

  const toggleSection = useCallback((key: CollapsibleSectionKey) => {
    setSectionExpandedMap((prev) => {
      return {
        ...prev,
        [key]: !prev[key],
      };
    });
  }, []);

  const handleExpandAllSections = useCallback(() => {
    setSectionExpandedMap({
      renderLayer: true,
      ttsLayer: true,
      gameLayer: true,
      workflowLayer: true,
    });
  }, []);

  const handleCollapseAllSections = useCallback(() => {
    setSectionExpandedMap({
      renderLayer: false,
      ttsLayer: false,
      gameLayer: false,
      workflowLayer: false,
    });
  }, []);

  const isAllSectionsExpanded = COLLAPSIBLE_SECTION_KEYS.every(key => sectionExpandedMap[key]);
  const isAllSectionsCollapsed = COLLAPSIBLE_SECTION_KEYS.every(key => !sectionExpandedMap[key]);
  const isPublishing = publishStatus?.status === "pending" || publishStatus?.status === "running";

  const isTtsConfigVisible = sectionExpandedMap.ttsLayer;
  const handleToggleRenderPortExpanded = useCallback(() => {
    setRenderPortExpanded(prev => !prev);
  }, []);
  const webgalEditorUrl = useMemo(() => {
    return buildWebGALEditorUrl({
      previewUrl: realtimePreviewUrl,
      fallbackGameName: `realtime_${spaceId}`,
      terreBaseUrl: getTerreBaseUrl(),
    }) ?? `${getTerreBaseUrl()}/#/game/realtime_${spaceId}`;
  }, [realtimePreviewUrl, spaceId, terrePort]);

  return (
    <div className="size-full overflow-y-auto">
      <div className="w-full min-w-0 p-4 space-y-4">
        <SpaceWebgalRenderWindowHeader
          realtimeStatus={realtimeStatus}
          realtimeInitProgress={realtimeInitProgress}
          isRealtimeActive={isRealtimeActive}
          isBatchRendering={isBatchRendering}
          renderPortExpanded={renderPortExpanded}
          terrePort={terrePort}
          terrePortInput={terrePortInput}
          terrePortError={terrePortError}
          webgalEditorUrl={webgalEditorUrl}
          publishStatus={publishStatus}
          isPublishing={isPublishing}
          batchProgress={batchProgress}
          onToggleRealtimeRender={handleToggleRealtimeRender}
          onPublish={handlePublish}
          onToggleRenderPortExpanded={handleToggleRenderPortExpanded}
          onTerrePortInputChange={handleTerrePortInputChange}
          onSaveTerrePort={handleSaveTerrePort}
        />

        <SpaceWebgalRenderWindowSettings
          settingsTab={settingsTab}
          sectionExpandedMap={sectionExpandedMap}
          isAllSectionsExpanded={isAllSectionsExpanded}
          isAllSectionsCollapsed={isAllSectionsCollapsed}
          isTtsConfigVisible={isTtsConfigVisible}
          autoFigureEnabled={autoFigureEnabled}
          miniAvatarEnabled={miniAvatarEnabled}
          ttsEnabled={ttsEnabled}
          ttsApiInput={ttsApiInput}
          ttsVoiceId={ttsVoiceId}
          ttsInstructInput={ttsInstructInput}
          gameConfig={gameConfig}
          descriptionInput={descriptionInput}
          packageNameInput={packageNameInput}
          figureDefaultEnterDurationInput={figureDefaultEnterDurationInput}
          figureDefaultExitDurationInput={figureDefaultExitDurationInput}
          typingSoundIntervalInput={typingSoundIntervalInput}
          typingSoundPunctuationPauseInput={typingSoundPunctuationPauseInput}
          typingSoundDetailExpanded={typingSoundDetailExpanded}
          isTitleImageUploading={isTitleImageUploading}
          isStartupLogoUploading={isStartupLogoUploading}
          isTypingSoundSeUploading={isTypingSoundSeUploading}
          roomContentAlertThreshold={roomContentAlertThreshold}
          roomContentAlertThresholdInput={roomContentAlertThresholdInput}
          titleImageFileInputRef={titleImageFileInputRef}
          startupLogoFileInputRef={startupLogoFileInputRef}
          typingSoundSeFileInputRef={typingSoundSeFileInputRef}
          onSettingsTabChange={setSettingsTab}
          onExpandAllSections={handleExpandAllSections}
          onCollapseAllSections={handleCollapseAllSections}
          onToggleSection={toggleSection}
          setAutoFigureEnabled={setAutoFigureEnabled}
          setMiniAvatarEnabled={setMiniAvatarEnabled}
          setTtsEnabled={setTtsEnabled}
          setTtsApiInput={setTtsApiInput}
          setTtsVoiceId={setTtsVoiceId}
          setTtsInstructInput={setTtsInstructInput}
          setGameConfig={setGameConfig}
          setDescriptionInput={setDescriptionInput}
          setPackageNameInput={setPackageNameInput}
          setFigureDefaultEnterDurationInput={setFigureDefaultEnterDurationInput}
          setFigureDefaultExitDurationInput={setFigureDefaultExitDurationInput}
          setTypingSoundIntervalInput={setTypingSoundIntervalInput}
          setTypingSoundPunctuationPauseInput={setTypingSoundPunctuationPauseInput}
          setTypingSoundDetailExpanded={setTypingSoundDetailExpanded}
          setRoomContentAlertThreshold={setRoomContentAlertThreshold}
          setRoomContentAlertThresholdInput={setRoomContentAlertThresholdInput}
          handleSaveTtsApi={handleSaveTtsApi}
          handleSaveDescription={handleSaveDescription}
          handleSavePackageName={handleSavePackageName}
          handleSaveFigureDefaultEnterDuration={handleSaveFigureDefaultEnterDuration}
          handleSaveFigureDefaultExitDuration={handleSaveFigureDefaultExitDuration}
          handleSaveTypingSoundInterval={handleSaveTypingSoundInterval}
          handleSaveTypingSoundPunctuationPause={handleSaveTypingSoundPunctuationPause}
          handlePickTypingSoundSe={handlePickTypingSoundSe}
          handleTypingSoundSeFileChange={handleTypingSoundSeFileChange}
          handleClearTypingSoundSe={handleClearTypingSoundSe}
          handlePickTitleImage={handlePickTitleImage}
          handleTitleImageFileChange={handleTitleImageFileChange}
          handleClearTitleImage={handleClearTitleImage}
          handlePickStartupLogo={handlePickStartupLogo}
          handleStartupLogoFileChange={handleStartupLogoFileChange}
          handleClearStartupLogo={handleClearStartupLogo}
          handleSaveRoomContentAlertThreshold={handleSaveRoomContentAlertThreshold}
        />

      </div>
      {isBatchRendering && (
        <SpaceWebgalBatchStatusPanel
          spaceId={spaceId}
          spaceName={spaceName}
          renderableRooms={renderableRooms}
          roomRenderStateMap={roomRenderStateMap}
          batchProgress={batchProgress}
        />
      )}
    </div>
  );
}
