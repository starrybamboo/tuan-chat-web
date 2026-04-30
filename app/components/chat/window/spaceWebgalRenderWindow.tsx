import type { ChatMessageResponse, UserRole } from "../../../../api";

import type { BatchProgress, CollapsibleSectionKey, RenderableRoom, RoomRenderState, SpaceWebgalSettingsTab } from "./spaceWebgalRenderWindowParts";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchRoomNpcRoleWithCache,
  fetchRoomRoleWithCache,
  useGetSpaceInfoQuery,
  useGetUserRoomsQuery,
} from "api/hooks/chatQueryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD,
  MAX_ROOM_CONTENT_ALERT_THRESHOLD,
  MIN_ROOM_CONTENT_ALERT_THRESHOLD,
  useRealtimeRenderStore,
} from "@/components/chat/stores/realtimeRenderStore";
import launchWebGal, { appendWebgalLaunchHints } from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { UploadUtils } from "@/utils/UploadUtils";
import { getTerreBaseUrl, getTerreHealthcheckUrl } from "@/webGAL/terreConfig";
import useRealtimeRender from "@/webGAL/useRealtimeRender";
import { tuanchat } from "../../../../api/instance";
import { SpaceWebgalRenderWindowHeader } from "./spaceWebgalRenderWindowHeader";
import { SpaceWebgalBatchStatusPanel } from "./spaceWebgalRenderWindowPanels";
import {
  COLLAPSIBLE_SECTION_KEYS,
  DEFAULT_SECTION_EXPANDED,
  extractArrayPayload,
  getErrorMessage,
  isRenderableRoom,
  sortMessagesForRender,
} from "./spaceWebgalRenderWindowParts";
import { SpaceWebgalRenderWindowSettings } from "./spaceWebgalRenderWindowSettings";

interface SpaceWebgalRenderWindowProps {
  spaceId: number;
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

