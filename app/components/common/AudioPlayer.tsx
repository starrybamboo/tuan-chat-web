import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface AudioPlayerProps {
  title?: string;
  audioFile?: File;
  audioUrl?: string;
  className?: string;
  showTitle?: boolean;
  size?: "sm" | "md" | "lg";
  height?: number;
}

/**
 * 通用音频播放器组件 - 使用 WaveSurfer.js 进行波形可视化
 */
export default function AudioPlayer({
  title,
  audioFile,
  audioUrl: externalAudioUrl,
  className = "",
  showTitle = true,
  size = "md",
  height,
}: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // 创建音频URL
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    else if (externalAudioUrl) {
      setAudioUrl(externalAudioUrl);
    }
    else {
      setAudioUrl(null);
    }
  }, [audioFile, externalAudioUrl]);

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
        height: height ?? (size === "sm" ? 40 : size === "lg" ? 60 : 50),
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
  }, [audioUrl, size]);

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

  if (!audioFile && !externalAudioUrl) {
    return null;
  }

  const buttonSize = size === "sm" ? "btn-xs" : size === "lg" ? "btn-md" : "btn-sm";
  const iconSize = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";
  const waveHeight = size === "sm" ? 40 : size === "lg" ? 60 : 50;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 标题信息 */}
      {showTitle && title && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span className={`${textSize} font-medium text-base-content`}>{title}</span>
          </div>
        </div>
      )}

      {/* 波形容器 */}
      <div className="w-full bg-base-200 rounded-lg p-2">
        {isLoading && (
          <div className={`flex items-center justify-center h-[${waveHeight}px]`}>
            <span className={`loading loading-spinner ${size === "sm" ? "loading-xs" : "loading-sm"}`}></span>
            <span className={`ml-2 ${textSize}`}>加载音频中...</span>
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
            className={`btn ${buttonSize} ${isLoading ? "btn-disabled" : "btn-primary"}`}
            onClick={togglePlayPause}
            disabled={isLoading}
            title={isPlaying ? "暂停" : "播放"}
          >
            {isLoading
              ? (
                  <span className={`loading loading-spinner ${size === "sm" ? "loading-xs" : "loading-xs"}`}></span>
                )
              : isPlaying
                ? (
                    <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  )
                : (
                    <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
          </button>

          {/* 停止按钮 */}
          <button
            type="button"
            className={`btn ${buttonSize} btn-outline ${isLoading ? "btn-disabled" : ""}`}
            onClick={stop}
            disabled={isLoading}
            title="停止"
          >
            <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>

          {/* 时间显示 */}
          <span className={`${textSize} text-base-content/70 ml-2`}>
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
