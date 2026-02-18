// 音频消息播放组件（WaveSurfer 波形播放器）。
// 为了避免列表渲染/刷新时自动触发下载，WaveSurfer 仅在用户点击播放时才初始化与加载音频。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { acquireAudioMessageWaveSurfer, hasAudioMessageWaveSurfer } from "@/components/chat/infra/audioMessage/audioMessageWaveSurferCache";
import { mediaDebug } from "@/components/chat/infra/media/mediaDebug";
import { useAudioPlaybackRegistration } from "@/components/common/useAudioPlaybackRegistration";

import "./audioMessage.css";

interface AudioMessageProps {
  url: string;
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

export default function AudioMessage({ url, cacheKey: cacheKeyProp, duration, title }: AudioMessageProps) {
  const hasUrl = Boolean(url);
  const cacheKey = typeof cacheKeyProp === "string" && cacheKeyProp ? cacheKeyProp : url;
  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<any>(null);
  const shouldAutoPlayRef = useRef(false);
  const isPlayingRef = useRef(false);
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

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedDuration, setResolvedDuration] = useState<number | undefined>(undefined);

  const fallbackDurationSeconds = typeof duration === "number" && Number.isFinite(duration) ? Math.max(0, duration) : undefined;
  const currentTimeText = useMemo(() => formatTime(currentTime), [currentTime]);

  const playback = useAudioPlaybackRegistration({
    id: `audio-msg:${cacheKey}`,
    kind: "chat",
    title: title || "聊天音频",
    url: hasUrl ? url : undefined,
    pause: () => {
      try {
        waveSurferRef.current?.pause?.();
      }
      catch {
        // ignore
      }
    },
  });
  const playbackRef = useRef(playback);
  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  const shouldKeepWaveSurferAlive = useCallback(() => {
    if (shouldAutoPlayRef.current || isPlayingRef.current) {
      return true;
    }
    try {
      return Boolean(waveSurferRef.current?.isPlaying?.());
    }
    catch {
      return false;
    }
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
      mediaDebug("audio-message", "event-ready", { cacheKey, url, instanceId: instanceIdRef.current });
      const d = ws.getDuration?.();
      if (typeof d === "number" && Number.isFinite(d) && d > 0)
        setResolvedDuration(d);

      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false;
        ws.play?.();
      }
    }));

    unsubs.push(ws.on?.("play", () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
      playbackRef.current.onPlay();
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
      playbackRef.current.onPause();
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
      playbackRef.current.onEnded();
      mediaDebug("audio-message", "event-finish", { cacheKey, url, instanceId: instanceIdRef.current });
    }));

    const updateTime = () => {
      const t = ws.getCurrentTime?.();
      if (typeof t === "number" && Number.isFinite(t))
        setCurrentTime(t);
    };
    unsubs.push(ws.on?.("timeupdate", updateTime));
    unsubs.push(ws.on?.("audioprocess", updateTime));

    unsubs.push(ws.on?.("error", (e: any) => {
      console.error("[tc-audio-message] wavesurfer error", e);
    }));

    unsubsRef.current = unsubs.filter(Boolean) as Array<() => void>;
    boundWaveSurferRef.current = ws;
  }, [cacheKey, clearWaveSurferBindings, url]);

  const ensureWaveSurfer = useCallback(async () => {
    if (waveSurferRef.current)
      return waveSurferRef.current;
    if (ensurePromiseRef.current)
      return ensurePromiseRef.current;
    if (!waveContainerRef.current)
      throw new Error("音频波形容器未就绪");

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
        if (typeof t === "number" && Number.isFinite(t))
          setCurrentTime(t);
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
  }, [cleanupWaveSurfer, shouldKeepWaveSurferAlive, cacheKey, url]);

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
    };
  }, [cacheKey, cleanupWaveSurfer, shouldKeepWaveSurferAlive, url]);

  useEffect(() => {
    if (!hasUrl)
      return;
    if (!waveContainerRef.current)
      return;
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
  }, [cacheKey, ensureWaveSurfer, hasUrl]);

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
    });
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

      if (ws.isPlaying?.())
        ws.pause?.();
      else
        ws.play?.();
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

  if (!hasUrl)
    return null;

  return (
    <div className="tc-audio-message bg-base-200 rounded-lg p-2 min-w-[200px] max-w-[340px]">
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
