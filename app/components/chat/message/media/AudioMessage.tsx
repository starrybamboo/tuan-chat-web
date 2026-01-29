// 音频消息播放组件（WaveSurfer 波形播放器）。
// 为了避免列表渲染/刷新时自动触发下载，WaveSurfer 仅在用户点击播放时才初始化与加载音频。
import { useEffect, useMemo, useRef, useState } from "react";

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

  const ensureWaveSurfer = async () => {
    if (waveSurferRef.current)
      return waveSurferRef.current;
    if (!waveContainerRef.current)
      throw new Error("音频波形容器未就绪");

    const mod: any = await import("wavesurfer.js");
    const WaveSurfer = mod?.default ?? mod;

    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: "rgba(148, 163, 184, 0.55)",
      progressColor: "#3b82f6",
      cursorColor: "rgba(59, 130, 246, 0.9)",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 28,
      normalize: true,
      interact: true,
      url,
      crossOrigin: "anonymous",
    });

    ws.on("ready", () => {
      setIsReady(true);
      const d = ws.getDuration?.();
      if (typeof d === "number" && Number.isFinite(d) && d > 0)
        setResolvedDuration(d);

      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false;
        ws.play?.();
      }
    });

    ws.on("play", () => {
      setIsPlaying(true);
      playback.onPlay();
    });
    ws.on("pause", () => {
      setIsPlaying(false);
      playback.onPause();
    });
    ws.on("finish", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      playback.onEnded();
    });

    const updateTime = () => {
      const t = ws.getCurrentTime?.();
      if (typeof t === "number" && Number.isFinite(t))
        setCurrentTime(t);
    };
    ws.on("timeupdate", updateTime);
    ws.on("audioprocess", updateTime);

    ws.on("error", (e: any) => {
      console.error("[tc-audio-message] wavesurfer error", e);
    });

    waveSurferRef.current = ws;
    return ws;
  };

  useEffect(() => {
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setResolvedDuration(undefined);
    shouldAutoPlayRef.current = false;

    const ws = waveSurferRef.current;
    waveSurferRef.current = null;
    try {
      ws?.destroy?.();
    }
    catch {
      // ignore
    }
  }, [url]);

  useEffect(() => {
    return () => {
      const ws = waveSurferRef.current;
      waveSurferRef.current = null;
      try {
        ws?.destroy?.();
      }
      catch {
        // ignore
      }
    };
  }, []);

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
