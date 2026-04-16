import { useEffect, useRef, useState } from "react";
import { BlocksuiteDescriptionEditorRuntime } from "./BlocksuiteDescriptionEditorRuntime.browser";
import { ensureBlocksuiteBrowserRuntime } from "./bootstrap/browser";
import { failBlocksuiteOpenSession, markBlocksuiteOpenSession } from "./shared/perf";
import { useBlocksuiteFrameProtocol } from "./useBlocksuiteFrameProtocol";

/**
 * `/blocksuite-frame` 路由真正加载出来的浏览器子图入口。
 *
 * 它负责：
 * 1. 解析 iframe 首开 query 参数
 * 2. 启动 browser runtime（样式 + custom elements + effects）
 * 3. 在 prewarm-only 与真正 editor runtime 之间切换
 */

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
    prewarmOnly,
  } = frameParams;

  const [isRuntimeReady, setIsRuntimeReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const instanceIdRef = useRef(instanceId);
  const bootstrapPhaseRef = useRef<"idle" | "booting" | "ready" | "error">("idle");
  const markedEntryInstanceIdRef = useRef<string | null>(null);

  useEffect(() => {
    instanceIdRef.current = instanceId;
  }, [instanceId]);

  useEffect(() => {
    if (!instanceId || markedEntryInstanceIdRef.current === instanceId) {
      return;
    }

    markBlocksuiteOpenSession(instanceId, "frame-entry-start");
    if (bootstrapPhaseRef.current === "booting") {
      markBlocksuiteOpenSession(instanceId, "frame-bootstrap-start");
    }
    if (bootstrapPhaseRef.current === "ready" || isRuntimeReady) {
      markBlocksuiteOpenSession(instanceId, "frame-bootstrap-start");
      markBlocksuiteOpenSession(instanceId, "frame-bootstrap-ready");
    }
    markedEntryInstanceIdRef.current = instanceId;
  }, [instanceId, isRuntimeReady]);

  useEffect(() => {
    let cancelled = false;
    // frame 现在统一通过单段 browser bootstrap 启动。
    bootstrapPhaseRef.current = "booting";
    markBlocksuiteOpenSession(instanceIdRef.current, "frame-bootstrap-start");

    void ensureBlocksuiteBrowserRuntime().then(() => {
      if (cancelled)
        return;
      bootstrapPhaseRef.current = "ready";
      markBlocksuiteOpenSession(instanceIdRef.current, "frame-bootstrap-ready");
      setRuntimeError(null);
      setIsRuntimeReady(true);
    }).catch((error) => {
      if (cancelled)
        return;
      console.error("[BlocksuiteFrame] Failed to bootstrap runtime", error);
      bootstrapPhaseRef.current = "error";
      failBlocksuiteOpenSession(instanceIdRef.current, error instanceof Error ? error.message : String(error));
      setRuntimeError("Blocksuite runtime bootstrap failed");
      setIsRuntimeReady(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRuntimeReady || !prewarmOnly) {
      return;
    }
    postToParent({ type: "render-ready" });
  }, [isRuntimeReady, postToParent, prewarmOnly]);

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

  if (prewarmOnly) {
    return <div className="h-full min-h-0 bg-base-200" aria-hidden="true" />;
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
