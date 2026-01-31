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

  /** 每个房间当前音量（0-100），用于记忆用户调节结果 */
  volumeByRoomId: Record<number, number | undefined>;

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

  /** 设置指定房间的音量（仅本地） */
  setVolume: (roomId: number, volume: number) => void;
};

/**
 * 音量映射说明：
 * - UI: 0~100
 * - 输出: GainNode.gain（0~n）
 * 使用指数曲线让“10以上调节更明显”，并降低最大增益避免过大。
 */
const BGM_MAX_GAIN = 1.6; // 最大增益（整体偏大时下调这里）
const BGM_CURVE = 2.2; // >1 越大：低音量更细腻，高音量段变化更明显

function uiToGain(uiVolume: number | undefined): number | undefined {
  if (typeof uiVolume !== "number" || !Number.isFinite(uiVolume))
    return undefined;

  const v = Math.max(0, Math.min(100, uiVolume)) / 100; // 0~1
  if (v <= 0)
    return 0;

  // 指数曲线：gain = v^curve * maxGain
  const gain = v ** BGM_CURVE * BGM_MAX_GAIN;
  return gain;
}

function extractEffectiveVolume(track?: BgmTrack, userVolume?: number): number | undefined {
  if (!track)
    return undefined;

  const userGain = uiToGain(userVolume);
  if (typeof userGain === "number")
    return userGain;

  const trackGain = uiToGain(typeof track.volume === "number" ? track.volume : undefined);
  if (typeof trackGain === "number")
    return trackGain;

  return undefined;
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
  volumeByRoomId: {},

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
      // 新曲默认允许播放
      userEnabledByRoomId: {
        ...state.userEnabledByRoomId,
        [roomId]: true,
      },
      // 不再强制清除 dismissed，这样可以在有需要时仍使用该标记
      userDismissedByRoomId: {
        ...state.userDismissedByRoomId,
      },
      // 如果 track 自带 volume 则初始化默认音量，否则默认 50
      volumeByRoomId: {
        ...state.volumeByRoomId,
        [roomId]: typeof track.volume === "number" && Number.isFinite(track.volume)
          ? Math.max(0, Math.min(100, track.volume))
          : (state.volumeByRoomId[roomId] ?? 50),
      },
    }));

    if (get().activeRoomId !== roomId)
      return;

    const userVolume = get().volumeByRoomId[roomId];
    try {
      await playBgm(track.url, {
        loop: true,
        volume: extractEffectiveVolume(track, userVolume),
      });
      set(state => ({
        ...state,
        playingRoomId: roomId,
        isPlaying: true,
      }));
    }
    catch {
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

    // 不再因为 dismissed 阻止开启，dismiss 仅表示是否隐藏控件（目前未使用）
    set(s => ({
      ...s,
      userEnabledByRoomId: {
        ...s.userEnabledByRoomId,
        [roomId]: true,
      },
      userDismissedByRoomId: {
        ...s.userDismissedByRoomId,
        [roomId]: false,
      },
    }));

    const userVolume = state.volumeByRoomId[roomId];
    try {
      await playBgm(track.url, {
        loop: true,
        volume: extractEffectiveVolume(track, userVolume),
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
      // 不再把控件 dismiss 掉，仍然显示浮动球，方便重新开启
      userDismissedByRoomId: {
        ...s.userDismissedByRoomId,
        [roomId]: false,
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

    const isPlayingThisRoom = state.isPlaying && state.playingRoomId === roomId;

    if (isPlayingThisRoom) {
      const isPlayingThis = state.playingRoomId === roomId;
      if (isPlayingThis) {
        pauseBgm();
      }
      set(s => ({
        ...s,
        playingRoomId: isPlayingThis ? null : s.playingRoomId,
        isPlaying: isPlayingThis ? false : s.isPlaying,
        userEnabledByRoomId: {
          ...s.userEnabledByRoomId,
          [roomId]: false,
        },
      }));
      return;
    }

    await get().userStart(roomId);
  },

  setVolume: (roomId, volume) => {
    if (!Number.isFinite(volume))
      return;
    const clamped = Math.max(0, Math.min(100, volume));
    set(state => ({
      ...state,
      volumeByRoomId: {
        ...state.volumeByRoomId,
        [roomId]: clamped,
      },
    }));

    const state = get();
    const isPlayingThisRoom = state.playingRoomId === roomId && state.isPlaying;
    if (isPlayingThisRoom) {
      const track = state.trackByRoomId[roomId];
      if (track) {
        void playBgm(track.url, {
          loop: true,
          volume: extractEffectiveVolume(track, clamped),
        });
      }
    }
  },
}));
