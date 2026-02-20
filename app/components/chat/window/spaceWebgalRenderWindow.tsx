import type { ChatMessageResponse, Room, UserRole } from "../../../../api";

import { useGetSpaceInfoQuery, useGetUserRoomsQuery } from "api/hooks/chatQueryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD,
  MAX_ROOM_CONTENT_ALERT_THRESHOLD,
  MIN_ROOM_CONTENT_ALERT_THRESHOLD,
  useRealtimeRenderStore,
} from "@/components/chat/stores/realtimeRenderStore";
import WorkflowWindow from "@/components/chat/window/workflowWindow";
import launchWebGal, { appendWebgalTimeoutHint } from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { UploadUtils } from "@/utils/UploadUtils";
import { getTerreBaseUrl, getTerreHealthcheckUrl } from "@/webGAL/terreConfig";
import useRealtimeRender from "@/webGAL/useRealtimeRender";
import { tuanchat } from "../../../../api/instance";

type RenderableRoom = Room & { roomId: number };

interface RoomRenderState {
  status: "idle" | "rendering" | "success" | "error";
  messageCount: number;
  errorMessage?: string;
}

function isRenderableRoom(room: Room): room is RenderableRoom {
  return typeof room.roomId === "number"
    && Number.isFinite(room.roomId)
    && room.roomId > 0
    && room.status !== 1;
}

function extractArrayPayload<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (!value || typeof value !== "object") {
    return [];
  }

  const data = (value as { data?: unknown }).data;
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === "object") {
    const list = (data as { list?: unknown }).list;
    if (Array.isArray(list)) {
      return list as T[];
    }
  }
  return [];
}

