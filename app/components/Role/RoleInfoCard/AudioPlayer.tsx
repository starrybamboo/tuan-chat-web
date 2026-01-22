import type { Role } from "../types";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface AudioPlayerProps {
  role: Role;
  size?: "default" | "compact";
  onRoleUpdate?: (updatedRole: Role) => void;
  onDelete?: () => void;
}

/**
 * 音频播放器组件 - 使用 WaveSurfer.js 进行波形可视化
 */
export default function AudioPlayer({ role, size = "default", onRoleUpdate, onDelete }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const isCompact = size === "compact";
  const waveHeight = isCompact ? 40 : 60;

  // 初始化 WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !role.voiceUrl) {
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
        barWidth: isCompact ? 1 : 2,
        barGap: 1,
        height: waveHeight,
        normalize: true,
        backend: "WebAudio",
      });

      // 加载音频
      wavesurferRef.current.load(role.voiceUrl);

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

      // 注意：WaveSurfer.js 可能不支持 'seek' 事件，我们移除它

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
  }, [role.voiceUrl, isCompact, waveHeight]);

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

  // 处理删除音频
  const handleDeleteAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedRole = { ...role, voiceUrl: undefined };

    // 调用外部回调
    if (onDelete) {
      onDelete();
    }

    // 通过回调通知父组件更新
    if (onRoleUpdate) {
      onRoleUpdate(updatedRole);
    }
  };

  if (!role.voiceUrl) {
    return null;
  }

  return (
    <div className={isCompact ? "mt-2 pt-2" : "mt-3 pt-3 border-t border-base-content/10"}>
      <div className={isCompact ? "space-y-2" : "space-y-3"}>
        {/* 波形容器 */}
        <div className={`w-full bg-base-200 rounded-lg ${isCompact ? "p-2" : "p-3"}`}>
          {isLoading && (
            <div className={`flex items-center justify-center ${isCompact ? "h-[40px]" : "h-[60px]"}`}>
              <span className="loading loading-spinner loading-sm"></span>
              <span className={`ml-2 ${isCompact ? "text-xs" : "text-sm"}`}>加载音频中...</span>
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
          <div className={`flex items-center ${isCompact ? "gap-1" : "gap-2"}`}>
            {/* 播放/暂停按钮 */}
            <button
              type="button"
              className={`btn ${isCompact ? "btn-xs" : "btn-sm"} ${isLoading ? "btn-disabled" : "btn-primary"}`}
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
                      <svg className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    )
                  : (
                      <svg className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
            </button>

            {/* 停止按钮 */}
            <button
              type="button"
              className={`btn ${isCompact ? "btn-xs" : "btn-sm"} btn-outline ${isLoading ? "btn-disabled" : ""}`}
              onClick={stop}
              disabled={isLoading}
              title="停止"
            >
              <svg className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
            </button>

            {/* 时间显示 */}
            <span className={`${isCompact ? "text-xs" : "text-sm"} text-base-content/70 ml-2`}>
              {formatTime(currentTime)}
              {" "}
              /
              {formatTime(duration)}
            </span>
          </div>

          {/* 删除按钮 */}
          <button
            type="button"
            className={`btn ${isCompact ? "btn-xs" : "btn-sm"} btn-ghost btn-circle text-error hover:bg-error/10`}
            onClick={handleDeleteAudio}
            title="删除音频"
          >
            <svg className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
