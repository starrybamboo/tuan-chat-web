import type { DocMode } from "@blocksuite/affine/model";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ensureBlocksuiteBrowserRuntime } from "../bootstrap/browser";
import { isBlocksuiteDebugEnabled } from "../debugFlags";
import { BlocksuiteDescriptionEditorRuntime } from "./BlocksuiteDescriptionEditorRuntime.browser";

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

function getBlocksuiteMeasuredScrollHeight(): number {
  const editorContainer = document.querySelector("tc-affine-editor-container, affine-editor-container") as Element | null;
  const rootForQuery: ParentNode = ((editorContainer as Element & { shadowRoot?: ShadowRoot | null })?.shadowRoot) ?? editorContainer ?? document;

  const measureElement = (el: HTMLElement | null): number => {
    if (!el)
      return 0;
    const rectH = Math.ceil(el.getBoundingClientRect?.().height ?? 0);
    const scrollH = Math.ceil(el.scrollHeight ?? 0);
    return Math.max(rectH, scrollH);
  };

  const primaryCandidates = [
    ".affine-page-root-block-container",
    "affine-page-root",
    ".page-editor",
    "editor-host",
  ];
  const docTitleCandidates = [
    ".doc-title-container",
    "doc-title",
  ];
  const tcHeaderCandidates = [
    ".tc-blocksuite-tc-header",
  ];
  const fallbackCandidates = [
    ".affine-page-viewport",
    ".affine-edgeless-viewport",
  ];

  let primaryMax = 0;
  for (const sel of primaryCandidates) {
    primaryMax = Math.max(primaryMax, measureElement(querySelectorDeep<HTMLElement>(rootForQuery, sel)));
  }

  let docTitleHeight = 0;
  for (const sel of docTitleCandidates) {
    docTitleHeight = Math.max(docTitleHeight, measureElement(querySelectorDeep<HTMLElement>(rootForQuery, sel)));
  }

  let tcHeaderHeight = 0;
  for (const sel of tcHeaderCandidates) {
    tcHeaderHeight = Math.max(tcHeaderHeight, measureElement(document.querySelector<HTMLElement>(sel)));
  }

  let fallbackMax = 0;
  for (const sel of fallbackCandidates) {
    fallbackMax = Math.max(fallbackMax, measureElement(querySelectorDeep<HTMLElement>(rootForQuery, sel)));
  }

  const docH = Math.max(
    document.documentElement?.scrollHeight ?? 0,
    document.body?.scrollHeight ?? 0,
  );

  if (primaryMax > 0 || docTitleHeight > 0 || tcHeaderHeight > 0) {
    const combinedPrimary = primaryMax > 0 && docTitleHeight > 0
      ? primaryMax + docTitleHeight
      : Math.max(primaryMax, docTitleHeight);
    const combinedWithHeader = combinedPrimary + tcHeaderHeight;
    const cappedFallback = fallbackMax > 0 ? Math.min(fallbackMax, combinedWithHeader) : 0;
    return Math.max(combinedWithHeader, cappedFallback);
  }

  return Math.max(fallbackMax, docH);
}

export function BlocksuiteStandaloneFrameApp() {
  const [sp] = useSearchParams();
  const instanceId = sp.get("instanceId") ?? "";

  const [frameParams, setFrameParams] = useState(() => {
    const rawSpaceId = sp.get("spaceId");
    const n = rawSpaceId ? Number(rawSpaceId) : Number.NaN;
    const spaceId = Number.isFinite(n) ? n : undefined;
    return {
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
    };
  });

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

    void ensureBlocksuiteBrowserRuntime().then(() => {
      if (cancelled)
        return;
      setRuntimeError(null);
      setIsRuntimeReady(true);
    }).catch((error) => {
      if (cancelled)
        return;
      console.error("[BlocksuiteFrame] Failed to bootstrap runtime", error);
      setRuntimeError("Blocksuite runtime bootstrap failed");
      setIsRuntimeReady(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
      const height = getBlocksuiteMeasuredScrollHeight();
      postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "height", height });
    };

    measureAndPostHeight.current = () => {
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
