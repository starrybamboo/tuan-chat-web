import { create } from "zustand";

import type { FigurePosition } from "@/types/voiceRenderTypes";

type RoomPreferenceState = {
  /** 是否使用气泡样式显示消息 */
  useChatBubbleStyle: boolean;

  /** WebGAL 联动模式 */
  webgalLinkMode: boolean;

  /** 自动回复模式 */
  autoReplyMode: boolean;

  /** 跑团模式 */
  runModeEnabled: boolean;

  /** 角色默认立绘位置 Map：key=roleId，value 为立绘位置；undefined 表示不显示立绘 */
  defaultFigurePositionMap: Record<number, FigurePosition>;

  /** WebGAL 对话参数：-notend（此话不停顿） */
  dialogNotend: boolean;

  /** WebGAL 对话参数：-concat（续接上段话） */
  dialogConcat: boolean;

  /** 发送区（草稿）自定义角色名：key=roleId，value=customRoleName */
  draftCustomRoleNameMap: Record<number, string>;

  setUseChatBubbleStyle: (value: boolean) => void;
  toggleUseChatBubbleStyle: () => void;

  setWebgalLinkMode: (value: boolean) => void;
  toggleWebgalLinkMode: () => void;

  setAutoReplyMode: (value: boolean) => void;
  toggleAutoReplyMode: () => void;

  setRunModeEnabled: (value: boolean) => void;

  setDefaultFigurePositionForRole: (roleId: number, position: FigurePosition) => void;

  setDialogNotend: (value: boolean) => void;
  toggleDialogNotend: () => void;

  setDialogConcat: (value: boolean) => void;
  toggleDialogConcat: () => void;

  setDraftCustomRoleNameForRole: (roleId: number, customRoleName: string | undefined) => void;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readBool(key: string, fallback: boolean): boolean {
  if (!canUseLocalStorage()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return raw === "true";
  }
  catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  }
  catch {
    // ignore
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  }
  catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
  catch {
    // ignore
  }
}

const INITIAL_STATE = {
  useChatBubbleStyle: readBool("useChatBubbleStyle", false),
  webgalLinkMode: readBool("webgalLinkMode", false),
  autoReplyMode: readBool("autoReplyMode", false),
  runModeEnabled: readBool("runModeEnabled", false),
  defaultFigurePositionMap: readJson<Record<number, FigurePosition>>("defaultFigurePositionMap", {}),
  dialogNotend: false,
  dialogConcat: false,
  draftCustomRoleNameMap: readJson<Record<number, string>>("draftCustomRoleNameMap", {}),
};

export const useRoomPreferenceStore = create<RoomPreferenceState>((set, get) => ({
  ...INITIAL_STATE,

  setUseChatBubbleStyle: (value) => {
    if (get().useChatBubbleStyle === value) {
      return;
    }
    writeBool("useChatBubbleStyle", value);
    set({ useChatBubbleStyle: value });
  },
  toggleUseChatBubbleStyle: () => {
    const next = !get().useChatBubbleStyle;
    writeBool("useChatBubbleStyle", next);
    set({ useChatBubbleStyle: next });
  },

  setWebgalLinkMode: (value) => {
    if (get().webgalLinkMode === value) {
      return;
    }
    writeBool("webgalLinkMode", value);
    set({ webgalLinkMode: value });
  },
  toggleWebgalLinkMode: () => {
    const next = !get().webgalLinkMode;
    writeBool("webgalLinkMode", next);
    set({ webgalLinkMode: next });
  },

  setAutoReplyMode: (value) => {
    if (get().autoReplyMode === value) {
      return;
    }
    writeBool("autoReplyMode", value);
    set({ autoReplyMode: value });
  },
  toggleAutoReplyMode: () => {
    const next = !get().autoReplyMode;
    writeBool("autoReplyMode", next);
    set({ autoReplyMode: next });
  },

  setRunModeEnabled: (value) => {
    if (get().runModeEnabled === value) {
      return;
    }
    writeBool("runModeEnabled", value);
    set({ runModeEnabled: value });
  },

  setDefaultFigurePositionForRole: (roleId, position) => {
    set((state) => {
      if (state.defaultFigurePositionMap[roleId] === position) {
        return state;
      }
      const nextMap: Record<number, FigurePosition> = {
        ...state.defaultFigurePositionMap,
        [roleId]: position,
      };
      writeJson("defaultFigurePositionMap", nextMap);
      return { defaultFigurePositionMap: nextMap };
    });
  },

  setDialogNotend: (value) => {
    if (get().dialogNotend === value) {
      return;
    }
    set({ dialogNotend: value });
  },
  toggleDialogNotend: () => set({ dialogNotend: !get().dialogNotend }),

  setDialogConcat: (value) => {
    if (get().dialogConcat === value) {
      return;
    }
    set({ dialogConcat: value });
  },
  toggleDialogConcat: () => set({ dialogConcat: !get().dialogConcat }),

  setDraftCustomRoleNameForRole: (roleId, customRoleName) => {
    set((state) => {
      const trimmed = (customRoleName ?? "").trim();
      const prevValue = state.draftCustomRoleNameMap[roleId];
      if (!trimmed) {
        if (prevValue == null) {
          return state;
        }
        const nextMap: Record<number, string> = { ...state.draftCustomRoleNameMap };
        delete nextMap[roleId];
        writeJson("draftCustomRoleNameMap", nextMap);
        return { draftCustomRoleNameMap: nextMap };
      }
      else {
        if (prevValue === trimmed) {
          return state;
        }
        const nextMap: Record<number, string> = { ...state.draftCustomRoleNameMap };
        nextMap[roleId] = trimmed;
        writeJson("draftCustomRoleNameMap", nextMap);
        return { draftCustomRoleNameMap: nextMap };
      }
    });
  },
}));
