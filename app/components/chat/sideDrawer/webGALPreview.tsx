/**
 * WebGAL 实时渲染预览面板
 * 以 iframe 形式嵌入到聊天室侧边栏
 */

interface WebGALPreviewProps {
  previewUrl: string | null;
  isActive: boolean;
  onClose?: () => void;
  className?: string;
  /** TTS 是否启用 */
  ttsEnabled?: boolean;
  /** TTS 开关回调 */
  onTTSToggle?: (enabled: boolean) => void;
}

export default function WebGALPreview({
  previewUrl,
  isActive,
  onClose,
  className,
  ttsEnabled = false,
  onTTSToggle,
}: WebGALPreviewProps) {
  if (!isActive || !previewUrl) {
    return (
      <div className={`flex flex-col h-full ${className ?? ""}`}>
        <div className="flex items-center justify-between p-2 border-b border-base-300 bg-base-200">
          <span className="font-medium text-sm">WebGAL 实时预览</span>
          {onClose && (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle"
              onClick={onClose}
              title="关闭预览"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-base-content/50 text-sm">
          <div className="text-center">
            <p>实时渲染未启动</p>
            <p className="text-xs mt-1">点击工具栏中的 WebGAL 按钮开启</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      <div className="flex items-center justify-between p-2 border-b border-base-300 bg-base-200">
        <span className="font-medium text-sm">WebGAL 实时预览</span>
        <div className="flex items-center gap-2">
          {/* TTS 开关 */}
          {onTTSToggle && (
            <label className="flex items-center gap-1 cursor-pointer" title={ttsEnabled ? "关闭 AI 配音" : "开启 AI 配音"}>
              <span className="text-xs text-base-content/70">配音</span>
              <input
                type="checkbox"
                className="toggle toggle-xs toggle-primary"
                checked={ttsEnabled}
                onChange={e => onTTSToggle(e.target.checked)}
              />
            </label>
          )}
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-xs"
            title="在新窗口打开"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          {onClose && (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle"
              onClick={onClose}
              title="关闭预览"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 relative bg-black">
        <iframe
          src={previewUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="WebGAL 实时预览"
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
