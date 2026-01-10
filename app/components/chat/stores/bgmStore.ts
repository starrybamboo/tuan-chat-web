import { create } from "zustand";

import { pauseBgm, playBgm, stopBgm } from "@/components/chat/infra/bgm/bgmPlayer";

export type BgmTrack = {
  url: string;
  /** 0-100 */
  volume?: number;
  fileName?: string;
  messageId?: number;
};

type StopReason = "user" | "kp" | "interrupt";

type BgmState = {
  /** 当前 UI 激活的房间（用于决定是否自动播放） */
  activeRoomId: number | null;

  /** 当前正在播放的房间 */
  playingRoomId: number | null;
  isPlaying: boolean;

  /** 每个房间最后一次收到的 BGM（KP 发起） */
  trackByRoomId: Record<number, BgmTrack | undefined>;

  /** KP 已明确停止（清空 track，同时阻止重开） */
  kpStoppedByRoomId: Record<number, boolean | undefined>;

  /** 用户是否对该房间的本曲“主动关闭并隐藏控件” */
  userDismissedByRoomId: Record<number, boolean | undefined>;

  /** 用户是否愿意在该房间播放（被打断时保持 true，便于重开） */
  userEnabledByRoomId: Record<number, boolean | undefined>;

  lastStopReasonByRoomId: Record<number, StopReason | undefined>;

  setActiveRoomId: (roomId: number | null) => void;

  onRoomInterrupted: (roomId: number) => void;

  /** 收到 KP 发送的 BGM（广播） */
  onBgmStartFromWs: (roomId: number, track: BgmTrack) => Promise<void>;

  /** 收到 KP 停止消息（广播） */
  onBgmStopFromWs: (roomId: number) => void;

  /** 用户点击“开启” */
  userStart: (roomId: number) => Promise<void>;

  /** 用户点击“关闭”（对本曲隐藏控件） */
  userStopAndDismiss: (roomId: number) => void;

  /** 悬浮球/按钮：开启或关闭（关闭会 dismiss） */
  userToggle: (roomId: number) => Promise<void>;
};

function extractEffectiveVolume(track?: BgmTrack): number | undefined {
  if (!track)
    return undefined;
  return typeof track.volume === "number" ? track.volume : undefined;
}

export const useBgmStore = create<BgmState>((set, get) => ({
  activeRoomId: null,
  playingRoomId: null,
  isPlaying: false,
  trackByRoomId: {},
  kpStoppedByRoomId: {},
  userDismissedByRoomId: {},
  userEnabledByRoomId: {},
  lastStopReasonByRoomId: {},

  setActiveRoomId: (roomId) => {
    const prevActive = get().activeRoomId;
    // 切换房间视为“打断”：停止当前播放，但不做 dismiss
    if (prevActive != null && prevActive !== roomId) {
      get().onRoomInterrupted(prevActive);
    }
    // 进入新房间也视为打断：如果当前正在播放其它房间的 BGM，停止
    const playingRoomId = get().playingRoomId;
    if (playingRoomId != null && playingRoomId !== roomId) {
      pauseBgm();
      set(state => ({
        ...state,
        playingRoomId: null,
        isPlaying: false,
      }));
    }

    set(state => ({
      ...state,
      activeRoomId: roomId,
    }));
  },

  onRoomInterrupted: (roomId) => {
    const { playingRoomId } = get();
    if (playingRoomId !== roomId)
      return;

    pauseBgm();
    set(state => ({
      ...state,
      playingRoomId: null,
      isPlaying: false,
      lastStopReasonByRoomId: {
        ...state.lastStopReasonByRoomId,
        [roomId]: "interrupt",
      },
    }));
  },

  onBgmStartFromWs: async (roomId, track) => {
    set(state => ({
      ...state,
      trackByRoomId: {
        ...state.trackByRoomId,
        [roomId]: track,
      },
      kpStoppedByRoomId: {
        ...state.kpStoppedByRoomId,
        [roomId]: false,
      },
      // 新曲默认允许播放，并清除“主动关闭”状态
      userEnabledByRoomId: {
        ...state.userEnabledByRoomId,
        [roomId]: true,
      },
      userDismissedByRoomId: {
        ...state.userDismissedByRoomId,
        [roomId]: false,
      },
    }));

    // 只在当前激活房间自动播放；否则仅记录，进入房间需要用户手动开启。
    if (get().activeRoomId !== roomId)
      return;

    try {
      await playBgm(track.url, {
        loop: true,
        volume: extractEffectiveVolume(track),
      });
      set(state => ({
        ...state,
        playingRoomId: roomId,
        isPlaying: true,
      }));
    }
    catch {
      // 可能被 autoplay 策略拦截：保持“可开启”状态，等待用户手动点击。
      set(state => ({
        ...state,
        playingRoomId: null,
        isPlaying: false,
      }));
    }
  },

  onBgmStopFromWs: (roomId) => {
    const isPlayingThisRoom = get().playingRoomId === roomId;
    if (isPlayingThisRoom) {
      stopBgm();
    }

    set(state => ({
      ...state,
      playingRoomId: isPlayingThisRoom ? null : state.playingRoomId,
      isPlaying: isPlayingThisRoom ? false : state.isPlaying,
      trackByRoomId: {
        ...state.trackByRoomId,
        [roomId]: undefined,
      },
      kpStoppedByRoomId: {
        ...state.kpStoppedByRoomId,
        [roomId]: true,
      },
      lastStopReasonByRoomId: {
        ...state.lastStopReasonByRoomId,
        [roomId]: "kp",
      },
    }));
  },

  userStart: async (roomId) => {
    const state = get();
    const track = state.trackByRoomId[roomId];
    if (!track)
      return;

    if (state.kpStoppedByRoomId[roomId])
      return;

    if (state.userDismissedByRoomId[roomId])
      return;

    set(s => ({
      ...s,
      userEnabledByRoomId: {
        ...s.userEnabledByRoomId,
        [roomId]: true,
      },
    }));

    try {
      await playBgm(track.url, {
        loop: true,
        volume: extractEffectiveVolume(track),
      });
      set(s => ({
        ...s,
        playingRoomId: roomId,
        isPlaying: true,
      }));
    }
    catch {
      // ignore
    }
  },

  userStopAndDismiss: (roomId) => {
    const state = get();
    const isPlayingThisRoom = state.playingRoomId === roomId;
    if (isPlayingThisRoom) {
      stopBgm();
    }

    set(s => ({
      ...s,
      playingRoomId: isPlayingThisRoom ? null : s.playingRoomId,
      isPlaying: isPlayingThisRoom ? false : s.isPlaying,
      userEnabledByRoomId: {
        ...s.userEnabledByRoomId,
        [roomId]: false,
      },
      userDismissedByRoomId: {
        ...s.userDismissedByRoomId,
        [roomId]: true,
      },
      lastStopReasonByRoomId: {
        ...s.lastStopReasonByRoomId,
        [roomId]: "user",
      },
    }));
  },

  userToggle: async (roomId) => {
    const state = get();
    const track = state.trackByRoomId[roomId];
    if (!track)
      return;

    if (state.userDismissedByRoomId[roomId])
      return;

    const isPlayingThisRoom = state.isPlaying && state.playingRoomId === roomId;
    if (isPlayingThisRoom) {
      get().userStopAndDismiss(roomId);
      return;
    }

    await get().userStart(roomId);
  },
}));
