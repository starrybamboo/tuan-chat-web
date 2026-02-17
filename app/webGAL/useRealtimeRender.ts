import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * WebGAL 实时渲染 Hook
 * 用于在 React 组件中使用实时渲染功能
 *
 * 支持多房间场景：
 * - 以 Space 为单位创建游戏
 * - 以 Room 为单位创建场景
 * - 初始化时导入历史消息
 * - 增量更新新消息
 */
import type { RealtimeWebgalGameConfig } from "@/components/chat/stores/realtimeRenderStore";

import type { ChatMessageResponse, RoleAvatar, Room, UserRole } from "../../api";
import type { RealtimeTTSConfig } from "./realtimeRenderer";

import { tuanchat } from "../../api/instance";
import { onWebgalAvatarUpdated } from "./avatarSync";
import { RealtimeRenderer } from "./realtimeRenderer";

export type RealtimeRenderStatus = "idle" | "initializing" | "connected" | "disconnected" | "error";

export type InitProgress = {
  phase: "idle" | "creating_game" | "fetching_avatars" | "uploading_sprites" | "uploading_backgrounds" | "creating_scenes" | "ready";
  current: number;
  total: number;
  message: string;
};

type UseRealtimeRenderOptions = {
  spaceId: number;
  spaceName?: string;
  workflowRoomMap?: Record<string, Array<string>>;
  enabled?: boolean;
  roles?: UserRole[];
  avatars?: RoleAvatar[];
  rooms?: Room[];
  /** TTS 配置 */
  ttsConfig?: RealtimeTTSConfig;
  /** 小头像是否启用 */
  miniAvatarEnabled?: boolean;
  /** 角色参考音频文件映射 (roleId -> File) */
  voiceFiles?: Map<number, File>;
  /** 自动填充立绘是否启用（没有设置立绘时自动填充左侧立绘） */
  autoFigureEnabled?: boolean;
  /** 游戏配置（写入 config.txt） */
  gameConfig?: RealtimeWebgalGameConfig;
};

type UseRealtimeRenderReturn = {
  /** 渲染状态 */
  status: RealtimeRenderStatus;
  /** 初始化进度 */
  initProgress: InitProgress | null;
  /** 是否正在运行 */
  isActive: boolean;
  /** 预览 URL */
  previewUrl: string | null;
  /** 开始实时渲染 */
  start: () => Promise<boolean>;
  /** 停止实时渲染 */
  stop: () => void;
  /** 渲染单条消息 */
  renderMessage: (message: ChatMessageResponse, roomId?: number) => Promise<void>;
  /** 渲染历史消息 */
  renderHistory: (messages: ChatMessageResponse[], roomId?: number) => Promise<void>;
  /** 重置场景 */
  resetScene: (roomId?: number) => Promise<void>;
  /** 清除背景 */
  clearBackground: (roomId?: number) => Promise<void>;
  /** 清除立绘 */
  clearFigure: (roomId?: number) => Promise<void>;
  /** 切换当前房间 */
  switchRoom: (roomId: number) => Promise<void>;
  /** 获取指定房间的预览 URL */
  getRoomPreviewUrl: (roomId: number) => string | null;
  /** 更新角色缓存 */
  updateRoleCache: (roles: UserRole[]) => void;
  /** 更新头像缓存 */
  updateAvatarCache: (avatars: RoleAvatar[]) => void;
  /** 更新房间列表 */
  updateRooms: (rooms: Room[]) => void;
  /** 跳转到指定消息 */
  jumpToMessage: (messageId: number, roomId?: number) => boolean;
  /** 更新 TTS 配置 */
  updateTTSConfig: (config: RealtimeTTSConfig) => void;
  /** 设置角色参考音频 */
  setVoiceFile: (roleId: number, file: File) => void;
  /** 批量设置角色参考音频 */
  setVoiceFiles: (voiceFiles: Map<number, File>) => void;
  /** 更新消息渲染设置并重新渲染跳转 */
  updateAndRerenderMessage: (message: ChatMessageResponse, roomId?: number, regenerateTTS?: boolean) => Promise<boolean>;
};

