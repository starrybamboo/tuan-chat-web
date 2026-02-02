import { create } from "zustand";

type DrawerPreferenceState = {
  chatLeftPanelWidth: number;
  subRoomWindowWidth: number;
  userDrawerWidth: number;
  roleDrawerWidth: number;
  threadDrawerWidth: number;
  initiativeDrawerWidth: number;
  mapDrawerWidth: number;
  exportDrawerWidth: number;
  webgalDrawerWidth: number;

  /** 仅在客户端 mount 后调用：从 localStorage 同步偏好，避免 SSR hydration mismatch */
  hydrateFromLocalStorage: () => void;

  setChatLeftPanelWidth: (width: number) => void;
  setSubRoomWindowWidth: (width: number) => void;
  setUserDrawerWidth: (width: number) => void;
  setRoleDrawerWidth: (width: number) => void;
  setThreadDrawerWidth: (width: number) => void;
  setInitiativeDrawerWidth: (width: number) => void;
  setMapDrawerWidth: (width: number) => void;
  setExportDrawerWidth: (width: number) => void;
  setWebgalDrawerWidth: (width: number) => void;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readNumber(key: string, fallback: number): number {
  if (!canUseLocalStorage()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  catch {
    return fallback;
  }
}

function writeNumber(key: string, value: number): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(key, String(value));
  }
  catch {
    // ignore
  }
}

const DEFAULT_DRAWER_WIDTHS = {
  chatLeftPanelWidth: 430,
  subRoomWindowWidth: 560,
  userDrawerWidth: 270,
  roleDrawerWidth: 270,
  threadDrawerWidth: 420,
  initiativeDrawerWidth: 270,
  mapDrawerWidth: 600,
  exportDrawerWidth: 350,
  webgalDrawerWidth: 600,
} as const;

let hasHydrated = false;

export const useDrawerPreferenceStore = create<DrawerPreferenceState>((set, get) => ({
  // IMPORTANT: 不要在模块初始化期读取 localStorage（客户端会与服务端 HTML 不一致，触发 hydration mismatch）。
  // 统一先用默认值首屏渲染，随后在 mount 后通过 hydrateFromLocalStorage 覆盖为用户偏好。
  chatLeftPanelWidth: DEFAULT_DRAWER_WIDTHS.chatLeftPanelWidth,
  subRoomWindowWidth: DEFAULT_DRAWER_WIDTHS.subRoomWindowWidth,
  userDrawerWidth: DEFAULT_DRAWER_WIDTHS.userDrawerWidth,
  roleDrawerWidth: DEFAULT_DRAWER_WIDTHS.roleDrawerWidth,
  threadDrawerWidth: DEFAULT_DRAWER_WIDTHS.threadDrawerWidth,
  initiativeDrawerWidth: DEFAULT_DRAWER_WIDTHS.initiativeDrawerWidth,
  mapDrawerWidth: DEFAULT_DRAWER_WIDTHS.mapDrawerWidth,
  exportDrawerWidth: DEFAULT_DRAWER_WIDTHS.exportDrawerWidth,
  webgalDrawerWidth: DEFAULT_DRAWER_WIDTHS.webgalDrawerWidth,

  hydrateFromLocalStorage: () => {
    if (hasHydrated)
      return;
    hasHydrated = true;

    const next = {
      chatLeftPanelWidth: readNumber("chatLeftPanelWidth", DEFAULT_DRAWER_WIDTHS.chatLeftPanelWidth),
      subRoomWindowWidth: readNumber("subRoomWindowWidth", DEFAULT_DRAWER_WIDTHS.subRoomWindowWidth),
      userDrawerWidth: readNumber("userDrawerWidth", DEFAULT_DRAWER_WIDTHS.userDrawerWidth),
      roleDrawerWidth: readNumber("roleDrawerWidth", DEFAULT_DRAWER_WIDTHS.roleDrawerWidth),
      threadDrawerWidth: readNumber("threadDrawerWidth", DEFAULT_DRAWER_WIDTHS.threadDrawerWidth),
      initiativeDrawerWidth: readNumber("initiativeDrawerWidth", DEFAULT_DRAWER_WIDTHS.initiativeDrawerWidth),
      mapDrawerWidth: readNumber("mapDrawerWidth", DEFAULT_DRAWER_WIDTHS.mapDrawerWidth),
      exportDrawerWidth: readNumber("exportDrawerWidth", DEFAULT_DRAWER_WIDTHS.exportDrawerWidth),
      webgalDrawerWidth: readNumber("webgalDrawerWidth", DEFAULT_DRAWER_WIDTHS.webgalDrawerWidth),
    } satisfies Partial<DrawerPreferenceState>;

    // 仅在确实可用时写入（避免 SSR/安全沙箱报错）。
    if (!canUseLocalStorage()) {
      return;
    }

    // 只有当值不同才 set，减少无意义重渲染。
    const prev = get();
    let changed = false;
    for (const k of Object.keys(next) as (keyof typeof next)[]) {
      if (typeof next[k] === "number" && (prev as any)[k] !== next[k]) {
        changed = true;
        break;
      }
    }
    if (changed) {
      set(next as any);
    }
  },

  setChatLeftPanelWidth: (width) => {
    writeNumber("chatLeftPanelWidth", width);
    set({ chatLeftPanelWidth: width });
  },
  setSubRoomWindowWidth: (width) => {
    writeNumber("subRoomWindowWidth", width);
    set({ subRoomWindowWidth: width });
  },
  setUserDrawerWidth: (width) => {
    writeNumber("userDrawerWidth", width);
    set({ userDrawerWidth: width });
  },
  setRoleDrawerWidth: (width) => {
    writeNumber("roleDrawerWidth", width);
    set({ roleDrawerWidth: width });
  },
  setThreadDrawerWidth: (width) => {
    writeNumber("threadDrawerWidth", width);
    set({ threadDrawerWidth: width });
  },
  setInitiativeDrawerWidth: (width) => {
    writeNumber("initiativeDrawerWidth", width);
    set({ initiativeDrawerWidth: width });
  },
  setMapDrawerWidth: (width) => {
    writeNumber("mapDrawerWidth", width);
    set({ mapDrawerWidth: width });
  },
  setExportDrawerWidth: (width) => {
    writeNumber("exportDrawerWidth", width);
    set({ exportDrawerWidth: width });
  },
  setWebgalDrawerWidth: (width) => {
    writeNumber("webgalDrawerWidth", width);
    set({ webgalDrawerWidth: width });
  },
}));
