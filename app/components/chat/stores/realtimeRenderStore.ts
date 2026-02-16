import { create } from "zustand";

import type { InitProgress, RealtimeRenderStatus } from "@/webGAL/useRealtimeRender";

import { getRealtimeRenderSettings, setRealtimeRenderSettings } from "@/components/chat/infra/indexedDB/realtimeRenderSettingsDb";
import { getDefaultTerrePort, setTerrePortOverride as setTerrePortOverrideInConfig } from "@/webGAL/terreConfig";

export type RealtimeWebgalDefaultLanguage = "" | "zh_CN" | "zh_TW" | "en" | "ja" | "fr" | "de";

export type RealtimeWebgalGameConfig = {
  /** 是否将群聊头像同步为 WebGAL 标题背景图（Title_img） */
  coverFromRoomAvatarEnabled: boolean;
  /** 是否将群聊头像同步为 WebGAL 启动图（Game_Logo） */
  startupLogoFromRoomAvatarEnabled: boolean;
  /** 是否将群聊头像同步为 WebGAL 游戏图标（icons/*） */
  gameIconFromRoomAvatarEnabled: boolean;
  /** 是否将空间名称+spaceId 同步为 WebGAL 游戏名（Game_name） */
  gameNameFromRoomNameEnabled: boolean;
  /** WebGAL 游戏简介（Description） */
  description: string;
  /** WebGAL 游戏包名（Package_name） */
  packageName: string;
  /** 是否启用紧急回避（Show_panic） */
  showPanicEnabled: boolean;
  /** 默认语言（Default_Language） */
  defaultLanguage: RealtimeWebgalDefaultLanguage;
  /** 是否开启鉴赏模式（Enable_Appreciation） */
  enableAppreciation: boolean;
  /** 是否开启打字音（TypingSoundEnabled） */
  typingSoundEnabled: boolean;
};

const DEFAULT_REALTIME_WEBGAL_GAME_CONFIG: RealtimeWebgalGameConfig = {
  coverFromRoomAvatarEnabled: true,
  startupLogoFromRoomAvatarEnabled: true,
  gameIconFromRoomAvatarEnabled: false,
  gameNameFromRoomNameEnabled: true,
  description: "",
  packageName: "",
  showPanicEnabled: false,
  defaultLanguage: "",
  enableAppreciation: true,
  typingSoundEnabled: true,
};

type RealtimeRenderState = {
  /** 是否启用实时渲染（仅表示前端渲染器运行状态，具体连接状态由渲染器内部维护） */
  enabled: boolean;

  /** 实时渲染 TTS 配置开关 */
  ttsEnabled: boolean;

  /** 实时渲染小头像开关 */
  miniAvatarEnabled: boolean;

  /** 实时渲染自动填充立绘开关 */
  autoFigureEnabled: boolean;

  /** TTS API URL（持久化到 IndexedDB） */
  ttsApiUrl: string;

  /** Terre 端口覆盖值（null 表示使用默认端口：环境变量 VITE_TERRE_URL） */
  terrePortOverride: number | null;

  /** Terre 实际端口（用于启动探测/连接） */
  terrePort: number;

  /** WebGAL 游戏配置（写入 config.txt） */
  gameConfig: RealtimeWebgalGameConfig;

  /** IndexedDB 配置是否已加载 */
  hydrated: boolean;

  /** 渲染器运行状态（镜像自 useRealtimeRender） */
  status: RealtimeRenderStatus;

  /** 初始化进度（镜像自 useRealtimeRender） */
  initProgress: InitProgress | null;

  /** 是否正在运行（镜像自 useRealtimeRender） */
  isActive: boolean;

  /** 预览 URL（镜像自 useRealtimeRender） */
  previewUrl: string | null;

  setEnabled: (value: boolean) => void;
  setTtsEnabled: (value: boolean) => void;
  setMiniAvatarEnabled: (value: boolean) => void;
  setAutoFigureEnabled: (value: boolean) => void;
  setTtsApiUrl: (value: string) => void;
  setTerrePortOverride: (port: number | null) => void;
  setGameConfig: (next: Partial<RealtimeWebgalGameConfig>) => void;
  ensureHydrated: () => Promise<void>;

  setRuntime: (runtime: {
    status?: RealtimeRenderStatus;
    initProgress?: InitProgress | null;
    isActive?: boolean;
    previewUrl?: string | null;
  }) => void;
  resetRuntime: () => void;
};

