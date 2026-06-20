import { create } from "zustand";

type RoomRoleSelectionState = {
  /** 房间ID -> 角色ID */
  curRoleIdMap: Record<number, number>;

  /** 角色ID -> 立绘ID */
  curAvatarIdMap: Record<number, number>;

  /** 角色ID -> 当前打开的立绘组ID；0 表示未分组 */
  curAvatarVariantIdMap: Record<number, number>;

  setCurRoleIdForRoom: (roomId: number, roleId: number) => void;
  setCurAvatarIdForRole: (roleId: number, avatarId: number) => void;
  setCurAvatarVariantIdForRole: (roleId: number, variantId: number) => void;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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
  curRoleIdMap: readJson<Record<number, number>>("curRoleIdMap", {}),
  curAvatarIdMap: readJson<Record<number, number>>("curAvatarIdMap", {}),
  curAvatarVariantIdMap: readJson<Record<number, number>>("curAvatarVariantIdMap", {}),
};

export const useRoomRoleSelectionStore = create<RoomRoleSelectionState>(set => ({
  ...INITIAL_STATE,

  setCurRoleIdForRoom: (roomId, roleId) => {
    set((state) => {
      if (state.curRoleIdMap[roomId] === roleId) {
        return state;
      }
      const nextMap = {
        ...state.curRoleIdMap,
        [roomId]: roleId,
      };
      writeJson("curRoleIdMap", nextMap);
      return { curRoleIdMap: nextMap };
    });
  },

  setCurAvatarIdForRole: (roleId, avatarId) => {
    set((state) => {
      if (state.curAvatarIdMap[roleId] === avatarId) {
        return state;
      }
      const nextMap = {
        ...state.curAvatarIdMap,
        [roleId]: avatarId,
      };
      writeJson("curAvatarIdMap", nextMap);
      return { curAvatarIdMap: nextMap };
    });
  },

  setCurAvatarVariantIdForRole: (roleId, variantId) => {
    set((state) => {
      if (state.curAvatarVariantIdMap[roleId] === variantId) {
        return state;
      }
      const nextMap = {
        ...state.curAvatarVariantIdMap,
        [roleId]: variantId,
      };
      writeJson("curAvatarVariantIdMap", nextMap);
      return { curAvatarVariantIdMap: nextMap };
    });
  },
}));
