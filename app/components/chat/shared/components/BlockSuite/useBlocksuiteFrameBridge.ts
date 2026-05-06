import type { DocMode } from "@blocksuite/affine/model";
import type { RefObject } from "react";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import type { BlocksuiteReportEntry } from "@/components/chat/infra/blocksuite/shared/blocksuiteReporter";
import type {
  BlocksuiteFrameMessage,
  BlocksuiteFrameSyncParams,
  BlocksuiteFrameToHostPayload,
} from "@/components/chat/infra/blocksuite/shared/frameProtocol";

import { isBlocksuiteDebugEnabled } from "@/components/chat/infra/blocksuite/shared/debugFlags";
import {
  getBlocksuiteFrameTargetOrigin,
  isBlocksuiteDocMode,
  postBlocksuiteFrameMessage,
  readBlocksuiteFrameMessageFromEvent,
} from "@/components/chat/infra/blocksuite/shared/frameProtocol";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";

import { getCurrentAppTheme } from "./blocksuiteDescriptionEditor.shared";

type UseBlocksuiteFrameBridgeParams = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  instanceId: string;
  workspaceId: string;
  spaceId?: number;
  docId: string;
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
  setIsFrameReady: (ready: boolean) => void;
  handleMentionClickMessage: (message: Extract<BlocksuiteFrameToHostPayload, { type: "mention-click" }>) => void;
  handleMentionHoverMessage: (message: Extract<BlocksuiteFrameToHostPayload, { type: "mention-hover" }>) => void;
};

function createBlocksuiteFrameSyncParams(params: {
  instanceId: string;
  workspaceId: string;
  spaceId?: number;
  docId: string;
  readOnly: boolean;
  allowModeSwitch: boolean;
  fullscreenEdgeless: boolean;
  forcedMode: DocMode;
  tcHeaderEnabled: boolean;
  frozenTcHeaderTitle?: string;
  frozenTcHeaderImageUrl?: string;
}): BlocksuiteFrameSyncParams {
  const {
    instanceId,
    workspaceId,
    spaceId,
    docId,
    readOnly,
    allowModeSwitch,
    fullscreenEdgeless,
    forcedMode,
    tcHeaderEnabled,
    frozenTcHeaderTitle,
    frozenTcHeaderImageUrl,
  } = params;

  return {
    editorInstanceId: instanceId,
    workspaceId,
    spaceId,
    docId,
    readOnly,
    allowModeSwitch,
    fullscreenEdgeless,
    mode: forcedMode,
    tcHeader: tcHeaderEnabled,
    tcHeaderTitle: frozenTcHeaderTitle,
    tcHeaderImageUrl: frozenTcHeaderImageUrl,
    prewarmOnly: false,
  };
}

function applyTcHeaderOverrideSideEffect(params: {
  entityType?: DescriptionEntityType;
  entityId?: number;
  header: BlocksuiteDocHeader;
}) {
  const { entityType, entityId, header } = params;
  if (entityType && entityType !== "space" && typeof entityId === "number" && entityId > 0) {
    useEntityHeaderOverrideStore.getState().setHeader({ entityType, entityId, header });
  }
}

