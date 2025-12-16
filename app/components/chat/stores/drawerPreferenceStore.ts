import { create } from "zustand";

type DrawerPreferenceState = {
  chatLeftPanelWidth: number;
  userDrawerWidth: number;
  roleDrawerWidth: number;
  initiativeDrawerWidth: number;
  clueDrawerWidth: number;
  mapDrawerWidth: number;
  exportDrawerWidth: number;
  webgalDrawerWidth: number;

  setChatLeftPanelWidth: (width: number) => void;
  setUserDrawerWidth: (width: number) => void;
  setRoleDrawerWidth: (width: number) => void;
  setInitiativeDrawerWidth: (width: number) => void;
  setClueDrawerWidth: (width: number) => void;
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

export const useDrawerPreferenceStore = create<DrawerPreferenceState>(set => ({
  chatLeftPanelWidth: readNumber("chatLeftPanelWidth", 430),
  userDrawerWidth: readNumber("userDrawerWidth", 300),
  roleDrawerWidth: readNumber("roleDrawerWidth", 300),
  initiativeDrawerWidth: readNumber("initiativeDrawerWidth", 300),
  clueDrawerWidth: readNumber("clueDrawerWidth", 300),
  mapDrawerWidth: readNumber("mapDrawerWidth", 600),
  exportDrawerWidth: readNumber("exportDrawerWidth", 350),
  webgalDrawerWidth: readNumber("webgalDrawerWidth", 600),

  setChatLeftPanelWidth: (width) => {
    writeNumber("chatLeftPanelWidth", width);
    set({ chatLeftPanelWidth: width });
  },
  setUserDrawerWidth: (width) => {
    writeNumber("userDrawerWidth", width);
    set({ userDrawerWidth: width });
  },
  setRoleDrawerWidth: (width) => {
    writeNumber("roleDrawerWidth", width);
    set({ roleDrawerWidth: width });
  },
  setInitiativeDrawerWidth: (width) => {
    writeNumber("initiativeDrawerWidth", width);
    set({ initiativeDrawerWidth: width });
  },
  setClueDrawerWidth: (width) => {
    writeNumber("clueDrawerWidth", width);
    set({ clueDrawerWidth: width });
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
