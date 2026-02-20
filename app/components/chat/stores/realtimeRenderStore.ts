import { create } from "zustand";

import type { RealtimeRenderCloudSettings } from "@/components/chat/infra/cloud/realtimeRenderSettingsCloud";
import type { InitProgress, RealtimeRenderStatus } from "@/webGAL/useRealtimeRender";

import {
  getRealtimeRenderSettingsFromCloud,
  setRealtimeRenderSettingsToCloud,
} from "@/components/chat/infra/cloud/realtimeRenderSettingsCloud";
import { getDefaultTerrePort, setTerrePortOverride as setTerrePortOverrideInConfig } from "@/webGAL/terreConfig";

export type RealtimeWebgalDefaultLanguage = "" | "zh_CN" | "zh_TW" | "en" | "ja" | "fr" | "de";
export type RealtimeWebgalBaseTemplate = "none" | "black";
const DEFAULT_TYPING_SOUND_INTERVAL = 1.5;
const DEFAULT_TYPING_SOUND_PUNCTUATION_PAUSE = 100;
export const DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD = 78;
export const MIN_ROOM_CONTENT_ALERT_THRESHOLD = 20;
export const MAX_ROOM_CONTENT_ALERT_THRESHOLD = 1024;

export type RealtimeWebgalGameConfig = {
  /** 未设置标题背景图 URL 时，是否将群聊头像同步为 WebGAL 标题背景图（Title_img） */
  coverFromRoomAvatarEnabled: boolean;
  /** WebGAL 标题背景图 URL（Title_img，优先于“标题背景图使用群聊头像”） */
  titleImageUrl: string;
  /** 未设置启动图 URL 时，是否将群聊头像同步为 WebGAL 启动图（Game_Logo） */
  startupLogoFromRoomAvatarEnabled: boolean;
  /** WebGAL 启动图 URL（Game_Logo，优先于“启动图使用群聊头像”） */
  startupLogoUrl: string;
  /** 是否将群聊头像同步为 WebGAL 游戏图标（icons/*） */
  gameIconFromRoomAvatarEnabled: boolean;
  /** 是否将空间名称+spaceId 同步为 WebGAL 游戏名（Game_name） */
  gameNameFromRoomNameEnabled: boolean;
  /** WebGAL 游戏简介（Description） */
  description: string;
  /** WebGAL 游戏包名（Package_name） */
  packageName: string;
  /** WebGAL 底层模板（none=默认模板, black=黑色模板） */
  baseTemplate: RealtimeWebgalBaseTemplate;
  /** 是否启用紧急回避（Show_panic） */
  showPanicEnabled: boolean;
  /** 默认语言（Default_Language） */
  defaultLanguage: RealtimeWebgalDefaultLanguage;
  /** 是否开启鉴赏模式（Enable_Appreciation） */
  enableAppreciation: boolean;
  /** 是否开启打字音（TypingSoundEnabled） */
  typingSoundEnabled: boolean;
  /** 打字音播放间隔（每隔多少个字符播放一次） */
  typingSoundInterval: number;
  /** 标点符号额外停顿（毫秒） */
  typingSoundPunctuationPause: number;
  /** 打字音效文件 URL（将上传同步为 TypingSoundSe） */
  typingSoundSeUrl: string;
};

