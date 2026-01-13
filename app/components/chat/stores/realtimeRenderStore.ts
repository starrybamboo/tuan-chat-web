import { create } from "zustand";

import type { InitProgress, RealtimeRenderStatus } from "@/webGAL/useRealtimeRender";

import { getRealtimeRenderSettings, setRealtimeRenderSettings } from "@/components/chat/infra/indexedDB/realtimeRenderSettingsDb";
import { getDefaultTerrePort, setTerrePortOverride as setTerrePortOverrideInConfig } from "@/webGAL/terreConfig";

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
  ensureHydrated: () => Promise<void>;

  setRuntime: (runtime: {
    status?: RealtimeRenderStatus;
    initProgress?: InitProgress | null;
    isActive?: boolean;
    previewUrl?: string | null;
  }) => void;
  resetRuntime: () => void;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLegacyTtsApiUrl(): string {
  if (!canUseLocalStorage()) {
    return "";
  }
  try {
    return window.localStorage.getItem("tts_api_url") || "";
  }
  catch {
    return "";
  }
}

function clearLegacyTtsApiUrl(): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    window.localStorage.removeItem("tts_api_url");
  }
  catch {
    // ignore
  }
}

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

let hydratePromise: Promise<void> | null = null;

export const useRealtimeRenderStore = create<RealtimeRenderState>((set, get) => ({
  enabled: false,
  ttsEnabled: false,
  miniAvatarEnabled: false,
  autoFigureEnabled: false,
  ttsApiUrl: "",
  terrePortOverride: null,
  terrePort: getDefaultTerrePort(),
  hydrated: false,

  status: "idle",
  initProgress: null,
  isActive: false,
  previewUrl: null,

  setEnabled: value => set({ enabled: value }),
  setTtsEnabled: value => set({ ttsEnabled: value }),
  setMiniAvatarEnabled: value => set({ miniAvatarEnabled: value }),
  setAutoFigureEnabled: value => set({ autoFigureEnabled: value }),
  setTtsApiUrl: (value) => {
    set({ ttsApiUrl: value });
    void setRealtimeRenderSettings({
      ttsApiUrl: value,
      terrePort: get().terrePortOverride,
    });
  },
  setTerrePortOverride: (port) => {
    const nextOverride = normalizePort(port);
    setTerrePortOverrideInConfig(nextOverride);
    set({
      terrePortOverride: nextOverride,
      terrePort: nextOverride ?? getDefaultTerrePort(),
    });
    void setRealtimeRenderSettings({
      ttsApiUrl: get().ttsApiUrl,
      terrePort: nextOverride,
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

      const legacyTtsApiUrl = !persistedTtsApiUrl ? readLegacyTtsApiUrl().trim() : "";
      const nextTtsApiUrl = persistedTtsApiUrl || legacyTtsApiUrl || "";
      const nextTerrePortOverride = persistedTerrePortOverride;

      setTerrePortOverrideInConfig(nextTerrePortOverride);
      set({
        ttsApiUrl: nextTtsApiUrl,
        terrePortOverride: nextTerrePortOverride,
        terrePort: nextTerrePortOverride ?? getDefaultTerrePort(),
        hydrated: true,
      });

      if (!persisted && legacyTtsApiUrl) {
        await setRealtimeRenderSettings({
          ttsApiUrl: legacyTtsApiUrl,
          terrePort: null,
        });
        clearLegacyTtsApiUrl();
      }
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
