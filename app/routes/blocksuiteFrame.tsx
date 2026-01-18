import type { DocMode } from "@blocksuite/affine/model";
import type { Route } from "./+types/blocksuiteFrame";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { BlocksuiteDescriptionEditorRuntime } from "@/components/chat/shared/components/blocksuiteDescriptionEditor";

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

  const direct = (root as any).querySelector?.(selector) as T | null | undefined;
  if (direct)
    return direct;

  const all = (root as any).querySelectorAll?.("*") as NodeListOf<Element> | undefined;
  if (!all)
    return null;

  for (const el of all) {
    const shadowRoot = (el as any).shadowRoot as ShadowRoot | null | undefined;
    if (!shadowRoot)
      continue;
    const found = querySelectorDeep<T>(shadowRoot, selector);
    if (found)
      return found;
  }

  return null;
}

function getBlocksuiteMeasuredScrollHeight(): number {
  // 注意：Blocksuite 可能给 viewport 设置 min-height: 100%（跟随 iframe 自己的高度）。
  // 如果把 viewport.scrollHeight 当 max，iframe 高度会“只增不减”。
  // 因此这里优先测量“真实内容容器”的高度（会随内容增减），viewport 只做兜底。

  const editorContainer = document.querySelector("tc-affine-editor-container, affine-editor-container") as Element | null;
  const rootForQuery: ParentNode = ((editorContainer as any)?.shadowRoot as ShadowRoot | null) ?? editorContainer ?? document;

  const measureElement = (el: HTMLElement | null): number => {
    if (!el)
      return 0;
    const rectH = Math.ceil(el.getBoundingClientRect?.().height ?? 0);
    const scrollH = Math.ceil((el.scrollHeight ?? 0));
    return Math.max(rectH, scrollH);
  };

  const primaryCandidates = [
    ".affine-page-root-block-container",
    "affine-page-root",
    ".page-editor",
    "editor-host",
    "doc-title",
    ".doc-title-container",
  ];

  const fallbackCandidates = [
    ".affine-page-viewport",
    ".affine-edgeless-viewport",
  ];

  let primaryMax = 0;
  for (const sel of primaryCandidates) {
    const el = querySelectorDeep<HTMLElement>(rootForQuery, sel);
    primaryMax = Math.max(primaryMax, measureElement(el));
  }

  let fallbackMax = 0;
  for (const sel of fallbackCandidates) {
    const el = querySelectorDeep<HTMLElement>(rootForQuery, sel);
    fallbackMax = Math.max(fallbackMax, measureElement(el));
  }

  // 兜底：文档自身高度（可能会等于 iframe 高度，所以只在 primary 不可用时强依赖）。
  const docH = Math.max(
    document.documentElement?.scrollHeight ?? 0,
    document.body?.scrollHeight ?? 0,
  );

  if (primaryMax > 0) {
    // primary 为准；fallback 不应把高度“撑到比内容还大”。
    const cappedFallback = fallbackMax > 0 ? Math.min(fallbackMax, primaryMax) : 0;
    return Math.max(primaryMax, cappedFallback);
  }

  return Math.max(fallbackMax, docH);
}

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Blocksuite Frame - tuan-chat" },
    { name: "description", content: "Blocksuite isolated frame" },
  ];
}