const DEFAULT_REALTIME_WEBGAL_GAME_CONFIG: RealtimeWebgalGameConfig = {
  coverFromRoomAvatarEnabled: true,
  titleImageUrl: "",
  startupLogoFromRoomAvatarEnabled: false,
  startupLogoUrl: "",
  gameIconFromRoomAvatarEnabled: true,
  gameNameFromRoomNameEnabled: true,
  description: "",
  packageName: "",
  baseTemplate: "none",
  showPanicEnabled: false,
  defaultLanguage: "",
  enableAppreciation: true,
  typingSoundEnabled: false,
  typingSoundInterval: DEFAULT_TYPING_SOUND_INTERVAL,
  typingSoundPunctuationPause: DEFAULT_TYPING_SOUND_PUNCTUATION_PAUSE,
  typingSoundSeUrl: "",
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

  /** 单条房间内容预警阈值（超过时提示拆分） */
  roomContentAlertThreshold: number;

  /** TTS API URL（云端：space.extra） */
  ttsApiUrl: string;

  /** Terre 端口覆盖值（null 表示使用默认端口：环境变量 VITE_TERRE_URL） */
  terrePortOverride: number | null;

  /** Terre 实际端口（用于启动探测/连接） */
  terrePort: number;

  /** WebGAL 游戏配置（写入 config.txt） */
  gameConfig: RealtimeWebgalGameConfig;

  /** 当前已加载配置对应的 spaceId（用于云端保存） */
  activeSpaceId: number | null;

  /** 云端配置是否已加载 */
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
  setRoomContentAlertThreshold: (value: number) => void;
  setTtsApiUrl: (value: string) => void;
  setTerrePortOverride: (port: number | null) => void;
  setGameConfig: (next: Partial<RealtimeWebgalGameConfig>) => void;
  ensureHydrated: (spaceId?: number | null) => Promise<void>;

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

function normalizeSpaceId(spaceId?: number | null): number | null {
  if (typeof spaceId !== "number" || !Number.isFinite(spaceId) || spaceId <= 0) {
    return null;
  }
  return Math.floor(spaceId);
}

function normalizeDefaultLanguage(value: unknown): RealtimeWebgalDefaultLanguage {
  if (value === "zh_CN" || value === "zh_TW" || value === "en" || value === "ja" || value === "fr" || value === "de") {
    return value;
  }
  return "";
}

function normalizeBaseTemplate(value: unknown): RealtimeWebgalBaseTemplate {
  if (value === "black") {
    return "black";
  }
  return "none";
}

function normalizeTypingSoundInterval(value: unknown): number {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) {
    return DEFAULT_TYPING_SOUND_INTERVAL;
  }
  return Math.max(0.1, Math.min(20, Number(raw.toFixed(2))));
}

function normalizeTypingSoundPunctuationPause(value: unknown): number {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) {
    return DEFAULT_TYPING_SOUND_PUNCTUATION_PAUSE;
  }
  return Math.max(0, Math.min(5000, Math.floor(raw)));
}

function normalizeRoomContentAlertThreshold(value: unknown): number {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) {
    return DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD;
  }
  const normalized = Math.floor(raw);
  return Math.max(MIN_ROOM_CONTENT_ALERT_THRESHOLD, Math.min(MAX_ROOM_CONTENT_ALERT_THRESHOLD, normalized));
}

function buildCloudSettingsSnapshot(state: Pick<RealtimeRenderState, "ttsApiUrl" | "terrePortOverride" | "autoFigureEnabled" | "roomContentAlertThreshold" | "gameConfig">): RealtimeRenderCloudSettings {
  return {
    ttsApiUrl: state.ttsApiUrl,
    terrePort: state.terrePortOverride,
    autoFigureEnabled: state.autoFigureEnabled,
    roomContentAlertThreshold: state.roomContentAlertThreshold,
    coverFromRoomAvatarEnabled: state.gameConfig.coverFromRoomAvatarEnabled,
    titleImageUrl: state.gameConfig.titleImageUrl,
    startupLogoFromRoomAvatarEnabled: state.gameConfig.startupLogoFromRoomAvatarEnabled,
    startupLogoUrl: state.gameConfig.startupLogoUrl,
    gameIconFromRoomAvatarEnabled: state.gameConfig.gameIconFromRoomAvatarEnabled,
    gameNameFromRoomNameEnabled: state.gameConfig.gameNameFromRoomNameEnabled,
    description: state.gameConfig.description,
    packageName: state.gameConfig.packageName,
    baseTemplate: state.gameConfig.baseTemplate,
    showPanicEnabled: state.gameConfig.showPanicEnabled,
    defaultLanguage: state.gameConfig.defaultLanguage,
    enableAppreciation: state.gameConfig.enableAppreciation,
    typingSoundEnabled: state.gameConfig.typingSoundEnabled,
    typingSoundInterval: state.gameConfig.typingSoundInterval,
    typingSoundPunctuationPause: state.gameConfig.typingSoundPunctuationPause,
    typingSoundSeUrl: state.gameConfig.typingSoundSeUrl,
  };
}

let hydratePromise: Promise<void> | null = null;
let hydrateSpaceId: number | null = null;
let persistQueue: Promise<void> = Promise.resolve();

