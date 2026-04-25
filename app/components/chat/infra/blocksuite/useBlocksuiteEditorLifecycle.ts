import type { DocModeProvider } from "@blocksuite/affine/shared/services";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import type { BlocksuiteFrameToHostPayload } from "@/components/chat/infra/blocksuite/shared/frameProtocol";

import { ensureBlocksuiteDocHeader, subscribeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import { loadBlocksuiteRuntime } from "@/components/chat/infra/blocksuite/runtime/runtimeLoader.browser";
import { isNonRetryableBlocksuiteDocError } from "@/components/chat/infra/blocksuite/shared/blocksuiteDocError";
import { isBlocksuiteDebugEnabled } from "@/components/chat/infra/blocksuite/shared/debugFlags";
import { failBlocksuiteOpenSession, finishBlocksuiteOpenSession, markBlocksuiteOpenSession } from "@/components/chat/infra/blocksuite/shared/perf";
import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/space/spaceDocId";

import type { BlocksuiteEditorHandle, BlocksuiteTcHeaderState } from "./blocksuiteRuntimeTypes";

import {
  LATE_REMOTE_HYDRATION_WAIT_MS,
  shouldEnsureTcHeaderFallback,
  shouldUseRemoteFirstHydration,
  waitForRemoteHydrationSettled,
  waitForRemoteSnapshotDecision,
} from "./blocksuiteEditorLifecycleHydration";

function warnNonFatalBlocksuiteError(message: string, error: unknown) {
  console.warn(message, error);
}

function getBlocksuiteStartupErrorMessage(error: unknown): string {
  if (isNonRetryableBlocksuiteDocError(error)) {
    return "文档不可用，可能已删除、无权限或尚未同步完成";
  }
  return "文档加载失败，请稍后重试";
}

type UseBlocksuiteEditorLifecycleParams = {
  workspaceId: string;
  docId: string;
  spaceId?: number;
  instanceId?: string;
  readOnly: boolean;
  tcHeaderEnabled: boolean;
  tcHeaderFallbackTitle?: string;
  tcHeaderFallbackImageUrl?: string;
  docModeProvider: DocModeProvider;
  isFull: boolean;
  postToParent: (payload: BlocksuiteFrameToHostPayload) => boolean;
};

export function useBlocksuiteEditorLifecycle(params: UseBlocksuiteEditorLifecycleParams) {
  const {
    workspaceId,
    docId,
    spaceId,
    instanceId,
    readOnly,
    tcHeaderEnabled,
    tcHeaderFallbackTitle,
    tcHeaderFallbackImageUrl,
    docModeProvider,
    isFull,
    postToParent,
  } = params;

  const hostContainerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenRootRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const storeRef = useRef<any>(null);
  const runtimeRef = useRef<Awaited<ReturnType<typeof loadBlocksuiteRuntime>> | null>(null);
  const docRuntimeRef = useRef<{ workspace: any; docId: string } | null>(null);
  const readOnlyRef = useRef(readOnly);
  const instanceIdRef = useRef(instanceId);
  const tcHeaderFallbackRef = useRef({
    title: tcHeaderFallbackTitle,
    imageUrl: tcHeaderFallbackImageUrl,
  });
  const [tcHeaderState, setTcHeaderState] = useState<BlocksuiteTcHeaderState>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [reloadEpoch, setReloadEpoch] = useState(0);

  const triggerReload = useCallback(() => {
    setReloadEpoch(prev => prev + 1);
  }, []);

  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  useEffect(() => {
    instanceIdRef.current = instanceId;
  }, [instanceId]);

  useEffect(() => {
    tcHeaderFallbackRef.current = {
      title: tcHeaderFallbackTitle,
      imageUrl: tcHeaderFallbackImageUrl,
    };
  }, [tcHeaderFallbackImageUrl, tcHeaderFallbackTitle]);

  useEffect(() => {
    if (!tcHeaderEnabled)
      return;
    setTcHeaderState(null);
  }, [docId, tcHeaderEnabled]);

  useEffect(() => {
    const container = hostContainerRef.current;
    if (!container)
      return;

    const abort = new AbortController();
    let createdEditor: any = null;
    let createdStore: any = null;
    let unsubscribeHeader: (() => void) | null = null;
    let retainedRuntime: Awaited<ReturnType<typeof loadBlocksuiteRuntime>> | null = null;
    let hasPostedRenderReady = false;
    setStartupError(null);

    const revealFrame = () => {
      if (hasPostedRenderReady)
        return;
      hasPostedRenderReady = true;
      requestAnimationFrame(() => {
        if (abort.signal.aborted)
          return;
        postToParent({ type: "render-ready" });
      });
    };

    // useEffect 不能直接写成 async，这里用立即执行异步函数承载整段启动流程。
    // 外层 effect 负责生命周期和 cleanup，内层 async 负责按顺序创建 runtime/store/editor。
    void (async () => {
      try {
        // runtime 是 Blocksuite 的运行时入口，后续 workspace、store、editor 都从这里拿。
        const runtime = await loadBlocksuiteRuntime();
        runtimeRef.current = runtime;
        if (abort.signal.aborted)
          return;

        // 在当前 effect 生命周期内持有 workspace，cleanup 时再释放对应引用。
        runtime.retainWorkspace(workspaceId);
        retainedRuntime = runtime;

        const workspace = runtime.getOrCreateWorkspace(workspaceId);
        docRuntimeRef.current = { workspace, docId };

        // 对描述文档优先尝试远端快照，尽量在创建 store 前恢复首屏内容。
        const remoteSnapshotDecision = await waitForRemoteSnapshotDecision({
          docId,
          signal: abort.signal,
        });
        if (abort.signal.aborted)
          return;

        if (remoteSnapshotDecision.state === "snapshot-hit" && remoteSnapshotDecision.update?.length) {
          try {
            // 启动期只做单次 merge 恢复，避免 replace 语义丢弃本地未同步内容。
            (workspace as any)?.restoreDocFromUpdate?.({
              docId,
              update: remoteSnapshotDecision.update,
            });
          }
          catch (error) {
            warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to apply startup remote snapshot", error);
          }
        }

        // store 创建前先确保文档元信息存在，便于 runtime 后续正确关联文档。
        runtime.ensureDocMeta({ workspaceId, docId });
        markBlocksuiteOpenSession(instanceIdRef.current ?? "", "store-create-start");
        const store = runtime.getOrCreateDoc({ workspaceId, docId, readonly: readOnlyRef.current });
        createdStore = store;

        try {
          (store as any)?.load?.();
        }
        catch (error) {
          warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to load store", error);
        }

        try {
          (store as any)?.resetHistory?.();
        }
        catch (error) {
          warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to reset store history", error);
        }

        // tcHeader 既同步到 React 状态，也顺手回填文档标题元信息。
        const applyHeaderState = (header: BlocksuiteDocHeader | null) => {
          if (!header)
            return;
          setTcHeaderState({ docId, header });
          if (header.title) {
            runtime.ensureDocMeta({ workspaceId, docId, title: header.title });
          }
        };

        if (tcHeaderEnabled) {
          try {
            // 订阅 store 内 header 变化，保持外层状态和编辑器内部模型一致。
            unsubscribeHeader = subscribeBlocksuiteDocHeader(store, (header) => {
              applyHeaderState(header);
            });

            if (shouldEnsureTcHeaderFallback({
              tcHeaderEnabled,
              hydrationState: remoteSnapshotDecision.state,
            })) {
              // 当前 hydration 状态足够稳定，可以立即补兜底 header。
              applyHeaderState(ensureBlocksuiteDocHeader(store, {
                title: tcHeaderFallbackRef.current.title,
                imageUrl: tcHeaderFallbackRef.current.imageUrl,
              }));
            }
            else {
              // 如果远端 hydration 仍在继续，延后补兜底 header，避免和真实远端内容抢写。
              void waitForRemoteHydrationSettled({
                workspace: workspace as any,
                docId,
                signal: abort.signal,
                timeoutMs: LATE_REMOTE_HYDRATION_WAIT_MS,
              }).then((lateHydrationState) => {
                if (abort.signal.aborted || lateHydrationState !== "completed")
                  return;

                try {
                  applyHeaderState(ensureBlocksuiteDocHeader(store, {
                    title: tcHeaderFallbackRef.current.title,
                    imageUrl: tcHeaderFallbackRef.current.imageUrl,
                  }));
                }
                catch (error) {
                  warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to finalize tcHeader state", error);
                }
              });
            }
          }
          catch (error) {
            warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to initialize tcHeader state", error);
          }
        }

        if (isBlocksuiteDebugEnabled()) {
          const rootId = (store as any)?.root?.id;
          const paragraphs = (store as any)?.getModelsByFlavour?.("affine:paragraph") as any[] | undefined;
          const first = paragraphs?.[0];
          const firstText = first?.props?.text;
          console.warn("[BlocksuiteDescriptionEditor] store ready", {
            docId,
            rootId,
            paragraphCount: paragraphs?.length ?? 0,
            firstText: firstText?.toString?.() ?? null,
          });
        }

        // store 准备完成后再创建 editor 视图，并把导航和模式切换能力注入进去。
        markBlocksuiteOpenSession(instanceIdRef.current ?? "", "editor-create-start");
        const editor = await runtime.createBlocksuiteEditor({
          store,
          workspace: workspace as any,
          docModeProvider,
          spaceId,
          autofocus: !readOnlyRef.current,
          disableDocTitle: tcHeaderEnabled,
          onNavigateToDoc: ({ spaceId, docId }) => {
            const parsed = parseSpaceDocId(docId);

            const go = (to: string) => {
              postToParent({
                type: "navigate",
                to,
              });
            };

            if (parsed?.kind === "room_description") {
              go(`/chat/${spaceId}/${parsed.roomId}/setting`);
              return;
            }

            if (parsed?.kind === "space_description") {
              go(`/chat/${spaceId}/setting`);
              return;
            }

            if (parsed?.kind === "independent") {
              go(`/chat/${spaceId}/doc/${parsed.docId}`);
              return;
            }

            go(`/chat/${spaceId}/doc/${encodeURIComponent(docId)}`);
          },
        });
        createdEditor = editor;

        // 宿主容器只承载 editor 元素，这里集中设置基础尺寸。
        (editor as any).style.display = "block";
        (editor as any).style.width = "100%";
        (editor as any).style.minHeight = "8rem";
        (editor as any).style.height = isFull ? "100%" : "auto";

        if (readOnlyRef.current) {
          // 不同实现可能读取字段或属性，统一设置避免只读状态不生效。
          (editor as any).readOnly = true;
          (editor as any).readonly = true;
          (editor as any).setAttribute?.("readonly", "true");
        }

        editorRef.current = editor as unknown as HTMLElement;
        storeRef.current = store;

        // 每次重建直接替换整个容器内容，避免残留旧 editor 节点。
        container.replaceChildren(editor as unknown as Node);

        const postRenderReady = () => {
          if (hasPostedRenderReady)
            return;
          hasPostedRenderReady = true;
          // 延后一帧再通知父层，保证 editor 已挂进 DOM 并获得一次布局机会。
          requestAnimationFrame(() => {
            if (abort.signal.aborted)
              return;
            markBlocksuiteOpenSession(instanceIdRef.current ?? "", "render-ready");
            finishBlocksuiteOpenSession(instanceIdRef.current ?? "");
            postToParent({ type: "render-ready" });
          });
        };

        postRenderReady();

        // 宿主层统一拦截撤销/重做快捷键，只在焦点位于当前 editor 内时转发给 Blocksuite。
        const onUndoRedoKeyDown = (event: KeyboardEvent) => {
          const isMod = event.ctrlKey || event.metaKey;
          if (!isMod)
            return;

          const key = (event.key ?? "").toLowerCase();
          const isUndo = key === "z" && !event.shiftKey;
          const isRedo = key === "y" || (key === "z" && event.shiftKey);
          if (!isUndo && !isRedo)
            return;

          const active = document.activeElement as HTMLElement | null;
          const root = hostContainerRef.current;
          if (!root)
            return;

          const hasFocusInside = !!(active && (root.contains(active) || (editor as any)?.contains?.(active)));
          if (!hasFocusInside)
            return;

          const storeAny = store as any;
          const editorAny = editor as any;
          const historyAny = storeAny?.history;
          const undo = storeAny?.undo ?? historyAny?.undo ?? editorAny?.undo;
          const redo = storeAny?.redo ?? historyAny?.redo ?? editorAny?.redo;
          const fn: unknown = isUndo ? undo : redo;
          if (typeof fn !== "function")
            return;

          event.preventDefault();
          try {
            if (fn === storeAny?.undo || fn === storeAny?.redo) {
              Reflect.apply(fn as (...args: unknown[]) => unknown, storeAny, []);
            }
            else if (fn === historyAny?.undo || fn === historyAny?.redo) {
              Reflect.apply(fn as (...args: unknown[]) => unknown, historyAny, []);
            }
            else {
              Reflect.apply(fn as (...args: unknown[]) => unknown, editorAny, []);
            }
          }
          catch (error) {
            warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to apply undo/redo shortcut", error);
          }
        };

        window.addEventListener("keydown", onUndoRedoKeyDown, { capture: true, signal: abort.signal });

        if (typeof window !== "undefined" && import.meta.env.DEV) {
          // 开发环境暴露调试句柄，便于在控制台直接检查 editor/store。
          const g = globalThis as any;
          g.editor = editor;
          g.blocksuiteStore = store;
        }
      }
      catch (error) {
        if (abort.signal.aborted)
          return;
        const errorMessage = getBlocksuiteStartupErrorMessage(error);
        console.error("[BlocksuiteDescriptionEditor] Failed to start editor runtime", error);
        failBlocksuiteOpenSession(instanceIdRef.current ?? "", errorMessage);
        setStartupError(errorMessage);
        revealFrame();
      }
    })();

    return () => {
      abort.abort();
      unsubscribeHeader?.();
      runtimeRef.current = null;
      docRuntimeRef.current = null;

      if (retainedRuntime) {
        try {
          retainedRuntime.releaseWorkspace(workspaceId);
        }
        catch (error) {
          warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to release workspace", error);
        }
        retainedRuntime = null;
      }

      try {
        createdEditor?.__tc_dispose?.();
      }
      catch (error) {
        warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to dispose editor", error);
      }

      editorRef.current = null;
      storeRef.current = null;
      container.replaceChildren();

      if (typeof window !== "undefined" && import.meta.env.DEV) {
        const g = globalThis as any;
        if (createdEditor && g.editor === createdEditor)
          delete g.editor;
        if (createdStore && g.blocksuiteStore === createdStore)
          delete g.blocksuiteStore;
      }
    };
  }, [
    docId,
    docModeProvider,
    isFull,
    postToParent,
    reloadEpoch,
    spaceId,
    tcHeaderEnabled,
    workspaceId,
  ]);

  useEffect(() => {
    return () => {
      const current = docRuntimeRef.current;
      if (!current || current.docId !== docId)
        return;

      try {
        current.workspace?.getDoc?.(current.docId)?.dispose?.();
      }
      catch (error) {
        warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to dispose current doc", error);
      }

      if (docRuntimeRef.current?.docId === current.docId) {
        docRuntimeRef.current = null;
      }
    };
  }, [docId]);

  useEffect(() => {
    const editor = editorRef.current as any;
    if (!editor)
      return;

    editor.readOnly = readOnly;
    if (readOnly)
      editor.setAttribute?.("readonly", "true");
    else
      editor.removeAttribute?.("readonly");
  }, [readOnly]);

  const editorHandle = useMemo<BlocksuiteEditorHandle>(() => {
    return {
      hostContainerRef,
      fullscreenRootRef,
      editorRef,
      storeRef,
      runtimeRef,
      triggerReload,
    };
  }, [triggerReload]);

  return {
    editorHandle,
    tcHeaderState,
    startupError,
  };
}
