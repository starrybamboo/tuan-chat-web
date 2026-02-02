// 音频消息播放组件（WaveSurfer 波形播放器）。
// 为了避免列表渲染/刷新时自动触发下载，WaveSurfer 仅在用户点击播放时才初始化与加载音频。
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { acquireAudioMessageWaveSurfer, hasAudioMessageWaveSurfer } from "@/components/chat/infra/audioMessage/audioMessageWaveSurferCache";
import { useAudioPlaybackRegistration } from "@/components/common/useAudioPlaybackRegistration";

import "./audioMessage.css";

interface AudioMessageProps {
  url: string;
  duration?: number; // Optional duration in seconds
  title?: string;
}

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AudioMessage({ url, duration, title }: AudioMessageProps) {
  const hasUrl = Boolean(url);
  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<any>(null);
  const shouldAutoPlayRef = useRef(false);
  const releaseRef = useRef<null | ((opts?: { keepPlaying?: boolean }) => void)>(null);
  const unsubsRef = useRef<(() => void)[]>([]);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedDuration, setResolvedDuration] = useState<number | undefined>(undefined);

  const fallbackDurationSeconds = typeof duration === "number" && Number.isFinite(duration) ? Math.max(0, duration) : undefined;
  const currentTimeText = useMemo(() => formatTime(currentTime), [currentTime]);

  const playback = useAudioPlaybackRegistration({
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

  const cleanupWaveSurfer = (opts?: { keepPlaying?: boolean }) => {
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

    const release = releaseRef.current;
    releaseRef.current = null;
    waveSurferRef.current = null;
    try {
      release?.(opts);
    }
    catch {
      // ignore
    }
  };

  const bindWaveSurfer = useCallback((ws: any) => {
    const unsubs: Array<(() => void) | undefined> = [];

    unsubs.push(ws.on?.("ready", () => {
      setIsReady(true);
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
      playback.onPlay();
    }));
    unsubs.push(ws.on?.("pause", () => {
      setIsPlaying(false);
      playback.onPause();
    }));
    unsubs.push(ws.on?.("finish", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      playback.onEnded();
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
  }, [playback]);

  const ensureWaveSurfer = useCallback(async () => {
    if (waveSurferRef.current)
      return waveSurferRef.current;
    if (!waveContainerRef.current)
      throw new Error("音频波形容器未就绪");

    const { ws, release } = await acquireAudioMessageWaveSurfer({
      url,
      container: waveContainerRef.current,
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
      setIsPlaying(Boolean(ws.isPlaying?.()));
      const t = ws.getCurrentTime?.();
      if (typeof t === "number" && Number.isFinite(t))
        setCurrentTime(t);
    }
    catch {
      // ignore
    }

    return ws;
  }, [bindWaveSurfer, url]);

  useEffect(() => {
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setResolvedDuration(undefined);
    shouldAutoPlayRef.current = false;
    cleanupWaveSurfer({ keepPlaying: false });
  }, [url]);

  useEffect(() => {
    return () => {
      const ws = waveSurferRef.current;
      const keepPlaying = Boolean(ws?.isPlaying?.());
      cleanupWaveSurfer({ keepPlaying });
    };
  }, []);

  useEffect(() => {
    if (!hasUrl)
      return;
    if (!waveContainerRef.current)
      return;
    if (!hasAudioMessageWaveSurfer(url))
      return;

    void ensureWaveSurfer();
  }, [ensureWaveSurfer, hasUrl, url]);

  const durationText = useMemo(() => {
    const d = typeof resolvedDuration === "number" && Number.isFinite(resolvedDuration) && resolvedDuration > 0
      ? resolvedDuration
      : fallbackDurationSeconds;
    return typeof d === "number" ? formatTime(d) : "00:00";
  }, [fallbackDurationSeconds, resolvedDuration]);

  const handleTogglePlay = async () => {
    try {
      const ws = await ensureWaveSurfer();
      if (!isReady)
        shouldAutoPlayRef.current = true;

      if (ws.isPlaying?.())
        ws.pause?.();
      else
        ws.play?.();
    }
    catch (e) {
      console.error("[tc-audio-message] toggle play failed", e);
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
