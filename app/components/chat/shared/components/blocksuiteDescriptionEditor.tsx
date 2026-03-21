import type { DocMode } from "@blocksuite/affine/model";
import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import type { BlocksuiteMentionProfilePopoverState } from "@/components/chat/infra/blocksuite/mentionProfilePopover";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { isBlocksuiteDebugEnabled } from "@/components/chat/infra/blocksuite/debugFlags";
import {
  startBlocksuiteOpenSession,
} from "@/components/chat/infra/blocksuite/perf";
import { BlocksuiteMentionProfilePopover } from "@/components/chat/infra/blocksuite/mentionProfilePopover";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";

interface BlocksuiteDescriptionEditorProps {
  workspaceId: string;
  spaceId?: number;
  docId: string;
  instanceId?: string;
  /** 已废弃：当前 route 方案不再执行临场 prewarm，这个入参仅为兼容保留。 */
  intentPrewarm?: boolean;
  variant?: "embedded" | "full";
  readOnly?: boolean;
  mode?: DocMode;
  allowModeSwitch?: boolean;
  fullscreenEdgeless?: boolean;
  tcHeader?: {
    enabled?: boolean;
    fallbackTitle?: string;
    fallbackImageUrl?: string;
  };
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  onModeChange?: (mode: DocMode) => void;
  onNavigate?: (to: string) => boolean | void;
  className?: string;
}

function normalizeAppThemeToBlocksuiteTheme(raw: string | null | undefined): "light" | "dark" {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("dark") || v.includes("dracula") || v.includes("night")) {
    return "dark";
  }
  return "light";
}

