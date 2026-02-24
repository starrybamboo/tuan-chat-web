import { create } from "zustand";

export type AutoPlaySoundPurpose = "bgm" | "se";

type PendingAutoPlayEvent = {
  roomId: number;
  messageId: number;
  purpose: AutoPlaySoundPurpose;
  sequence: number;
  createdAtMs: number;
};

type ConsumePendingParams = {
  roomId: number;
  messageId: number;
  purpose: AutoPlaySoundPurpose;
};

type AudioMessageAutoPlayState = {
  /** 当前用户正在查看的房间（仅该房间允许自动播放） */
  activeRoomId: number | null;
  pendingByMessageId: Record<number, PendingAutoPlayEvent | undefined>;
  bgmStopSeqByRoomId: Record<number, number | undefined>;
  nextSequence: number;

  setActiveRoomId: (roomId: number | null) => void;
  enqueueFromWs: (event: { roomId: number; messageId: number; purpose: AutoPlaySoundPurpose }) => void;
  consumePending: (params: ConsumePendingParams) => PendingAutoPlayEvent | undefined;
  markBgmStopFromWs: (roomId: number) => void;
};

const MAX_PENDING_EVENTS = 200;
const PENDING_EVENT_TTL_MS = 3 * 60 * 1000;

function prunePending(
  pendingByMessageId: Record<number, PendingAutoPlayEvent | undefined>,
  activeRoomId: number | null,
) {
  const now = Date.now();
  const kept: Array<[number, PendingAutoPlayEvent]> = [];

  for (const [key, value] of Object.entries(pendingByMessageId)) {
    const messageId = Number(key);
    if (!Number.isFinite(messageId) || !value) {
      continue;
    }
    if (activeRoomId != null && value.roomId !== activeRoomId) {
      continue;
    }
    if (now - value.createdAtMs > PENDING_EVENT_TTL_MS) {
      continue;
    }
    kept.push([messageId, value]);
  }

  kept.sort((a, b) => a[1].sequence - b[1].sequence);
  if (kept.length > MAX_PENDING_EVENTS) {
    kept.splice(0, kept.length - MAX_PENDING_EVENTS);
  }

  const next: Record<number, PendingAutoPlayEvent | undefined> = {};
  for (const [messageId, event] of kept) {
    next[messageId] = event;
  }
  return next;
}

export const useAudioMessageAutoPlayStore = create<AudioMessageAutoPlayState>((set, get) => ({
  activeRoomId: null,
  pendingByMessageId: {},
  bgmStopSeqByRoomId: {},
  nextSequence: 0,

  setActiveRoomId: (roomId) => {
    set((state) => {
      const prunedPending = prunePending(state.pendingByMessageId, roomId);
      if (roomId == null) {
        return {
          ...state,
          activeRoomId: null,
          pendingByMessageId: {},
          bgmStopSeqByRoomId: {},
        };
      }

      const nextStopSeqByRoomId: Record<number, number | undefined> = {};
      const stopSeq = state.bgmStopSeqByRoomId[roomId];
      if (typeof stopSeq === "number") {
        nextStopSeqByRoomId[roomId] = stopSeq;
      }

      return {
        ...state,
        activeRoomId: roomId,
        pendingByMessageId: prunedPending,
        bgmStopSeqByRoomId: nextStopSeqByRoomId,
      };
    });
  },

  enqueueFromWs: ({ roomId, messageId, purpose }) => {
    const activeRoomId = get().activeRoomId;
    if (activeRoomId == null || activeRoomId !== roomId) {
      return;
    }

    set((state) => {
      const nextSequence = state.nextSequence + 1;
      const nextPending = prunePending(state.pendingByMessageId, state.activeRoomId);

      // BGM 只保留最新一条，避免短时间内多条 BGM 指令排队造成误播。
      if (purpose === "bgm") {
        for (const [key, value] of Object.entries(nextPending)) {
          if (value?.roomId === roomId && value.purpose === "bgm") {
            delete nextPending[Number(key)];
          }
        }
      }

      nextPending[messageId] = {
        roomId,
        messageId,
        purpose,
        sequence: nextSequence,
        createdAtMs: Date.now(),
      };

      return {
        ...state,
        nextSequence,
        pendingByMessageId: nextPending,
      };
    });
  },

  consumePending: ({ roomId, messageId, purpose }) => {
    const pending = get().pendingByMessageId[messageId];
    if (!pending) {
      return undefined;
    }
    if (pending.roomId !== roomId || pending.purpose !== purpose) {
      return undefined;
    }

    set((state) => {
      const nextPending = { ...state.pendingByMessageId };
      delete nextPending[messageId];
      return {
        ...state,
        pendingByMessageId: nextPending,
      };
    });

    return pending;
  },

  markBgmStopFromWs: (roomId) => {
    const activeRoomId = get().activeRoomId;
    if (activeRoomId == null || activeRoomId !== roomId) {
      return;
    }

    set(state => ({
      ...state,
      bgmStopSeqByRoomId: {
        ...state.bgmStopSeqByRoomId,
        [roomId]: (state.bgmStopSeqByRoomId[roomId] ?? 0) + 1,
      },
    }));
  },
}));
