import type { DocMode } from "@blocksuite/affine/model";

import { useMemo, useRef } from "react";

import { buildBlocksuiteFrameSrc } from "@/components/chat/infra/blocksuite/shared/frameSrc";

type UseBlocksuiteFrameInitParams = {
  instanceId: string;
  workspaceId: string;
  spaceId?: number;
  docId: string;
  readOnly: boolean;
  allowModeSwitch: boolean;
  fullscreenEdgeless: boolean;
  forcedMode: DocMode;
  tcHeader?: {
    enabled?: boolean;
    fallbackTitle?: string;
    fallbackImageUrl?: string;
  };
  className?: string;
  isEdgelessFullscreenActive: boolean;
  isFrameReady: boolean;
  hasFrameReadyOnce: boolean;
};

export function useBlocksuiteFrameInit(params: UseBlocksuiteFrameInitParams) {
  const {
    instanceId,
    workspaceId,
    spaceId,
    docId,
    readOnly,
    allowModeSwitch,
    fullscreenEdgeless,
    forcedMode,
    tcHeader,
    className,
    isEdgelessFullscreenActive,
    isFrameReady,
    hasFrameReadyOnce,
  } = params;

  const tcHeaderEnabled = Boolean(tcHeader?.enabled);
  const frozenTcHeaderFallbackRef = useRef<{
    workspaceId: string;
    docId: string;
    title?: string;
    imageUrl?: string;
  } | null>(null);

  // tcHeader 的 fallback 只在文档切换时更新，避免标题/封面抖动影响 iframe 初始化参数。
  if (tcHeaderEnabled) {
    const prev = frozenTcHeaderFallbackRef.current;
    if (!prev || prev.workspaceId !== workspaceId || prev.docId !== docId) {
      frozenTcHeaderFallbackRef.current = {
        workspaceId,
        docId,
        title: tcHeader?.fallbackTitle,
        imageUrl: tcHeader?.fallbackImageUrl,
      };
    }
  }
  else if (frozenTcHeaderFallbackRef.current) {
    frozenTcHeaderFallbackRef.current = null;
  }

  const frozenTcHeaderTitle = frozenTcHeaderFallbackRef.current?.title;
  const frozenTcHeaderImageUrl = frozenTcHeaderFallbackRef.current?.imageUrl;

  const initParams = useMemo(() => {
    // query 参数统一转成 iframe 可消费的稳定字符串格式。
    return {
      instanceId,
      workspaceId,
      spaceId: typeof spaceId === "number" && Number.isFinite(spaceId) ? String(spaceId) : undefined,
      docId,
      readOnly: readOnly ? "1" : "0",
      allowModeSwitch: allowModeSwitch ? "1" : "0",
      fullscreenEdgeless: fullscreenEdgeless ? "1" : "0",
      mode: forcedMode,
      tcHeader: tcHeaderEnabled ? "1" : "0",
      tcHeaderTitle: frozenTcHeaderTitle,
      tcHeaderImageUrl: frozenTcHeaderImageUrl,
    };
  }, [
    allowModeSwitch,
    docId,
    forcedMode,
    frozenTcHeaderImageUrl,
    frozenTcHeaderTitle,
    fullscreenEdgeless,
    instanceId,
    readOnly,
    spaceId,
    tcHeaderEnabled,
    workspaceId,
  ]);

  // iframe 首次挂载后保持初始参数不变，避免 src 变化触发整帧重建。
  const frozenInitParamsRef = useRef(initParams);
  const frozenInitParams = frozenInitParamsRef.current;

  const src = useMemo(() => {
    return buildBlocksuiteFrameSrc({
      instanceId: frozenInitParams.instanceId,
      workspaceId: frozenInitParams.workspaceId,
      spaceId: frozenInitParams.spaceId === undefined ? undefined : Number(frozenInitParams.spaceId),
      docId: frozenInitParams.docId,
      readOnly: frozenInitParams.readOnly === "1",
      allowModeSwitch: frozenInitParams.allowModeSwitch === "1",
      fullscreenEdgeless: frozenInitParams.fullscreenEdgeless === "1",
      mode: frozenInitParams.mode,
      tcHeader: frozenInitParams.tcHeader === "1",
      tcHeaderTitle: frozenInitParams.tcHeaderTitle,
      tcHeaderImageUrl: frozenInitParams.tcHeaderImageUrl,
    });
  }, [frozenInitParams]);

  // 外部如果已经显式传了高度类，这里就不要再额外补默认高度。
  const hasExplicitHeightClass = useMemo(() => {
    const value = (className ?? "").trim();
    if (!value)
      return false;
    return /(?:^|\s)(?:h-\[|h-|min-h-|max-h-)/.test(value);
  }, [className]);

  // 首次 ready 之前先隐藏 iframe，避免未初始化内容闪烁。
  const shouldHideFrame = !hasFrameReadyOnce && !isFrameReady;

  const wrapperClassName = isEdgelessFullscreenActive
    ? [className, "w-full h-full min-h-0"].filter(Boolean).join(" ")
    : "contents";

  const iframeClassName = isEdgelessFullscreenActive
    ? "block w-full h-full border-0 bg-transparent"
    : [
        "block",
        "w-full",
        "border-0",
        "bg-transparent",
        shouldHideFrame ? "opacity-0 pointer-events-none" : "opacity-100",
        className,
        !hasExplicitHeightClass ? "h-full" : "",
      ].filter(Boolean).join(" ");

  return {
    src,
    tcHeaderEnabled,
    frozenTcHeaderTitle,
    frozenTcHeaderImageUrl,
    wrapperClassName,
    iframeClassName,
    hasExplicitHeightClass,
    hasFrameReadyOnce,
    isFrameReady,
  };
}