function getCurrentAppTheme(): "light" | "dark" {
  if (typeof document === "undefined") {
    return "light";
  }
  const root = document.documentElement;
  return normalizeAppThemeToBlocksuiteTheme(root.dataset.theme) === "dark" || root.classList.contains("dark")
    ? "dark"
    : "light";
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

function BlocksuiteDescriptionEditorIframeHost(props: BlocksuiteDescriptionEditorProps) {
  const {
    workspaceId,
    spaceId,
    docId,
    variant = "embedded",
    intentPrewarm = false,
    mode: forcedMode = "page",
    readOnly = false,
    allowModeSwitch = false,
    fullscreenEdgeless = false,
    tcHeader,
    onTcHeaderChange,
    className,
    onModeChange,
    onNavigate,
  } = props;

  const navigate = useNavigate();
  const instanceId = useId();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const postFrameParamsRef = useRef<() => void>(() => {});
  const [frameMode, setFrameMode] = useState<DocMode>(forcedMode);
  const [iframeHeight, setIframeHeight] = useState<number | null>(null);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [hasFrameReadyOnce, setHasFrameReadyOnce] = useState(false);
  const hostMentionDebugUntilRef = useRef(0);
  const hostMentionDebugRemainingRef = useRef(0);
  const [mentionProfilePopover, setMentionProfilePopover] = useState<BlocksuiteMentionProfilePopoverState | null>(null);
  const mentionProfilePopoverStateRef = useRef<BlocksuiteMentionProfilePopoverState | null>(null);
  const mentionProfilePopoverHoveredRef = useRef(false);
  const mentionProfilePopoverOpenTimerRef = useRef<number | null>(null);
  const mentionProfilePopoverCloseTimerRef = useRef<number | null>(null);

  const clearMentionProfilePopoverOpenTimer = useCallback(() => {
    const timerId = mentionProfilePopoverOpenTimerRef.current;
    if (timerId !== null) {
      mentionProfilePopoverOpenTimerRef.current = null;
      try {
        window.clearTimeout(timerId);
      }
      catch {
      }
    }
  }, []);

  const clearMentionProfilePopoverCloseTimer = useCallback(() => {
    const timerId = mentionProfilePopoverCloseTimerRef.current;
    if (timerId !== null) {
      mentionProfilePopoverCloseTimerRef.current = null;
      try {
        window.clearTimeout(timerId);
      }
      catch {
      }
    }
  }, []);

  const scheduleMentionProfilePopoverClose = useCallback(() => {
    clearMentionProfilePopoverCloseTimer();
    mentionProfilePopoverCloseTimerRef.current = window.setTimeout(() => {
      if (mentionProfilePopoverHoveredRef.current)
        return;
      setMentionProfilePopover(null);
    }, 160);
  }, [clearMentionProfilePopoverCloseTimer]);

  const scheduleMentionProfilePopoverOpen = useCallback((next: BlocksuiteMentionProfilePopoverState) => {
    clearMentionProfilePopoverOpenTimer();
    clearMentionProfilePopoverCloseTimer();
    mentionProfilePopoverOpenTimerRef.current = window.setTimeout(() => {
      mentionProfilePopoverOpenTimerRef.current = null;
      mentionProfilePopoverHoveredRef.current = false;
      setMentionProfilePopover(next);
    }, 240);
  }, [clearMentionProfilePopoverCloseTimer, clearMentionProfilePopoverOpenTimer]);

  const onNavigateRef = useRef<BlocksuiteDescriptionEditorProps["onNavigate"]>(onNavigate);
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    startBlocksuiteOpenSession({
      instanceId,
      workspaceId,
      docId,
      variant,
    });
  }, [docId, instanceId, variant, workspaceId]);

  void intentPrewarm;

  useEffect(() => {
    mentionProfilePopoverStateRef.current = mentionProfilePopover;
  }, [mentionProfilePopover]);

  const isEdgelessFullscreenActive = allowModeSwitch && fullscreenEdgeless && frameMode === "edgeless";

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const expectedOrigin = window.location.origin;

    const onMessage = (e: MessageEvent) => {
      const originOk = !expectedOrigin || expectedOrigin === "null" ? true : e.origin === expectedOrigin;
      if (!originOk)
        return;

      if (e.source !== iframeRef.current?.contentWindow)
        return;

      const data: any = e.data;
      if (!data || data.tc !== "tc-blocksuite-frame")
        return;

      if (data.instanceId && data.instanceId !== instanceId)
        return;

      if (data.type === "mode" && (data.mode === "page" || data.mode === "edgeless")) {
        const next = data.mode as DocMode;
        setFrameMode(next);
        onModeChange?.(next);
        return;
      }

      if (data.type === "height" && typeof data.height === "number" && Number.isFinite(data.height) && data.height > 0) {
        setIframeHeight(Math.ceil(data.height));
        return;
      }

      if (data.type === "ready") {
        try {
          postFrameParamsRef.current();
          const frameWindow = iframeRef.current?.contentWindow;
          if (!frameWindow)
            return;
          frameWindow.postMessage(
            {
              tc: "tc-blocksuite-frame",
              instanceId,
              type: "theme",
              theme: getCurrentAppTheme(),
            },
            getPostMessageTargetOrigin(),
          );
          frameWindow.postMessage(
            { tc: "tc-blocksuite-frame", instanceId, type: "request-height" },
            getPostMessageTargetOrigin(),
          );
        }
        catch {
        }
        return;
      }

      if (data.type === "navigate" && typeof data.to === "string" && data.to) {
        try {
          const handled = onNavigateRef.current?.(data.to);
          if (handled === true)
            return;
          navigate(data.to);
        }
        catch {
        }
        return;
      }

      if (data.type === "mention-click" && typeof data.userId === "string" && data.userId) {
        try {
          clearMentionProfilePopoverCloseTimer();
          setMentionProfilePopover(null);
          const to = `/profile/${encodeURIComponent(data.userId)}`;
          const handled = onNavigateRef.current?.(to);
          if (handled === true)
            return;
          navigate(to);
        }
        catch {
        }
        return;
      }

      if (data.type === "mention-hover" && (data.state === "enter" || data.state === "leave") && typeof data.userId === "string" && data.userId) {
        if (data.state === "enter") {
          const anchorRect = data.anchorRect as any;
          const anchorRectOk = Boolean(anchorRect)
            && typeof anchorRect.left === "number"
            && typeof anchorRect.top === "number"
            && typeof anchorRect.right === "number"
            && typeof anchorRect.bottom === "number"
            && typeof anchorRect.width === "number"
            && typeof anchorRect.height === "number";

          if (!anchorRectOk)
            return;

          try {
            scheduleMentionProfilePopoverOpen({ userId: data.userId, anchorRect });
          }
          catch {
          }
          return;
        }

        if (data.state === "leave") {
          try {
            const current = mentionProfilePopoverStateRef.current;
            if (!current) {
              clearMentionProfilePopoverOpenTimer();
              return;
            }
            if (current.userId !== data.userId)
              return;
            clearMentionProfilePopoverOpenTimer();
            scheduleMentionProfilePopoverClose();
          }
          catch {
          }
        }
        return;
      }

      if (data.type === "tc-header" && data.header && typeof data.docId === "string") {
        if (data.docId !== docId)
          return;
        try {
          const header = data.header as BlocksuiteDocHeader;
          if (!header || typeof header.title !== "string" || typeof header.imageUrl !== "string")
            return;

          const entityType = (typeof data.entityType === "string" ? data.entityType : undefined) as DescriptionEntityType | undefined;
          const entityId = typeof data.entityId === "number" ? data.entityId : undefined;
          if (entityType && entityType !== "space" && typeof entityId === "number" && entityId > 0) {
            useEntityHeaderOverrideStore.getState().setHeader({ entityType, entityId, header });
          }

          onTcHeaderChange?.({
            docId: data.docId,
            entityType,
            entityId,
            header,
          });
        }
        catch {
        }
        return;
      }

      if (data.type === "render-ready") {
        setIsFrameReady(true);
        return;
      }

      if (data.type === "debug-log") {
        try {
          const entry = data.entry as any;
          const source = String(entry?.source ?? "unknown");
          const message = String(entry?.message ?? "");
          const payload = (entry?.payload ?? null) as any;

          if (isBlocksuiteDebugEnabled() && source === "BlocksuiteFrame" && message === "keydown @") {
            hostMentionDebugUntilRef.current = Date.now() + 5000;
            hostMentionDebugRemainingRef.current = 12;
          }

          if (isBlocksuiteDebugEnabled() && source === "BlocksuiteFrame" && message === "keydown Enter") {
            if (Date.now() < hostMentionDebugUntilRef.current && hostMentionDebugRemainingRef.current > 0) {
              hostMentionDebugRemainingRef.current -= 1;
              try {
                const active = document.activeElement;
                const toLower = (v: unknown) => String(v ?? "").toLowerCase();
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
                  return { tag, id: id || undefined, className: cls || undefined, role: role || undefined, testid: testid || undefined };
                };
                const probes = {
                  blocksuitePortal: document.querySelectorAll("blocksuite-portal, .blocksuite-portal").length,
                  affineMenu: document.querySelectorAll("affine-menu").length,
                  roleListbox: document.querySelectorAll("[role='listbox']").length,
                  roleMenu: document.querySelectorAll("[role='menu']").length,
                };
                console.warn("[BlocksuiteHostDebug]", "keydown Enter", { active: summarizeEl(active), probes });
              }
              catch {
              }
            }
          }

          if (isBlocksuiteDebugEnabled()) {
            if (payload && typeof payload === "object") {
              console.warn("[BlocksuiteFrameDebug]", source, message, payload);
            }
            else {
              console.warn("[BlocksuiteFrameDebug]", source, message);
            }
          }
        }
        catch {
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [
    clearMentionProfilePopoverCloseTimer,
    clearMentionProfilePopoverOpenTimer,
    docId,
    instanceId,
    navigate,
    onModeChange,
    onTcHeaderChange,
    scheduleMentionProfilePopoverClose,
    scheduleMentionProfilePopoverOpen,
  ]);

  useEffect(() => {
    if (!mentionProfilePopover)
      return;
    if (typeof window === "undefined")
      return;

    const close = () => {
      clearMentionProfilePopoverOpenTimer();
      clearMentionProfilePopoverCloseTimer();
      setMentionProfilePopover(null);
    };

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close, true);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close, true);
    };
  }, [clearMentionProfilePopoverCloseTimer, clearMentionProfilePopoverOpenTimer, mentionProfilePopover]);

  useEffect(() => {
    if (!isBlocksuiteDebugEnabled())
      return;
    if (typeof document === "undefined")
      return;

    const toLower = (v: unknown) => String(v ?? "").toLowerCase();
    const summarizeNode = (node: unknown) => {
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

    const logHostEvent = (type: string, e: Event) => {
      const now = Date.now();
      if (now >= hostMentionDebugUntilRef.current)
        return;
      if (hostMentionDebugRemainingRef.current <= 0)
        return;
      hostMentionDebugRemainingRef.current -= 1;

      try {
        const path = (e as any).composedPath?.() as unknown[] | undefined;
        const nodes = Array.isArray(path)
          ? path.map(summarizeNode).filter(Boolean).slice(0, 10)
          : [];
        console.warn("[BlocksuiteHostDebug]", type, {
          targetTag: toLower((e.target as any)?.tagName),
          nodes,
        });
      }
      catch {
      }
    };

    const onPointerDown = (e: PointerEvent) => logHostEvent("pointerdown", e);
    const onClick = (e: MouseEvent) => logHostEvent("click", e);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined")
      return;

    if (!isEdgelessFullscreenActive)
      return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isEdgelessFullscreenActive]);

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const postTheme = () => {
      const theme = getCurrentAppTheme();
      try {
        iframeRef.current?.contentWindow?.postMessage(
          {
            tc: "tc-blocksuite-frame",
            instanceId,
            type: "theme",
            theme,
          },
          getPostMessageTargetOrigin(),
        );
      }
      catch {
      }
    };

    postTheme();

    const root = document.documentElement;
    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver(() => {
        postTheme();
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
    }
    catch {
      observer = null;
    }

    return () => {
      try {
        observer?.disconnect?.();
      }
      catch {
      }
    };
  }, [instanceId]);

  const tcHeaderEnabled = Boolean(tcHeader?.enabled);
  const frozenTcHeaderFallbackRef = useRef<{
    workspaceId: string;
    docId: string;
    title?: string;
    imageUrl?: string;
  } | null>(null);

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
    return {
      instanceId,
      workspaceId,
      spaceId: typeof spaceId === "number" && Number.isFinite(spaceId) ? String(spaceId) : undefined,
      docId,
      variant,
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
    variant,
    workspaceId,
  ]);

  const frozenInitParamsRef = useRef(initParams);
  const frozenInitParams = frozenInitParamsRef.current;

  const src = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(frozenInitParams)) {
      if (value === undefined)
        continue;
      params.set(key, String(value));
    }
    return `/blocksuite-frame?${params.toString()}`;
  }, [frozenInitParams]);

  const hasExplicitHeightClass = useMemo(() => {
    const value = (className ?? "").trim();
    if (!value)
      return false;
    return /(?:^|\s)(?:h-\[|h-|min-h-|max-h-)/.test(value);
  }, [className]);

  const iframeHeightAttr = (!isEdgelessFullscreenActive && variant !== "full" && iframeHeight && iframeHeight > 0)
    ? iframeHeight
    : undefined;

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
        (variant !== "full" && !iframeHeightAttr) ? "min-h-32" : "",
        (variant === "full" && !hasExplicitHeightClass) ? "h-full" : "",
      ]
        .filter(Boolean)
        .join(" ");

  function postFrameParams() {
    try {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow)
        return;
      frameWindow.postMessage(
        {
          tc: "tc-blocksuite-frame",
          instanceId,
          type: "sync-params",
          workspaceId,
          spaceId,
          docId,
          variant,
          readOnly,
          allowModeSwitch,
          fullscreenEdgeless,
          mode: forcedMode,
          tcHeader: tcHeaderEnabled,
          tcHeaderTitle: frozenTcHeaderTitle,
          tcHeaderImageUrl: frozenTcHeaderImageUrl,
        },
        getPostMessageTargetOrigin(),
      );
    }
    catch {
    }
  }

  postFrameParamsRef.current = postFrameParams;

  const syncFrameBasics = () => {
    try {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow)
        return;

      frameWindow.postMessage(
        {
          tc: "tc-blocksuite-frame",
          instanceId,
          type: "theme",
          theme: getCurrentAppTheme(),
        },
        getPostMessageTargetOrigin(),
      );

      frameWindow.postMessage(
        { tc: "tc-blocksuite-frame", instanceId, type: "request-height" },
        getPostMessageTargetOrigin(),
      );
    }
    catch {
    }
  };

  useEffect(() => {
    postFrameParamsRef.current();
  }, [
    allowModeSwitch,
    docId,
    forcedMode,
    fullscreenEdgeless,
    readOnly,
    spaceId,
    tcHeaderEnabled,
    frozenTcHeaderImageUrl,
    frozenTcHeaderTitle,
    variant,
    workspaceId,
  ]);

  useEffect(() => {
    setIsFrameReady(false);
  }, [docId]);

  useEffect(() => {
    if (isFrameReady)
      setHasFrameReadyOnce(true);
  }, [isFrameReady]);

  return (
    <div className={wrapperClassName}>
      {!hasFrameReadyOnce && !isFrameReady && (
        <div
          className={[
            "w-full",
            "rounded-xl",
            "border",
            "border-base-300/60",
            "bg-base-100/60",
            "p-4",
            (variant !== "full" && !iframeHeightAttr) ? "min-h-32" : "",
            (variant === "full" && !hasExplicitHeightClass) ? "h-full" : "",
          ].filter(Boolean).join(" ")}
          aria-label="Blocksuite loading"
        >
          <div className="mx-auto w-full max-w-195 pr-6 px-4">
            <div className="flex min-h-12 items-center gap-4">
              <div className="skeleton h-14 w-14 rounded-2xl" />
              <div className="skeleton h-12 flex-1 rounded-2xl" />
              <div className="ml-auto flex items-center gap-2">
                <div className="skeleton h-8 w-24 rounded-full" />
                <div className="skeleton h-8 w-20 rounded-full" />
              </div>
            </div>
            <div className="skeleton mt-3 h-4 w-full" />
            <div className="skeleton mt-2 h-4 w-full" />
            <div className="skeleton mt-2 h-4 w-full" />
          </div>
        </div>
      )}
      <BlocksuiteMentionProfilePopover
        state={mentionProfilePopover}
        onRequestClose={() => {
          clearMentionProfilePopoverCloseTimer();
          setMentionProfilePopover(null);
        }}
        onHoverChange={(hovered) => {
          mentionProfilePopoverHoveredRef.current = hovered;
          if (hovered) {
            clearMentionProfilePopoverCloseTimer();
          }
          else if (mentionProfilePopover) {
            scheduleMentionProfilePopoverClose();
          }
        }}
      />
      <iframe
        ref={iframeRef}
        src={src}
        title="blocksuite-editor"
        className={iframeClassName}
        allow="clipboard-read; clipboard-write; fullscreen"
        allowFullScreen
        height={iframeHeightAttr}
        style={{ backgroundColor: "transparent" }}
        onLoad={() => {
          postFrameParams();
          syncFrameBasics();
        }}
      />
    </div>
  );
}

export default function BlocksuiteDescriptionEditor(props: BlocksuiteDescriptionEditorProps) {
  return <BlocksuiteDescriptionEditorIframeHost {...props} />;
}
