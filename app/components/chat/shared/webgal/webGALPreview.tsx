/**
 * WebGAL 实时渲染预览面板
 * 以 iframe 形式嵌入到聊天室侧边栏
 */

import { useEffect, useState } from "react";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { getDefaultTerrePort, getTerreBaseUrl } from "@/webGAL/terreConfig";

interface WebGALPreviewProps {
  previewUrl: string | null;
  isActive: boolean;
  isResizing?: boolean;
  onClose?: () => void;
  className?: string;
}

/** WebGAL 设置对话框（TTS + Terre 端口） */
function WebGALSettingsModal({
  isOpen,
  onClose,
  apiUrl,
  terrePortOverride,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  terrePortOverride: number | null;
  onSave: (next: { apiUrl: string; terrePortOverride: number | null }) => void;
}) {
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [inputPort, setInputPort] = useState(terrePortOverride ? String(terrePortOverride) : "");
  const [portError, setPortError] = useState<string | null>(null);

  useEffect(() => {
    setInputUrl(apiUrl);
  }, [apiUrl, isOpen]);

  useEffect(() => {
    setInputPort(terrePortOverride ? String(terrePortOverride) : "");
    setPortError(null);
  }, [terrePortOverride, isOpen]);

  if (!isOpen)
    return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl p-4 w-80 max-w-[90vw]">
        <h3 className="font-medium text-lg mb-4">WebGAL 设置</h3>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">TTS API 地址</span>
          </label>
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            placeholder="http://localhost:9000"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
          />
          <label className="label">
            <span className="label-text-alt text-base-content/50">
              留空使用默认地址 (环境变量 VITE_TTS_URL)
            </span>
          </label>
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">WebGAL (Terre) 端口</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            className="input input-bordered input-sm w-full"
            placeholder={String(getDefaultTerrePort())}
            value={inputPort}
            onChange={(e) => {
              setInputPort(e.target.value);
              setPortError(null);
            }}
          />
          <label className="label">
            <span className="label-text-alt text-base-content/50">
              留空使用默认端口 (环境变量 VITE_TERRE_URL)
            </span>
          </label>
          {portError && (
            <div className="text-xs text-error -mt-2">
              {portError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              const trimmedPort = inputPort.trim();
              let nextTerrePortOverride: number | null = null;
              if (trimmedPort) {
                const parsed = Number(trimmedPort);
                const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : Number.NaN;
                if (!Number.isFinite(normalized) || normalized < 1 || normalized > 65535) {
                  setPortError("端口必须是 1-65535 的整数");
                  return;
                }
                nextTerrePortOverride = normalized;
              }

              onSave({
                apiUrl: inputUrl.trim(),
                terrePortOverride: nextTerrePortOverride,
              });
              onClose();
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WebGALPreview({
  previewUrl,
  isActive,
  isResizing = false,
  onClose,
  className,
}: WebGALPreviewProps) {
  const [showSettings, setShowSettings] = useState(false);

  const ensureHydrated = useRealtimeRenderStore(state => state.ensureHydrated);
  useEffect(() => {
    void ensureHydrated();
  }, [ensureHydrated]);

  const ttsEnabled = useRealtimeRenderStore(state => state.ttsEnabled);
  const setTtsEnabled = useRealtimeRenderStore(state => state.setTtsEnabled);
  const ttsApiUrl = useRealtimeRenderStore(state => state.ttsApiUrl);
  const setTtsApiUrl = useRealtimeRenderStore(state => state.setTtsApiUrl);
  const terrePortOverride = useRealtimeRenderStore(state => state.terrePortOverride);
  const setTerrePortOverride = useRealtimeRenderStore(state => state.setTerrePortOverride);
  const miniAvatarEnabled = useRealtimeRenderStore(state => state.miniAvatarEnabled);
  const setMiniAvatarEnabled = useRealtimeRenderStore(state => state.setMiniAvatarEnabled);
  const autoFigureEnabled = useRealtimeRenderStore(state => state.autoFigureEnabled);
  const setAutoFigureEnabled = useRealtimeRenderStore(state => state.setAutoFigureEnabled);
  const realtimeStatus = useRealtimeRenderStore(state => state.status);

  const fallbackTitle = realtimeStatus === "initializing"
    ? "实时渲染正在启动"
    : realtimeStatus === "error"
      ? "实时渲染启动失败"
      : "实时渲染未启动";
  const fallbackHint = realtimeStatus === "initializing"
    ? "请稍候，正在连接 WebGAL..."
    : realtimeStatus === "error"
      ? "请确认 WebGAL 已启动后重试"
      : "点击工具栏中的 WebGAL 按钮开启";

  if (!isActive || !previewUrl) {
    return (
      <div className={`flex flex-col h-full ${className ?? ""}`}>
        <div className="flex items-center justify-between p-2 border-b border-base-300 bg-base-200">
          <span className="font-medium text-sm">WebGAL 实时预览</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              title="设置"
              onClick={() => setShowSettings(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
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
        <div className="flex-1 flex items-center justify-center text-base-content/50 text-sm">
          <div className="text-center">
            <p>{fallbackTitle}</p>
            <p className="text-xs mt-1">{fallbackHint}</p>
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
          {/* 自动填充立绘开关 */}
          <label className="flex items-center gap-1 cursor-pointer" title={autoFigureEnabled ? "关闭自动填充立绘（没有设置立绘时不显示）" : "开启自动填充立绘（没有设置立绘时自动显示左侧立绘）"}>
            <span className="text-xs text-base-content/70">自动填充立绘</span>
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-primary"
              checked={autoFigureEnabled}
              onChange={e => setAutoFigureEnabled(e.target.checked)}
            />
          </label>
          {/* 小头像开关 */}
          <label className="flex items-center gap-1 cursor-pointer ml-2" title={miniAvatarEnabled ? "关闭小头像" : "开启小头像"}>
            <span className="text-xs text-base-content/70">小头像</span>
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-primary"
              checked={miniAvatarEnabled}
              onChange={e => setMiniAvatarEnabled(e.target.checked)}
            />
          </label>
          {/* TTS 开关和设置 */}
          <>
            <label className="flex items-center gap-1 cursor-pointer" title={ttsEnabled ? "关闭 AI 配音" : "开启 AI 配音"}>
              <span className="text-xs text-base-content/70">配音</span>
              <input
                type="checkbox"
                className="toggle toggle-xs toggle-primary"
                checked={ttsEnabled}
                onChange={e => setTtsEnabled(e.target.checked)}
              />
            </label>
            {/* TTS 设置按钮 */}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              title="配音设置"
              onClick={() => setShowSettings(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </>

          <a
            href={previewUrl
              ? (() => {
                  // 从预览URL中提取游戏名，生成 WebGAL 编辑器URL
                  const match = previewUrl.match(/\/games\/([^/]+)/);
                  if (match) {
                    const gameName = match[1];
                    // 直接跳转到编辑页面
                    return `${getTerreBaseUrl()}/#/game/${gameName}`;
                  }
                  return previewUrl;
                })()
              : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-xs"
            title="打开 WebGAL 编辑器"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
      <div className="flex-1 relative bg-black">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${isResizing ? "pointer-events-none" : ""} flex items-center justify-center w-full h-full`}>
            <iframe
              src={previewUrl}
              title="WebGAL 实时预览"
              allow="autoplay; fullscreen"
              sandbox="allow-scripts allow-same-origin"
              style={{
                width: "100%",
                height: "auto",
                aspectRatio: "16/9",
                maxWidth: "100%",
                maxHeight: "100%",
                border: 0,
              }}
            />
          </div>
        </div>
      </div>

      {/* WebGAL 设置对话框 */}
      <WebGALSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        apiUrl={ttsApiUrl}
        terrePortOverride={terrePortOverride}
        onSave={({ apiUrl, terrePortOverride }) => {
          setTtsApiUrl(apiUrl);
          setTerrePortOverride(terrePortOverride);
        }}
      />
    </div>
  );
}