  const ensureHydrated = useRealtimeRenderStore(state => state.ensureHydrated);
  const setRealtimeRenderQueryClient = useRealtimeRenderStore(state => state.setQueryClient);
  const ttsEnabled = useRealtimeRenderStore(state => state.ttsEnabled);
  const setTtsEnabled = useRealtimeRenderStore(state => state.setTtsEnabled);
  const ttsApiUrl = useRealtimeRenderStore(state => state.ttsApiUrl);
  const setTtsApiUrl = useRealtimeRenderStore(state => state.setTtsApiUrl);
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
  const [descriptionInput, setDescriptionInput] = useState("");
  const [packageNameInput, setPackageNameInput] = useState("");
  const [typingSoundIntervalInput, setTypingSoundIntervalInput] = useState("");
  const [typingSoundPunctuationPauseInput, setTypingSoundPunctuationPauseInput] = useState("");
  const [typingSoundDetailExpanded, setTypingSoundDetailExpanded] = useState(false);
  const [terrePortInput, setTerrePortInput] = useState("");
  const [terrePortError, setTerrePortError] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<SpaceWebgalSettingsTab>("render");
  const [roomContentAlertThresholdInput, setRoomContentAlertThresholdInput] = useState("");
  const [renderPortExpanded, setRenderPortExpanded] = useState(false);
  const [sectionExpandedMap, setSectionExpandedMap] = useState<Record<CollapsibleSectionKey, boolean>>(DEFAULT_SECTION_EXPANDED);

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
    setDescriptionInput(gameConfig.description);
  }, [gameConfig.description]);

  useEffect(() => {
    setPackageNameInput(gameConfig.packageName);
  }, [gameConfig.packageName]);

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
    engine: "index" as const,
    apiUrl: ttsApiUrl.trim() || undefined,
    emotionMode: 2,
    emotionWeight: 0.8,
    temperature: 0.8,
    topP: 0.8,
    maxTokensPerSegment: 120,
  }), [ttsApiUrl, ttsEnabled]);

  const realtimeRender = useRealtimeRender({
    spaceId,
    spaceName,
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
    };
  }, [resetRealtimeRuntime, stopRealtimeRender]);

  const loadAllRoomRoles = useCallback(async (targetRooms: RenderableRoom[]): Promise<UserRole[]> => {
    const roleMap = new Map<number, UserRole>();
    for (const room of targetRooms) {
      const roomId = room.roomId;
      const [playerRolesResult, npcRolesResult] = await Promise.allSettled([
        fetchRoomRoleWithCache(queryClient, roomId),
        fetchRoomNpcRoleWithCache(queryClient, roomId),
      ]);

      if (playerRolesResult.status === "fulfilled") {
        const roles = extractArrayPayload<UserRole>(playerRolesResult.value);
        roles.forEach((role) => {
          if (typeof role.roleId === "number" && Number.isFinite(role.roleId) && role.roleId > 0) {
            roleMap.set(role.roleId, role);
          }
        });
      }
      if (npcRolesResult.status === "fulfilled") {
        const roles = extractArrayPayload<UserRole>(npcRolesResult.value);
        roles.forEach((role) => {
          if (typeof role.roleId === "number" && Number.isFinite(role.roleId) && role.roleId > 0) {
            roleMap.set(role.roleId, role);
          }
        });
      }
    }
    return Array.from(roleMap.values());
  }, [queryClient]);

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
      toast.error(appendWebgalLaunchHints(launchResult.error || "WebGAL 启动失败"), { id: "space-webgal-init" });
      return false;
    }
    if (electronEnv && typeof launchResult.port === "number" && Number.isFinite(launchResult.port)) {
      // Electron 启动成功后，强制对齐到主进程实际监听端口，避免连接到历史端口。
      setTerrePortOverride(launchResult.port);
    }

    toast.loading("正在启动 WebGAL...", { id: "space-webgal-init" });
    try {
      if (!electronEnv) {
        await pollPort(
          getTerreHealthcheckUrl(),
          20_000,
          200,
        );
      }

      toast.loading("正在初始化空间渲染器...", { id: "space-webgal-init" });
      const success = await startRealtimeRender();
      if (!success) {
        toast.error(appendWebgalLaunchHints("WebGAL 渲染器启动失败"), { id: "space-webgal-init" });
        return false;
      }
      toast.success("WebGAL 渲染器已启动", { id: "space-webgal-init" });
      return true;
    }
    catch (error) {
      const message = appendWebgalLaunchHints(
        error instanceof Error && error.message
          ? `WebGAL 启动失败：${error.message}`
          : "WebGAL 启动超时",
      );
      toast.error(message, { id: "space-webgal-init" });
      return false;
    }
  }, [ensureHydrated, isRealtimeActive, realtimeStatus, setTerrePortOverride, spaceId, startRealtimeRender]);

  const handleStopRealtimeRender = useCallback(() => {
    stopRealtimeRender();
    resetRealtimeRuntime();
    toast.success("已停止空间 WebGAL 渲染");
  }, [resetRealtimeRuntime, stopRealtimeRender]);

  const handleRenderAllRooms = useCallback(async () => {
    if (isBatchRendering) {
      return;
    }
    if (renderableRooms.length === 0) {
      toast("当前空间没有可渲染的房间");
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
          const roomMessagesResponse = await tuanchat.chatController.getAllMessage(roomId);
          const messages = sortMessagesForRender(
            extractArrayPayload<ChatMessageResponse>(roomMessagesResponse),
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
      toast.success(`空间渲染完成：${successCount}/${renderableRooms.length} 个房间`);
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
    toast.success("TTS 地址已保存");
  }, [setTtsApiUrl, ttsApiInput]);

  const handleSaveDescription = useCallback(() => {
    setGameConfig({ description: descriptionInput.trim() });
    toast.success("游戏简介已保存");
  }, [descriptionInput, setGameConfig]);

  const handleSavePackageName = useCallback(() => {
    setGameConfig({ packageName: packageNameInput.trim() });
    toast.success("游戏包名已保存");
  }, [packageNameInput, setGameConfig]);

  const handleSaveTypingSoundInterval = useCallback(() => {
    const parsed = Number(typingSoundIntervalInput.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("请输入大于 0 的数字");
      return;
    }
    const normalized = Math.max(0.1, Math.min(20, Number(parsed.toFixed(2))));
    setGameConfig({ typingSoundInterval: normalized });
    setTypingSoundIntervalInput(String(normalized));
    toast.success("打字音频率已保存");
  }, [setGameConfig, typingSoundIntervalInput]);

  const handleSaveTypingSoundPunctuationPause = useCallback(() => {
    const parsed = Number(typingSoundPunctuationPauseInput.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("请输入大于等于 0 的毫秒数");
      return;
    }
    const normalized = Math.max(0, Math.min(5000, Math.floor(parsed)));
    setGameConfig({ typingSoundPunctuationPause: normalized });
    setTypingSoundPunctuationPauseInput(String(normalized));
    toast.success("标点停顿已保存");
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
      toast.error("请上传音频文件");
      return;
    }

    setIsTypingSoundSeUploading(true);
    toast.loading("正在上传打字音效...", { id: "space-webgal-typing-se-upload" });
    try {
      const uploadedUrl = await uploadUtilsRef.current.uploadAudioOriginal(file, 1);
      setGameConfig({ typingSoundSeUrl: uploadedUrl.trim() });
      toast.success("打字音效上传成功", { id: "space-webgal-typing-se-upload" });
    }
    catch (error) {
      toast.error(`打字音效上传失败：${getErrorMessage(error)}`, { id: "space-webgal-typing-se-upload" });
    }
    finally {
      setIsTypingSoundSeUploading(false);
    }
  }, [setGameConfig]);

  const handleClearTypingSoundSe = useCallback(() => {
    setGameConfig({ typingSoundSeUrl: "" });
    if (typingSoundSeFileInputRef.current) {
      typingSoundSeFileInputRef.current.value = "";
    }
    toast.success("打字音效已恢复默认");
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
      toast.error("请上传图片文件");
      return;
    }

    setIsTitleImageUploading(true);
    toast.loading("正在上传标题背景图...", { id: "space-webgal-title-image-upload" });
    try {
      const uploadedImage = await uploadUtilsRef.current.uploadDualImage(file, 1);
      setGameConfig({
        titleImageUrl: uploadedImage.url.trim(),
        originalTitleImageUrl: uploadedImage.originalUrl.trim(),
      });
      toast.success("标题背景图上传成功", { id: "space-webgal-title-image-upload" });
    }
    catch (error) {
      toast.error(`标题背景图上传失败：${getErrorMessage(error)}`, { id: "space-webgal-title-image-upload" });
    }
    finally {
      setIsTitleImageUploading(false);
    }
  }, [setGameConfig]);

  const handleClearTitleImage = useCallback(() => {
    setGameConfig({ titleImageUrl: "", originalTitleImageUrl: "" });
    if (titleImageFileInputRef.current) {
      titleImageFileInputRef.current.value = "";
    }
    toast.success("标题背景图已清空");
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
      toast.error("请上传图片文件");
      return;
    }

    setIsStartupLogoUploading(true);
    toast.loading("正在上传启动图...", { id: "space-webgal-startup-logo-upload" });
    try {
      const uploadedImage = await uploadUtilsRef.current.uploadDualImage(file, 1);
      setGameConfig({
        startupLogoUrl: uploadedImage.url.trim(),
        originalStartupLogoUrl: uploadedImage.originalUrl.trim(),
      });
      toast.success("启动图上传成功", { id: "space-webgal-startup-logo-upload" });
    }
    catch (error) {
      toast.error(`启动图上传失败：${getErrorMessage(error)}`, { id: "space-webgal-startup-logo-upload" });
    }
    finally {
      setIsStartupLogoUploading(false);
    }
  }, [setGameConfig]);

  const handleClearStartupLogo = useCallback(() => {
    setGameConfig({ startupLogoUrl: "", originalStartupLogoUrl: "" });
    if (startupLogoFileInputRef.current) {
      startupLogoFileInputRef.current.value = "";
    }
    toast.success("启动图已清空");
  }, [setGameConfig]);

  const handleSaveTerrePort = useCallback(() => {
    const trimmedPort = terrePortInput.trim();
    if (!trimmedPort) {
      setTerrePortOverride(null);
      setTerrePortError(null);
      toast.success("已改为默认 Terre 端口");
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
    toast.success("Terre 端口已保存");
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
      toast.success("房间内容阈值已恢复推荐值");
      return;
    }

    const parsed = Number(trimmedValue);
    const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : Number.NaN;
    if (!Number.isFinite(normalized) || normalized < MIN_ROOM_CONTENT_ALERT_THRESHOLD || normalized > MAX_ROOM_CONTENT_ALERT_THRESHOLD) {
      toast.error(`请输入 ${MIN_ROOM_CONTENT_ALERT_THRESHOLD}-${MAX_ROOM_CONTENT_ALERT_THRESHOLD} 的整数`);
      return;
    }

    setRoomContentAlertThreshold(normalized);
    setRoomContentAlertThresholdInput(String(normalized));
    toast.success("房间内容阈值已保存");
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

  const isTtsConfigVisible = sectionExpandedMap.ttsLayer;
  const handleToggleRenderPortExpanded = useCallback(() => {
    setRenderPortExpanded(prev => !prev);
  }, []);
  const webgalEditorUrl = useMemo(() => {
    const match = realtimePreviewUrl?.match(/\/games\/([^/]+)/);
    const gameDir = match?.[1] || `realtime_${spaceId}`;
    return `${getTerreBaseUrl()}/#/game/${gameDir}`;
  }, [realtimePreviewUrl, spaceId]);

  return (
    <div className="h-full w-full overflow-y-auto">
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
          batchProgress={batchProgress}
          onToggleRealtimeRender={handleToggleRealtimeRender}
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
          gameConfig={gameConfig}
          descriptionInput={descriptionInput}
          packageNameInput={packageNameInput}
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
          setGameConfig={setGameConfig}
          setDescriptionInput={setDescriptionInput}
          setPackageNameInput={setPackageNameInput}
          setTypingSoundIntervalInput={setTypingSoundIntervalInput}
          setTypingSoundPunctuationPauseInput={setTypingSoundPunctuationPauseInput}
          setTypingSoundDetailExpanded={setTypingSoundDetailExpanded}
          setRoomContentAlertThreshold={setRoomContentAlertThreshold}
          setRoomContentAlertThresholdInput={setRoomContentAlertThresholdInput}
          handleSaveTtsApi={handleSaveTtsApi}
          handleSaveDescription={handleSaveDescription}
          handleSavePackageName={handleSavePackageName}
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