function normalizePort(port: number | null): number | null {
  if (port == null) {
    return null;
  }
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }
  const normalized = Math.floor(port);
  if (normalized < 1 || normalized > 65535) {
    return null;
  }
  return normalized;
}

function normalizeDefaultLanguage(value: unknown): RealtimeWebgalDefaultLanguage {
  if (value === "zh_CN" || value === "zh_TW" || value === "en" || value === "ja" || value === "fr" || value === "de") {
    return value;
  }
  return "";
}

let hydratePromise: Promise<void> | null = null;

export const useRealtimeRenderStore = create<RealtimeRenderState>((set, get) => ({
  enabled: false,
  ttsEnabled: false,
  miniAvatarEnabled: false,
  autoFigureEnabled: false,
  ttsApiUrl: "",
  terrePortOverride: null,
  terrePort: getDefaultTerrePort(),
  gameConfig: DEFAULT_REALTIME_WEBGAL_GAME_CONFIG,
  hydrated: false,

  status: "idle",
  initProgress: null,
  isActive: false,
  previewUrl: null,

  setEnabled: value => set(state => (state.enabled === value ? state : { enabled: value })),
  setTtsEnabled: value => set(state => (state.ttsEnabled === value ? state : { ttsEnabled: value })),
  setMiniAvatarEnabled: value => set(state => (state.miniAvatarEnabled === value ? state : { miniAvatarEnabled: value })),
  setAutoFigureEnabled: (value) => {
    if (get().autoFigureEnabled === value)
      return;
    set({ autoFigureEnabled: value });
    void setRealtimeRenderSettings({ autoFigureEnabled: value });
  },
  setTtsApiUrl: (value) => {
    const nextValue = String(value ?? "");
    if (get().ttsApiUrl === nextValue)
      return;
    set({ ttsApiUrl: nextValue });
    void setRealtimeRenderSettings({
      ttsApiUrl: nextValue,
    });
  },
  setTerrePortOverride: (port) => {
    const nextOverride = normalizePort(port);
    if (get().terrePortOverride === nextOverride)
      return;
    setTerrePortOverrideInConfig(nextOverride);
    set({
      terrePortOverride: nextOverride,
      terrePort: nextOverride ?? getDefaultTerrePort(),
    });
    void setRealtimeRenderSettings({
      terrePort: nextOverride,
    });
  },
  setGameConfig: (next) => {
    const current = get().gameConfig;
    const merged: RealtimeWebgalGameConfig = {
      ...current,
      ...next,
    };

    if (
      current.coverFromRoomAvatarEnabled === merged.coverFromRoomAvatarEnabled
      && current.startupLogoFromRoomAvatarEnabled === merged.startupLogoFromRoomAvatarEnabled
      && current.gameIconFromRoomAvatarEnabled === merged.gameIconFromRoomAvatarEnabled
      && current.gameNameFromRoomNameEnabled === merged.gameNameFromRoomNameEnabled
      && current.description === merged.description
      && current.packageName === merged.packageName
      && current.showPanicEnabled === merged.showPanicEnabled
      && current.defaultLanguage === merged.defaultLanguage
      && current.enableAppreciation === merged.enableAppreciation
      && current.typingSoundEnabled === merged.typingSoundEnabled
    ) {
      return;
    }

    set({ gameConfig: merged });
    void setRealtimeRenderSettings({
      coverFromRoomAvatarEnabled: merged.coverFromRoomAvatarEnabled,
      startupLogoFromRoomAvatarEnabled: merged.startupLogoFromRoomAvatarEnabled,
      gameIconFromRoomAvatarEnabled: merged.gameIconFromRoomAvatarEnabled,
      gameNameFromRoomNameEnabled: merged.gameNameFromRoomNameEnabled,
      description: merged.description,
      packageName: merged.packageName,
      showPanicEnabled: merged.showPanicEnabled,
      defaultLanguage: merged.defaultLanguage,
      enableAppreciation: merged.enableAppreciation,
      typingSoundEnabled: merged.typingSoundEnabled,
    });
  },
  ensureHydrated: async () => {
    if (get().hydrated) {
      return;
    }
    if (hydratePromise) {
      await hydratePromise;
      return;
    }

    hydratePromise = (async () => {
      const persisted = await getRealtimeRenderSettings();

      const persistedTtsApiUrl = (persisted?.ttsApiUrl ?? "").trim();
      const persistedTerrePortOverride = normalizePort(persisted?.terrePort ?? null);
      const persistedAutoFigureEnabled = persisted?.autoFigureEnabled;
      const persistedCoverFromRoomAvatarEnabled = persisted?.coverFromRoomAvatarEnabled;
      const persistedStartupLogoFromRoomAvatarEnabled = persisted?.startupLogoFromRoomAvatarEnabled;
      const persistedGameIconFromRoomAvatarEnabled = persisted?.gameIconFromRoomAvatarEnabled;
      const persistedGameNameFromRoomNameEnabled = persisted?.gameNameFromRoomNameEnabled;
      const persistedDescription = persisted?.description;
      const persistedPackageName = persisted?.packageName;
      const persistedShowPanicEnabled = persisted?.showPanicEnabled;
      const persistedDefaultLanguage = persisted?.defaultLanguage;
      const persistedEnableAppreciation = persisted?.enableAppreciation;
      const persistedTypingSoundEnabled = persisted?.typingSoundEnabled;

      const nextTtsApiUrl = persistedTtsApiUrl;
      const nextTerrePortOverride = persistedTerrePortOverride;
      const nextAutoFigureEnabled = typeof persistedAutoFigureEnabled === "boolean"
        ? persistedAutoFigureEnabled
        : get().autoFigureEnabled;
      const nextGameConfig: RealtimeWebgalGameConfig = {
        coverFromRoomAvatarEnabled: typeof persistedCoverFromRoomAvatarEnabled === "boolean"
          ? persistedCoverFromRoomAvatarEnabled
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.coverFromRoomAvatarEnabled,
        startupLogoFromRoomAvatarEnabled: typeof persistedStartupLogoFromRoomAvatarEnabled === "boolean"
          ? persistedStartupLogoFromRoomAvatarEnabled
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.startupLogoFromRoomAvatarEnabled,
        gameIconFromRoomAvatarEnabled: typeof persistedGameIconFromRoomAvatarEnabled === "boolean"
          ? persistedGameIconFromRoomAvatarEnabled
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.gameIconFromRoomAvatarEnabled,
        gameNameFromRoomNameEnabled: typeof persistedGameNameFromRoomNameEnabled === "boolean"
          ? persistedGameNameFromRoomNameEnabled
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.gameNameFromRoomNameEnabled,
        description: typeof persistedDescription === "string"
          ? persistedDescription
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.description,
        packageName: typeof persistedPackageName === "string"
          ? persistedPackageName
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.packageName,
        showPanicEnabled: typeof persistedShowPanicEnabled === "boolean"
          ? persistedShowPanicEnabled
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.showPanicEnabled,
        defaultLanguage: normalizeDefaultLanguage(persistedDefaultLanguage),
        enableAppreciation: typeof persistedEnableAppreciation === "boolean"
          ? persistedEnableAppreciation
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.enableAppreciation,
        typingSoundEnabled: typeof persistedTypingSoundEnabled === "boolean"
          ? persistedTypingSoundEnabled
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.typingSoundEnabled,
      };

      setTerrePortOverrideInConfig(nextTerrePortOverride);
      set({
        ttsApiUrl: nextTtsApiUrl,
        terrePortOverride: nextTerrePortOverride,
        terrePort: nextTerrePortOverride ?? getDefaultTerrePort(),
        autoFigureEnabled: nextAutoFigureEnabled,
        gameConfig: nextGameConfig,
        hydrated: true,
      });
    })()
      .catch((e) => {
        hydratePromise = null;
        throw e;
      });

    await hydratePromise;
  },

  setRuntime: runtime => set((state) => {
    const next = {
      status: runtime.status ?? state.status,
      initProgress: runtime.initProgress ?? state.initProgress,
      isActive: runtime.isActive ?? state.isActive,
      previewUrl: runtime.previewUrl ?? state.previewUrl,
    };

    if (
      next.status === state.status
      && next.initProgress === state.initProgress
      && next.isActive === state.isActive
      && next.previewUrl === state.previewUrl
    ) {
      return state;
    }

    return { ...state, ...next };
  }),
  resetRuntime: () => set({
    status: "idle",
    initProgress: null,
    isActive: false,
    previewUrl: null,
  }),
}));