export default function BlocksuiteFrameRoute() {
  const [sp] = useSearchParams();

  const instanceId = sp.get("instanceId") ?? "";
  const workspaceId = sp.get("workspaceId") ?? "";
  const docId = sp.get("docId") ?? "";
  const readOnly = parseBool01(sp.get("readOnly"));
  const tcHeaderEnabled = parseBool01(sp.get("tcHeader"));
  const tcHeaderTitle = sp.get("tcHeaderTitle") ?? undefined;
  const tcHeaderImageUrl = sp.get("tcHeaderImageUrl") ?? undefined;

  const spaceId = useMemo(() => {
    const raw = sp.get("spaceId");
    if (!raw)
      return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n))
      return undefined;
    return n;
  }, [sp]);

  const variant = (sp.get("variant") === "full" ? "full" : "embedded") as "embedded" | "full";
  const allowModeSwitch = parseBool01(sp.get("allowModeSwitch"));
  const fullscreenEdgeless = parseBool01(sp.get("fullscreenEdgeless"));
  const forcedMode = (sp.get("mode") === "edgeless" ? "edgeless" : "page") as DocMode;

  const [currentMode, setCurrentMode] = useState<DocMode>(forcedMode);

  const postToParent = (payload: any) => {
    try {
      window.parent.postMessage(payload, getPostMessageTargetOrigin());
    }
    catch {
      // ignore
    }
  };

  const measureAndPostHeight = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    (globalThis as any).__tcBlocksuiteDebugLog = (entry: any) => {
      postToParent({
        tc: "tc-blocksuite-frame",
        instanceId,
        type: "debug-log",
        entry,
      });
    };

    return () => {
      try {
        delete (globalThis as any).__tcBlocksuiteDebugLog;
      }
      catch {
        // ignore
      }
    };
  }, [instanceId]);

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const toLower = (v: unknown) => String(v ?? "").toLowerCase();
    const mentionDebugWindowMs = 5000;
    let mentionDebugUntil = 0;
    let mentionDebugRemaining = 0;
    const summarizeEl = (node: unknown) => {
      if (!(node instanceof Element))
        return null;
      const tag = toLower(node.tagName);
      const id = node.id ? toLower(node.id) : "";
      const cls = typeof (node as any).className === "string" ? toLower((node as any).className) : "";
      const role = typeof (node as any).getAttribute === "function"
        ? toLower((node as any).getAttribute("role"))
        : "";
      const testid = typeof (node as any).getAttribute === "function"
        ? toLower((node as any).getAttribute("data-testid"))
        : "";
      return {
        tag,
        id: id || undefined,
        className: cls || undefined,
        role: role || undefined,
        testid: testid || undefined,
      };
    };
    const summarizeNode = (node: unknown) => {
      if (!(node instanceof Element))
        return null;
      const tag = toLower(node.tagName);
      const id = node.id ? toLower(node.id) : "";
      const cls = typeof (node as any).className === "string" ? toLower((node as any).className) : "";
      return {
        tag,
        id: id || undefined,
        className: cls || undefined,
      };
    };

    const shouldLogMentionEvent = (path: unknown[]) => {
      for (const n of path) {
        if (!(n instanceof Element))
          continue;
        const tag = toLower(n.tagName);
        const id = toLower(n.id);
        const cls = typeof (n as any).className === "string" ? toLower((n as any).className) : "";
        const anyText = `${tag} ${id} ${cls}`;
        if (anyText.includes("mention"))
          return true;
        if (anyText.includes("affine-inline-mention"))
          return true;
        if (anyText.includes("affine-mention"))
          return true;
      }
      return false;
    };

    const logEvent = (type: string, e: Event) => {
      try {
        const path = (e as any).composedPath?.() as unknown[] | undefined;
        if (!path || path.length === 0)
          return;
        const now = Date.now();
        const inWindow = now < mentionDebugUntil;
        const mentionMatched = shouldLogMentionEvent(path);
        if (!inWindow && !mentionMatched)
          return;
        if (inWindow) {
          if (mentionDebugRemaining <= 0)
            return;
          mentionDebugRemaining -= 1;
        }

        const nodes = path
          .map(summarizeNode)
          .filter(Boolean)
          .slice(0, 8);

        (globalThis as any).__tcBlocksuiteDebugLog?.({
          source: "BlocksuiteFrame",
          message: type,
          payload: {
            type,
            targetTag: toLower((e.target as any)?.tagName),
            inWindow,
            mentionMatched,
            nodes,
          },
        });
      }
      catch {
        // ignore
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      try {
        const active = summarizeEl(document.activeElement);
        if (e.key === "@") {
          mentionDebugUntil = Date.now() + mentionDebugWindowMs;
          mentionDebugRemaining = 12;
          (globalThis as any).__tcBlocksuiteDebugLog?.({
            source: "BlocksuiteFrame",
            message: "keydown @",
            payload: { key: e.key, code: (e as any).code, shiftKey: e.shiftKey, active },
          });
          return;
        }
        if (e.key === "Enter" || e.key === "Escape") {
          if (Date.now() < mentionDebugUntil) {
            (globalThis as any).__tcBlocksuiteDebugLog?.({
              source: "BlocksuiteFrame",
              message: `keydown ${e.key}`,
              payload: { key: e.key, code: (e as any).code, shiftKey: e.shiftKey, active },
            });
          }
        }
      }
      catch {
        // ignore
      }
    };

    const onPointerDown = (e: PointerEvent) => logEvent("pointerdown", e);
    const onClick = (e: MouseEvent) => logEvent("click", e);

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    // Handshake: let host know iframe is alive.
    postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "ready" });
  }, [instanceId]);

  const isEdgelessFullscreenViewport = fullscreenEdgeless && currentMode === "edgeless";
  const shouldReportHeight = variant === "embedded" && !isEdgelessFullscreenViewport;

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    if (!shouldReportHeight) {
      measureAndPostHeight.current = null;
      return;
    }

    const postHeight = (height: number) => {
      postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "height", height });
    };

    let raf = 0;
    let lastPostedHeight = 0;
    let inputTimeout0: number | null = null;
    let inputTimeout120: number | null = null;
    let pollTimeoutId: number | null = null;
    let lastChangeAt = Date.now();
    let lastMeasuredHeight = 0;

    const measureAndPostNow = () => {
      try {
        const h = getBlocksuiteMeasuredScrollHeight();
        if (!Number.isFinite(h) || h <= 0)
          return;

        // 用于自适应轮询的“最近一次变化时间”。
        if (Math.abs(h - lastMeasuredHeight) >= 1) {
          lastMeasuredHeight = h;
          lastChangeAt = Date.now();
        }

        if (Math.abs(h - lastPostedHeight) >= 1) {
          lastPostedHeight = h;
          postHeight(h);
        }
      }
      catch {
        // ignore
      }
    };

    const schedule = () => {
      if (raf)
        cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        measureAndPostNow();
      });
    };

    measureAndPostHeight.current = schedule;

    // 初始先测一次。
    schedule();

    // 普适化方案：自适应轮询
    // - 高度变化频繁（回填/输入）时：高频
    // - 稳定后：自动降频，降低开销
    // 这样无需依赖“窗口 resize”才能触发高度同步。
    const computeNextDelay = (stableMs: number) => {
      if (stableMs < 800)
        return 60;
      if (stableMs < 3000)
        return 120;
      if (stableMs < 15000)
        return 300;
      if (stableMs < 60000)
        return 1000;
      return 3000;
    };

    const pollTick = () => {
      measureAndPostNow();
      const stableMs = Date.now() - lastChangeAt;
      const delay = computeNextDelay(stableMs);
      pollTimeoutId = window.setTimeout(pollTick, delay);
    };

    // 启动轮询；回填可能发生在任意时刻。
    pollTimeoutId = window.setTimeout(pollTick, 60);

    let ro: ResizeObserver | null = null;
    try {
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => {
          schedule();
        });
        if (document.body)
          ro.observe(document.body);
        if (document.documentElement)
          ro.observe(document.documentElement);
      }
    }
    catch {
      ro = null;
    }

    const onResize = () => schedule();
    window.addEventListener("resize", onResize);

    // 输入/编辑：blocksuite 内部可能在 shadow DOM 里更新，外部的 ResizeObserver 未必能感知。
    // 监听常见输入事件，主动触发高度测量（尤其是回车换行）。
    const onContentMaybeChanged = () => {
      schedule();
      // 兜底：有些排版在下一个 tick 才稳定
      try {
        inputTimeout0 = window.setTimeout(() => schedule(), 0);
        inputTimeout120 = window.setTimeout(() => schedule(), 120);
      }
      catch {
        // ignore
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Backspace" || e.key === "Delete") {
        onContentMaybeChanged();
      }
    };

    const onBeforeInput = (e: Event) => {
      // beforeinput 能覆盖一些情况下 input 不触发的问题（尤其是删除）。
      const evt = e as InputEvent;
      const t = evt.inputType ?? "";
      if (t.startsWith("delete") || t.startsWith("insert") || t === "insertParagraph") {
        onContentMaybeChanged();
      }
    };

    // 兜底：blocksuite 的 DOM（含 shadow DOM）变化不一定触发 input/keydown。
    // 这里对编辑器根做 MutationObserver，保证“删除导致高度回缩”也能被捕捉。
    const editorContainer = document.querySelector("tc-affine-editor-container, affine-editor-container") as Element | null;
    const moTargets: Array<ParentNode> = [];
    if (editorContainer)
      moTargets.push(editorContainer);
    const shadowRoot = (editorContainer as any)?.shadowRoot as ShadowRoot | null | undefined;
    if (shadowRoot)
      moTargets.push(shadowRoot);

    let mo: MutationObserver | null = null;
    try {
      mo = new MutationObserver(() => {
        onContentMaybeChanged();
      });
      for (const t of moTargets) {
        mo.observe(t as Node, { childList: true, subtree: true, characterData: true, attributes: true });
      }
    }
    catch {
      mo = null;
    }

    document.addEventListener("input", onContentMaybeChanged, true);
    document.addEventListener("paste", onContentMaybeChanged, true);
    document.addEventListener("compositionend", onContentMaybeChanged, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("beforeinput", onBeforeInput, true);

    return () => {
      try {
        if (raf)
          cancelAnimationFrame(raf);
      }
      catch {
        // ignore
      }
      try {
        if (pollTimeoutId !== null)
          window.clearTimeout(pollTimeoutId);
      }
      catch {
        // ignore
      }
      try {
        if (inputTimeout0 !== null)
          window.clearTimeout(inputTimeout0);
      }
      catch {
        // ignore
      }
      try {
        if (inputTimeout120 !== null)
          window.clearTimeout(inputTimeout120);
      }
      catch {
        // ignore
      }
      try {
        ro?.disconnect?.();
      }
      catch {
        // ignore
      }
      window.removeEventListener("resize", onResize);
      document.removeEventListener("input", onContentMaybeChanged, true);
      document.removeEventListener("paste", onContentMaybeChanged, true);
      document.removeEventListener("compositionend", onContentMaybeChanged, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("beforeinput", onBeforeInput, true);
      try {
        mo?.disconnect?.();
      }
      catch {
        // ignore
      }
      measureAndPostHeight.current = null;
    };
  }, [instanceId, shouldReportHeight]);

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const expectedOrigin = window.location.origin;

    const onMessage = (e: MessageEvent) => {
      const originOk = !expectedOrigin || expectedOrigin === "null" ? true : e.origin === expectedOrigin;
      if (!originOk)
        return;

      if (e.source !== window.parent)
        return;

      const data: any = e.data;
      if (!data || data.tc !== "tc-blocksuite-frame")
        return;

      if (data.instanceId && data.instanceId !== instanceId)
        return;

      if (data.type === "request-height") {
        try {
          measureAndPostHeight.current?.();
        }
        catch {
          // ignore
        }
        return;
      }

      if (data.type === "theme" && (data.theme === "light" || data.theme === "dark")) {
        try {
          const theme = data.theme as "light" | "dark";
          document.documentElement.dataset.theme = theme;
          document.documentElement.classList.toggle("dark", theme === "dark");
          try {
            // 主题切换可能影响排版高度
            measureAndPostHeight.current?.();
          }
          catch {
            // ignore
          }
        }
        catch {
          // ignore
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [instanceId]);

  if (!workspaceId || !docId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <span className="text-sm opacity-70">Invalid blocksuite frame params</span>
      </div>
    );
  }

  const frameRootClassName = isEdgelessFullscreenViewport
    ? "h-screen w-screen overflow-hidden"
    : (variant === "full" ? "h-screen w-screen overflow-auto" : "w-full");

  return (
    <div className={frameRootClassName}>
      <BlocksuiteDescriptionEditorRuntime
        instanceId={instanceId}
        workspaceId={workspaceId}
        spaceId={spaceId}
        docId={docId}
        variant={variant}
        readOnly={readOnly}
        allowModeSwitch={allowModeSwitch}
        fullscreenEdgeless={fullscreenEdgeless}
        mode={forcedMode}
        tcHeader={tcHeaderEnabled ? { enabled: true, fallbackTitle: tcHeaderTitle, fallbackImageUrl: tcHeaderImageUrl } : undefined}
        onModeChange={(mode) => {
          setCurrentMode(mode);
          postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "mode", mode });
          try {
            // mode 切换会影响布局高度
            measureAndPostHeight.current?.();
          }
          catch {
            // ignore
          }
        }}
        className={(variant === "full" || isEdgelessFullscreenViewport) ? "h-full" : undefined}
      />
    </div>
  );
}