function sortMessagesForRender(messages: ChatMessageResponse[]): ChatMessageResponse[] {
  return [...messages].sort((a, b) => {
    const positionDiff = (a.message.position ?? 0) - (b.message.position ?? 0);
    if (positionDiff !== 0) {
      return positionDiff;
    }
    const syncIdDiff = (a.message.syncId ?? 0) - (b.message.syncId ?? 0);
    if (syncIdDiff !== 0) {
      return syncIdDiff;
    }
    return a.message.messageId - b.message.messageId;
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "未知错误";
}

function buildStatusMeta(status: "idle" | "initializing" | "connected" | "disconnected" | "error") {
  if (status === "connected") {
    return { label: "已连接", badgeClass: "badge-success" };
  }
  if (status === "initializing") {
    return { label: "初始化中", badgeClass: "badge-info" };
  }
  if (status === "disconnected") {
    return { label: "连接断开", badgeClass: "badge-warning" };
  }
  if (status === "error") {
    return { label: "连接失败", badgeClass: "badge-error" };
  }
  return { label: "未启动", badgeClass: "badge-ghost" };
}

function buildRoomStatusMeta(status: RoomRenderState["status"]) {
  if (status === "success") {
    return { label: "完成", badgeClass: "badge-success" };
  }
  if (status === "rendering") {
    return { label: "渲染中", badgeClass: "badge-info" };
  }
  if (status === "error") {
    return { label: "失败", badgeClass: "badge-error" };
  }
  return { label: "未渲染", badgeClass: "badge-ghost" };
}

function SectionCollapseToggle({
  expanded,
  onClick,
  label,
}: {
  expanded: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="h-8 w-8 rounded-md flex items-center justify-center text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
      title={expanded ? `收起${label}` : `展开${label}`}
      aria-label={expanded ? `收起${label}` : `展开${label}`}
      onClick={onClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 transition-transform duration-200 ${expanded ? "-rotate-90" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 5-7 7 7 7" />
      </svg>
    </button>
  );
}

function ConfigHelpButton({ label, description }: { label: string; description: string }) {
  const stopLabelToggle = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <span className="tooltip tooltip-top z-20" data-tip={description}>
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-base-content/50 transition-colors hover:bg-info/15 hover:text-info focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-info/60"
        title={description}
        aria-label={`${label}说明：${description}`}
        onClick={stopLabelToggle}
        onPointerDown={stopLabelToggle}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 11v5"></path>
          <path d="M12 8h.01"></path>
        </svg>
      </button>
    </span>
  );
}

function ConfigItemLabel({ label, description }: { label: string; description: string }) {
  return (
    <span className="flex items-center gap-1 text-sm">
      <span>{label}</span>
      <ConfigHelpButton label={label} description={description} />
    </span>
  );
}

interface SpaceWebgalRenderWindowProps {
  spaceId: number;
}

type CollapsibleSectionKey = "renderLayer" | "ttsLayer" | "gameLayer" | "workflowLayer";
type SpaceWebgalSettingsTab = "render" | "roomContent";

const DEFAULT_SECTION_EXPANDED: Record<CollapsibleSectionKey, boolean> = {
  renderLayer: true,
  ttsLayer: true,
  gameLayer: true,
  workflowLayer: false,
};

const COLLAPSIBLE_SECTION_KEYS: CollapsibleSectionKey[] = [
  "workflowLayer",
  "renderLayer",
  "ttsLayer",
  "gameLayer",
];

const DEFAULT_LANGUAGE_OPTIONS = [
  { value: "", label: "不设定" },
  { value: "zh_CN", label: "简体中文" },
  { value: "zh_TW", label: "繁体中文" },
  { value: "en", label: "英语" },
  { value: "ja", label: "日语" },
  { value: "fr", label: "法语" },
  { value: "de", label: "德语" },
] as const;

const BASE_TEMPLATE_OPTIONS = [
  { value: "none", label: "无（默认）" },
  { value: "black", label: "Black" },
] as const;

export default function SpaceWebgalRenderWindow({ spaceId }: SpaceWebgalRenderWindowProps) {
  const spaceInfoQuery = useGetSpaceInfoQuery(spaceId);
  const roomsQuery = useGetUserRoomsQuery(spaceId);
  const rooms = useMemo(() => {
    return roomsQuery.data?.data?.rooms ?? [];
  }, [roomsQuery.data?.data?.rooms]);
  const workflowRoomMap = useMemo(() => {
    return spaceInfoQuery.data?.data?.roomMap;
  }, [spaceInfoQuery.data?.data?.roomMap]);
  const renderableRooms = useMemo(() => rooms.filter(isRenderableRoom), [rooms]);
  const spaceName = spaceInfoQuery.data?.data?.name;

  const ensureHydrated = useRealtimeRenderStore(state => state.ensureHydrated);
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
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; roomName?: string } | null>(null);
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
        tuanchat.roomRoleController.roomRole(roomId),
        tuanchat.roomRoleController.roomNpcRole(roomId),
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
  }, []);

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
      toast.error(appendWebgalTimeoutHint(launchResult.error || "WebGAL 启动失败"), { id: "space-webgal-init" });
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
        toast.error("WebGAL 渲染器启动失败", { id: "space-webgal-init" });
        return false;
      }
      toast.success("WebGAL 渲染器已启动", { id: "space-webgal-init" });
      return true;
    }
    catch (error) {
      const message = appendWebgalTimeoutHint(
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
      const uploadedUrl = await uploadUtilsRef.current.uploadImg(file, 1);
      setGameConfig({ titleImageUrl: uploadedUrl.trim() });
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
    setGameConfig({ titleImageUrl: "" });
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
      const uploadedUrl = await uploadUtilsRef.current.uploadImg(file, 1);
      setGameConfig({ startupLogoUrl: uploadedUrl.trim() });
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
    setGameConfig({ startupLogoUrl: "" });
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

  const renderStatusMeta = buildStatusMeta(realtimeStatus);
  const isTtsConfigVisible = sectionExpandedMap.ttsLayer;
  const webgalEditorUrl = useMemo(() => {
    const match = realtimePreviewUrl?.match(/\/games\/([^/]+)/);
    const gameDir = match?.[1] || `realtime_${spaceId}`;
    return `${getTerreBaseUrl()}/#/game/${gameDir}`;
  }, [realtimePreviewUrl, spaceId]);

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="w-full min-w-0 p-4 space-y-4">
        <div className="rounded-lg border border-base-300 bg-base-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold">空间级 WebGAL 渲染</div>
              <div className="text-xs text-base-content/70 mt-1">
                游戏名使用空间名称+ID，渲染范围为当前空间下所有未删除房间。
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`badge ${renderStatusMeta.badgeClass}`}>{renderStatusMeta.label}</div>
              <button
                type="button"
                className="h-8 w-8 rounded-md flex items-center justify-center text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
                title={renderPortExpanded ? "收起渲染端口设置" : "展开渲染端口设置"}
                aria-label={renderPortExpanded ? "收起渲染端口设置" : "展开渲染端口设置"}
                onClick={() => setRenderPortExpanded(prev => !prev)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform duration-200 ${renderPortExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm ${isRealtimeActive ? "btn-outline" : "btn-primary"}`}
              disabled={realtimeStatus === "initializing" || isBatchRendering}
              onClick={handleToggleRealtimeRender}
            >
              {isRealtimeActive ? "停止渲染器" : "启动并渲染全部房间"}
            </button>
            <a
              href={webgalEditorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline"
              title="打开 WebGAL 编辑器"
            >
              打开 WebGAL 编辑器
            </a>
          </div>
          {renderPortExpanded && (
            <div className="mt-3 rounded-md border border-base-300 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">{`Terre 端口（当前：${terrePort}）`}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input input-bordered input-sm w-36"
                    placeholder="默认"
                    value={terrePortInput}
                    onChange={(event) => {
                      setTerrePortInput(event.target.value);
                      setTerrePortError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSaveTerrePort();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleSaveTerrePort}
                  >
                    保存
                  </button>
                </div>
              </div>
              {terrePortError && <div className="text-xs text-error mt-1">{terrePortError}</div>}
            </div>
          )}

          {batchProgress && (
            <div className="mt-3 text-sm text-base-content/80">
              正在渲染：
              {batchProgress.current}
              /
              {batchProgress.total}
              {batchProgress.roomName ? `（${batchProgress.roomName}）` : ""}
            </div>
          )}
          {realtimeInitProgress && realtimeStatus === "initializing" && (
            <div className="mt-2 text-xs text-base-content/70">
              {realtimeInitProgress.message}
            </div>
          )}
        </div>

        <div role="tablist" className="tabs tabs-boxed w-fit">
          <button
            type="button"
            role="tab"
            aria-selected={settingsTab === "render"}
            className={`tab ${settingsTab === "render" ? "tab-active" : ""}`}
            onClick={() => setSettingsTab("render")}
          >
            渲染设置
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={settingsTab === "roomContent"}
            className={`tab ${settingsTab === "roomContent" ? "tab-active" : ""}`}
            onClick={() => setSettingsTab("roomContent")}
          >
            房间内容
          </button>
        </div>

        {settingsTab === "render"
          ? (
              <>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    disabled={isAllSectionsExpanded}
                    onClick={handleExpandAllSections}
                  >
                    一键展开
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    disabled={isAllSectionsCollapsed}
                    onClick={handleCollapseAllSections}
                  >
                    一键折叠
                  </button>
                </div>

                <div className={`rounded-lg border border-base-300 bg-base-100 ${sectionExpandedMap.workflowLayer ? "p-4" : "px-4 py-2"}`}>
                  <div className={`flex items-center justify-between gap-2${sectionExpandedMap.workflowLayer ? " mb-3" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-sm font-semibold shrink-0">流程图</div>
                      <span className="text-xs text-base-content/60 truncate">（修改流程图请打开全屏修改）</span>
                    </div>
                    <SectionCollapseToggle
                      expanded={sectionExpandedMap.workflowLayer}
                      label="流程图"
                      onClick={() => toggleSection("workflowLayer")}
                    />
                  </div>
                  {sectionExpandedMap.workflowLayer && (
                    <div className="rounded-md border border-base-300 px-2 py-2 overflow-x-auto">
                      <WorkflowWindow />
                    </div>
                  )}
                </div>

                <div className={`rounded-lg border border-base-300 bg-base-100 ${sectionExpandedMap.renderLayer ? "p-4" : "px-4 py-2"}`}>
                  <div className={`flex items-center justify-between gap-2${sectionExpandedMap.renderLayer ? " mb-3" : ""}`}>
                    <div className="text-sm font-semibold">渲染表现层</div>
                    <SectionCollapseToggle
                      expanded={sectionExpandedMap.renderLayer}
                      label="渲染表现层"
                      onClick={() => toggleSection("renderLayer")}
                    />
                  </div>
                  {sectionExpandedMap.renderLayer && (
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                        <span className="text-sm">自动填充立绘</span>
                        <input
                          type="checkbox"
                          className="toggle toggle-sm toggle-primary"
                          checked={autoFigureEnabled}
                          onChange={event => setAutoFigureEnabled(event.target.checked)}
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                        <span className="text-sm">小头像</span>
                        <input
                          type="checkbox"
                          className="toggle toggle-sm toggle-primary"
                          checked={miniAvatarEnabled}
                          onChange={event => setMiniAvatarEnabled(event.target.checked)}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className={`rounded-lg border border-base-300 bg-base-100 ${isTtsConfigVisible ? "p-4" : "px-4 py-2"}`}>
                  <div className={`flex flex-wrap items-center justify-between gap-2${isTtsConfigVisible ? " mb-3" : ""}`}>
                    <div className="text-sm font-semibold">TTS 配音层</div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 rounded-md border border-base-300 px-2 py-1 text-xs">
                        <span>AI 配音</span>
                        <input
                          type="checkbox"
                          className="toggle toggle-xs toggle-primary"
                          checked={ttsEnabled}
                          onChange={event => setTtsEnabled(event.target.checked)}
                        />
                      </label>
                      <SectionCollapseToggle
                        expanded={sectionExpandedMap.ttsLayer}
                        label="TTS 配音层"
                        onClick={() => toggleSection("ttsLayer")}
                      />
                    </div>
                  </div>
                  {isTtsConfigVisible && (
                    <div className="rounded-md border border-base-300 px-3 py-2">
                      <div className="text-sm mb-2">TTS API 地址</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input input-bordered input-sm flex-1"
                          placeholder="http://localhost:9000"
                          value={ttsApiInput}
                          onChange={event => setTtsApiInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleSaveTtsApi();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={handleSaveTtsApi}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`rounded-lg border border-base-300 bg-base-100 ${sectionExpandedMap.gameLayer ? "p-4" : "px-4 py-2"}`}>
                  <div className={`flex items-center justify-between gap-2${sectionExpandedMap.gameLayer ? " mb-3" : ""}`}>
                    <div className="text-sm font-semibold">WebGAL 游戏层（config.txt）</div>
                    <SectionCollapseToggle
                      expanded={sectionExpandedMap.gameLayer}
                      label="WebGAL 游戏层"
                      onClick={() => toggleSection("gameLayer")}
                    />
                  </div>
                  {sectionExpandedMap.gameLayer && (
                    <div className="space-y-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                          <ConfigItemLabel
                            label="未设置标题背景图时使用群聊头像"
                            description="如果你没有上传标题背景图，就自动用群聊头像当首页背景。"
                          />
                          <input
                            type="checkbox"
                            className="toggle toggle-sm toggle-primary"
                            checked={gameConfig.coverFromRoomAvatarEnabled}
                            onChange={event => setGameConfig({ coverFromRoomAvatarEnabled: event.target.checked })}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                          <ConfigItemLabel
                            label="未设置启动图时使用群聊头像"
                            description="如果你没有上传启动图，就自动用群聊头像当启动图。"
                          />
                          <input
                            type="checkbox"
                            className="toggle toggle-sm toggle-primary"
                            checked={gameConfig.startupLogoFromRoomAvatarEnabled}
                            onChange={event => setGameConfig({ startupLogoFromRoomAvatarEnabled: event.target.checked })}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                          <ConfigItemLabel
                            label="游戏图标使用群聊头像"
                            description="让游戏图标和群聊头像保持一致。"
                          />
                          <input
                            type="checkbox"
                            className="toggle toggle-sm toggle-primary"
                            checked={gameConfig.gameIconFromRoomAvatarEnabled}
                            onChange={event => setGameConfig({ gameIconFromRoomAvatarEnabled: event.target.checked })}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                          <ConfigItemLabel
                            label="游戏名使用空间名+ID"
                            description="自动用“空间名 + 编号”当游戏名，避免重名。"
                          />
                          <input
                            type="checkbox"
                            className="toggle toggle-sm toggle-primary"
                            checked={gameConfig.gameNameFromRoomNameEnabled}
                            onChange={event => setGameConfig({ gameNameFromRoomNameEnabled: event.target.checked })}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                          <ConfigItemLabel
                            label="启用紧急回避"
                            description="需要快速遮住画面时可以一键隐藏当前内容。"
                          />
                          <input
                            type="checkbox"
                            className="toggle toggle-sm toggle-primary"
                            checked={gameConfig.showPanicEnabled}
                            onChange={event => setGameConfig({ showPanicEnabled: event.target.checked })}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                          <ConfigItemLabel
                            label="启用鉴赏模式"
                            description="开启后可在菜单里查看已看过的内容，方便回顾。"
                          />
                          <input
                            type="checkbox"
                            className="toggle toggle-sm toggle-primary"
                            checked={gameConfig.enableAppreciation}
                            onChange={event => setGameConfig({ enableAppreciation: event.target.checked })}
                          />
                        </label>
                        <div className={`rounded-md border border-base-300 md:col-span-2 ${typingSoundDetailExpanded ? "p-3" : "px-3 py-2"}`}>
                          <div className={`flex flex-wrap items-center justify-between gap-2${typingSoundDetailExpanded ? " mb-3" : ""}`}>
                            <ConfigItemLabel
                              label="启用打字音"
                              description="文字一个个出现时会播放轻微按键音，展开后可以细调频率和音效。"
                            />
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 rounded-md border border-base-300 px-2 py-1 text-xs">
                                <span>打字音</span>
                                <input
                                  type="checkbox"
                                  className="toggle toggle-xs toggle-primary"
                                  checked={gameConfig.typingSoundEnabled}
                                  onChange={event => setGameConfig({ typingSoundEnabled: event.target.checked })}
                                />
                              </label>
                              <SectionCollapseToggle
                                expanded={typingSoundDetailExpanded}
                                label="打字音细化设置"
                                onClick={() => setTypingSoundDetailExpanded(prev => !prev)}
                              />
                            </div>
                          </div>
                          {typingSoundDetailExpanded && (
                            <div className="rounded-md border border-base-300 px-3 py-2">
                              <div className="grid gap-2 md:grid-cols-2">
                                <div>
                                  <div className="mb-1 text-xs text-base-content/70">每隔多少个字播放一次</div>
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      min={0.1}
                                      max={20}
                                      step={0.1}
                                      className="input input-bordered input-sm flex-1"
                                      value={typingSoundIntervalInput}
                                      onChange={event => setTypingSoundIntervalInput(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          handleSaveTypingSoundInterval();
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline"
                                      onClick={handleSaveTypingSoundInterval}
                                    >
                                      保存
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-1 text-xs text-base-content/70">标点额外停顿（毫秒）</div>
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={5000}
                                      step={10}
                                      className="input input-bordered input-sm flex-1"
                                      value={typingSoundPunctuationPauseInput}
                                      onChange={event => setTypingSoundPunctuationPauseInput(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          handleSaveTypingSoundPunctuationPause();
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline"
                                      onClick={handleSaveTypingSoundPunctuationPause}
                                    >
                                      保存
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3">
                                <div className="mb-1 text-xs text-base-content/70">打字音效文件</div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline"
                                    onClick={handlePickTypingSoundSe}
                                    disabled={isTypingSoundSeUploading}
                                  >
                                    {isTypingSoundSeUploading ? "上传中..." : "上传音频"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-ghost"
                                    onClick={handleClearTypingSoundSe}
                                    disabled={isTypingSoundSeUploading || !gameConfig.typingSoundSeUrl}
                                  >
                                    恢复默认
                                  </button>
                                  <span className="text-xs text-base-content/70">
                                    {gameConfig.typingSoundSeUrl ? "已设置自定义打字音" : "使用默认打字音"}
                                  </span>
                                </div>
                                {gameConfig.typingSoundSeUrl && (
                                  <audio className="mt-2 h-8 w-full max-w-sm" controls preload="none" src={gameConfig.typingSoundSeUrl} />
                                )}
                                <input
                                  ref={typingSoundSeFileInputRef}
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  onChange={handleTypingSoundSeFileChange}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                          <ConfigItemLabel
                            label="默认语言"
                            description="玩家第一次打开游戏时默认显示的语言。"
                          />
                          <select
                            className="select select-bordered select-sm w-40"
                            value={gameConfig.defaultLanguage}
                            onChange={event => setGameConfig({ defaultLanguage: event.target.value as typeof gameConfig.defaultLanguage })}
                          >
                            {DEFAULT_LANGUAGE_OPTIONS.map(option => (
                              <option key={option.value || "empty"} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center justify-between gap-2 rounded-md border border-base-300 px-3 py-2">
                          <ConfigItemLabel
                            label="WebGAL模板"
                            description="none 为内置默认模板；black 会覆盖为 WebGAL Black。"
                          />
                          <select
                            className="select select-bordered select-sm w-40"
                            value={gameConfig.baseTemplate}
                            onChange={event => setGameConfig({ baseTemplate: event.target.value as typeof gameConfig.baseTemplate })}
                          >
                            {BASE_TEMPLATE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-md border border-base-300 px-3 py-2">
                          <div className="mb-2 flex items-center gap-1 text-sm">
                            <span>游戏简介（Description）</span>
                            <ConfigHelpButton label="游戏简介（Description）" description="给玩家看的简介文字，会显示在游戏信息里。" />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="input input-bordered input-sm flex-1"
                              placeholder="留空则不设定"
                              value={descriptionInput}
                              onChange={event => setDescriptionInput(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  handleSaveDescription();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={handleSaveDescription}
                            >
                              保存
                            </button>
                          </div>
                        </div>

                        <div className="rounded-md border border-base-300 px-3 py-2">
                          <div className="mb-2 flex items-center gap-1 text-sm">
                            <span>游戏包名（Package_name）</span>
                            <ConfigHelpButton label="游戏包名（Package_name）" description="打包发布时使用的应用标识；不确定可先保持当前值。" />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="input input-bordered input-sm flex-1"
                              placeholder="如 com.openwebgal.demo"
                              value={packageNameInput}
                              onChange={event => setPackageNameInput(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  handleSavePackageName();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={handleSavePackageName}
                            >
                              保存
                            </button>
                          </div>
                        </div>

                        <div className="rounded-md border border-base-300 px-3 py-2 md:col-span-2">
                          <div className="mb-2 flex items-center gap-1 text-sm">
                            <span>标题背景图（Title_img）</span>
                            <ConfigHelpButton
                              label="标题背景图（Title_img）"
                              description="进入游戏首页时看到的大背景图。"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={handlePickTitleImage}
                              disabled={isTitleImageUploading}
                            >
                              {isTitleImageUploading ? "上传中..." : "上传图片"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={handleClearTitleImage}
                              disabled={isTitleImageUploading || !gameConfig.titleImageUrl}
                            >
                              清空
                            </button>
                            <span className="text-xs text-base-content/70">
                              {gameConfig.titleImageUrl ? "已设置标题背景图" : "未设置标题背景图（可用上方头像兜底）"}
                            </span>
                          </div>
                          {gameConfig.titleImageUrl && (
                            <div className="mt-2 h-20 w-36 overflow-hidden rounded-md border border-base-300">
                              <img
                                src={gameConfig.titleImageUrl}
                                alt="标题背景图预览"
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <input
                            ref={titleImageFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleTitleImageFileChange}
                          />
                        </div>

                        <div className="rounded-md border border-base-300 px-3 py-2 md:col-span-2">
                          <div className="mb-2 flex items-center gap-1 text-sm">
                            <span>启动图（Game_Logo）</span>
                            <ConfigHelpButton
                              label="启动图（Game_Logo）"
                              description="游戏刚启动时显示的图片。"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={handlePickStartupLogo}
                              disabled={isStartupLogoUploading}
                            >
                              {isStartupLogoUploading ? "上传中..." : "上传图片"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={handleClearStartupLogo}
                              disabled={isStartupLogoUploading || !gameConfig.startupLogoUrl}
                            >
                              清空
                            </button>
                            <span className="text-xs text-base-content/70">
                              {gameConfig.startupLogoUrl ? "已设置启动图" : "未设置启动图（可用上方头像兜底）"}
                            </span>
                          </div>
                          {gameConfig.startupLogoUrl && (
                            <div className="mt-2 h-20 w-36 overflow-hidden rounded-md border border-base-300">
                              <img
                                src={gameConfig.startupLogoUrl}
                                alt="启动图预览"
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <input
                            ref={startupLogoFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleStartupLogoFileChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          : (
              <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold">单条消息预警阈值</div>
                  <div className="text-xs text-base-content/70 mt-1">
                    WebGAL 对话框单条文本可见行数有限，建议将超长内容拆分发送，避免右侧只显示前两行。
                  </div>
                </div>
                <div className="rounded-md border border-base-300 p-3 space-y-3">
                  <div className="text-xs text-base-content/70">
                    推荐值：
                    {DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD}
                    字（中文对话一般可稳定落在两行内）。
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={MIN_ROOM_CONTENT_ALERT_THRESHOLD}
                      max={MAX_ROOM_CONTENT_ALERT_THRESHOLD}
                      step={1}
                      className="input input-bordered input-sm w-44"
                      value={roomContentAlertThresholdInput}
                      onChange={(event) => {
                        setRoomContentAlertThresholdInput(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          handleSaveRoomContentAlertThreshold();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={handleSaveRoomContentAlertThreshold}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setRoomContentAlertThreshold(DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD);
                        setRoomContentAlertThresholdInput(String(DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD));
                      }}
                    >
                      恢复推荐值
                    </button>
                  </div>
                  <div className="text-xs text-base-content/70">
                    当前阈值：
                    {roomContentAlertThreshold}
                    字。超过阈值会在左侧输入区提示，并在发送时阻止提交。
                  </div>
                </div>
              </div>
            )}

      </div>
      {isBatchRendering && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(560px,calc(100vw-2rem))] rounded-lg border border-base-300 bg-base-100/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-2 border-b border-base-300 px-4 py-3">
            <div className="text-sm font-semibold">房间渲染状态</div>
            <div className="text-xs text-base-content/70">
              {`空间：${spaceName || `#${spaceId}`} | 未删除房间：${renderableRooms.length}`}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-base-content/70 mb-2">
              {`进度：${batchProgress?.current ?? 0}/${batchProgress?.total ?? renderableRooms.length}${batchProgress?.roomName ? `（${batchProgress.roomName}）` : ""}`}
            </div>
            {renderableRooms.length === 0
              ? (
                  <div className="text-sm text-base-content/70">暂无可渲染房间。</div>
                )
              : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {renderableRooms.map((room) => {
                      const state = roomRenderStateMap[room.roomId] ?? { status: "idle", messageCount: 0 };
                      const roomStatusMeta = buildRoomStatusMeta(state.status);
                      const roomName = room.name?.trim() || `房间#${room.roomId}`;
                      return (
                        <div key={room.roomId} className="rounded-md border border-base-300 px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{roomName}</div>
                              <div className="text-xs text-base-content/70">{`Room ID: ${room.roomId}`}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`badge badge-sm ${roomStatusMeta.badgeClass}`}>{roomStatusMeta.label}</span>
                              <span className="text-xs text-base-content/70">
                                {state.messageCount}
                                {" "}
                                条消息
                              </span>
                            </div>
                          </div>
                          {state.errorMessage && (
                            <div className="text-xs text-error mt-1 truncate" title={state.errorMessage}>
                              {state.errorMessage}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
          </div>
        </div>
      )}
    </div>
  );
}
