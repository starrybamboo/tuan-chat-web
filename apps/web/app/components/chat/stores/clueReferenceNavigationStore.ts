import { create } from "zustand";

export type ClueReferenceNavigationTarget = {
  sourceRoomId?: number;
  sourceMessageId?: number;
  requestId: number;
};

type ClueReferenceNavigationStore = {
  target: ClueReferenceNavigationTarget | null;
  openClueReference: (target: Omit<ClueReferenceNavigationTarget, "requestId">) => void;
  clearTarget: (requestId: number) => void;
};

let nextRequestId = 1;

function toPositiveInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}

export const useClueReferenceNavigationStore = create<ClueReferenceNavigationStore>(set => ({
  target: null,
  openClueReference: target => set({
    target: {
      sourceRoomId: toPositiveInteger(target.sourceRoomId),
      sourceMessageId: toPositiveInteger(target.sourceMessageId),
      requestId: nextRequestId++,
    },
  }),
  clearTarget: requestId => set(state => (
    state.target?.requestId === requestId ? { target: null } : state
  )),
}));
