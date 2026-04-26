import type { DocMode } from "@blocksuite/affine/model";

import { useMemo, useState } from "react";

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

type BlocksuiteFrameInitParams = {
  instanceId: string;
  workspaceId: string;
  spaceId?: string;
  docId: string;
  readOnly: "1" | "0";
  allowModeSwitch: "1" | "0";
  fullscreenEdgeless: "1" | "0";
  mode: DocMode;
  tcHeader: "1" | "0";
  tcHeaderTitle?: string;
  tcHeaderImageUrl?: string;
};

function createFrameInitParams(params: UseBlocksuiteFrameInitParams): BlocksuiteFrameInitParams {
  const tcHeaderEnabled = Boolean(params.tcHeader?.enabled);
  return {
    instanceId: params.instanceId,
    workspaceId: params.workspaceId,
    spaceId: typeof params.spaceId === "number" && Number.isFinite(params.spaceId) ? String(params.spaceId) : undefined,
    docId: params.docId,
    readOnly: params.readOnly ? "1" : "0",
    allowModeSwitch: params.allowModeSwitch ? "1" : "0",
    fullscreenEdgeless: params.fullscreenEdgeless ? "1" : "0",
    mode: params.forcedMode,
    tcHeader: tcHeaderEnabled ? "1" : "0",
    tcHeaderTitle: tcHeaderEnabled ? params.tcHeader?.fallbackTitle : undefined,
    tcHeaderImageUrl: tcHeaderEnabled ? params.tcHeader?.fallbackImageUrl : undefined,
  };
}

export function useBlocksuiteFrameInit(params: UseBlocksuiteFrameInitParams) {
  const {
    className,
    isEdgelessFullscreenActive,
    isFrameReady,
    hasFrameReadyOnce,
  } = params;

  // iframe 首次挂载后保持初始参数不变，避免 src 变化触发整帧重建。
  const [frozenInitParams] = useState(() => createFrameInitParams(params));
  const tcHeaderEnabled = frozenInitParams.tcHeader === "1";
  const frozenTcHeaderTitle = frozenInitParams.tcHeaderTitle;
  const frozenTcHeaderImageUrl = frozenInitParams.tcHeaderImageUrl;

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
