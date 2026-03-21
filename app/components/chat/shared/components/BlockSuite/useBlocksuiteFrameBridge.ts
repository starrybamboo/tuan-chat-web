import type { DocMode } from "@blocksuite/affine/model";
import type { RefObject } from "react";

import { useCallback, useEffect, useRef } from "react";

import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";

import { isBlocksuiteDebugEnabled } from "@/components/chat/infra/blocksuite/debugFlags";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";

import { getCurrentAppTheme, getPostMessageTargetOrigin } from "./blocksuiteDescriptionEditor.shared";

type UseBlocksuiteFrameBridgeParams = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  instanceId: string;
  workspaceId: string;
  spaceId?: number;
  docId: string;
  variant: "embedded" | "full";
  readOnly: boolean;
  allowModeSwitch: boolean;
  fullscreenEdgeless: boolean;
  forcedMode: DocMode;
  tcHeaderEnabled: boolean;
  frozenTcHeaderTitle?: string;
  frozenTcHeaderImageUrl?: string;
  navigate: (to: string) => void;
  onNavigate?: (to: string) => boolean | void;
  onModeChange?: (mode: DocMode) => void;
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  setFrameMode: (mode: DocMode) => void;
  setIframeHeight: (height: number | null) => void;
  setIsFrameReady: (ready: boolean) => void;
  handleMentionClickMessage: (userId: string) => void;
  handleMentionHoverMessage: (data: any) => void;
};

export function useBlocksuiteFrameBridge(params: UseBlocksuiteFrameBridgeParams) {
  const {
    iframeRef,
    instanceId,
    workspaceId,
    spaceId,
    docId,
    variant,
    readOnly,
    allowModeSwitch,
    fullscreenEdgeless,
    forcedMode,
    tcHeaderEnabled,
    frozenTcHeaderTitle,
    frozenTcHeaderImageUrl,
    navigate,
    onNavigate,
    onModeChange,
    onTcHeaderChange,
    setFrameMode,
    setIframeHeight,
    setIsFrameReady,
    handleMentionClickMessage,
    handleMentionHoverMessage,
  } = params;

  const hostMentionDebugUntilRef = useRef(0);
  const hostMentionDebugRemainingRef = useRef(0);
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const postFrameParams = useCallback(() => {
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
  }, [
    allowModeSwitch,
    docId,
    forcedMode,
    fullscreenEdgeless,
    frozenTcHeaderImageUrl,
    frozenTcHeaderTitle,
    iframeRef,
    instanceId,
    readOnly,
    spaceId,
    tcHeaderEnabled,
    variant,
    workspaceId,
  ]);

  const syncFrameBasics = useCallback(() => {
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
  }, [iframeRef, instanceId]);

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
          postFrameParams();
          syncFrameBasics();
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
        handleMentionClickMessage(data.userId);
        return;
      }

      if (data.type === "mention-hover" && (data.state === "enter" || data.state === "leave") && typeof data.userId === "string" && data.userId) {
        handleMentionHoverMessage(data);
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
        if ((import.meta as any)?.env?.DEV) {
          try {
            const owner = window.top && window.top.location?.origin === window.location.origin
              ? window.top as any
              : window as any;
            const summary = owner.__tcBlocksuitePerfLast;
            if (summary && summary.instanceId === instanceId) {
              console.warn("[BlocksuitePerf]", summary);
            }
          }
          catch {
          }
        }
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
    docId,
    handleMentionClickMessage,
    handleMentionHoverMessage,
    iframeRef,
    instanceId,
    navigate,
    onModeChange,
    onTcHeaderChange,
    postFrameParams,
    setFrameMode,
    setIframeHeight,
    setIsFrameReady,
    syncFrameBasics,
  ]);

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
    postFrameParams();
  }, [postFrameParams]);

  return {
    postFrameParams,
    syncFrameBasics,
  };
}