function useRealtimeRender({
  spaceId,
  spaceName,
  workflowRoomMap,
  enabled,
  roles = [],
  avatars = [],
  rooms = [],
  ttsConfig,
  miniAvatarEnabled = false,
  voiceFiles,
  autoFigureEnabled = true,
  gameConfig,
}: UseRealtimeRenderOptions): UseRealtimeRenderReturn {
  const [status, setStatus] = useState<RealtimeRenderStatus>("idle");
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const rendererRef = useRef<RealtimeRenderer | null>(null);
  const queryClient = useQueryClient();
  const roomsRef = useRef<Room[]>(rooms);
  const spaceNameRef = useRef<string | undefined>(spaceName);
  const ttsConfigRef = useRef<RealtimeTTSConfig | undefined>(ttsConfig);
  const voiceFilesRef = useRef<Map<number, File> | undefined>(voiceFiles);
  const gameConfigRef = useRef<RealtimeWebgalGameConfig | undefined>(gameConfig);
  const workflowRoomMapRef = useRef<Record<string, Array<string>> | undefined>(workflowRoomMap);

  // 保持 refs 最新
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    spaceNameRef.current = spaceName;
    if (rendererRef.current) {
      rendererRef.current.setSpaceName(spaceName);
    }
  }, [spaceName]);

  useEffect(() => {
    ttsConfigRef.current = ttsConfig;
    if (rendererRef.current && ttsConfig) {
      rendererRef.current.setTTSConfig(ttsConfig);
      console.warn(`[useRealtimeRender] TTS 配置变化: enabled=${ttsConfig.enabled}`);
    }
  }, [ttsConfig]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setMiniAvatarEnabled(miniAvatarEnabled);
    }
  }, [miniAvatarEnabled]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setAutoFigureEnabled(autoFigureEnabled);
    }
  }, [autoFigureEnabled]);

  useEffect(() => {
    gameConfigRef.current = gameConfig;
    if (rendererRef.current && gameConfig) {
      rendererRef.current.setGameConfig(gameConfig);
    }
  }, [gameConfig]);

  useEffect(() => {
    workflowRoomMapRef.current = workflowRoomMap;
    if (rendererRef.current) {
      rendererRef.current.setWorkflowRoomMap(workflowRoomMap);
    }
  }, [workflowRoomMap]);

  useEffect(() => {
    voiceFilesRef.current = voiceFiles;
    if (rendererRef.current && voiceFiles) {
      rendererRef.current.setVoiceFiles(voiceFiles);
    }
  }, [voiceFiles]);

  // 初始化角色和头像缓存
  useEffect(() => {
    if (rendererRef.current && roles.length > 0) {
      rendererRef.current.setRoleCache(roles);
    }
  }, [roles]);

  useEffect(() => {
    if (rendererRef.current && avatars.length > 0) {
      avatars.forEach((avatar) => {
        if (avatar.avatarId) {
          queryClient.setQueryData(["getRoleAvatar", avatar.avatarId], { data: avatar });
        }
      });
    }
  }, [avatars, queryClient]);

  useEffect(() => {
    return onWebgalAvatarUpdated(({ avatarId, avatar }) => {
      if (!avatarId || !avatar) {
        return;
      }
      queryClient.setQueryData(["getRoleAvatar", avatarId], { data: avatar });
      if (rendererRef.current) {
        rendererRef.current.invalidateAvatarCaches(avatarId);
      }
    });
  }, [queryClient]);

  // 更新房间信息缓存
  useEffect(() => {
    if (rendererRef.current && rooms.length > 0) {
      rendererRef.current.setRooms(rooms);
    }
  }, [rooms]);

  // 开始实时渲染
  const start = useCallback(async (): Promise<boolean> => {
    if (status === "initializing" || status === "connected") {
      return status === "connected";
    }

    setStatus("initializing");
    setInitProgress({
      phase: "idle",
      current: 0,
      total: 0,
      message: "正在准备...",
    });

    try {
      const renderer = RealtimeRenderer.getInstance(spaceId);
      rendererRef.current = renderer;
      renderer.setQueryClient(queryClient);
      renderer.setSpaceName(spaceNameRef.current);
      renderer.setWorkflowRoomMap(workflowRoomMapRef.current);

      // 设置小头像配置
      renderer.setMiniAvatarEnabled(miniAvatarEnabled);

      // 设置自动填充立绘配置
      renderer.setAutoFigureEnabled(autoFigureEnabled);

      // 设置 config.txt 同步配置
      if (gameConfigRef.current) {
        renderer.setGameConfig(gameConfigRef.current);
      }

      // 设置进度回调
      renderer.setProgressCallback((progress) => {
        setInitProgress({
          phase: progress.phase as InitProgress["phase"],
          current: progress.current,
          total: progress.total,
          message: progress.message,
        });
      });

      // 设置状态回调
      renderer.setStatusCallback((newStatus) => {
        if (newStatus === "connected") {
          setStatus("connected");
          setPreviewUrl(renderer.getPreviewUrl());
        }
        else if (newStatus === "disconnected") {
          setStatus("disconnected");
        }
        else {
          setStatus("error");
        }
      });

      // 设置角色缓存
      if (roles.length > 0) {
        renderer.setRoleCache(roles);

        // 全量获取所有角色的头像信息
        console.warn("[useRealtimeRender] 正在获取角色头像信息...");
        const allAvatars: RoleAvatar[] = [...avatars];
        const avatarIdsToFetch = new Set<number>();

        // 收集所有需要获取的头像ID
        for (const role of roles) {
          if (role.avatarId && !queryClient.getQueryData(["getRoleAvatar", role.avatarId])) {
            avatarIdsToFetch.add(role.avatarId);
          }
        }

        // 更新进度: 正在获取头像信息
        setInitProgress({
          phase: "fetching_avatars",
          current: 0,
          total: avatarIdsToFetch.size,
          message: `正在获取角色头像信息... (0/${avatarIdsToFetch.size})`,
        });

        // 批量获取头像信息
        let fetchedCount = 0;
        for (const avatarId of avatarIdsToFetch) {
          try {
            const avatarResponse = await tuanchat.avatarController.getRoleAvatar(avatarId);
            if (avatarResponse.data) {
              allAvatars.push(avatarResponse.data);
              queryClient.setQueryData(["getRoleAvatar", avatarId], avatarResponse);
            }
            fetchedCount++;
            setInitProgress({
              phase: "fetching_avatars",
              current: fetchedCount,
              total: avatarIdsToFetch.size,
              message: `正在获取角色头像信息... (${fetchedCount}/${avatarIdsToFetch.size})`,
            });
          }
          catch (error) {
            console.error(`获取头像 ${avatarId} 失败:`, error);
            fetchedCount++;
          }
        }

        // 设置头像缓存
        console.warn(`[useRealtimeRender] 获取了 ${allAvatars.length} 个头像信息`);
      }

      // 设置房间列表（用于创建多个场景）- 使用 ref 获取最新值
      const currentRooms = roomsRef.current;
      if (currentRooms.length > 0) {
        renderer.setRooms(currentRooms);
        console.warn(`[useRealtimeRender] 设置了 ${currentRooms.length} 个房间`);
      }

      // 设置 TTS 配置
      const currentTTSConfig = ttsConfigRef.current;
      if (currentTTSConfig) {
        renderer.setTTSConfig(currentTTSConfig);
        console.warn(`[useRealtimeRender] TTS 已${currentTTSConfig.enabled ? "启用" : "禁用"}`);
      }

      // 设置参考音频文件
      const currentVoiceFiles = voiceFilesRef.current;
      if (currentVoiceFiles && currentVoiceFiles.size > 0) {
        renderer.setVoiceFiles(currentVoiceFiles);
        console.warn(`[useRealtimeRender] 设置了 ${currentVoiceFiles.size} 个角色的参考音频`);
      }

      // 如果启用了 TTS 但没有提供参考音频，尝试从角色的 voiceUrl 获取
      if (currentTTSConfig?.enabled && (!currentVoiceFiles || currentVoiceFiles.size === 0)) {
        console.warn("[useRealtimeRender] 正在从角色 voiceUrl 获取参考音频...");
        await renderer.fetchVoiceFilesFromRoles();
      }

      // 初始化渲染器（会自动预加载立绘并创建房间场景）
      const success = await renderer.init();
      if (success) {
        setIsActive(true);
        setPreviewUrl(renderer.getPreviewUrl());
        setInitProgress({
          phase: "ready",
          current: 1,
          total: 1,
          message: "初始化完成",
        });
        return true;
      }
      else {
        setStatus("error");
        setInitProgress(null);
        return false;
      }
    }
    catch (error) {
      console.error("启动实时渲染失败:", error);
      setStatus("error");
      setInitProgress(null);
      return false;
    }
  }, [spaceId, status, roles, avatars, queryClient, miniAvatarEnabled, autoFigureEnabled]);

  // 停止实时渲染
  const stop = useCallback(() => {
    RealtimeRenderer.destroyInstance();
    rendererRef.current = null;
    setStatus("idle");
    setIsActive(false);
    setPreviewUrl(null);
  }, []);

  // 渲染单条消息
  const renderMessage = useCallback(async (message: ChatMessageResponse, roomId?: number): Promise<void> => {
    if (!rendererRef.current) {
      console.warn("实时渲染器未就绪，无法渲染消息");
      return;
    }

    // 获取头像信息（优先从 React Query 缓存读取）
    const avatarId = message.message.avatarId;
    const cached = avatarId ? queryClient.getQueryData<any>(["getRoleAvatar", avatarId]) : null;
    console.warn(`[useRealtimeRender] 渲染消息, avatarId=${avatarId}, queryCache=${Boolean(cached)}`);

    if (!cached?.data && avatarId && avatarId > 0) {
      try {
        const avatarResponse = await tuanchat.avatarController.getRoleAvatar(avatarId);
        if (avatarResponse.data) {
          queryClient.setQueryData(["getRoleAvatar", avatarId], avatarResponse);
          console.warn(`[useRealtimeRender] 成功获取头像 ${avatarId}:`, avatarResponse.data.avatarUrl || avatarResponse.data.spriteUrl);
        }
      }
      catch (error) {
        console.error("获取头像信息失败:", error);
      }
    }

    await rendererRef.current.renderMessage(message, roomId);
  }, [queryClient]);

  // 渲染历史消息
  const renderHistory = useCallback(async (messages: ChatMessageResponse[], roomId?: number): Promise<void> => {
    if (!rendererRef.current) {
      console.warn("实时渲染器未就绪，无法渲染历史消息");
      return;
    }

    // 预先获取所有消息中缺失的头像信息
    // 注意：需要检查 renderer 的 avatarMap 而不是本地缓存，因为 renderer 可能是新实例
    const missingAvatarIds = new Set<number>();
    for (const message of messages) {
      const avatarId = message.message.avatarId;
      // avatarId 必须是正整数才有效
      if (avatarId && avatarId > 0) {
        missingAvatarIds.add(avatarId);
      }
    }

    console.warn(`[useRealtimeRender] 需要获取 ${missingAvatarIds.size} 个头像信息:`, Array.from(missingAvatarIds));

    // 批量获取头像信息：先从 query 缓存中装载已缓存的头像，再只获取缺失的头像
    const idsToFetch: number[] = [];
    for (const avatarId of missingAvatarIds) {
      const cached = queryClient.getQueryData<any>(["getRoleAvatar", avatarId]);
      if (!cached?.data) {
        idsToFetch.push(avatarId);
      }
    }

    for (const avatarId of idsToFetch) {
      try {
        const avatarResponse = await tuanchat.avatarController.getRoleAvatar(avatarId);
        if (avatarResponse.data) {
          queryClient.setQueryData(["getRoleAvatar", avatarId], avatarResponse);
          console.warn(`[useRealtimeRender] 成功获取头像 ${avatarId}:`, avatarResponse.data.avatarUrl || avatarResponse.data.spriteUrl);
        }
      }
      catch (error) {
        console.error(`获取头像 ${avatarId} 信息失败:`, error);
      }
    }

    await rendererRef.current.renderHistory(messages, roomId);
  }, [queryClient]);

  // 重置场景
  const resetScene = useCallback(async (roomId?: number): Promise<void> => {
    if (!rendererRef.current) {
      return;
    }
    await rendererRef.current.resetScene(roomId);
  }, []);

  // 清除背景
  const clearBackground = useCallback(async (roomId?: number): Promise<void> => {
    if (!rendererRef.current) {
      return;
    }
    await rendererRef.current.clearBackground(roomId);
  }, []);

  // 清除立绘
  const clearFigure = useCallback(async (roomId?: number): Promise<void> => {
    if (!rendererRef.current) {
      return;
    }
    await rendererRef.current.clearFigure(roomId);
  }, []);

  // 切换当前房间
  const switchRoom = useCallback(async (roomId: number): Promise<void> => {
    if (!rendererRef.current) {
      return;
    }
    await rendererRef.current.switchRoom(roomId);
  }, []);

  // 获取指定房间的预览 URL
  const getRoomPreviewUrl = useCallback((roomId: number): string | null => {
    if (!rendererRef.current) {
      return null;
    }
    return rendererRef.current.getPreviewUrl(roomId);
  }, []);

  // 更新角色缓存
  const updateRoleCache = useCallback((newRoles: UserRole[]) => {
    if (rendererRef.current) {
      rendererRef.current.setRoleCache(newRoles);
    }
  }, []);

  // 更新头像缓存
  const updateAvatarCache = useCallback((newAvatars: RoleAvatar[]) => {
    if (rendererRef.current) {
      newAvatars.forEach((avatar) => {
        if (avatar.avatarId) {
          queryClient.setQueryData(["getRoleAvatar", avatar.avatarId], { data: avatar });
        }
      });
    }
  }, [queryClient]);

  // 更新房间列表
  const updateRooms = useCallback((newRooms: Room[]) => {
    if (rendererRef.current) {
      rendererRef.current.setRooms(newRooms);
    }
  }, []);

  // 跳转到指定消息
  const jumpToMessage = useCallback((messageId: number, roomId?: number): boolean => {
    if (!rendererRef.current) {
      console.warn("实时渲染器未就绪，无法跳转");
      return false;
    }
    return rendererRef.current.jumpToMessage(messageId, roomId);
  }, []);

  // 更新 TTS 配置
  const updateTTSConfig = useCallback((config: RealtimeTTSConfig) => {
    ttsConfigRef.current = config;
    if (rendererRef.current) {
      rendererRef.current.setTTSConfig(config);
    }
  }, []);

  // 设置角色参考音频
  const setVoiceFile = useCallback((roleId: number, file: File) => {
    if (rendererRef.current) {
      rendererRef.current.setVoiceFile(roleId, file);
    }
  }, []);

  // 批量设置角色参考音频
  const setVoiceFilesCallback = useCallback((newVoiceFiles: Map<number, File>) => {
    voiceFilesRef.current = newVoiceFiles;
    if (rendererRef.current) {
      rendererRef.current.setVoiceFiles(newVoiceFiles);
    }
  }, []);

  // 更新消息渲染设置并重新渲染跳转
  const updateAndRerenderMessage = useCallback(async (
    message: ChatMessageResponse,
    roomId?: number,
    regenerateTTS: boolean = false,
  ): Promise<boolean> => {
    if (!rendererRef.current) {
      console.warn("实时渲染器未就绪，无法更新渲染");
      return false;
    }

    // 获取头像信息（优先从 React Query 缓存读取）
    const avatarId = message.message.avatarId;
    const cached = avatarId ? queryClient.getQueryData<any>(["getRoleAvatar", avatarId]) : null;

    if (!cached?.data && avatarId && avatarId > 0) {
      try {
        const avatarResponse = await tuanchat.avatarController.getRoleAvatar(avatarId);
        if (avatarResponse.data) {
          queryClient.setQueryData(["getRoleAvatar", avatarId], avatarResponse);
        }
      }
      catch (error) {
        console.error("获取头像信息失败:", error);
      }
    }

    return rendererRef.current.updateAndRerenderMessage(message, roomId, regenerateTTS);
  }, [queryClient]);

  // 自动启动（如果 enabled 为 true）
  useEffect(() => {
    if (typeof enabled !== "boolean") {
      return;
    }
    if (enabled && status === "idle") {
      start();
    }
    else if (!enabled && isActive) {
      stop();
    }
  }, [enabled, status, isActive, start, stop]);

  // 清理
  useEffect(() => {
    return () => {
      if (isActive) {
        RealtimeRenderer.destroyInstance();
      }
    };
  }, [isActive]);

  return {
    status,
    initProgress,
    isActive,
    previewUrl,
    start,
    stop,
    renderMessage,
    renderHistory,
    resetScene,
    clearBackground,
    clearFigure,
    switchRoom,
    getRoomPreviewUrl,
    updateRoleCache,
    updateAvatarCache,
    updateRooms,
    jumpToMessage,
    updateTTSConfig,
    setVoiceFile,
    setVoiceFiles: setVoiceFilesCallback,
    updateAndRerenderMessage,
  };
}

export default useRealtimeRender;
