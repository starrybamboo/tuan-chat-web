// 资源卡片音频播放组件，复用通用播放器以支持流式加载与进度条拖动。
// 保留名称展示逻辑，避免额外波形渲染开销。
import AudioPlayer from "@/components/common/AudioPlayer";

interface AudioWavePlayerProps {
  audioUrl: string;
  audioName?: string;
  displayName?: boolean;
  onDelete?: () => void;
  className?: string;
}

export default function AudioWavePlayer({
  audioUrl,
  audioName,
  displayName,
  className = "",
}: AudioWavePlayerProps) {
  if (!audioUrl) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {audioName && displayName && (
        <div className="text-sm font-medium text-base-content/80 truncate">
          {audioName}
        </div>
      )}
      <AudioPlayer audioUrl={audioUrl} showTitle={false} size="sm" />
    </div>
  );
}
