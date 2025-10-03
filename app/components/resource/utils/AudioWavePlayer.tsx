import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface AudioWavePlayerProps {
  audioUrl: string;
  audioName?: string;
  displayName?: boolean;
  onDelete?: () => void;
  className?: string;
}

/**
 * 音频波形播放器组件 - 专为资源卡片设计
 * 使用 WaveSurfer.js 进行波形可视化
 */
export default function AudioWavePlayer({
  audioUrl,
  audioName,
  displayName,
  className = "",
}: AudioWavePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // 初始化 WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioUrl) {
      return;
    }

    // 销毁旧实例
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    setIsLoading(true);
    setIsPlaying(false);

    try {
      wavesurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#94a3b8", // 波形颜色 - slate-400
        progressColor: "#3b82f6", // 播放进度颜色 - blue-500
        cursorColor: "#ef4444", // 播放指针颜色 - red-500
        barWidth: 2,
        barGap: 1,
        height: 50,
        normalize: true,
        backend: "WebAudio",
      });

      // 加载音频
      wavesurferRef.current.load(audioUrl);

      // 事件监听器
      wavesurferRef.current.on("ready", () => {
        setIsLoading(false);
        if (wavesurferRef.current) {
          setDuration(wavesurferRef.current.getDuration());
        }
      });

      wavesurferRef.current.on("play", () => {
        setIsPlaying(true);
      });

      wavesurferRef.current.on("pause", () => {
        setIsPlaying(false);
      });

      wavesurferRef.current.on("finish", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      wavesurferRef.current.on("audioprocess", () => {
        if (wavesurferRef.current) {
          setCurrentTime(wavesurferRef.current.getCurrentTime());
        }
      });

      wavesurferRef.current.on("error", (error) => {
        console.error("WaveSurfer error:", error);
        setIsLoading(false);
        setIsPlaying(false);
      });
    }
    catch (error) {
      console.error("Failed to create WaveSurfer instance:", error);
      setIsLoading(false);
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl]);

  // 播放/暂停控制
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wavesurferRef.current && !isLoading) {
      wavesurferRef.current.playPause();
    }
  };

  // 停止播放
  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      setCurrentTime(0);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 音频名称 */}
      {audioName && displayName && (
        <div className="text-sm font-medium text-base-content/80 truncate">
          {audioName}
        </div>
      )}

      {/* 波形容器 */}
      <div className="w-full bg-base-200 rounded-lg p-2">
        {isLoading && (
          <div className="flex items-center justify-center h-[50px]">
            <span className="loading loading-spinner loading-xs"></span>
            <span className="ml-2 text-xs">加载中...</span>
          </div>
        )}
        <div
          ref={containerRef}
          className={`w-full cursor-pointer ${isLoading ? "hidden" : ""}`}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* 控制栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 播放/暂停按钮 */}
          <button
            type="button"
            className={`btn btn-xs ${isLoading ? "btn-disabled" : "btn-primary"}`}
            onClick={togglePlayPause}
            disabled={isLoading}
            title={isPlaying ? "暂停" : "播放"}
          >
            {isLoading
              ? (
                  <span className="loading loading-spinner loading-xs"></span>
                )
              : isPlaying
                ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  )
                : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
          </button>

          {/* 停止按钮 */}
          <button
            type="button"
            className={`btn btn-xs btn-outline ${isLoading ? "btn-disabled" : ""}`}
            onClick={stop}
            disabled={isLoading}
            title="停止"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>

          {/* 时间显示 */}
          <span className="text-xs text-base-content/60">
            {formatTime(currentTime)}
            {" "}
            /
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
