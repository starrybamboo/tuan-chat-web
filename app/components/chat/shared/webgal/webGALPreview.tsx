/**
 * WebGAL 实时渲染预览面板
 * 以 iframe 形式嵌入到聊天室侧边栏
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { fetchRoomDndMap, roomDndMapQueryKey } from "@/components/chat/shared/map/roomDndMapApi";
import {
  buildBattleOverlayMessage,
  buildBattleOverlaySnapshot,
} from "@/components/chat/shared/webgal/battleOverlaySnapshot";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { resolveWebGALPreviewState } from "@/components/chat/shared/webgal/webGalPreviewState";
import { useOptionalStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { getTerreBaseUrl } from "@/webGAL/terreConfig";

interface WebGALPreviewProps {
  previewUrl: string | null;
  isResizing?: boolean;
  onClose?: () => void;
  className?: string;
}

export default function WebGALPreview({
  previewUrl,
  isResizing = false,
  onClose,
  className,
}: WebGALPreviewProps) {
  const spaceContext = use(SpaceContext);
  const roomContext = use(RoomContext);
  const spaceId = spaceContext.spaceId ?? null;
  const roomId = typeof roomContext.roomId === "number" && roomContext.roomId > 0 ? roomContext.roomId : null;
  const stateRuntime = useOptionalStateRuntimeContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const ensureHydrated = useRealtimeRenderStore(state => state.ensureHydrated);
  const setRealtimeRenderQueryClient = useRealtimeRenderStore(state => state.setQueryClient);
  useEffect(() => {
    setRealtimeRenderQueryClient(queryClient);
  }, [queryClient, setRealtimeRenderQueryClient]);

  useEffect(() => {
    void ensureHydrated(spaceId);
  }, [ensureHydrated, spaceId]);

  const realtimeStatus = useRealtimeRenderStore(state => state.status);
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const mapQuery = useQuery({
    enabled: roomId != null,
    queryKey: roomDndMapQueryKey(roomId ?? -1),
    queryFn: () => fetchRoomDndMap(roomId ?? -1),
  });

  const isWebgalPaneActive = sideDrawerState === "webgal";
  const canOpenSpaceWebgalSettings = typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0;
  const queryWithoutTab = useCallback(() => {
    const nextSearchParams = new URLSearchParams(location.searchStr);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    return qs ? `?${qs}` : "";
  }, [location.searchStr]);
  const handleOpenSpaceWebgalSettings = useCallback(() => {
    if (!canOpenSpaceWebgalSettings) {
      return;
    }
    setSideDrawerState("none");
    router.history.push(`/chat/${spaceId}/webgal${queryWithoutTab()}`);
  }, [canOpenSpaceWebgalSettings, queryWithoutTab, router, setSideDrawerState, spaceId]);
  const previewState = resolveWebGALPreviewState({
    previewUrl,
    realtimeStatus,
    isWebgalPaneActive,
  });
  const battleOverlaySnapshot = useMemo(() => buildBattleOverlaySnapshot({
    roomId,
    map: mapQuery.data ?? null,
    roles: roomContext.roomAllRoles ?? [],
    runtime: stateRuntime,
  }), [mapQuery.data, roomContext.roomAllRoles, roomId, stateRuntime]);
  const postBattleOverlaySnapshot = useCallback(() => {
    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow) {
      return;
    }
    targetWindow.postMessage(buildBattleOverlayMessage(battleOverlaySnapshot), "*");
  }, [battleOverlaySnapshot]);

  useEffect(() => {
    if (!previewState.showPreviewFrame) {
      return;
    }
    postBattleOverlaySnapshot();
  }, [postBattleOverlaySnapshot, previewState.showPreviewFrame]);

  if (!previewState.showPreviewFrame) {
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
            <p>{previewState.fallbackTitle}</p>
            <p className="text-xs mt-1">{previewState.fallbackHint}</p>
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
              ref={iframeRef}
              src={previewUrl ?? undefined}
              title="WebGAL 实时预览"
              allow="autoplay; fullscreen"
              sandbox="allow-scripts allow-same-origin"
              onLoad={postBattleOverlaySnapshot}
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
