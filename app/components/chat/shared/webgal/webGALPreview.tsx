/**
 * WebGAL 实时渲染预览面板
 * 以 iframe 形式嵌入到聊天室侧边栏
 */

import { use, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { getTerreBaseUrl } from "@/webGAL/terreConfig";

interface WebGALPreviewProps {
  previewUrl: string | null;
  isActive: boolean;
  isResizing?: boolean;
  onClose?: () => void;
  className?: string;
}

export default function WebGALPreview({
  previewUrl,
  isActive,
  isResizing = false,
  onClose,
  className,
}: WebGALPreviewProps) {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? null;
  const navigate = useNavigate();
  const location = useLocation();

  const ensureHydrated = useRealtimeRenderStore(state => state.ensureHydrated);
  useEffect(() => {
    void ensureHydrated();
  }, [ensureHydrated]);

  const realtimeStatus = useRealtimeRenderStore(state => state.status);
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const isWebgalPaneActive = sideDrawerState === "webgal";
  const canOpenSpaceWebgalSettings = typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0;
  const isStarting = realtimeStatus === "initializing"
    || (isWebgalPaneActive && realtimeStatus !== "error" && !isActive);
  const queryWithoutTab = useCallback(() => {
    const nextSearchParams = new URLSearchParams(location.search);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    return qs ? `?${qs}` : "";
  }, [location.search]);
  const handleOpenSpaceWebgalSettings = useCallback(() => {
    if (!canOpenSpaceWebgalSettings) {
      return;
    }
    setSideDrawerState("none");
    navigate(`/chat/${spaceId}/webgal${queryWithoutTab()}`);
  }, [canOpenSpaceWebgalSettings, navigate, queryWithoutTab, setSideDrawerState, spaceId]);

  const fallbackTitle = isStarting
    ? "实时渲染正在启动"
    : realtimeStatus === "error"
      ? "实时渲染启动失败"
      : "实时渲染未启动";
  const fallbackHint = isStarting
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
              title={canOpenSpaceWebgalSettings ? "打开空间级 WebGAL 渲染设置" : "当前空间不可用"}
              disabled={!canOpenSpaceWebgalSettings}
              onClick={handleOpenSpaceWebgalSettings}
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
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            title={canOpenSpaceWebgalSettings ? "打开空间级 WebGAL 渲染设置" : "当前空间不可用"}
            disabled={!canOpenSpaceWebgalSettings}
            onClick={handleOpenSpaceWebgalSettings}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

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
    </div>
  );
}
