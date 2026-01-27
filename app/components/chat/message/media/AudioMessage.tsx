import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { PauseIcon, PlayIcon } from "@/icons";

interface AudioMessageProps {
  url: string;
  duration?: number; // Optional duration in seconds
}

export default function AudioMessage({ url, duration: initialDuration }: AudioMessageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !url)
      return;

    let isCancelled = false;
    const isAbortError = (err: unknown) => {
      if (!err || typeof err !== "object")
        return false;
      const maybeError = err as { name?: string; message?: string };
      return maybeError.name === "AbortError" || Boolean(maybeError.message?.includes("signal is aborted"));
    };

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setIsLoading(true);
    setIsPlaying(false);

    try {
      wavesurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#94a3b8", // slate-400
        progressColor: "#3b82f6", // blue-500
        cursorColor: "transparent",
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        height: 40,
        normalize: true,
        backend: "WebAudio",
      });

      wavesurferRef.current.load(url);

      wavesurferRef.current.on("ready", () => {
        if (isCancelled)
          return;
        setIsLoading(false);
        if (wavesurferRef.current) {
          const d = wavesurferRef.current.getDuration();
          if (d > 0)
            setDuration(d);
        }
      });

      wavesurferRef.current.on("play", () => {
        if (!isCancelled)
          setIsPlaying(true);
      });
      wavesurferRef.current.on("pause", () => {
        if (!isCancelled)
          setIsPlaying(false);
      });
      wavesurferRef.current.on("finish", () => {
        if (isCancelled)
          return;
        setIsPlaying(false);
        setCurrentTime(0);
      });
      wavesurferRef.current.on("audioprocess", () => {
        if (isCancelled)
          return;
        if (wavesurferRef.current) {
          setCurrentTime(wavesurferRef.current.getCurrentTime());
        }
      });
      wavesurferRef.current.on("error", (err) => {
        if (isCancelled || isAbortError(err))
          return;
        console.error("WaveSurfer error:", err);
        setIsLoading(false);
      });
    }
    catch (error) {
      console.error("Failed to create WaveSurfer:", error);
      setIsLoading(false);
    }

    return () => {
      isCancelled = true;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [url]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 bg-base-200 rounded-lg min-w-[160px] sm:min-w-[200px] max-w-[260px] sm:max-w-[300px]">
      <button
        className="btn btn-circle btn-xs sm:btn-sm btn-primary flex-shrink-0"
        onClick={togglePlay}
        disabled={isLoading}
        type="button"
      >
        {isLoading
          ? (
              <span className="loading loading-spinner loading-xs"></span>
            )
          : isPlaying
            ? (
                <PauseIcon className="size-3 sm:size-4" />
              )
            : (
                <PlayIcon className="size-3 sm:size-4 ml-0.5" />
              )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div ref={containerRef} className="w-full" />
        <div className="flex justify-between text-xs text-base-content/70 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
