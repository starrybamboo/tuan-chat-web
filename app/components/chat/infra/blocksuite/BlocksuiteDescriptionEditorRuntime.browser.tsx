import type { DocMode } from "@blocksuite/affine/model";
import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { getRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { loadBlocksuiteRuntime } from "@/components/chat/infra/blocksuite/runtime/runtimeLoader.browser";
import { base64ToUint8Array } from "@/components/chat/infra/blocksuite/shared/base64";
import { isBlocksuiteDebugEnabled } from "@/components/chat/infra/blocksuite/shared/debugFlags";
import { BlocksuiteTcHeader } from "./BlocksuiteTcHeader";
import { useBlocksuiteDocModeProvider } from "./useBlocksuiteDocModeProvider";
import { useBlocksuiteEditorLifecycle } from "./useBlocksuiteEditorLifecycle";
import { useBlocksuiteEditorModeSync } from "./useBlocksuiteEditorModeSync";
import { useBlocksuiteTcHeaderSync } from "./useBlocksuiteTcHeaderSync";
import { useBlocksuiteViewportBehavior } from "./useBlocksuiteViewportBehavior";

/**
 * iframe 内真正的编辑器 React runtime。
 *
 * 这一层负责把：
 * - workspace/doc/store 的获取与恢复
 * - tcHeader 与模式切换
 * - editor 创建与销毁
 * 组合成最终可渲染的 Blocksuite 页面。
 */
interface BlocksuiteDescriptionEditorProps {
  /** Blocksuite workspaceId，比如 `space:123` / `user:1` */
  workspaceId: string;
  /** 仅 space 场景使用：用于路由跳转 & mentions */
  spaceId?: number;
  docId: string;
  /** iframe 宿主实例 id（用于 postMessage 去重） */
  instanceId?: string;
  /** 只读模式：允许滚动/选择，但不允许编辑 */
  readOnly?: boolean;
  /** 外部强制模式（allowModeSwitch=false 时生效） */
  mode?: DocMode;
  /** 是否允许在 page/edgeless 间切换 */
  allowModeSwitch?: boolean;
  /** 画布模式下是否支持全屏 */
  fullscreenEdgeless?: boolean;
  /** 启用“图片+标题”的自定义头部，并禁用 blocksuite 内置 doc-title */
  tcHeader?: {
    enabled?: boolean;
    fallbackTitle?: string;
    fallbackImageUrl?: string;
  };
  /** tcHeader 变化（包含初始化/远端同步/本地编辑）；可供外层补充做高度重测等副作用 */
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  /** editor mode 变化回调（page/edgeless） */
  onModeChange?: (mode: DocMode) => void;
  /** iframe 内部请求导航时，允许宿主拦截并自行处理；返回 true 表示已处理，阻止默认 navigate */
  onNavigate?: (to: string) => boolean | void;
  className?: string;
}

function getPostMessageTargetOrigin(): string {
  if (typeof window === "undefined") {
    return "*";
  }

  // 在 file://（例如 Electron 打包）场景下，location.origin 可能是 "null"。
  const origin = window.location.origin;
  if (!origin || origin === "null") {
    return "*";
  }
  return origin;
}

function warnNonFatalBlocksuiteError(message: string, error: unknown) {
  console.warn(message, error);
}

function isProbablyInIframe(): boolean {
  if (typeof window === "undefined")
    return false;

  try {
    return window.self !== window.top;
  }
  catch {
    // 无法访问 window.top（跨域）时，也视为 iframe 内。
    return true;
  }
}

export function BlocksuiteDescriptionEditorRuntime(props: BlocksuiteDescriptionEditorProps) {
  const {
    workspaceId,
    spaceId,
    docId,
    instanceId,
    className,
    readOnly = false,
    allowModeSwitch = false,
    fullscreenEdgeless = false,
    mode: forcedMode = "page",
    tcHeader,
    onTcHeaderChange,
    onModeChange,
  } = props;

  const isFull = true;
  const [isForcePullingCloud, setIsForcePullingCloud] = useState(false);
  const tcHeaderEnabled = Boolean(tcHeader?.enabled);

  const postToParent = useCallback((payload: any) => {
    try {
      window.parent.postMessage(payload, getPostMessageTargetOrigin());
      return true;
    }
    catch (error) {
      warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to post message to parent", error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isBlocksuiteDebugEnabled())
      return;
    const inIframe = isProbablyInIframe();
    const msg = { docId, workspaceId, spaceId, inIframe, instanceId: props.instanceId ?? null };
    console.warn("[BlocksuiteMentionHost] runtime mount", msg);
    (globalThis as any).__tcBlocksuiteDebugLog?.({ source: "BlocksuiteMentionHost", message: "runtime mount", payload: msg });
  }, [docId, props.instanceId, spaceId, workspaceId]);

  const tcHeaderEntity = useMemo(() => {
    const parsed = parseDescriptionDocId(docId);
    return parsed
      ? { entityType: parsed.entityType, entityId: parsed.entityId }
      : null;
  }, [docId]);

  const canForcePullFromCloud = useMemo(() => {
    return !readOnly && Boolean(parseDescriptionDocId(docId));
  }, [docId, readOnly]);

  const {
    currentMode,
    docModeProvider,
  } = useBlocksuiteDocModeProvider({
    workspaceId,
    docId,
    allowModeSwitch,
    forcedMode,
    onModeChange,
  });

  const {
    editorHandle,
    tcHeaderState,
  } = useBlocksuiteEditorLifecycle({
    workspaceId,
    docId,
    spaceId,
    instanceId,
    readOnly,
    tcHeaderEnabled,
    tcHeaderFallbackTitle: tcHeader?.fallbackTitle,
    tcHeaderFallbackImageUrl: tcHeader?.fallbackImageUrl,
    docModeProvider,
    isFull,
    postToParent,
  });

  const {
    isEdgelessFullscreen,
    isBrowserFullscreen,
    rootClassName,
    viewportOverflowClass,
    toggleBrowserFullscreen,
  } = useBlocksuiteViewportBehavior({
    currentMode,
    allowModeSwitch,
    fullscreenEdgeless,
    isFull,
    className,
    tcHeaderEnabled,
    fullscreenRootRef: editorHandle.fullscreenRootRef,
    hostContainerRef: editorHandle.hostContainerRef,
  });

  const shouldFillEditorHeight = isFull || isEdgelessFullscreen || isBrowserFullscreen;

  useBlocksuiteEditorModeSync({
    currentMode,
    shouldFillHeight: shouldFillEditorHeight,
    editorHandle,
  });

  const handleForcePullFromCloud = useCallback(async () => {
    if (!canForcePullFromCloud || isForcePullingCloud)
      return;

    setIsForcePullingCloud(true);
    try {
      const key = parseDescriptionDocId(docId);
      if (!key) {
        toast.error("当前文档不支持云端拉取");
        return;
      }

      const remote = await getRemoteSnapshot(key);
      const updateB64 = String(remote?.updateB64 ?? "");
      if (!updateB64) {
        toast.error("云端暂无可用文档快照");
        return;
      }
      const update = base64ToUint8Array(updateB64);

      // 丢弃本地离线队列，避免旧改动在替换后反向覆盖云端。
      const { clearUpdates } = await import("@/components/chat/infra/blocksuite/description/descriptionDocDb");
      await clearUpdates(docId);

      const runtime = editorHandle.runtimeRef.current ?? await loadBlocksuiteRuntime();
      editorHandle.runtimeRef.current = runtime;
      const workspace = runtime.getOrCreateWorkspace(workspaceId) as any;
      if (typeof workspace.replaceDocFromUpdate !== "function") {
        toast.error("当前运行时不支持云端覆盖");
        return;
      }
      workspace.replaceDocFromUpdate({ docId, update });

      editorHandle.triggerReload();
      toast.success("已用云端内容覆盖本地");
    }
    catch {
      toast.error("云端拉取失败，请稍后重试");
    }
    finally {
      setIsForcePullingCloud(false);
    }
  }, [canForcePullFromCloud, docId, editorHandle, isForcePullingCloud, workspaceId]);

  useBlocksuiteTcHeaderSync({
    tcHeaderEnabled,
    tcHeaderState,
    docId,
    workspaceId,
    instanceId,
    editorHandle,
    postToParent,
    onTcHeaderChange,
    tcHeaderEntity,
    shouldPostToParent: isProbablyInIframe(),
  });

  return (
    <div className={rootClassName}>
      <div
        ref={editorHandle.fullscreenRootRef}
        className={`relative bg-base-100 ${viewportOverflowClass}${(isFull || isEdgelessFullscreen || isBrowserFullscreen) ? " h-full" : " rounded-box"}${(isFull || isEdgelessFullscreen || isBrowserFullscreen) ? " flex flex-col" : ""}`}
      >
        {tcHeaderEnabled
          ? (
              <BlocksuiteTcHeader
                docId={docId}
                readOnly={readOnly}
                allowModeSwitch={allowModeSwitch}
                currentMode={currentMode}
                isBrowserFullscreen={isBrowserFullscreen}
                canForcePullFromCloud={canForcePullFromCloud}
                isForcePullingCloud={isForcePullingCloud}
                tcHeaderState={tcHeaderState}
                fallbackTitle={tcHeader?.fallbackTitle}
                fallbackImageUrl={tcHeader?.fallbackImageUrl}
                storeRef={editorHandle.storeRef}
                onToggleBrowserFullscreen={() => void toggleBrowserFullscreen()}
                onForcePullFromCloud={() => void handleForcePullFromCloud()}
                onToggleMode={() => {
                  docModeProvider.togglePrimaryMode(docId);
                }}
              />
            )
          : null}

        {(allowModeSwitch || canForcePullFromCloud) && !tcHeaderEnabled
          ? (
              <div className="flex items-center justify-end p-2 border-b border-base-300">
                {currentMode === "edgeless"
                  ? (
                      <button
                        type="button"
                        className="btn btn-sm mr-2"
                        onClick={() => void toggleBrowserFullscreen()}
                      >
                        {isBrowserFullscreen ? "退出全屏" : "全屏"}
                      </button>
                    )
                  : null}
                {canForcePullFromCloud
                  ? (
                      <button
                        type="button"
                        className="btn btn-sm mr-2"
                        disabled={isForcePullingCloud}
                        onClick={() => void handleForcePullFromCloud()}
                      >
                        {isForcePullingCloud ? "拉取中..." : "云端覆盖"}
                      </button>
                    )
                  : null}
                {allowModeSwitch
                  ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          docModeProvider.togglePrimaryMode(docId);
                        }}
                      >
                        {currentMode === "page" ? "切换到画布" : "退出画布"}
                      </button>
                    )
                  : null}
              </div>
            )
          : null}

        <div
          ref={editorHandle.hostContainerRef}
          className={`${(isFull || isEdgelessFullscreen || isBrowserFullscreen) ? "flex-1 min-h-0" : "min-h-32"} w-full ${currentMode === "edgeless" ? "affine-edgeless-viewport" : "affine-page-viewport"}`}
        />
      </div>
    </div>
  );
}
