// 音频消息播放组件（WaveSurfer 波形播放器）。
// 为了避免列表渲染/刷新时自动触发下载，WaveSurfer 仅在用户点击播放时才初始化与加载音频。
import { PauseIcon, PlayIcon, TrashIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  createBgmControllerId,
  handoverBgmPlaybackToFallback,
  isBgmMessagePlaying,
  markBgmMessageStopped,
  registerBgmMessageController,
  requestPlayBgmMessage,
  requestStopRoomBgm,
  unregisterBgmMessageController,
} from "@/components/chat/infra/audioMessage/audioMessageBgmCoordinator";
import {
  acquireAudioMessageWaveSurfer,
  hasAudioMessageWaveSurfer,
} from "@/components/chat/infra/audioMessage/audioMessageWaveSurferCache";
import { mediaDebug } from "@/components/chat/infra/media/mediaDebug";
import { useAudioMessageAutoPlayStore } from "@/components/chat/stores/audioMessageAutoPlayStore";

type AudioMessageProps = {
  url: string;
  /** 所属房间（BGM 自动播放与切换需要） */
  roomId?: number;
  /** 当前消息 ID（BGM 自动播放与切换需要） */
  messageId?: number;
  /** 音频用途：bgm / se / 其他 */
  purpose?: string;
  /** 用于跨虚拟列表卸载保活（建议传 messageId）。不传则退化为按 url 缓存。 */
  cacheKey?: string;
  duration?: number; // Optional duration in seconds
  title?: string;
  className?: string;
  layout?: "default" | "document";
  onDelete?: () => void;
  deleteLabel?: string;
}

const VISUAL_PLAYBACK_START_WAIT_MS = 2500;

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function normalizePurpose(rawPurpose?: string) {
  if (typeof rawPurpose !== "string") {
    return "voice";
  }
  const normalized = rawPurpose.trim().toLowerCase();
  if (normalized === "bgm" || normalized === "se") {
    return normalized;
  }
  return "voice";
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

function setWaveSurferVolume(ws: any, volume: number) {
  const safe = clampVolume(volume);
  try {
    ws.setVolume?.(safe);
  }
  catch {
    // ignore
  }
  try {
    const media = ws.getMediaElement?.();
    if (media && typeof media === "object" && "volume" in media) {
      media.volume = safe;
    }
  }
  catch {
    // ignore
  }
}

function ensureNonLoopPlayback(ws: any) {
  try {
    const media = ws.getMediaElement?.();
    if (media && typeof media === "object" && "loop" in media) {
      media.loop = false;
    }
  }
  catch {
    // ignore
  }
}

function seekToStart(ws: any) {
  try {
    const media = ws.getMediaElement?.();
    if (media && typeof media === "object" && "currentTime" in media) {
      media.currentTime = 0;
      return;
    }
  }
  catch {
    // ignore
  }
  try {
    ws.seekTo?.(0);
  }
  catch {
    // ignore
  }
}

function stopWavePlayback(ws: any) {
  try {
    ws.stop?.();
    return;
  }
  catch {
    // ignore and fallback
  }
  try {
    ws.pause?.();
    seekToStart(ws);
  }
  catch {
    // ignore
  }
}

function waitForNextFrame(): Promise<number> {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    return new Promise(resolve => setTimeout(() => resolve(Date.now()), 16));
  }
  return new Promise(resolve => window.requestAnimationFrame(resolve));
}

