import { create } from "zustand";

import type { InitProgress, RealtimeRenderStatus } from "@/webGAL/useRealtimeRender";

type RealtimeRenderState = {
  /** 是否启用实时渲染（仅表示前端渲染器运行状态，具体连接状态由渲染器内部维护） */
  enabled: boolean;

  /** 实时渲染 TTS 配置开关 */
  ttsEnabled: boolean;

  /** 实时渲染小头像开关 */
  miniAvatarEnabled: boolean;

  /** 实时渲染自动填充立绘开关 */
  autoFigureEnabled: boolean;

  /** TTS API URL（持久化到 localStorage: tts_api_url） */
  ttsApiUrl: string;

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

function readString(key: string, fallback: string): string {
  if (!canUseLocalStorage()) {
    return fallback;
  }
  try {
    return window.localStorage.getItem(key) || fallback;
  }
  catch {
    return fallback;
  }
}

function writeString(key: string, value: string): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    }
    else {
      window.localStorage.removeItem(key);
    }
  }
  catch {
    // ignore
  }
}

export const useRealtimeRenderStore = create<RealtimeRenderState>(set => ({
  enabled: false,
  ttsEnabled: false,
  miniAvatarEnabled: false,
  autoFigureEnabled: false,
  ttsApiUrl: readString("tts_api_url", ""),

  status: "idle",
  initProgress: null,
  isActive: false,
  previewUrl: null,

  setEnabled: value => set({ enabled: value }),
  setTtsEnabled: value => set({ ttsEnabled: value }),
  setMiniAvatarEnabled: value => set({ miniAvatarEnabled: value }),
  setAutoFigureEnabled: value => set({ autoFigureEnabled: value }),
  setTtsApiUrl: (value) => {
    writeString("tts_api_url", value);
    set({ ttsApiUrl: value });
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
