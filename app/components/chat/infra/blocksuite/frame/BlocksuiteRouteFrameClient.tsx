import type { DocMode } from "@blocksuite/affine/model";
import { useEffect, useMemo, useRef, useState } from "react";
import { ensureBlocksuiteBrowserRuntime } from "../bootstrap/browser";
import { isBlocksuiteDebugEnabled } from "../shared/debugFlags";
import { failBlocksuiteOpenSession, markBlocksuiteOpenSession } from "../shared/perf";
import { BlocksuiteDescriptionEditorRuntime } from "./BlocksuiteDescriptionEditorRuntime.browser";

/**
 * `/blocksuite-frame` 路由真正加载出来的浏览器子图入口。
 *
 * 它负责：
 * 1. 解析 iframe 首开 query 参数
 * 2. 启动 browser runtime（样式 + custom elements + effects）
 * 3. 在 iframe 内测量高度并回传宿主
 * 4. 把参数交给真正的 editor runtime
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

function querySelectorDeep<T extends Element>(root: ParentNode | null, selector: string): T | null {
  if (!root)
    return null;

  const direct = (root as ParentNode & { querySelector?: typeof document.querySelector }).querySelector?.(selector) as T | null | undefined;
  if (direct)
    return direct;

  const all = (root as ParentNode & { querySelectorAll?: typeof document.querySelectorAll }).querySelectorAll?.("*") as NodeListOf<Element> | undefined;
  if (!all)
    return null;

  for (const el of all) {
    const shadowRoot = (el as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
    if (!shadowRoot)
      continue;
    const found = querySelectorDeep<T>(shadowRoot, selector);
    if (found)
      return found;
  }

  return null;
}

function measureElement(el: HTMLElement | null): number {
  if (!el)
    return 0;
  const rectH = Math.ceil(el.getBoundingClientRect?.().height ?? 0);
  const scrollH = Math.ceil(el.scrollHeight ?? 0);
  return Math.max(rectH, scrollH);
}

function getDocumentScrollHeight(): number {
  return Math.max(
    document.documentElement?.scrollHeight ?? 0,
    document.body?.scrollHeight ?? 0,
  );
}

function getBlocksuiteMeasuredScrollHeight(params: {
  currentMode: DocMode;
  tcHeaderEnabled: boolean;
}): number {
  const { currentMode, tcHeaderEnabled } = params;

  // 编辑器内部混合了 light DOM 和 shadowRoot，这里统一做深度查询。
  const editorContainer = document.querySelector("tc-affine-editor-container, affine-editor-container") as Element | null;
  const rootForQuery: ParentNode = ((editorContainer as Element & { shadowRoot?: ShadowRoot | null })?.shadowRoot) ?? editorContainer ?? document;
  const documentHeight = getDocumentScrollHeight();

  if (currentMode === "edgeless") {
    const viewportHeight = measureElement(
      querySelectorDeep<HTMLElement>(rootForQuery, ".affine-edgeless-viewport"),
    );
    return viewportHeight > 0 ? viewportHeight : documentHeight;
  }

  const primaryHeight = measureElement(
    querySelectorDeep<HTMLElement>(rootForQuery, ".affine-page-root-block-container"),
  );
  if (primaryHeight <= 0)
    return documentHeight;

  const docTitleHeight = measureElement(
    querySelectorDeep<HTMLElement>(rootForQuery, "doc-title"),
  );
  const tcHeaderHeight = tcHeaderEnabled
    ? measureElement(document.querySelector<HTMLElement>(".tc-blocksuite-tc-header"))
    : 0;

  return primaryHeight + docTitleHeight + tcHeaderHeight;
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
      variant: (sp.get("variant") === "full" ? "full" : "embedded") as "embedded" | "full",
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
    variant,
    allowModeSwitch,
    fullscreenEdgeless,
    forcedMode,
  } = frameParams;

  const [currentMode, setCurrentMode] = useState<DocMode>(forcedMode);
  const [isRuntimeReady, setIsRuntimeReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const measureAndPostHeight = useRef<(() => void) | null>(null);

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

  useEffect(() => {
    if (!allowModeSwitch) {
      setCurrentMode(forcedMode);
    }
  }, [allowModeSwitch, docId, forcedMode]);

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
    if (typeof window === "undefined")
      return;

    let raf = 0;

    const postHeight = () => {
      raf = 0;
      const height = getBlocksuiteMeasuredScrollHeight({
        currentMode,
        tcHeaderEnabled,
      });
      postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "height", height });
    };

    measureAndPostHeight.current = () => {
      // 折叠到下一帧，避免一次 DOM 变化触发多次测量与 postMessage。
      if (raf)
        cancelAnimationFrame(raf);
      raf = requestAnimationFrame(postHeight);
    };

    const observer = new MutationObserver(() => {
      measureAndPostHeight.current?.();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    const onResize = () => measureAndPostHeight.current?.();
    window.addEventListener("resize", onResize);

    const t1 = window.setTimeout(() => measureAndPostHeight.current?.(), 0);
    const t2 = window.setTimeout(() => measureAndPostHeight.current?.(), 120);
    const t3 = window.setTimeout(() => measureAndPostHeight.current?.(), 600);

    return () => {
      if (raf)
        cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [currentMode, instanceId, tcHeaderEnabled]);

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
        variant?: "embedded" | "full";
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
        measureAndPostHeight.current?.();
        return;
      }

      if (data.type === "request-height") {
        measureAndPostHeight.current?.();
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
          variant: data.variant ?? prev.variant,
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
      <div className="flex min-h-screen items-center justify-center bg-base-200 p-6">
        <div className="rounded-md border border-error/30 bg-base-100 p-4 text-sm text-error">
          {runtimeError}
        </div>
      </div>
    );
  }

  if (!isRuntimeReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-200">
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
      variant={variant}
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
        setCurrentMode(mode);
        postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "mode", mode });
        measureAndPostHeight.current?.();
      }}
      onNavigate={(to) => {
        postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "navigate", to });
        return true;
      }}
      onTcHeaderChange={(payload) => {
        postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "tc-header-change", payload });
        measureAndPostHeight.current?.();
      }}
      className={currentMode === "edgeless" ? "h-screen" : "min-h-screen"}
    />
  );
}