export default function AudioMessage({
  url,
  roomId,
  messageId,
  purpose,
  cacheKey: cacheKeyProp,
  duration,
  title,
  className = "",
  layout = "default",
  onDelete,
  deleteLabel = "删除音频",
}: AudioMessageProps) {
  const hasUrl = Boolean(url);
  const cacheKey = typeof cacheKeyProp === "string" && cacheKeyProp ? cacheKeyProp : url;
  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<any>(null);
  const shouldAutoPlayRef = useRef(false);
  const shouldPlayFromStartRef = useRef(false);
  const isPlayingRef = useRef(false);
  const volumeRatioRef = useRef(1);
  const releaseRef = useRef<null | ((opts?: { keepPlaying?: boolean }) => void)>(null);
  const unsubsRef = useRef<(() => void)[]>([]);
  const boundWaveSurferRef = useRef<any>(null);
  const ensurePromiseRef = useRef<Promise<any | null> | null>(null);
  const pendingAutoPlayAttemptRef = useRef<Promise<boolean> | null>(null);
  const mountedRef = useRef(false);
  const ensureTokenRef = useRef(0);
  const instanceId = useId();

  const normalizedPurpose = useMemo(() => normalizePurpose(purpose), [purpose]);
  const roomIdNumber = typeof roomId === "number" && Number.isFinite(roomId) ? roomId : undefined;
  const messageIdNumber = typeof messageId === "number" && Number.isFinite(messageId) ? messageId : undefined;
  const isBgmMessage = normalizedPurpose === "bgm" && roomIdNumber != null && messageIdNumber != null;
  const isSeMessage = normalizedPurpose === "se" && roomIdNumber != null && messageIdNumber != null;
  const pendingAutoPlayExpectedPurpose = isBgmMessage ? "bgm" : isSeMessage ? "se" : null;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedDuration, setResolvedDuration] = useState<number | undefined>(undefined);

  const fallbackDurationSeconds = typeof duration === "number" && Number.isFinite(duration) ? Math.max(0, duration) : undefined;
  const currentTimeText = useMemo(() => formatTime(currentTime), [currentTime]);

  const pendingAutoPlay = useAudioMessageAutoPlayStore(
    useCallback(
      state => (messageIdNumber != null ? state.pendingByMessageId[messageIdNumber] : undefined),
      [messageIdNumber],
    ),
  );
  const hasMatchingPendingAutoPlay = Boolean(
    pendingAutoPlayExpectedPurpose
    && pendingAutoPlay
    && roomIdNumber != null
    && messageIdNumber != null
    && pendingAutoPlay.roomId === roomIdNumber
    && pendingAutoPlay.messageId === messageIdNumber
    && pendingAutoPlay.purpose === pendingAutoPlayExpectedPurpose,
  );
  const bgmStopSeq = useAudioMessageAutoPlayStore(
    useCallback(
      state => (roomIdNumber != null ? state.bgmStopSeqByRoomId[roomIdNumber] ?? 0 : 0),
      [roomIdNumber],
    ),
  );
  const latestBgmStopSeqRef = useRef(0);

  const setVolumeRatio = useCallback((volume: number) => {
    const next = clampVolume(volume);
    volumeRatioRef.current = next;
    if (waveSurferRef.current) {
      setWaveSurferVolume(waveSurferRef.current, next);
    }
  }, []);

  const getVolumeRatio = useCallback(() => volumeRatioRef.current, []);

  const getCurrentTimeSec = useCallback(() => {
    const ws = waveSurferRef.current;
    if (!ws) {
      return 0;
    }
    try {
      const current = ws.getCurrentTime?.();
      if (typeof current === "number" && Number.isFinite(current)) {
        return Math.max(0, current);
      }
    }
    catch {
      // ignore
    }
    return 0;
  }, []);

  const setCurrentTimeSec = useCallback((timeSec: number) => {
    const ws = waveSurferRef.current;
    if (!ws) {
      return;
    }
    const safe = Number.isFinite(timeSec) ? Math.max(0, timeSec) : 0;

    try {
      const media = ws.getMediaElement?.();
      if (media && typeof media === "object" && "currentTime" in media) {
        media.currentTime = safe;
        return;
      }
    }
    catch {
      // ignore
    }

    try {
      const durationSec = ws.getDuration?.();
      if (typeof durationSec === "number" && Number.isFinite(durationSec) && durationSec > 0) {
        ws.seekTo?.(Math.max(0, Math.min(1, safe / durationSec)));
      }
    }
    catch {
      // ignore
    }
  }, []);

  const isWavePlaying = useCallback(() => {
    if (isPlayingRef.current) {
      return true;
    }
    try {
      return Boolean(waveSurferRef.current?.isPlaying?.());
    }
    catch {
      return false;
    }
  }, []);

  const waitForWavePlaybackStart = useCallback(async (timeoutMs: number) => {
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    while (mountedRef.current) {
      if (isWavePlaying()) {
        return true;
      }
      const now = await waitForNextFrame();
      if (isWavePlaying()) {
        return true;
      }
      if (now - start >= timeoutMs) {
        return isWavePlaying();
      }
    }
    return false;
  }, [isWavePlaying]);

  const requestWavePlayback = useCallback(async (ws: any, reason: string) => {
    try {
      await ws.play?.();
      return true;
    }
    catch (error) {
      console.error("[tc-audio-message] wave play failed", error);
      mediaDebug("audio-message", "wave-play-failed", {
        cacheKey,
        url,
        instanceId,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }, [cacheKey, url]);

  const notifyBgmStopped = useCallback(() => {
    if (!isBgmMessage || roomIdNumber == null || messageIdNumber == null) {
      return;
    }
    markBgmMessageStopped(roomIdNumber, messageIdNumber, "visual");
  }, [isBgmMessage, messageIdNumber, roomIdNumber]);

  const shouldKeepWaveSurferAlive = useCallback(() => {
    // 已移除全局悬浮控制，卸载后的音频不可见不可控，因此统一不保活播放。
    return false;
  }, []);

  const clearWaveSurferBindings = useCallback(() => {
    const unsubs = unsubsRef.current;
    unsubsRef.current = [];
    for (const unsub of unsubs) {
      try {
        unsub();
      }
      catch {
        // ignore
      }
    }
    boundWaveSurferRef.current = null;
  }, []);

  const cleanupWaveSurfer = useCallback((opts?: { keepPlaying?: boolean }) => {
    clearWaveSurferBindings();
    // 让已发起但尚未完成的 ensure 立即失效，避免“卸载后才 acquire 成功”的引用泄漏。
    ensureTokenRef.current += 1;

    const release = releaseRef.current;
    releaseRef.current = null;
    waveSurferRef.current = null;
    ensurePromiseRef.current = null;
    try {
      release?.(opts);
    }
    catch {
      // ignore
    }
    mediaDebug("audio-message", "cleanup-wave-surfer", {
      cacheKey,
      url,
      instanceId,
      keepPlaying: Boolean(opts?.keepPlaying),
    });
  }, [cacheKey, clearWaveSurferBindings, instanceId, url]);

  const bindWaveSurfer = useCallback((ws: any) => {
    if (boundWaveSurferRef.current === ws) {
      return;
    }
    clearWaveSurferBindings();

    const unsubs: Array<(() => void) | undefined> = [];

    unsubs.push(ws.on?.("ready", () => {
      setIsReady(true);
      ensureNonLoopPlayback(ws);
      setWaveSurferVolume(ws, volumeRatioRef.current);
      mediaDebug("audio-message", "event-ready", { cacheKey, url, instanceId });
      const d = ws.getDuration?.();
      if (typeof d === "number" && Number.isFinite(d) && d > 0) {
        setResolvedDuration(d);
      }

      if (shouldPlayFromStartRef.current) {
        seekToStart(ws);
        shouldPlayFromStartRef.current = false;
      }
      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false;
        void requestWavePlayback(ws, "ready-auto-play");
      }
    }));

    unsubs.push(ws.on?.("play", () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
      mediaDebug("audio-message", "event-play", {
        cacheKey,
        url,
        instanceId,
        currentTime: ws.getCurrentTime?.(),
      });
    }));
    unsubs.push(ws.on?.("pause", () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      notifyBgmStopped();
      mediaDebug("audio-message", "event-pause", {
        cacheKey,
        url,
        instanceId,
        currentTime: ws.getCurrentTime?.(),
      });
    }));
    unsubs.push(ws.on?.("finish", () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentTime(0);
      notifyBgmStopped();
      mediaDebug("audio-message", "event-finish", { cacheKey, url, instanceId });
    }));

    const updateTime = () => {
      const t = ws.getCurrentTime?.();
      if (typeof t === "number" && Number.isFinite(t)) {
        setCurrentTime(t);
      }
    };
    unsubs.push(ws.on?.("timeupdate", updateTime));
    unsubs.push(ws.on?.("audioprocess", updateTime));

    unsubs.push(ws.on?.("error", (e: any) => {
      console.error("[tc-audio-message] wavesurfer error", e);
    }));

    unsubsRef.current = unsubs.filter(Boolean) as Array<() => void>;
    boundWaveSurferRef.current = ws;
  }, [cacheKey, clearWaveSurferBindings, instanceId, notifyBgmStopped, requestWavePlayback, url]);

  const ensureWaveSurfer = useCallback(async () => {
    if (waveSurferRef.current) {
      return waveSurferRef.current;
    }
    if (ensurePromiseRef.current) {
      return ensurePromiseRef.current;
    }
    if (!waveContainerRef.current) {
      throw new Error("音频波形容器未就绪");
    }

    const token = ensureTokenRef.current + 1;
    ensureTokenRef.current = token;

    const task = (async () => {
      const { ws, release } = await acquireAudioMessageWaveSurfer({
        cacheKey,
        url,
        container: waveContainerRef.current!,
      });

      if (!mountedRef.current || ensureTokenRef.current !== token) {
        try {
          release({ keepPlaying: Boolean(ws?.isPlaying?.()) });
        }
        catch {
          // ignore
        }
        mediaDebug("audio-message", "ensure-wave-surfer-stale-release", {
          cacheKey,
          url,
          instanceId,
          token,
        });
        return null;
      }

      mediaDebug("audio-message", "ensure-wave-surfer-acquired", {
        cacheKey,
        url,
        instanceId,
        token,
      });

      waveSurferRef.current = ws;
      releaseRef.current = release;

      ensureNonLoopPlayback(ws);
      setWaveSurferVolume(ws, volumeRatioRef.current);
      bindWaveSurfer(ws);

      try {
        const d = ws.getDuration?.();
        if (typeof d === "number" && Number.isFinite(d) && d > 0) {
          setIsReady(true);
          setResolvedDuration(d);
        }
      }
      catch {
        // ignore
      }

      try {
        const playing = Boolean(ws.isPlaying?.());
        setIsPlaying(playing);
        isPlayingRef.current = playing;
        const t = ws.getCurrentTime?.();
        if (typeof t === "number" && Number.isFinite(t)) {
          setCurrentTime(t);
        }
      }
      catch {
        // ignore
      }

      return ws;
    })();

    ensurePromiseRef.current = task;
    try {
      return await task;
    }
    finally {
      if (ensurePromiseRef.current === task) {
        ensurePromiseRef.current = null;
      }
    }
  }, [bindWaveSurfer, cacheKey, instanceId, url]);

  const playCurrentMessage = useCallback(async (opts?: { fromStart?: boolean; waitForPlaybackStart?: boolean }) => {
    const ws = await ensureWaveSurfer();
    if (!ws) {
      return false;
    }

    ensureNonLoopPlayback(ws);
    if (opts?.fromStart) {
      shouldPlayFromStartRef.current = true;
    }

    const waveDuration = ws.getDuration?.();
    const canPlayImmediately = isReady
      || (typeof waveDuration === "number" && Number.isFinite(waveDuration) && waveDuration > 0);
    if (!canPlayImmediately) {
      shouldAutoPlayRef.current = true;
      const playAccepted = await requestWavePlayback(
        ws,
        opts?.fromStart ? "play-from-start-deferred" : "play-deferred",
      );
      if (playAccepted) {
        shouldAutoPlayRef.current = false;
        if (!opts?.waitForPlaybackStart) {
          return true;
        }
        return await waitForWavePlaybackStart(VISUAL_PLAYBACK_START_WAIT_MS);
      }
      if (!opts?.waitForPlaybackStart) {
        return false;
      }
      const started = await waitForWavePlaybackStart(VISUAL_PLAYBACK_START_WAIT_MS);
      if (!started) {
        shouldAutoPlayRef.current = false;
      }
      return started;
    }

    if (shouldPlayFromStartRef.current) {
      seekToStart(ws);
      shouldPlayFromStartRef.current = false;
    }

    shouldAutoPlayRef.current = false;
    const playAccepted = await requestWavePlayback(
      ws,
      opts?.fromStart ? "play-from-start" : "play",
    );
    if (!playAccepted) {
      return false;
    }
    if (!opts?.waitForPlaybackStart) {
      return true;
    }
    return await waitForWavePlaybackStart(VISUAL_PLAYBACK_START_WAIT_MS);
  }, [ensureWaveSurfer, isReady, requestWavePlayback, waitForWavePlaybackStart]);

  const attemptPendingAutoPlay = useCallback(() => {
    if (!hasMatchingPendingAutoPlay || !hasUrl) {
      return undefined;
    }
    if (roomIdNumber == null || messageIdNumber == null || !pendingAutoPlayExpectedPurpose || !pendingAutoPlay) {
      return undefined;
    }
    if (pendingAutoPlayAttemptRef.current) {
      return pendingAutoPlayAttemptRef.current;
    }

    const attempt = (async () => {
      const started = pendingAutoPlayExpectedPurpose === "bgm"
        ? await requestPlayBgmMessage(roomIdNumber, messageIdNumber)
        : await playCurrentMessage({
            fromStart: true,
            waitForPlaybackStart: true,
          });

      if (started) {
        useAudioMessageAutoPlayStore.getState().consumePending({
          roomId: roomIdNumber,
          messageId: messageIdNumber,
          purpose: pendingAutoPlayExpectedPurpose,
        });
      }

      mediaDebug("audio-message", "pending-auto-play-attempt", {
        cacheKey,
        url,
        instanceId,
        roomId: roomIdNumber,
        messageId: messageIdNumber,
        purpose: pendingAutoPlayExpectedPurpose,
        pendingSequence: pendingAutoPlay.sequence,
        started,
      });
      return started;
    })();

    pendingAutoPlayAttemptRef.current = attempt;
    void attempt.finally(() => {
      if (pendingAutoPlayAttemptRef.current === attempt) {
        pendingAutoPlayAttemptRef.current = null;
      }
    });
    return attempt;
  }, [
    cacheKey,
    hasMatchingPendingAutoPlay,
    hasUrl,
    messageIdNumber,
    pendingAutoPlay,
    pendingAutoPlayExpectedPurpose,
    playCurrentMessage,
    roomIdNumber,
    url,
  ]);

  const stopCurrentMessage = useCallback(() => {
    shouldAutoPlayRef.current = false;
    shouldPlayFromStartRef.current = false;
    const ws = waveSurferRef.current;
    if (ws) {
      stopWavePlayback(ws);
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    notifyBgmStopped();
  }, [notifyBgmStopped]);

  useEffect(() => {
    mediaDebug("audio-message", "effect-reset-on-key-change", {
      cacheKey,
      url,
      instanceId,
    });
    const keepPlaying = shouldKeepWaveSurferAlive();
    cleanupWaveSurfer({ keepPlaying });

    setIsReady(false);
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    setResolvedDuration(undefined);
    shouldAutoPlayRef.current = false;
    shouldPlayFromStartRef.current = false;
    pendingAutoPlayAttemptRef.current = null;
    setVolumeRatio(1);
  }, [cleanupWaveSurfer, shouldKeepWaveSurferAlive, cacheKey, instanceId, setVolumeRatio, url]);

  useEffect(() => {
    mountedRef.current = true;
    mediaDebug("audio-message", "effect-mount", {
      cacheKey,
      url,
      instanceId,
    });
    return () => {
      mountedRef.current = false;
      const keepPlaying = shouldKeepWaveSurferAlive();
      const shouldHandoverToFallback = Boolean(
        isBgmMessage
        && roomIdNumber != null
        && messageIdNumber != null
        && url
        && isBgmMessagePlaying(roomIdNumber, messageIdNumber)
        && isWavePlaying(),
      );
      if (shouldHandoverToFallback) {
        const snapshot = {
          currentTimeSec: getCurrentTimeSec(),
          volumeRatio: getVolumeRatio(),
        };
        void handoverBgmPlaybackToFallback(
          roomIdNumber!,
          messageIdNumber!,
          url,
          snapshot,
        );
      }
      mediaDebug("audio-message", "effect-unmount", {
        cacheKey,
        url,
        instanceId,
        keepPlaying,
        shouldHandoverToFallback,
      });
      cleanupWaveSurfer({ keepPlaying });
      if (!shouldHandoverToFallback) {
        notifyBgmStopped();
      }
    };
  }, [
    cacheKey,
    cleanupWaveSurfer,
    getCurrentTimeSec,
    getVolumeRatio,
    isBgmMessage,
    isWavePlaying,
    instanceId,
    messageIdNumber,
    notifyBgmStopped,
    roomIdNumber,
    shouldKeepWaveSurferAlive,
    url,
  ]);

  useEffect(() => {
    if (!hasUrl) {
      return;
    }
    if (!waveContainerRef.current) {
      return;
    }
    if (!hasAudioMessageWaveSurfer(cacheKey)) {
      mediaDebug("audio-message", "effect-no-existing-cache", { cacheKey, url });
      return;
    }

    mediaDebug("audio-message", "effect-rebind-existing-cache", {
      cacheKey,
      url,
      instanceId,
    });
    void ensureWaveSurfer();
  }, [cacheKey, ensureWaveSurfer, hasUrl, instanceId, url]);

  useEffect(() => {
    if (!isBgmMessage || roomIdNumber == null || messageIdNumber == null) {
      return;
    }

    const controllerId = createBgmControllerId(roomIdNumber, messageIdNumber);
    registerBgmMessageController({
      id: controllerId,
      roomId: roomIdNumber,
      messageId: messageIdNumber,
      play: () => playCurrentMessage(),
      playFromStart: () => playCurrentMessage({ fromStart: true }),
      stop: stopCurrentMessage,
      isPlaying: isWavePlaying,
      getVolumeRatio,
      setVolumeRatio,
      getCurrentTimeSec,
      setCurrentTimeSec,
    });

    return () => {
      unregisterBgmMessageController({
        roomId: roomIdNumber,
        messageId: messageIdNumber,
      });
    };
  }, [
    getVolumeRatio,
    getCurrentTimeSec,
    isBgmMessage,
    isWavePlaying,
    messageIdNumber,
    playCurrentMessage,
    roomIdNumber,
    setCurrentTimeSec,
    setVolumeRatio,
    stopCurrentMessage,
  ]);

  useEffect(() => {
    void attemptPendingAutoPlay();
  }, [attemptPendingAutoPlay]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    void attemptPendingAutoPlay();
  }, [attemptPendingAutoPlay, isReady]);

  useEffect(() => {
    if (!hasMatchingPendingAutoPlay || typeof window === "undefined") {
      return;
    }

    const retryPendingAutoPlay = () => {
      void attemptPendingAutoPlay();
    };

    window.addEventListener("pointerdown", retryPendingAutoPlay, { passive: true });
    window.addEventListener("keydown", retryPendingAutoPlay);
    return () => {
      window.removeEventListener("pointerdown", retryPendingAutoPlay);
      window.removeEventListener("keydown", retryPendingAutoPlay);
    };
  }, [attemptPendingAutoPlay, hasMatchingPendingAutoPlay]);

  useEffect(() => {
    if (!isBgmMessage || roomIdNumber == null) {
      return;
    }
    if (bgmStopSeq <= latestBgmStopSeqRef.current) {
      return;
    }
    latestBgmStopSeqRef.current = bgmStopSeq;
    void requestStopRoomBgm(roomIdNumber);
  }, [bgmStopSeq, isBgmMessage, roomIdNumber]);

  const durationText = useMemo(() => {
    const d = typeof resolvedDuration === "number" && Number.isFinite(resolvedDuration) && resolvedDuration > 0
      ? resolvedDuration
      : fallbackDurationSeconds;
    return typeof d === "number" ? formatTime(d) : "00:00";
  }, [fallbackDurationSeconds, resolvedDuration]);
  const playbackTimeText = `${currentTimeText} / ${durationText}`;
  const compactTimeText = isPlaying ? currentTimeText : durationText;

  const handleTogglePlay = async () => {
    mediaDebug("audio-message", "toggle-play-click", {
      cacheKey,
      url,
      instanceId,
      isReady,
      isPlaying,
      purpose: normalizedPurpose,
    });

    if (isBgmMessage && roomIdNumber != null && messageIdNumber != null) {
      if (isBgmMessagePlaying(roomIdNumber, messageIdNumber)) {
        void requestStopRoomBgm(roomIdNumber);
      }
      else {
        void requestPlayBgmMessage(roomIdNumber, messageIdNumber);
      }
      return;
    }

    try {
      const ws = await ensureWaveSurfer();
      if (!ws) {
        mediaDebug("audio-message", "toggle-play-cancel-stale", {
          cacheKey,
          url,
          instanceId,
        });
        return;
      }

      if (ws.isPlaying?.()) {
        stopWavePlayback(ws);
      }
      else {
        await playCurrentMessage({ waitForPlaybackStart: true });
      }
    }
    catch (e) {
      console.error("[tc-audio-message] toggle play failed", e);
      mediaDebug("audio-message", "toggle-play-error", {
        cacheKey,
        url,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  if (!hasUrl) {
    return null;
  }

  if (layout === "document") {
    return (
      <div
        className={`
          tc-audio-message flex w-full items-center gap-3 rounded-md
          bg-base-200/80 px-3 py-2.5 shadow-sm
          ${className}
        `}
        title={title}
      >
        <button
          type="button"
          className="
            flex size-9 shrink-0 items-center justify-center rounded-md
            bg-base-100/85 text-base-content transition
            hover:bg-base-100 hover:text-base-content/90
          "
          onClick={handleTogglePlay}
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying
            ? <PauseIcon className="size-4" weight="fill" />
            : <PlayIcon className="size-4 translate-x-0.5" weight="fill" />}
        </button>

        <div className="
          min-w-[88px] shrink-0 text-sm font-medium tabular-nums
          text-base-content/85
        ">
          {playbackTimeText}
        </div>

        <div className="min-w-0 flex-1">
          <div ref={waveContainerRef} className="w-full min-h-[20px]" />
        </div>

        {onDelete && (
          <button
            type="button"
            className="
              flex size-9 shrink-0 items-center justify-center rounded-md
              text-base-content/55 transition
              hover:bg-error/10 hover:text-error
            "
            onMouseDown={event => event.preventDefault()}
            onClick={onDelete}
            aria-label={deleteLabel}
            title={deleteLabel}
          >
            <TrashIcon className="size-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        tc-audio-message min-w-[220px] max-w-[420px] rounded-md bg-base-200
        p-2.5
        ${className}
      `}
      title={title}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="
            flex size-8 shrink-0 items-center justify-center rounded-md
            text-base-content transition
            hover:bg-base-300/70
          "
          onClick={handleTogglePlay}
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying
            ? <PauseIcon className="size-4" weight="fill" />
            : <PlayIcon className="size-4 translate-x-0.5" weight="fill" />}
        </button>

        <div className="min-w-9 shrink-0 text-xs tabular-nums text-slate-500">
          {compactTimeText}
        </div>

        <div className="min-w-0 flex-1">
          <div ref={waveContainerRef} className="w-full min-h-[28px]" />
        </div>
      </div>
    </div>
  );
}