// 负责在宿主页面与 BlockSuite iframe 之间同步参数、接收事件，并转发交互结果。
export function useBlocksuiteFrameBridge(params: UseBlocksuiteFrameBridgeParams) {
  const {
    iframeRef,
    instanceId,
    workspaceId,
    spaceId,
    docId,
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
    setIsFrameReady,
    handleMentionClickMessage,
    handleMentionHoverMessage,
  } = params;

  const hostMentionDebugUntilRef = useRef(0);
  const hostMentionDebugRemainingRef = useRef(0);
  const onNavigateRef = useRef(onNavigate);

  // 保持 message 监听器里拿到的是最新 onNavigate，避免因回调变化反复重绑全局事件。
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const createSyncParamsPayload = useCallback(() => {
    return createBlocksuiteFrameSyncParams({
      instanceId,
      workspaceId,
      spaceId,
      docId,
      readOnly,
      allowModeSwitch,
      fullscreenEdgeless,
      forcedMode,
      tcHeaderEnabled,
      frozenTcHeaderTitle,
      frozenTcHeaderImageUrl,
    });
  }, [
    allowModeSwitch,
    docId,
    forcedMode,
    fullscreenEdgeless,
    frozenTcHeaderImageUrl,
    frozenTcHeaderTitle,
    readOnly,
    spaceId,
    tcHeaderEnabled,
    workspaceId,
    instanceId,
  ]);

  const postToFrame = useCallback((payload: Parameters<typeof postBlocksuiteFrameMessage>[0]["payload"]) => {
    return postBlocksuiteFrameMessage({
      targetWindow: iframeRef.current?.contentWindow,
      instanceId,
      payload,
      targetOrigin: getBlocksuiteFrameTargetOrigin(),
    });
  }, [iframeRef, instanceId]);

  const flushFrameSync = useCallback((reason: string) => {
    void reason;
    postToFrame({
      type: "sync-params",
      ...createSyncParamsPayload(),
    });
    postToFrame({
      type: "theme",
      theme: getCurrentAppTheme(),
    });
  }, [createSyncParamsPayload, postToFrame]);

  // 订阅 iframe 的 postMessage，统一分发模式切换、导航、mention、header 和 ready 事件。
  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const expectedOrigin = window.location.origin;

    const handleReadySideEffect = () => {
      flushFrameSync("frame-ready");
    };

    const handleNavigateSideEffect = (message: Extract<BlocksuiteFrameToHostPayload, { type: "navigate" }>) => {
      try {
        const handled = onNavigateRef.current?.(message.to);
        if (handled === true)
          return;
        navigate(message.to);
      }
      catch {
      }
    };

    const handleTcHeaderSideEffect = (message: Extract<BlocksuiteFrameToHostPayload, { type: "tc-header" }>) => {
      if (message.docId !== docId)
        return;

      try {
        const header = message.header as BlocksuiteDocHeader;
        if (!header || typeof header.title !== "string" || typeof header.imageUrl !== "string")
          return;

        const entityType = (typeof message.entityType === "string" ? message.entityType : undefined) as DescriptionEntityType | undefined;
        const entityId = typeof message.entityId === "number" ? message.entityId : undefined;
        applyTcHeaderOverrideSideEffect({ entityType, entityId, header });

        onTcHeaderChange?.({
          docId: message.docId,
          entityType,
          entityId,
          header,
        });
      }
      catch {
      }
    };

    const handleRenderReadySideEffect = () => {
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
    };

    const handleReportSideEffect = (message: Extract<BlocksuiteFrameToHostPayload, { type: "report" }>) => {
      const entry = message.entry as BlocksuiteReportEntry | null | undefined;
      if (!entry || typeof entry !== "object")
        return;

      if (entry.kind === "error" && entry.toast?.message) {
        toast.error(entry.toast.message, {
          id: entry.toast.id ?? `blocksuite:${entry.instanceId}:${entry.phase}:${entry.errorCode}`,
        });
      }

      if (isBlocksuiteDebugEnabled()) {
        if (entry.kind === "error") {
          console.error("[BlocksuiteFrameReport]", entry);
        }
        else {
          console.warn("[BlocksuiteFrameReport]", entry);
        }
      }
    };

    const dispatchFrameMessage = (message: BlocksuiteFrameMessage) => {
      if (message.type === "mode" && isBlocksuiteDocMode(message.mode)) {
        const next = message.mode as DocMode;
        setFrameMode(next);
        onModeChange?.(next);
        return;
      }

      if (message.type === "ready") {
        handleReadySideEffect();
        return;
      }

      if (message.type === "navigate" && typeof message.to === "string" && message.to) {
        handleNavigateSideEffect(message);
        return;
      }

      if (message.type === "mention-click"
        && (message.targetKind === "user" || message.targetKind === "role")
        && typeof message.targetId === "string"
        && message.targetId) {
        handleMentionClickMessage(message);
        return;
      }

      if (message.type === "mention-hover"
        && (message.state === "enter" || message.state === "leave")
        && (message.targetKind === "user" || message.targetKind === "role")
        && typeof message.targetId === "string"
        && message.targetId) {
        handleMentionHoverMessage(message);
        return;
      }

      if (message.type === "tc-header" && typeof message.docId === "string" && message.header) {
        handleTcHeaderSideEffect(message);
        return;
      }

      if (message.type === "render-ready") {
        handleRenderReadySideEffect();
        return;
      }

      if (message.type === "report") {
        handleReportSideEffect(message);
        return;
      }

      if (message.type === "debug-log") {
        try {
          const entry = message.entry as any;
          const source = String(entry?.source ?? "unknown");
          const debugMessage = String(entry?.message ?? "");
          const payload = (entry?.payload ?? null) as any;

          if (isBlocksuiteDebugEnabled() && source === "BlocksuiteFrame" && debugMessage === "keydown @") {
            hostMentionDebugUntilRef.current = Date.now() + 5000;
            hostMentionDebugRemainingRef.current = 12;
          }

          if (isBlocksuiteDebugEnabled() && source === "BlocksuiteFrame" && debugMessage === "keydown Enter") {
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
              console.warn("[BlocksuiteFrameDebug]", source, debugMessage, payload);
            }
            else {
              console.warn("[BlocksuiteFrameDebug]", source, debugMessage);
            }
          }
        }
        catch {
        }
      }
    };

    // 只处理当前 iframe、当前实例发出的合法消息，避免串窗体或串实例。
    const onMessage = (e: MessageEvent) => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow)
        return;

      const message = readBlocksuiteFrameMessageFromEvent({
        event: e,
        expectedOrigin,
        expectedSource: frameWindow,
        instanceId,
      });
      if (!message)
        return;

      dispatchFrameMessage(message);
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
    setFrameMode,
    setIsFrameReady,
    flushFrameSync,
  ]);

  // 仅在调试模式下监听宿主点击链路，辅助排查 mention 菜单被宿主事件打断的问题。
  useEffect(() => {
    if (!isBlocksuiteDebugEnabled())
      return;
    if (typeof document === "undefined")
      return;

    const toLower = (v: unknown) => String(v ?? "").toLowerCase();
    // 把宿主 DOM 节点压缩成可读摘要，避免调试日志输出整棵节点对象。
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

    // 在短时间窗口内采样宿主交互事件，定位 iframe 外部是否抢占了焦点或点击。
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

  // 当对外同步参数更新时，主动向 iframe 推送一次最新基础状态。
  useEffect(() => {
    flushFrameSync("params-change");
  }, [flushFrameSync]);

  return {
    flushFrameSync,
  };
}
