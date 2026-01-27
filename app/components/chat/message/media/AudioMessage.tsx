// 音频消息播放组件，使用流式 Audio 元素展示进度条与时间信息。
// 依赖轻量播放器 UI，提供播放、暂停与拖动定位能力。
import AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import "./audioMessage.css";

interface AudioMessageProps {
  url: string;
  duration?: number; // Optional duration in seconds
}

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AudioMessage({ url, duration }: AudioMessageProps) {
  if (!url)
    return null;

  const fallbackDuration = typeof duration === "number" ? formatTime(duration) : "00:00";

  return (
    <div className="tc-audio-message bg-base-200 rounded-lg p-1.5 sm:p-2 min-w-[160px] sm:min-w-[200px] max-w-[260px] sm:max-w-[300px]">
      <AudioPlayer
        className="tc-audio-message-player"
        src={url}
        autoPlayAfterSrcChange={false}
        showJumpControls={false}
        customAdditionalControls={[]}
        customVolumeControls={[]}
        customControlsSection={[RHAP_UI.MAIN_CONTROLS]}
        customProgressBarSection={[RHAP_UI.CURRENT_TIME, RHAP_UI.PROGRESS_BAR, RHAP_UI.DURATION]}
        defaultCurrentTime="00:00"
        defaultDuration={fallbackDuration}
        audioProps={{
          preload: "metadata",
          crossOrigin: "anonymous",
        }}
      />
    </div>
  );
}
