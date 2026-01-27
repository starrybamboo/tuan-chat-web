// 通用音频播放器组件，提供流式播放、进度条与时间展示。
// 适配不同尺寸的预览场景，避免整段音频下载后才播放。
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import H5AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import "./audioPlayer.css";

interface AudioPlayerProps {
  title?: string;
  audioFile?: File;
  audioUrl?: string;
  className?: string;
  showTitle?: boolean;
  size?: "sm" | "md" | "lg";
  height?: number;
}

export default function AudioPlayer({
  title,
  audioFile,
  audioUrl: externalAudioUrl,
  className = "",
  showTitle = true,
  size = "md",
  height,
}: AudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    if (externalAudioUrl) {
      setAudioUrl(externalAudioUrl);
      return;
    }

    setAudioUrl(null);
  }, [audioFile, externalAudioUrl]);

  if (!audioFile && !externalAudioUrl) {
    return null;
  }

  const sizeClass = size === "sm" ? "tc-audio-player--sm" : size === "lg" ? "tc-audio-player--lg" : "tc-audio-player--md";
  const progressHeight = typeof height === "number" && Number.isFinite(height)
    ? Math.max(4, Math.round(height / 8))
    : undefined;
  const resolvedUrl = audioUrl ?? externalAudioUrl ?? "";

  return (
    <div className={`space-y-2 ${className}`}>
      {showTitle && title && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span className={`${size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"} font-medium text-base-content`}>
              {title}
            </span>
          </div>
        </div>
      )}

      <div className="w-full bg-base-200 rounded-lg p-2">
        <H5AudioPlayer
          className={`tc-audio-player ${sizeClass}`}
          src={resolvedUrl}
          autoPlayAfterSrcChange={false}
          showJumpControls={false}
          customAdditionalControls={[]}
          customVolumeControls={[]}
          customControlsSection={[RHAP_UI.MAIN_CONTROLS]}
          customProgressBarSection={[RHAP_UI.CURRENT_TIME, RHAP_UI.PROGRESS_BAR, RHAP_UI.DURATION]}
          audioProps={{
            preload: "metadata",
            crossOrigin: "anonymous",
          }}
          style={progressHeight ? { "--tc-audio-progress-height": `${progressHeight}px` } as CSSProperties : undefined}
        />
      </div>
    </div>
  );
}