function enqueuePersist(spaceId: number, settings: RealtimeRenderCloudSettings): void {
  persistQueue = persistQueue
    .catch(() => {})
    .then(async () => {
      try {
        await setRealtimeRenderSettingsToCloud(spaceId, settings);
      }
      catch (error) {
        console.warn("[realtimeRenderStore] 保存 WebGAL 实时渲染配置失败:", error);
      }
    });
}

export const useRealtimeRenderStore = create<RealtimeRenderState>((set, get) => ({
  enabled: false,
  ttsEnabled: false,
  miniAvatarEnabled: false,
  autoFigureEnabled: false,
  roomContentAlertThreshold: DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD,
  ttsApiUrl: "",
  terrePortOverride: null,
  terrePort: getDefaultTerrePort(),
  gameConfig: DEFAULT_REALTIME_WEBGAL_GAME_CONFIG,
  activeSpaceId: null,
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

    const state = get();
    const spaceId = state.activeSpaceId;
    if (spaceId != null) {
      enqueuePersist(spaceId, buildCloudSettingsSnapshot(state));
    }
  },
  setRoomContentAlertThreshold: (value) => {
    const nextValue = normalizeRoomContentAlertThreshold(value);
    if (get().roomContentAlertThreshold === nextValue)
      return;
    set({ roomContentAlertThreshold: nextValue });

    const state = get();
    const spaceId = state.activeSpaceId;
    if (spaceId != null) {
      enqueuePersist(spaceId, buildCloudSettingsSnapshot(state));
    }
  },
  setTtsApiUrl: (value) => {
    const nextValue = String(value ?? "");
    if (get().ttsApiUrl === nextValue)
      return;
    set({ ttsApiUrl: nextValue });

    const state = get();
    const spaceId = state.activeSpaceId;
    if (spaceId != null) {
      enqueuePersist(spaceId, buildCloudSettingsSnapshot(state));
    }
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

    const state = get();
    const spaceId = state.activeSpaceId;
    if (spaceId != null) {
      enqueuePersist(spaceId, buildCloudSettingsSnapshot(state));
    }
  },
  setGameConfig: (next) => {
    const current = get().gameConfig;
    const merged: RealtimeWebgalGameConfig = {
      ...current,
      ...next,
    };

    if (
      current.coverFromRoomAvatarEnabled === merged.coverFromRoomAvatarEnabled
      && current.titleImageUrl === merged.titleImageUrl
      && current.startupLogoFromRoomAvatarEnabled === merged.startupLogoFromRoomAvatarEnabled
      && current.startupLogoUrl === merged.startupLogoUrl
      && current.gameIconFromRoomAvatarEnabled === merged.gameIconFromRoomAvatarEnabled
      && current.gameNameFromRoomNameEnabled === merged.gameNameFromRoomNameEnabled
      && current.description === merged.description
      && current.packageName === merged.packageName
      && current.baseTemplate === merged.baseTemplate
      && current.showPanicEnabled === merged.showPanicEnabled
      && current.defaultLanguage === merged.defaultLanguage
      && current.enableAppreciation === merged.enableAppreciation
      && current.typingSoundEnabled === merged.typingSoundEnabled
      && current.typingSoundInterval === merged.typingSoundInterval
      && current.typingSoundPunctuationPause === merged.typingSoundPunctuationPause
      && current.typingSoundSeUrl === merged.typingSoundSeUrl
    ) {
      return;
    }

    set({ gameConfig: merged });

    const state = get();
    const spaceId = state.activeSpaceId;
    if (spaceId != null) {
      enqueuePersist(spaceId, buildCloudSettingsSnapshot(state));
    }
  },
  ensureHydrated: async (spaceId) => {
    const normalizedSpaceId = normalizeSpaceId(spaceId) ?? get().activeSpaceId;
    if (normalizedSpaceId == null) {
      if (!get().hydrated) {
        set({ hydrated: true });
      }
      return;
    }

    if (get().hydrated && get().activeSpaceId === normalizedSpaceId) {
      return;
    }

    if (hydratePromise && hydrateSpaceId === normalizedSpaceId) {
      await hydratePromise;
      return;
    }

    if (hydratePromise) {
      await hydratePromise;
    }

    hydrateSpaceId = normalizedSpaceId;
    hydratePromise = (async () => {
      let persisted: RealtimeRenderCloudSettings | null = null;
      try {
        persisted = await getRealtimeRenderSettingsFromCloud(normalizedSpaceId);
      }
      catch (error) {
        console.warn("[realtimeRenderStore] 加载 WebGAL 实时渲染配置失败，回退默认配置:", error);
      }

      const persistedTtsApiUrl = (persisted?.ttsApiUrl ?? "").trim();
      const persistedTerrePortOverride = normalizePort(persisted?.terrePort ?? null);
      const persistedAutoFigureEnabled = persisted?.autoFigureEnabled;
      const persistedRoomContentAlertThreshold = persisted?.roomContentAlertThreshold;
      const persistedCoverFromRoomAvatarEnabled = persisted?.coverFromRoomAvatarEnabled;
      const persistedTitleImageUrl = persisted?.titleImageUrl;
      const persistedStartupLogoFromRoomAvatarEnabled = persisted?.startupLogoFromRoomAvatarEnabled;
      const persistedStartupLogoUrl = persisted?.startupLogoUrl;
      const persistedGameIconFromRoomAvatarEnabled = persisted?.gameIconFromRoomAvatarEnabled;
      const persistedGameNameFromRoomNameEnabled = persisted?.gameNameFromRoomNameEnabled;
      const persistedDescription = persisted?.description;
      const persistedPackageName = persisted?.packageName;
      const persistedBaseTemplate = persisted?.baseTemplate;
      const persistedShowPanicEnabled = persisted?.showPanicEnabled;
      const persistedDefaultLanguage = persisted?.defaultLanguage;
      const persistedEnableAppreciation = persisted?.enableAppreciation;
      const persistedTypingSoundEnabled = persisted?.typingSoundEnabled;
      const persistedTypingSoundInterval = persisted?.typingSoundInterval;
      const persistedTypingSoundPunctuationPause = persisted?.typingSoundPunctuationPause;
      const persistedTypingSoundSeUrl = persisted?.typingSoundSeUrl;

      const nextTtsApiUrl = persistedTtsApiUrl;
      const nextTerrePortOverride = persistedTerrePortOverride;
      const nextAutoFigureEnabled = typeof persistedAutoFigureEnabled === "boolean"
        ? persistedAutoFigureEnabled
        : false;
      const nextRoomContentAlertThreshold = normalizeRoomContentAlertThreshold(persistedRoomContentAlertThreshold);
      const nextGameConfig: RealtimeWebgalGameConfig = {
        coverFromRoomAvatarEnabled: typeof persistedCoverFromRoomAvatarEnabled === "boolean"
          ? persistedCoverFromRoomAvatarEnabled
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.coverFromRoomAvatarEnabled,
        titleImageUrl: typeof persistedTitleImageUrl === "string"
          ? persistedTitleImageUrl.trim()
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.titleImageUrl,
        startupLogoFromRoomAvatarEnabled: typeof persistedStartupLogoFromRoomAvatarEnabled === "boolean"
          ? persistedStartupLogoFromRoomAvatarEnabled
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.startupLogoFromRoomAvatarEnabled,
        startupLogoUrl: typeof persistedStartupLogoUrl === "string"
          ? persistedStartupLogoUrl.trim()
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.startupLogoUrl,
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
        baseTemplate: normalizeBaseTemplate(persistedBaseTemplate),
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
        typingSoundInterval: normalizeTypingSoundInterval(persistedTypingSoundInterval),
        typingSoundPunctuationPause: normalizeTypingSoundPunctuationPause(persistedTypingSoundPunctuationPause),
        typingSoundSeUrl: typeof persistedTypingSoundSeUrl === "string"
          ? persistedTypingSoundSeUrl.trim()
          : DEFAULT_REALTIME_WEBGAL_GAME_CONFIG.typingSoundSeUrl,
      };

      setTerrePortOverrideInConfig(nextTerrePortOverride);
      set({
        activeSpaceId: normalizedSpaceId,
        ttsApiUrl: nextTtsApiUrl,
        terrePortOverride: nextTerrePortOverride,
        terrePort: nextTerrePortOverride ?? getDefaultTerrePort(),
        autoFigureEnabled: nextAutoFigureEnabled,
        roomContentAlertThreshold: nextRoomContentAlertThreshold,
        gameConfig: nextGameConfig,
        hydrated: true,
      });
    })()
      .finally(() => {
        hydratePromise = null;
        hydrateSpaceId = null;
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
