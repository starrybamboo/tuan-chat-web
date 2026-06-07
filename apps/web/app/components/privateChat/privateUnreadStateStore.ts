import { create } from "zustand";

type PrivateUnreadState = {
  optimisticReadSyncMap: Record<number, number>;
  markContactAsRead: (contactId: number, syncId: number) => void;
  reset: () => void;
};

export function mergeOptimisticReadSyncMap(
  current: Record<number, number>,
  contactId: number,
  syncId: number,
): Record<number, number> {
  if (!Number.isFinite(contactId) || contactId <= 0) {
    return current;
  }
  if (!Number.isFinite(syncId) || syncId <= 0) {
    return current;
  }
  const prevSync = current[contactId] ?? 0;
  if (syncId <= prevSync) {
    return current;
  }
  return {
    ...current,
    [contactId]: syncId,
  };
}

export const usePrivateUnreadStateStore = create<PrivateUnreadState>(set => ({
  optimisticReadSyncMap: {},
  markContactAsRead: (contactId, syncId) => {
    set((state) => {
      const nextMap = mergeOptimisticReadSyncMap(state.optimisticReadSyncMap, contactId, syncId);
      if (nextMap === state.optimisticReadSyncMap) {
        return state;
      }
      return {
        ...state,
        optimisticReadSyncMap: nextMap,
      };
    });
  },
  reset: () => {
    set((state) => {
      if (Object.keys(state.optimisticReadSyncMap).length === 0) {
        return state;
      }
      return {
        ...state,
        optimisticReadSyncMap: {},
      };
    });
  },
}));
