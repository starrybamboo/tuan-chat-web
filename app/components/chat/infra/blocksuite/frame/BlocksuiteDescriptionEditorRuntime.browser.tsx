import type { DocMode } from "@blocksuite/affine/model";
import type { DocModeProvider } from "@blocksuite/affine/shared/services";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import { FileTextIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { Subscription } from "rxjs";
import { base64ToUint8Array } from "@/components/chat/infra/blocksuite/base64";
import { isNonRetryableBlocksuiteDocError } from "@/components/chat/infra/blocksuite/blocksuiteDocError";
import { isBlocksuiteDebugEnabled } from "@/components/chat/infra/blocksuite/debugFlags";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { getRemoteSnapshot } from "@/components/chat/infra/blocksuite/descriptionDocRemote";
import { ensureBlocksuiteDocHeader, setBlocksuiteDocHeader, subscribeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import { finishBlocksuiteOpenSession, markBlocksuiteOpenSession } from "@/components/chat/infra/blocksuite/perf";
import { loadBlocksuiteRuntime } from "@/components/chat/infra/blocksuite/runtime/runtimeLoader.browser";
import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { ResizableImg } from "@/components/common/resizableImg";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";

interface BlocksuiteDescriptionEditorProps {
  /** Blocksuite workspaceId，比如 `space:123` / `user:1` */
  workspaceId: string;
  /** 仅 space 场景使用：用于路由跳转 & mentions */
  spaceId?: number;
  docId: string;
  /** iframe 宿主实例 id（用于 postMessage 去重） */
  instanceId?: string;
  /** 默认嵌入式；`full` 用于全屏/DocRoute 场景 */
  variant?: "embedded" | "full";
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
  /** tcHeader 变化（包含初始化/远端同步/本地编辑）；iframe host 场景会通过 postMessage 转发 */
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  /** 对外暴露 editor mode 的控制能力；卸载时会回传 null */
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

const REMOTE_HYDRATE_FAST_WAIT_MS = 250;

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

function tryFocusEdgelessViewport(editor: any, store: any): boolean {
  try {
    const doc = store as any;
    const rootId = doc?.root?.id;
    const rootBlock = editor?.host?.view?.getBlock?.(rootId);

    // Prefer higher-level APIs when available.
    if (typeof rootBlock?.gfx?.fitToScreen === "function") {
      rootBlock.gfx.fitToScreen();
      return true;
    }
    const service = rootBlock?.service;
    if (typeof service?.zoomToFit === "function") {
      service.zoomToFit();
      return true;
    }
  }
  catch {
    // ignore
  }
  return false;
}

export function BlocksuiteDescriptionEditorRuntime(props: BlocksuiteDescriptionEditorProps) {
  const {
    workspaceId,
    spaceId,
    docId,
    instanceId,
    className,
    variant = "embedded",
    readOnly = false,
    allowModeSwitch = false,
    fullscreenEdgeless = false,
    mode: forcedMode = "page",
    tcHeader,
    onTcHeaderChange,
    onModeChange,
  } = props;

  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  const isFull = variant === "full";

  const readOnlyRef = useRef(readOnly);
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  const instanceIdRef = useRef(instanceId);
  useEffect(() => {
    instanceIdRef.current = instanceId;
  }, [instanceId]);

  const [currentMode, setCurrentMode] = useState<DocMode>(forcedMode);
  const currentModeRef = useRef<DocMode>(forcedMode);
  const [reloadEpoch, setReloadEpoch] = useState(0);
  const [isForcePullingCloud, setIsForcePullingCloud] = useState(false);

  useEffect(() => {
    currentModeRef.current = currentMode;
    onModeChange?.(currentMode);
  }, [currentMode, onModeChange]);

  const hostContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const storeRef = useRef<any>(null);
  const docRuntimeRef = useRef<{ workspace: any; docId: string } | null>(null);
  const prevModeRef = useRef<DocMode>(forcedMode);
  const runtimeRef = useRef<Awaited<ReturnType<typeof loadBlocksuiteRuntime>> | null>(null);

  const tcHeaderEnabled = Boolean(tcHeader?.enabled);
  const [tcHeaderState, setTcHeaderState] = useState<{
    docId: string;
    header: BlocksuiteDocHeader;
  } | null>(null);

  useEffect(() => {
    if (!isBlocksuiteDebugEnabled())
      return;
    try {
      const inIframe = isProbablyInIframe();
      const msg = { docId, workspaceId, spaceId, variant, inIframe, instanceId: props.instanceId ?? null };
      console.warn("[BlocksuiteMentionHost] runtime mount", msg);
      try {
        (globalThis as any).__tcBlocksuiteDebugLog?.({ source: "BlocksuiteMentionHost", message: "runtime mount", payload: msg });
      }
      catch {
        // ignore
      }
    }
    catch {
      // ignore
    }
  }, [docId, props.instanceId, spaceId, variant, workspaceId]);

  const tcHeaderEntity = useMemo(() => {
    const parsed = parseDescriptionDocId(docId);
    return parsed
      ? { entityType: parsed.entityType, entityId: parsed.entityId }
      : null;
  }, [docId]);

  const canForcePullFromCloud = useMemo(() => {
    return !readOnly && Boolean(parseDescriptionDocId(docId));
  }, [docId, readOnly]);

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
      try {
        const { clearUpdates } = await import("@/components/chat/infra/blocksuite/descriptionDocDb");
        await clearUpdates(docId);
      }
      catch {
        // ignore
      }

      const runtime = runtimeRef.current ?? await loadBlocksuiteRuntime();
      runtimeRef.current = runtime;
      const workspace = runtime.getOrCreateWorkspace(workspaceId) as any;
      if (typeof workspace.replaceDocFromUpdate === "function") {
        workspace.replaceDocFromUpdate({ docId, update });
      }
      else if (typeof workspace.restoreDocFromUpdate === "function") {
        // fallback: old runtime only supports merge restore
        workspace.restoreDocFromUpdate({ docId, update });
      }
      else {
        toast.error("当前运行时不支持云端覆盖");
        return;
      }

      setReloadEpoch(v => v + 1);
      toast.success("已用云端内容覆盖本地");
    }
    catch {
      toast.error("云端拉取失败，请稍后重试");
    }
    finally {
      setIsForcePullingCloud(false);
    }
  }, [canForcePullFromCloud, docId, isForcePullingCloud, workspaceId]);

  const postToParent = (payload: any) => {
    try {
      window.parent.postMessage(payload, getPostMessageTargetOrigin());
    }
    catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!tcHeaderEnabled || !tcHeaderState)
      return;
    if (tcHeaderState.docId !== docId)
      return;

    // Keep blocksuite workspace meta in sync (linked-doc/@ search uses meta.title).
    try {
      const runtime = runtimeRef.current;
      runtime?.ensureDocMeta?.({ workspaceId, docId, title: tcHeaderState.header.title });
    }
    catch {
      // ignore
    }

    // Notify host (iframe parent or same-window callers).
    try {
      const payload = {
        tc: "tc-blocksuite-frame",
        instanceId,
        type: "tc-header",
        docId,
        entityType: tcHeaderEntity?.entityType,
        entityId: tcHeaderEntity?.entityId,
        header: tcHeaderState.header,
      };

      if (isProbablyInIframe()) {
        postToParent(payload);
      }

      onTcHeaderChange?.({
        docId,
        entityType: tcHeaderEntity?.entityType,
        entityId: tcHeaderEntity?.entityId,
        header: tcHeaderState.header,
      });
    }
    catch {
      // ignore
    }
  }, [docId, instanceId, onTcHeaderChange, tcHeaderEnabled, tcHeaderEntity?.entityId, tcHeaderEntity?.entityType, tcHeaderState, workspaceId]);

  useEffect(() => {
    if (!tcHeaderEnabled)
      return;
    setTcHeaderState(null);
  }, [docId, tcHeaderEnabled]);

  const docModeProvider: DocModeProvider = useMemo(() => {
    // DocModeProvider 是一个“跨 doc/跨 widget”的服务，这里做最小实现：
    // - editor mode 由 React state 驱动
    // - primary mode：
    //   - allowModeSwitch=false：内存 map（保持旧行为）
    //   - allowModeSwitch=true：按 spaceId 维度持久化（localStorage）
    const storageKey = `tc:blocksuite:${workspaceId}:primaryModeByDocId`;
    const primaryModeByDocId = new Map<string, DocMode>();
    const listenersByDocId = new Map<string, Set<(m: DocMode) => void>>();

    const isValidMode = (v: unknown): v is DocMode => v === "page" || v === "edgeless";

    const loadFromStorage = () => {
      if (!allowModeSwitch)
        return;
      if (typeof window === "undefined")
        return;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw)
          return;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof k === "string" && isValidMode(v)) {
            primaryModeByDocId.set(k, v);
          }
        }
      }
      catch {
        // ignore
      }
    };

    const flushToStorage = () => {
      if (!allowModeSwitch)
        return;
      if (typeof window === "undefined")
        return;
      try {
        const obj: Record<string, DocMode> = {};
        for (const [k, v] of primaryModeByDocId.entries()) {
          obj[k] = v;
        }
        window.localStorage.setItem(storageKey, JSON.stringify(obj));
      }
      catch {
        // ignore
      }
    };

    loadFromStorage();

    const emit = (id: string, m: DocMode) => {
      const listeners = listenersByDocId.get(id);
      if (listeners) {
        for (const fn of listeners) fn(m);
      }
    };

    return {
      setEditorMode: (m: DocMode) => {
        currentModeRef.current = m;
        setCurrentMode(m);
      },
      getEditorMode: () => {
        return currentModeRef.current;
      },
      setPrimaryMode: (m: DocMode, id: string) => {
        primaryModeByDocId.set(id, m);
        flushToStorage();
        emit(id, m);
        // 尽量保持 editor mode 与 primary mode 一致（符合 playground 的体感）。
        currentModeRef.current = m;
        setCurrentMode(m);
      },
      getPrimaryMode: (id: string) => {
        return primaryModeByDocId.get(id) ?? forcedMode;
      },
      togglePrimaryMode: (id: string) => {
        const next = (primaryModeByDocId.get(id) ?? forcedMode) === "page" ? "edgeless" : "page";
        primaryModeByDocId.set(id, next);
        flushToStorage();
        emit(id, next);
        setCurrentMode(next);
        return next;
      },
      onPrimaryModeChange: (handler: (m: DocMode) => void, id: string) => {
        let listeners = listenersByDocId.get(id);
        if (!listeners) {
          listeners = new Set();
          listenersByDocId.set(id, listeners);
        }
        listeners.add(handler);

        const subscription = new Subscription();
        subscription.add(() => {
          const set = listenersByDocId.get(id);
          set?.delete(handler);
        });
        return subscription;
      },
    };
  }, [allowModeSwitch, forcedMode, workspaceId]);

  useEffect(() => {
    if (allowModeSwitch) {
      try {
        const initial = docModeProvider.getPrimaryMode(docId);
        currentModeRef.current = initial;
        setCurrentMode(initial);
      }
      catch {
        // ignore
      }
      return;
    }

    // 兼容旧行为：当不允许切换时，外部传入的 mode 仍然是“强制模式”。
    try {
      docModeProvider.setPrimaryMode(forcedMode, docId);
    }
    catch {
      // ignore
    }
  }, [allowModeSwitch, docId, docModeProvider, forcedMode]);

  useEffect(() => {
    const container = hostContainerRef.current;
    if (!container)
      return;

    const isFullInEffect = isFull;
    const abort = new AbortController();
    let fastRestoreTimeout: ReturnType<typeof setTimeout> | null = null;
    let createdEditor: any = null;
    let createdStore: any = null;
    let unsubscribeHeader: (() => void) | null = null;
    let retainedRuntime: Awaited<ReturnType<typeof loadBlocksuiteRuntime>> | null = null;

    // Hydrate first (restore semantics), then render editor.
    // This avoids binding the UI to an empty initialized root.
    (async () => {
      const runtime = await loadBlocksuiteRuntime();
      runtimeRef.current = runtime;
      if (abort.signal.aborted)
        return;

      runtime.retainWorkspace(workspaceId);
      retainedRuntime = runtime;

      const workspace = runtime.getOrCreateWorkspace(workspaceId);
      docRuntimeRef.current = { workspace, docId };
      const runtimeWs = workspace as any;
      const restoreSnapshotUpdate = (update: Uint8Array) => {
        if (!update?.length) {
          return;
        }
        if (typeof runtimeWs.restoreDocFromUpdate === "function") {
          runtimeWs.restoreDocFromUpdate({ docId, update });
        }
      };

      const remoteSnapshotUpdateTask = (async (): Promise<Uint8Array | null> => {
        try {
          const key = parseDescriptionDocId(docId);
          if (!key) {
            return null;
          }
          const remote = await getRemoteSnapshot(key);
          if (!remote?.updateB64) {
            return null;
          }
          return base64ToUint8Array(remote.updateB64);
        }
        catch (e) {
          if (!isNonRetryableBlocksuiteDocError(e)) {
            console.error("[BlocksuiteDescriptionEditor] Failed to restore remote snapshot", e);
          }
          return null;
        }
      })();
      let hasRestoredRemoteBeforeEditorReady = false;

      // 1) 优先给远端快照一个很短的窗口，超时就继续本地内容渲染（本地优先）。
      // 这样既能在快网下尽量保持“先远端快照后初始化”的一致性，又避免慢网阻塞打开文档。
      if (!abort.signal.aborted) {
        try {
          const fastRestore = await Promise.race([
            remoteSnapshotUpdateTask.then(update => ({ timedOut: false as const, update })),
            new Promise<{ timedOut: true; update: null }>((resolve) => {
              fastRestoreTimeout = setTimeout(() => {
                fastRestoreTimeout = null;
                resolve({ timedOut: true, update: null });
              }, REMOTE_HYDRATE_FAST_WAIT_MS);
            }),
          ]);
          if (!fastRestore.timedOut && fastRestore.update?.length) {
            restoreSnapshotUpdate(fastRestore.update);
            hasRestoredRemoteBeforeEditorReady = true;
          }
        }
        catch {
          // ignore
        }
      }

      if (abort.signal.aborted)
        return;

      // 3) Create store + editor after hydrate
      // Important: don't overwrite existing doc title.
      runtime.ensureDocMeta({ workspaceId, docId });
      markBlocksuiteOpenSession(instanceIdRef.current ?? "", "store-create-start");
      // Blocksuite store 的 readonly 是在创建时决定的；仅切换 editor.readOnly 不足以从只读切到可写。
      // 因此当 readOnly 改变时，需要重建一次 editor/store（见下方 useEffect 依赖）。
      const store = runtime.getOrCreateDoc({ workspaceId, docId, readonly: readOnlyRef.current });
      createdStore = store;

      if (tcHeaderEnabled) {
        try {
          const ensured = ensureBlocksuiteDocHeader(store, {
            title: tcHeader?.fallbackTitle,
            imageUrl: tcHeader?.fallbackImageUrl,
          });
          if (ensured) {
            setTcHeaderState({ docId, header: ensured });
            if (ensured.title) {
              runtime.ensureDocMeta({ workspaceId, docId, title: ensured.title });
            }
          }

          unsubscribeHeader = subscribeBlocksuiteDocHeader(store, (h) => {
            if (h) {
              setTcHeaderState({ docId, header: h });
              if (h.title) {
                runtime.ensureDocMeta({ workspaceId, docId, title: h.title });
              }
            }
          });
        }
        catch {
          // ignore
        }
      }

      // Align with blocksuite playground behavior:
      // ensure doc is loaded and history is reset after hydration/restore.
      try {
        (store as any)?.load?.();
      }
      catch {
        // ignore
      }
      try {
        (store as any)?.resetHistory?.();
      }
      catch {
        // ignore
      }

      if (isBlocksuiteDebugEnabled()) {
        try {
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
        catch {
          // ignore
        }
      }

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
            if (isProbablyInIframe()) {
              try {
                window.parent.postMessage(
                  {
                    tc: "tc-blocksuite-frame",
                    type: "navigate",
                    to,
                  },
                  getPostMessageTargetOrigin(),
                );
                return;
              }
              catch {
                // ignore
              }
            }
            navigateRef.current(to);
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

      (editor as any).style.display = "block";
      (editor as any).style.width = "100%";
      (editor as any).style.minHeight = "8rem";
      (editor as any).style.height = isFullInEffect ? "100%" : "auto";

      if (readOnlyRef.current) {
        try {
          (editor as any).readOnly = true;
          (editor as any).readonly = true;
          (editor as any).setAttribute?.("readonly", "true");
        }
        catch {
          // ignore
        }
      }

      editorRef.current = editor as unknown as HTMLElement;
      storeRef.current = store;

      container.replaceChildren(editor as unknown as Node);
      void remoteSnapshotUpdateTask.then((update) => {
        if (abort.signal.aborted) {
          return;
        }
        if (hasRestoredRemoteBeforeEditorReady) {
          return;
        }
        if (!update?.length) {
          return;
        }
        try {
          restoreSnapshotUpdate(update);
        }
        catch {
          // ignore
        }
      });

      // Signal host after first paint so it can hide the skeleton.
      if (isProbablyInIframe()) {
        requestAnimationFrame(() => {
          try {
            markBlocksuiteOpenSession(instanceIdRef.current ?? "", "render-ready");
            finishBlocksuiteOpenSession(instanceIdRef.current ?? "");
            postToParent({ tc: "tc-blocksuite-frame", instanceId: instanceIdRef.current, type: "render-ready" });
          }
          catch {
            // ignore
          }
        });
      }

      // Fallback undo/redo shortcuts (some embedded hosts may miss built-in keymap binding).
      // Only intercept when the focus is inside the editor container.
      const onUndoRedoKeyDown = (e: KeyboardEvent) => {
        const isMod = e.ctrlKey || e.metaKey;
        if (!isMod)
          return;

        const key = (e.key ?? "").toLowerCase();
        const isUndo = key === "z" && !e.shiftKey;
        const isRedo = key === "y" || (key === "z" && e.shiftKey);
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

        e.preventDefault();
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
        catch {
          // ignore
        }
      };

      // Use AbortController to auto-remove listener on cleanup.
      window.addEventListener("keydown", onUndoRedoKeyDown, { capture: true, signal: abort.signal });

      // 确保初始 mode 与 React state 一致。
      try {
        if (typeof (editor as any).switchEditor === "function") {
          (editor as any).switchEditor(currentModeRef.current);
        }
        else {
          (editor as any).mode = currentModeRef.current;
        }
      }
      catch {
        // ignore
      }

      if (typeof window !== "undefined" && import.meta.env.DEV) {
        const g = globalThis as any;
        g.editor = editor;
        g.blocksuiteStore = store;
      }
    })();

    return () => {
      abort.abort();
      if (fastRestoreTimeout) {
        clearTimeout(fastRestoreTimeout);
        fastRestoreTimeout = null;
      }
      try {
        unsubscribeHeader?.();
      }
      catch {
        // ignore
      }
      runtimeRef.current = null;
      docRuntimeRef.current = null;

      if (retainedRuntime) {
        try {
          retainedRuntime.releaseWorkspace(workspaceId);
        }
        catch {
          // ignore
        }
        retainedRuntime = null;
      }

      try {
        const editorAny = createdEditor as any;
        editorAny?.__tc_dispose?.();
      }
      catch {
        // ignore
      }

      editorRef.current = null;
      storeRef.current = null;
      try {
        container.replaceChildren();
      }
      catch {
        // ignore
      }

      if (typeof window !== "undefined" && import.meta.env.DEV) {
        const g = globalThis as any;
        if (createdEditor && g.editor === createdEditor)
          delete g.editor;
        if (createdStore && g.blocksuiteStore === createdStore)
          delete g.blocksuiteStore;
      }
    };
  }, [docId, docModeProvider, isFull, readOnly, reloadEpoch, spaceId, tcHeader?.fallbackImageUrl, tcHeader?.fallbackTitle, tcHeaderEnabled, workspaceId]);

  useEffect(() => {
    return () => {
      const current = docRuntimeRef.current;
      if (!current) {
        return;
      }
      if (current.docId !== docId) {
        return;
      }
      try {
        current.workspace?.getDoc?.(current.docId)?.dispose?.();
      }
      catch {
        // ignore
      }
      if (docRuntimeRef.current?.docId === current.docId) {
        docRuntimeRef.current = null;
      }
    };
  }, [docId, workspaceId]);

  useEffect(() => {
    const editor = editorRef.current as any;
    if (!editor)
      return;

    try {
      editor.readOnly = readOnly;
      editor.readonly = readOnly;
      if (readOnly)
        editor.setAttribute?.("readonly", "true");
      else
        editor.removeAttribute?.("readonly");
    }
    catch {
      // ignore
    }
  }, [readOnly]);

  const isEdgelessFullscreen = allowModeSwitch && fullscreenEdgeless && currentMode === "edgeless";

  const fullscreenRootRef = useRef<HTMLDivElement | null>(null);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined")
      return;

    const onChange = () => {
      try {
        const docAny = document as any;
        setIsBrowserFullscreen(Boolean(docAny.fullscreenElement ?? docAny.webkitFullscreenElement ?? docAny.msFullscreenElement));
      }
      catch {
        setIsBrowserFullscreen(false);
      }
    };

    onChange();
    document.addEventListener("fullscreenchange", onChange);
    const onWebkitChange = onChange as any;
    document.addEventListener("webkitfullscreenchange" as any, onWebkitChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange" as any, onWebkitChange);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined")
      return;
    if (!isBrowserFullscreen)
      return;
    if (currentMode === "edgeless")
      return;
    try {
      const docAny = document as any;
      const exit = docAny.exitFullscreen ?? docAny.webkitExitFullscreen ?? docAny.msExitFullscreen;
      void exit?.call(document);
    }
    catch {
      // ignore
    }
  }, [currentMode, isBrowserFullscreen]);

  const toggleBrowserFullscreen = async () => {
    try {
      const root = fullscreenRootRef.current;
      if (!root)
        return;

      const docAny = document as any;
      const enabled = docAny.fullscreenEnabled ?? docAny.webkitFullscreenEnabled ?? docAny.msFullscreenEnabled;
      const request = (root as any).requestFullscreen ?? (root as any).webkitRequestFullscreen ?? (root as any).msRequestFullscreen;
      const exit = docAny.exitFullscreen ?? docAny.webkitExitFullscreen ?? docAny.msExitFullscreen;
      const fsElement = docAny.fullscreenElement ?? docAny.webkitFullscreenElement ?? docAny.msFullscreenElement;

      if (enabled === false || typeof request !== "function") {
        toast.error("当前环境不支持全屏");
        return;
      }

      if (fsElement) {
        await exit?.call(document);
      }
      else {
        await request.call(root);
      }
    }
    catch {
      toast.error("全屏切换失败");
    }
  };

  const hasHeightConstraintClass = useMemo(() => {
    const v = (className ?? "").trim();
    if (!v)
      return false;
    // 仅把“显式限制高度”的情况当成需要内部滚动：h-* / h-[...] / max-h-*
    // min-h-* 只是下限，不应触发内部滚动。
    return /(?:^|\s)(?:h-\[|h-|max-h-)/.test(v);
  }, [className]);

  const viewportOverflowClass = currentMode === "page"
    ? ((isFull || isEdgelessFullscreen || isBrowserFullscreen || hasHeightConstraintClass) ? "overflow-auto" : "overflow-visible")
    : "overflow-hidden";

  useEffect(() => {
    const editor = editorRef.current as any;
    if (!editor)
      return;
    // Keep mode in sync with outer state.
    try {
      // Important: align with blocksuite playground behavior.
      // `affine-editor-container` switches internal hosts via `switchEditor`.
      if (typeof editor.switchEditor === "function") {
        editor.switchEditor(currentMode);
      }
      else {
        editor.mode = currentMode;
      }
      editor.style.height = (isEdgelessFullscreen || isBrowserFullscreen || isFull) ? "100%" : "auto";
    }
    catch {
      // ignore
    }

    // If edgeless DOM exists but user can't see it, it's often a viewport transform/zoom issue.
    // On entering edgeless, try to fit/center once (best-effort; won't run on every render).
    const prev = prevModeRef.current;
    prevModeRef.current = currentMode;

    let rafId: number | null = null;
    let t0: ReturnType<typeof setTimeout> | null = null;
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;

    if (prev !== "edgeless" && currentMode === "edgeless") {
      const run = () => {
        const e = editorRef.current as any;
        const s = storeRef.current;
        if (!e || !s)
          return;
        tryFocusEdgelessViewport(e, s);
      };

      // Delay a bit to allow host/root/service to be ready.
      rafId = requestAnimationFrame(() => {
        t0 = setTimeout(run, 0);
        t1 = setTimeout(run, 120);
        t2 = setTimeout(run, 300);
      });
    }

    return () => {
      if (rafId !== null) {
        try {
          cancelAnimationFrame(rafId);
        }
        catch {
          // ignore
        }
      }
      if (t0) {
        try {
          clearTimeout(t0);
        }
        catch {
          // ignore
        }
      }
      if (t1) {
        try {
          clearTimeout(t1);
        }
        catch {
          // ignore
        }
      }
      if (t2) {
        try {
          clearTimeout(t2);
        }
        catch {
          // ignore
        }
      }
    };
  }, [currentMode, isBrowserFullscreen, isEdgelessFullscreen, isFull]);

  useEffect(() => {
    if (typeof document === "undefined")
      return;
    if (!isEdgelessFullscreen)
      return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isEdgelessFullscreen]);

  const rootClassName = [tcHeaderEnabled ? "tc-blocksuite-tc-header-enabled" : "", className, (isEdgelessFullscreen || isBrowserFullscreen) ? "h-full min-h-0" : ""]
    .filter(Boolean)
    .join(" ");

  const canEditTcHeader = tcHeaderEnabled && !readOnly;
  const tcHeaderImageUrl = tcHeaderState?.header.imageUrl ?? tcHeader?.fallbackImageUrl ?? "";
  const tcHeaderTitle = tcHeaderState?.header.title ?? tcHeader?.fallbackTitle ?? "";
  const hasTcHeaderImage = Boolean(tcHeaderImageUrl.trim());
  const handleOpenTcHeaderImagePreview = useCallback(() => {
    const imageUrl = tcHeaderImageUrl.trim();
    if (!imageUrl) {
      return;
    }
    toastWindow(
      onClose => <ResizableImg src={imageUrl} onClose={onClose} />,
      {
        fullScreen: true,
        transparent: true,
      },
    );
  }, [tcHeaderImageUrl]);
  const handleTcHeaderImagePreviewKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    handleOpenTcHeaderImagePreview();
  }, [handleOpenTcHeaderImagePreview]);

  return (
    <div className={rootClassName}>
      <div
        ref={fullscreenRootRef}
        className={`relative bg-base-100 ${viewportOverflowClass}${(isEdgelessFullscreen || isBrowserFullscreen) ? " h-full" : " rounded-box"}${(isFull || isEdgelessFullscreen || isBrowserFullscreen) ? " flex flex-col" : ""}`}
      >
        {tcHeaderEnabled
          ? (
              <div className="tc-blocksuite-tc-header">
                <div className="tc-blocksuite-tc-header-inner">
                  <div className="tc-blocksuite-tc-header-top">
                    {canEditTcHeader
                      ? (
                          <ImgUploaderWithCopper
                            key={`tcHeader:${docId}`}
                            setCopperedDownloadUrl={(url) => {
                              const store = storeRef.current;
                              if (!store)
                                return;
                              setBlocksuiteDocHeader(store, { imageUrl: url });
                            }}
                            fileName={`blocksuite-header-${docId.replaceAll(":", "-")}`}
                            aspect={1}
                          >
                            <div className={`tc-blocksuite-tc-header-avatar${hasTcHeaderImage ? "" : " tc-blocksuite-tc-header-avatar-empty"}`} aria-label="更换头像">
                              {hasTcHeaderImage
                                ? (
                                    <img
                                      src={tcHeaderImageUrl}
                                      alt={tcHeaderTitle || "header"}
                                      className="tc-blocksuite-tc-header-avatar-img"
                                    />
                                  )
                                : (
                                    <div className="tc-blocksuite-tc-header-avatar-placeholder" aria-hidden="true">
                                      <span className="tc-blocksuite-tc-header-avatar-placeholder-glyph">
                                        <FileTextIcon className="tc-blocksuite-tc-header-avatar-placeholder-icon" weight="bold" />
                                      </span>
                                    </div>
                                  )}
                              <div className="tc-blocksuite-tc-header-avatar-overlay">
                                <span className="tc-blocksuite-tc-header-avatar-overlay-text">更换</span>
                              </div>
                            </div>
                          </ImgUploaderWithCopper>
                        )
                      : (
                          <div
                            className={`tc-blocksuite-tc-header-avatar tc-blocksuite-tc-header-avatar-readonly${hasTcHeaderImage ? " tc-blocksuite-tc-header-avatar-previewable" : ""}${hasTcHeaderImage ? "" : " tc-blocksuite-tc-header-avatar-empty"}`}
                            role={hasTcHeaderImage ? "button" : undefined}
                            tabIndex={hasTcHeaderImage ? 0 : undefined}
                            aria-label={hasTcHeaderImage ? "查看封面大图" : undefined}
                            title={hasTcHeaderImage ? "点击查看大图" : undefined}
                            onClick={hasTcHeaderImage ? handleOpenTcHeaderImagePreview : undefined}
                            onKeyDown={hasTcHeaderImage ? handleTcHeaderImagePreviewKeyDown : undefined}
                          >
                            {hasTcHeaderImage
                              ? (
                                  <img
                                    src={tcHeaderImageUrl}
                                    alt={tcHeaderTitle || "header"}
                                    className="tc-blocksuite-tc-header-avatar-img"
                                  />
                                )
                              : (
                                  <div className="tc-blocksuite-tc-header-avatar-placeholder" aria-hidden="true">
                                    <span className="tc-blocksuite-tc-header-avatar-placeholder-glyph">
                                      <FileTextIcon className="tc-blocksuite-tc-header-avatar-placeholder-icon" weight="bold" />
                                    </span>
                                  </div>
                                )}
                            {hasTcHeaderImage && (
                              <div className="tc-blocksuite-tc-header-avatar-overlay">
                                <span className="tc-blocksuite-tc-header-avatar-overlay-text">查看</span>
                              </div>
                            )}
                          </div>
                        )}

                    <input
                      className="tc-blocksuite-tc-header-title"
                      value={tcHeaderTitle}
                      disabled={!canEditTcHeader}
                      placeholder="标题"
                      onChange={(e) => {
                        const store = storeRef.current;
                        if (!store)
                          return;
                        setBlocksuiteDocHeader(store, { title: e.target.value });
                      }}
                      onBlur={(e) => {
                        const store = storeRef.current;
                        if (!store)
                          return;
                        setBlocksuiteDocHeader(store, { title: e.target.value.trim() });
                      }}
                    />

                    <div className="tc-blocksuite-tc-header-actions">
                      {currentMode === "edgeless"
                        ? (
                            <button
                              type="button"
                              className="tc-blocksuite-tc-header-btn tc-blocksuite-tc-header-btn-ghost"
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
                              className="tc-blocksuite-tc-header-btn tc-blocksuite-tc-header-btn-ghost"
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
                              className="tc-blocksuite-tc-header-btn"
                              onClick={() => {
                                docModeProvider.togglePrimaryMode(docId);
                              }}
                            >
                              {currentMode === "page" ? "切换画布" : "退出画布"}
                            </button>
                          )
                        : null}
                    </div>
                  </div>
                </div>
              </div>
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
          ref={hostContainerRef}
          className={`${(isFull || isEdgelessFullscreen || isBrowserFullscreen) ? "flex-1 min-h-0" : "min-h-32"} w-full ${currentMode === "edgeless" ? "affine-edgeless-viewport" : "affine-page-viewport"}`}
        />
      </div>
    </div>
  );
}
