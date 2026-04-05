import { useEffect, useState } from "react";
import { BlocksuiteDescriptionEditorRuntime } from "./BlocksuiteDescriptionEditorRuntime.browser";
import { ensureBlocksuiteBrowserRuntime } from "./bootstrap/browser";
import { failBlocksuiteOpenSession, markBlocksuiteOpenSession } from "./shared/perf";
import { readInitialBlocksuiteFrameProtocolState, useBlocksuiteFrameProtocol } from "./useBlocksuiteFrameProtocol";

/**
 * `/blocksuite-frame` 路由真正加载出来的浏览器子图入口。
 *
 * 它负责：
 * 1. 解析 iframe 首开 query 参数
 * 2. 启动 browser runtime（样式 + custom elements + effects）
 * 3. 把参数交给真正的 editor runtime
 */
const FRAME_INSTANCE_ID = typeof window === "undefined"
  ? ""
  : readInitialBlocksuiteFrameProtocolState(window.location.search).instanceId;

if (FRAME_INSTANCE_ID) {
  markBlocksuiteOpenSession(FRAME_INSTANCE_ID, "frame-entry-start");
}

export function BlocksuiteRouteFrameClient() {
  const { instanceId, frameParams, postToParent } = useBlocksuiteFrameProtocol();

  const {
    workspaceId,
    docId,
    spaceId,
    readOnly,
    tcHeaderEnabled,
    tcHeaderTitle,
    tcHeaderImageUrl,
    allowModeSwitch,
    fullscreenEdgeless,
    forcedMode,
  } = frameParams;

  const [isRuntimeReady, setIsRuntimeReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // frame 现在统一通过单段 browser bootstrap 启动。
    markBlocksuiteOpenSession(instanceId, "frame-bootstrap-start");

    void ensureBlocksuiteBrowserRuntime().then(() => {
      if (cancelled)
        return;
      markBlocksuiteOpenSession(instanceId, "frame-bootstrap-ready");
      setRuntimeError(null);
      setIsRuntimeReady(true);
    }).catch((error) => {
      if (cancelled)
        return;
      console.error("[BlocksuiteFrame] Failed to bootstrap runtime", error);
      failBlocksuiteOpenSession(instanceId, error instanceof Error ? error.message : String(error));
      setRuntimeError("Blocksuite runtime bootstrap failed");
      setIsRuntimeReady(false);
    });

    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  if (runtimeError) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-base-200 p-6">
        <div className="rounded-md border border-error/30 bg-base-100 p-4 text-sm text-error">
          {runtimeError}
        </div>
      </div>
    );
  }

  if (!isRuntimeReady) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-base-200">
        <div className="flex items-center gap-2 text-base-content/70">
          <span className="loading loading-spinner loading-md" aria-label="Loading" />
          <span>Blocksuite 正在启动...</span>
        </div>
      </div>
    );
  }

  return (
    <BlocksuiteDescriptionEditorRuntime
      workspaceId={workspaceId}
      docId={docId}
      spaceId={spaceId}
      instanceId={instanceId}
      readOnly={readOnly}
      allowModeSwitch={allowModeSwitch}
      fullscreenEdgeless={fullscreenEdgeless}
      mode={forcedMode}
      tcHeader={{
        enabled: tcHeaderEnabled,
        fallbackTitle: tcHeaderTitle,
        fallbackImageUrl: tcHeaderImageUrl,
      }}
      onModeChange={(mode) => {
        postToParent({ type: "mode", mode });
      }}
      onNavigate={(to) => {
        postToParent({ type: "navigate", to });
        return true;
      }}
      className="h-full"
    />
  );
}
