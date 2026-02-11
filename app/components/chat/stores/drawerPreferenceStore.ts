import { create } from "zustand";

type DrawerPreferenceState = {
  chatLeftPanelWidth: number;
  subRoomWindowWidth: number;
  userDrawerWidth: number;
  roleDrawerWidth: number;
  docFolderDrawerWidth: number;
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
  setDocFolderDrawerWidth: (width: number) => void;
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
  userDrawerWidth: 320,
  roleDrawerWidth: 320,
  docFolderDrawerWidth: 320,
  threadDrawerWidth: 420,
  initiativeDrawerWidth: 320,
  mapDrawerWidth: 600,
  exportDrawerWidth: 320,
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
  docFolderDrawerWidth: DEFAULT_DRAWER_WIDTHS.docFolderDrawerWidth,
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
      docFolderDrawerWidth: readNumber("docFolderDrawerWidth", DEFAULT_DRAWER_WIDTHS.docFolderDrawerWidth),
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
    set((state) => {
      if (state.chatLeftPanelWidth === width)
        return state;
      writeNumber("chatLeftPanelWidth", width);
      return { chatLeftPanelWidth: width };
    });
  },
  setSubRoomWindowWidth: (width) => {
    set((state) => {
      if (state.subRoomWindowWidth === width)
        return state;
      writeNumber("subRoomWindowWidth", width);
      return { subRoomWindowWidth: width };
    });
  },
  setUserDrawerWidth: (width) => {
    set((state) => {
      if (state.userDrawerWidth === width)
        return state;
      writeNumber("userDrawerWidth", width);
      return { userDrawerWidth: width };
    });
  },
  setRoleDrawerWidth: (width) => {
    set((state) => {
      if (state.roleDrawerWidth === width)
        return state;
      writeNumber("roleDrawerWidth", width);
      return { roleDrawerWidth: width };
    });
  },
  setDocFolderDrawerWidth: (width) => {
    set((state) => {
      if (state.docFolderDrawerWidth === width)
        return state;
      writeNumber("docFolderDrawerWidth", width);
      return { docFolderDrawerWidth: width };
    });
  },
  setThreadDrawerWidth: (width) => {
    set((state) => {
      if (state.threadDrawerWidth === width)
        return state;
      writeNumber("threadDrawerWidth", width);
      return { threadDrawerWidth: width };
    });
  },
  setInitiativeDrawerWidth: (width) => {
    set((state) => {
      if (state.initiativeDrawerWidth === width)
        return state;
      writeNumber("initiativeDrawerWidth", width);
      return { initiativeDrawerWidth: width };
    });
  },
  setMapDrawerWidth: (width) => {
    set((state) => {
      if (state.mapDrawerWidth === width)
        return state;
      writeNumber("mapDrawerWidth", width);
      return { mapDrawerWidth: width };
    });
  },
  setExportDrawerWidth: (width) => {
    set((state) => {
      if (state.exportDrawerWidth === width)
        return state;
      writeNumber("exportDrawerWidth", width);
      return { exportDrawerWidth: width };
    });
  },
  setWebgalDrawerWidth: (width) => {
    set((state) => {
      if (state.webgalDrawerWidth === width)
        return state;
      writeNumber("webgalDrawerWidth", width);
      return { webgalDrawerWidth: width };
    });
  },
}));
