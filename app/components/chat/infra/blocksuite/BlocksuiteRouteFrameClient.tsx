import type { DocMode } from "@blocksuite/affine/model";
import { useEffect, useMemo, useState } from "react";
import { BlocksuiteDescriptionEditorRuntime } from "./BlocksuiteDescriptionEditorRuntime.browser";
import { ensureBlocksuiteBrowserRuntime } from "./bootstrap/browser";
import { isBlocksuiteDebugEnabled } from "./shared/debugFlags";
import { failBlocksuiteOpenSession, markBlocksuiteOpenSession } from "./shared/perf";

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
  : new URLSearchParams(window.location.search).get("instanceId") ?? "";

if (FRAME_INSTANCE_ID) {
  markBlocksuiteOpenSession(FRAME_INSTANCE_ID, "frame-entry-start");
}

function getPostMessageTargetOrigin(): string {
  if (typeof window === "undefined") {
    return "*";
  }

  const origin = window.location.origin;
  if (!origin || origin === "null") {
    return "*";
  }
  return origin;
}

function parseBool01(v: string | null | undefined): boolean {
  return v === "1" || v === "true";
}

function readInitialFrameState() {
  // iframe 首开参数来自宿主拼接在 src 上的 querystring。
  const sp = typeof window === "undefined"
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
  const rawSpaceId = sp.get("spaceId");
  const n = rawSpaceId ? Number(rawSpaceId) : Number.NaN;
  const spaceId = Number.isFinite(n) ? n : undefined;

  return {
    instanceId: sp.get("instanceId") ?? "",
    frameParams: {
      workspaceId: sp.get("workspaceId") ?? "",
      docId: sp.get("docId") ?? "",
      spaceId,
      readOnly: parseBool01(sp.get("readOnly")),
      tcHeaderEnabled: parseBool01(sp.get("tcHeader")),
      tcHeaderTitle: sp.get("tcHeaderTitle") ?? undefined,
      tcHeaderImageUrl: sp.get("tcHeaderImageUrl") ?? undefined,
      allowModeSwitch: parseBool01(sp.get("allowModeSwitch")),
      fullscreenEdgeless: parseBool01(sp.get("fullscreenEdgeless")),
      forcedMode: (sp.get("mode") === "edgeless" ? "edgeless" : "page") as DocMode,
    },
  };
}

export function BlocksuiteRouteFrameClient() {
  const initialState = useMemo(() => readInitialFrameState(), []);
  const instanceId = initialState.instanceId;
  const [frameParams, setFrameParams] = useState(initialState.frameParams);

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

  const postToParent = (payload: Record<string, unknown>) => {
    try {
      window.parent.postMessage(payload, getPostMessageTargetOrigin());
    }
    catch {
      // ignore
    }
  };

  useEffect(() => {
    if (typeof window === "undefined")
      return;
    if (!isBlocksuiteDebugEnabled())
      return;

    (globalThis as { __tcBlocksuiteDebugLog?: (entry: unknown) => void }).__tcBlocksuiteDebugLog = (entry) => {
      postToParent({
        tc: "tc-blocksuite-frame",
        instanceId,
        type: "debug-log",
        entry,
      });
    };

    return () => {
      try {
        delete (globalThis as { __tcBlocksuiteDebugLog?: unknown }).__tcBlocksuiteDebugLog;
      }
      catch {
        // ignore
      }
    };
  }, [instanceId]);

  useEffect(() => {
    postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "ready" });
  }, [instanceId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        tc?: string;
        instanceId?: string;
        type?: string;
        theme?: string;
        workspaceId?: string;
        spaceId?: number;
        docId?: string;
        readOnly?: boolean;
        allowModeSwitch?: boolean;
        fullscreenEdgeless?: boolean;
        mode?: DocMode;
        tcHeader?: boolean;
        tcHeaderTitle?: string;
        tcHeaderImageUrl?: string;
      } | null;

      if (!data || data.tc !== "tc-blocksuite-frame")
        return;
      if (data.instanceId && data.instanceId !== instanceId)
        return;

      if (data.type === "theme") {
        const theme = data.theme === "dark" ? "dark" : "light";
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.body.classList.toggle("dark", theme === "dark");
        return;
      }

      if (data.type === "sync-params") {
        setFrameParams(prev => ({
          workspaceId: data.workspaceId ?? prev.workspaceId,
          docId: data.docId ?? prev.docId,
          spaceId: typeof data.spaceId === "number" && Number.isFinite(data.spaceId) ? data.spaceId : prev.spaceId,
          readOnly: typeof data.readOnly === "boolean" ? data.readOnly : prev.readOnly,
          tcHeaderEnabled: typeof data.tcHeader === "boolean" ? data.tcHeader : prev.tcHeaderEnabled,
          tcHeaderTitle: data.tcHeaderTitle ?? prev.tcHeaderTitle,
          tcHeaderImageUrl: data.tcHeaderImageUrl ?? prev.tcHeaderImageUrl,
          allowModeSwitch: typeof data.allowModeSwitch === "boolean" ? data.allowModeSwitch : prev.allowModeSwitch,
          fullscreenEdgeless: typeof data.fullscreenEdgeless === "boolean" ? data.fullscreenEdgeless : prev.fullscreenEdgeless,
          forcedMode: data.mode ?? prev.forcedMode,
        }));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
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
        postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "mode", mode });
      }}
      onNavigate={(to) => {
        postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "navigate", to });
        return true;
      }}
      className="h-full"
    />
  );
}
