// 音频消息播放组件（WaveSurfer 波形播放器）。
// 为了避免列表渲染/刷新时自动触发下载，WaveSurfer 仅在用户点击播放时才初始化与加载音频。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createBgmControllerId,
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

import "./audioMessage.css";

interface AudioMessageProps {
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
}

let audioMessageInstanceSeq = 0;

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

export default function AudioMessage({
  url,
  roomId,
  messageId,
  purpose,
  cacheKey: cacheKeyProp,
  duration,
  title,
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
  const mountedRef = useRef(false);
  const ensureTokenRef = useRef(0);
  const instanceIdRef = useRef(0);
  if (instanceIdRef.current === 0) {
    audioMessageInstanceSeq += 1;
    instanceIdRef.current = audioMessageInstanceSeq;
  }

  const normalizedPurpose = useMemo(() => normalizePurpose(purpose), [purpose]);
  const roomIdNumber = typeof roomId === "number" && Number.isFinite(roomId) ? roomId : undefined;
  const messageIdNumber = typeof messageId === "number" && Number.isFinite(messageId) ? messageId : undefined;
  const isBgmMessage = normalizedPurpose === "bgm" && roomIdNumber != null && messageIdNumber != null;
  const isSeMessage = normalizedPurpose === "se" && roomIdNumber != null && messageIdNumber != null;

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

  const notifyBgmStopped = useCallback(() => {
    if (!isBgmMessage || roomIdNumber == null || messageIdNumber == null) {
      return;
    }
    markBgmMessageStopped(roomIdNumber, messageIdNumber);
  }, [isBgmMessage, messageIdNumber, roomIdNumber]);

  const shouldKeepWaveSurferAlive = useCallback(() => {
    if (isBgmMessage) {
      // BGM 改为消息内切换控制，卸载时不保留隐藏播放节点。
      return false;
    }
    if (shouldAutoPlayRef.current || isPlayingRef.current) {
      return true;
    }
    try {
      return Boolean(waveSurferRef.current?.isPlaying?.());
    }
    catch {
      return false;
    }
  }, [isBgmMessage]);

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
      instanceId: instanceIdRef.current,
      keepPlaying: Boolean(opts?.keepPlaying),
    });
  }, [cacheKey, clearWaveSurferBindings, url]);

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
      mediaDebug("audio-message", "event-ready", { cacheKey, url, instanceId: instanceIdRef.current });
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
        ws.play?.();
      }
    }));

    unsubs.push(ws.on?.("play", () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
      mediaDebug("audio-message", "event-play", {
        cacheKey,
        url,
        instanceId: instanceIdRef.current,
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
        instanceId: instanceIdRef.current,
        currentTime: ws.getCurrentTime?.(),
      });
    }));
    unsubs.push(ws.on?.("finish", () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentTime(0);
      notifyBgmStopped();
      mediaDebug("audio-message", "event-finish", { cacheKey, url, instanceId: instanceIdRef.current });
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
  }, [cacheKey, clearWaveSurferBindings, notifyBgmStopped, url]);

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
          instanceId: instanceIdRef.current,
          token,
        });
        return null;
      }

      mediaDebug("audio-message", "ensure-wave-surfer-acquired", {
        cacheKey,
        url,
        instanceId: instanceIdRef.current,
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
  }, [bindWaveSurfer, cacheKey, url]);

  const playCurrentMessage = useCallback(async (opts?: { fromStart?: boolean }) => {
    const ws = await ensureWaveSurfer();
    if (!ws) {
      return;
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
      return;
    }

    if (shouldPlayFromStartRef.current) {
      seekToStart(ws);
      shouldPlayFromStartRef.current = false;
    }

    await ws.play?.();
  }, [ensureWaveSurfer, isReady]);

  const stopCurrentMessage = useCallback(() => {
    const ws = waveSurferRef.current;
    if (ws) {
      try {
        ws.stop?.();
      }
      catch {
        try {
          ws.pause?.();
          seekToStart(ws);
        }
        catch {
          // ignore
        }
      }
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
      instanceId: instanceIdRef.current,
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
    setVolumeRatio(1);
  }, [cleanupWaveSurfer, shouldKeepWaveSurferAlive, cacheKey, setVolumeRatio, url]);

  useEffect(() => {
    mountedRef.current = true;
    mediaDebug("audio-message", "effect-mount", {
      cacheKey,
      url,
      instanceId: instanceIdRef.current,
    });
    return () => {
      mountedRef.current = false;
      const keepPlaying = shouldKeepWaveSurferAlive();
      mediaDebug("audio-message", "effect-unmount", {
        cacheKey,
        url,
        instanceId: instanceIdRef.current,
        keepPlaying,
      });
      cleanupWaveSurfer({ keepPlaying });
      notifyBgmStopped();
    };
  }, [cacheKey, cleanupWaveSurfer, notifyBgmStopped, shouldKeepWaveSurferAlive, url]);

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
      instanceId: instanceIdRef.current,
    });
    void ensureWaveSurfer();
  }, [cacheKey, ensureWaveSurfer, hasUrl, url]);

  useEffect(() => {
    if (!isBgmMessage || roomIdNumber == null || messageIdNumber == null) {
      return;
    }

    const controllerId = createBgmControllerId(roomIdNumber, messageIdNumber);
    registerBgmMessageController({
      id: controllerId,
      roomId: roomIdNumber,
      messageId: messageIdNumber,
      playFromStart: () => playCurrentMessage({ fromStart: true }),
      stop: stopCurrentMessage,
      isPlaying: isWavePlaying,
      getVolumeRatio,
      setVolumeRatio,
    });

    return () => {
      unregisterBgmMessageController({
        roomId: roomIdNumber,
        messageId: messageIdNumber,
      });
    };
  }, [
    getVolumeRatio,
    isBgmMessage,
    isWavePlaying,
    messageIdNumber,
    playCurrentMessage,
    roomIdNumber,
    setVolumeRatio,
    stopCurrentMessage,
  ]);

  useEffect(() => {
    if (!pendingAutoPlay || !hasUrl) {
      return;
    }
    if (roomIdNumber == null || messageIdNumber == null) {
      return;
    }
    if (pendingAutoPlay.roomId !== roomIdNumber || pendingAutoPlay.messageId !== messageIdNumber) {
      return;
    }

    const expectedPurpose = isBgmMessage ? "bgm" : isSeMessage ? "se" : null;
    if (!expectedPurpose || pendingAutoPlay.purpose !== expectedPurpose) {
      return;
    }

    const consumed = useAudioMessageAutoPlayStore.getState().consumePending({
      roomId: roomIdNumber,
      messageId: messageIdNumber,
      purpose: expectedPurpose,
    });
    if (!consumed) {
      return;
    }

    if (expectedPurpose === "bgm") {
      void requestPlayBgmMessage(roomIdNumber, messageIdNumber);
      return;
    }
    void playCurrentMessage({ fromStart: true });
  }, [
    hasUrl,
    isBgmMessage,
    isSeMessage,
    messageIdNumber,
    pendingAutoPlay,
    playCurrentMessage,
    roomIdNumber,
  ]);

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

  const handleTogglePlay = async () => {
    mediaDebug("audio-message", "toggle-play-click", {
      cacheKey,
      url,
      instanceId: instanceIdRef.current,
      isReady,
      isPlaying,
      purpose: normalizedPurpose,
    });

    if (isBgmMessage && roomIdNumber != null && messageIdNumber != null) {
      if (isWavePlaying()) {
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
          instanceId: instanceIdRef.current,
        });
        return;
      }
      if (!isReady) {
        shouldAutoPlayRef.current = true;
        mediaDebug("audio-message", "toggle-play-defer-until-ready", {
          cacheKey,
          url,
          instanceId: instanceIdRef.current,
        });
        return;
      }

      if (ws.isPlaying?.()) {
        ws.pause?.();
      }
      else {
        ws.play?.();
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

  return (
    <div
      className="tc-audio-message bg-base-200 rounded-lg p-2 min-w-[200px] max-w-[340px]"
      title={title}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-xs btn-circle btn-ghost"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying
            ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                </svg>
              )
            : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )}
        </button>

        <div className="flex-1 min-w-0">
          <div ref={waveContainerRef} className="tc-audio-wave" />
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>{currentTimeText}</span>
            <span>{durationText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
