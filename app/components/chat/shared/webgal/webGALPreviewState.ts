import { appendWebgalLaunchHints } from "@/utils/launchWebGal";
import type { RealtimeRenderStatus } from "@/webGAL/useRealtimeRender";

type ResolveWebGALPreviewStateOptions = {
  previewUrl: string | null;
  realtimeStatus: RealtimeRenderStatus;
  isWebgalPaneActive: boolean;
};

export type WebGALPreviewState = {
  showPreviewFrame: boolean;
  fallbackTitle: string;
  fallbackHint: string;
};

export function resolveWebGALPreviewState({
  previewUrl,
  realtimeStatus,
  isWebgalPaneActive,
}: ResolveWebGALPreviewStateOptions): WebGALPreviewState {
  const showPreviewFrame = typeof previewUrl === "string" && previewUrl.trim().length > 0;
  const isStarting = !showPreviewFrame
    && (realtimeStatus === "initializing" || (isWebgalPaneActive && realtimeStatus !== "error"));

  return {
    showPreviewFrame,
    fallbackTitle: isStarting
      ? "实时渲染正在启动"
      : realtimeStatus === "error"
        ? "实时渲染启动失败"
        : "实时渲染未启动",
    fallbackHint: isStarting
      ? "请稍候，正在连接 WebGAL..."
      : realtimeStatus === "error"
        ? appendWebgalLaunchHints("请确认 WebGAL 已启动后重试")
        : "点击工具栏中的 WebGAL 按钮开启",
  };
}
