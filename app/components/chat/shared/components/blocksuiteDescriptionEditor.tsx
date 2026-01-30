import type { DocMode } from "@blocksuite/affine/model";
import type { DocModeProvider } from "@blocksuite/affine/shared/services";
import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import type { BlocksuiteMentionProfilePopoverState } from "@/components/chat/infra/blocksuite/mentionProfilePopover";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router";
import { Subscription } from "rxjs";
import { base64ToUint8Array } from "@/components/chat/infra/blocksuite/base64";
import { isBlocksuiteDebugEnabled } from "@/components/chat/infra/blocksuite/debugFlags";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { getRemoteSnapshot } from "@/components/chat/infra/blocksuite/descriptionDocRemote";
import { ensureBlocksuiteDocHeader, setBlocksuiteDocHeader, subscribeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";

import { BlocksuiteMentionProfilePopover } from "@/components/chat/infra/blocksuite/mentionProfilePopover";
import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import { ensureBlocksuiteRuntimeStyles } from "@/components/chat/infra/blocksuite/styles/ensureBlocksuiteRuntimeStyles";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";

async function loadBlocksuiteRuntime() {
  const [{ createEmbeddedAffineEditor }, { ensureBlocksuiteCoreElementsDefined }, spaceRegistry] = await Promise.all([
    import("@/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor"),
    import("@/components/chat/infra/blocksuite/spec/coreElements"),
    import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry"),
  ]);

  return {
    createEmbeddedAffineEditor,
    ensureBlocksuiteCoreElementsDefined,
    ensureDocMeta: spaceRegistry.ensureDocMeta,
    getOrCreateDoc: spaceRegistry.getOrCreateDoc,
    getOrCreateWorkspace: spaceRegistry.getOrCreateWorkspace,
  };
}

interface BlocksuiteDescriptionEditorProps {
  /** Blocksuite workspaceId，比如 `space:123` / `user:1` */
  workspaceId: string;
  /** 仅 space 场景使用：用于路由跳转 & mentions */
  spaceId?: number;
  docId: string;
  /** iframe 宿主实例 id（用于 postMessage 去重）；仅 /blocksuite-frame 路由传入 */
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

function normalizeAppThemeToBlocksuiteTheme(raw: string | null | undefined): "light" | "dark" {
  const v = (raw ?? "").toLowerCase();
  // daisyUI 常见：data-theme="dark" | "light" | "cupcake" | "dracula"...
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
  // 优先读取 data-theme，其次读取 class="dark"
  return normalizeAppThemeToBlocksuiteTheme(root.dataset.theme) === "dark" || root.classList.contains("dark")
    ? "dark"
    : "light";
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

  const [currentMode, setCurrentMode] = useState<DocMode>(forcedMode);
  const currentModeRef = useRef<DocMode>(forcedMode);

  useEffect(() => {
    currentModeRef.current = currentMode;
    onModeChange?.(currentMode);
  }, [currentMode, onModeChange]);

  const hostContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const storeRef = useRef<any>(null);
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
      console.debug("[BlocksuiteMentionHost] runtime mount", msg);
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

    const scopeRoot = (container.closest?.(".tc-blocksuite-scope") as HTMLElement | null) ?? container;

    // 主题跟随：把站点主题（data-theme / dark class）同步到 viewport。
    const syncPortalsTheme = (theme: "light" | "dark") => {
      // Slash menu / tooltip 等弹层通过 portal 挂到 body 下的 `.blocksuite-portal` 容器。
      // 如果只给 viewport 设置 data-theme，弹层会继承不到 `[data-theme=...]` 下的 affine 变量，导致“样式不对”。
      // 这里仅给 blocksuite 自己的 portal 容器打标，不改 body/html，避免影响站点（例如 daisyUI 的 data-theme）。
      const portals = document.querySelectorAll<HTMLElement>(".blocksuite-portal");
      for (const el of portals) {
        el.dataset.theme = theme;
        el.classList.toggle("dark", theme === "dark");
      }
    };

    const syncTheme = () => {
      const theme = getCurrentAppTheme();
      scopeRoot.dataset.theme = theme;
      scopeRoot.classList.toggle("dark", theme === "dark");
      syncPortalsTheme(theme);
    };
    syncTheme();

    const root = document.documentElement;
    const mo = new MutationObserver(() => syncTheme());
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });

    // 监听 portal 的创建（比如打开 slash menu 时才创建），确保后创建的 portal 也能拿到正确主题。
    const body = document.body;
    const portalMo = new MutationObserver((mutations) => {
      const theme = scopeRoot.dataset.theme === "dark" ? "dark" : "light";

      for (const m of mutations) {
        for (const added of m.addedNodes) {
          if (!(added instanceof HTMLElement))
            continue;
          if (added.classList.contains("blocksuite-portal")) {
            added.dataset.theme = theme;
            added.classList.toggle("dark", theme === "dark");
            continue;
          }
          const nested = added.querySelectorAll?.(".blocksuite-portal");
          if (!nested?.length)
            continue;
          for (const el of nested) {
            if (el instanceof HTMLElement) {
              el.dataset.theme = theme;
              el.classList.toggle("dark", theme === "dark");
            }
          }
        }
      }
    });
    portalMo.observe(body, { childList: true, subtree: true });
    const abort = new AbortController();
    let createdEditor: any = null;
    let createdStore: any = null;
    let unsubscribeHeader: (() => void) | null = null;

    // Hydrate first (restore semantics), then render editor.
    // This avoids binding the UI to an empty initialized root.
    (async () => {
      // 在 blocksuite 初始化前确保运行时 CSS 已经注入（并做作用域重写），避免加载期间污染全局样式。
      try {
        await ensureBlocksuiteRuntimeStyles();
      }
      catch {
        // ignore
      }

      const runtime = await loadBlocksuiteRuntime();
      runtimeRef.current = runtime;
      if (abort.signal.aborted)
        return;

      await runtime.ensureBlocksuiteCoreElementsDefined();

      const workspace = runtime.getOrCreateWorkspace(workspaceId);

      // 1) Migrate legacy local docId (if needed)
      try {
        const legacyDocId = "space:description";
        const expectedNewDocId = spaceId ? `space:${spaceId}:description` : "";
        const runtimeWs = workspace as any;
        if (expectedNewDocId && docId === expectedNewDocId
          && typeof runtimeWs?.listKnownDocIds === "function"
          && typeof runtimeWs?.encodeDocAsUpdate === "function"
          && typeof runtimeWs?.restoreDocFromUpdate === "function") {
          const known = runtimeWs.listKnownDocIds() as string[];
          const hasLegacy = known.includes(legacyDocId);
          const hasNew = known.includes(docId);
          if (hasLegacy && !hasNew) {
            const legacyUpdate = runtimeWs.encodeDocAsUpdate(legacyDocId) as Uint8Array;
            runtimeWs.restoreDocFromUpdate({ docId, update: legacyUpdate });
          }
        }
      }
      catch {
        // ignore migration failures
      }

      // 2) Restore from remote snapshot (if available)
      // Critical: explicit fetch ensures the store is populated with remote content (correct root block)
      // *before* the editor is initialized. This prevents 'ensureAffineMinimumBlockData' from creating
      // a duplicate/conflicting default page, which results in a blank view.
      if (!abort.signal.aborted) {
        try {
          const key = parseDescriptionDocId(docId);
          if (key) {
            const remote = await getRemoteSnapshot(key);
            if (remote?.updateB64) {
              const update = base64ToUint8Array(remote.updateB64);
              const runtimeWs = workspace as any;
              if (typeof runtimeWs.restoreDocFromUpdate === "function") {
                runtimeWs.restoreDocFromUpdate({ docId, update });
              }
            }
          }
        }
        catch (e) {
          console.error("[BlocksuiteDescriptionEditor] Failed to restore remote snapshot", e);
        }
      }

      if (abort.signal.aborted)
        return;

      // 3) Create store + editor after hydrate
      // Important: don't overwrite existing doc title.
      runtime.ensureDocMeta({ workspaceId, docId });
      const store = runtime.getOrCreateDoc({ workspaceId, docId });
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
          console.debug("[BlocksuiteDescriptionEditor] store ready", {
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

      const editor = await runtime.createEmbeddedAffineEditor({
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
      // Signal host after first paint so it can hide the skeleton.
      if (isProbablyInIframe()) {
        requestAnimationFrame(() => {
          try {
            postToParent({ tc: "tc-blocksuite-frame", instanceId, type: "render-ready" });
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
      mo.disconnect();
      portalMo.disconnect();
      try {
        unsubscribeHeader?.();
      }
      catch {
        // ignore
      }
      runtimeRef.current = null;

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
  }, [docId, docModeProvider, isFull, spaceId, tcHeader?.fallbackImageUrl, tcHeader?.fallbackTitle, tcHeaderEnabled, workspaceId]);

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

  const rootClassName = ["tc-blocksuite-scope", tcHeaderEnabled ? "tc-blocksuite-tc-header-enabled" : "", className, (isEdgelessFullscreen || isBrowserFullscreen) ? "h-full min-h-0" : ""]
    .filter(Boolean)
    .join(" ");

  const canEditTcHeader = tcHeaderEnabled && !readOnly;
  const tcHeaderImageUrl = tcHeaderState?.header.imageUrl ?? tcHeader?.fallbackImageUrl ?? "";
  const tcHeaderTitle = tcHeaderState?.header.title ?? tcHeader?.fallbackTitle ?? "";

  const resetBuiltinDocTitle = async () => {
    const store = storeRef.current;
    if (!store)
      return;

    try {
      const { Text } = await import("@blocksuite/store");

      const normalizeTitleText = (raw: string) => {
        // Keep behavior stable for "empty but has zero-width placeholders".
        return String(raw ?? "").replace(/[\s\u200B]+/g, "").trim();
      };

      const candidates: any[] = [];

      // Prefer root when available (DocTitle reads from `doc.root.props.title`).
      const rootModel = (store as any).root;
      if (rootModel?.props?.title) {
        candidates.push(rootModel);
      }

      // Fallback: explicit page models.
      const pages = (store as any).getModelsByFlavour?.("affine:page") as any[] | undefined;
      if (Array.isArray(pages)) {
        candidates.push(...pages);
      }

      const seen = new Set<string>();
      const uniqueCandidates = candidates.filter((m) => {
        const key = String(m?.id ?? "");
        if (!key)
          return true;
        if (seen.has(key))
          return false;
        seen.add(key);
        return true;
      });

      const shouldReset = uniqueCandidates.some((m) => {
        const titleObj = m?.props?.title;
        const currentTitle = typeof titleObj?.toString === "function" ? titleObj.toString() : String(titleObj ?? "");
        return Boolean(normalizeTitleText(currentTitle));
      });

      if (!shouldReset) {
        toast("内置标题已为空");
        return;
      }

      const doUpdate = () => {
        for (const m of uniqueCandidates) {
          try {
            (store as any).updateBlock?.(m, { title: new Text("") });
          }
          catch {
            // ignore
          }
        }
      };

      if (typeof (store as any).transact === "function") {
        (store as any).transact(doUpdate);
      }
      else {
        doUpdate();
      }

      // Best-effort: immediately remove any `<doc-title>` nodes if they exist.
      try {
        const nodes = document.querySelectorAll("[data-tc-blocksuite-root] doc-title");
        for (const n of Array.from(nodes)) {
          try {
            n.remove();
          }
          catch {
            // ignore
          }
        }
      }
      catch {
        // ignore
      }

      toast.success("已清空内置标题");
    }
    catch {
      // ignore
    }
  };

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
                            <div className="tc-blocksuite-tc-header-avatar" aria-label="更换头像">
                              {tcHeaderImageUrl
                                ? (
                                    <img
                                      src={tcHeaderImageUrl}
                                      alt={tcHeaderTitle || "header"}
                                      className="tc-blocksuite-tc-header-avatar-img"
                                    />
                                  )
                                : null}
                              <div className="tc-blocksuite-tc-header-avatar-overlay">
                                <span className="tc-blocksuite-tc-header-avatar-overlay-text">更换</span>
                              </div>
                            </div>
                          </ImgUploaderWithCopper>
                        )
                      : (
                          <div className="tc-blocksuite-tc-header-avatar tc-blocksuite-tc-header-avatar-readonly">
                            {tcHeaderImageUrl
                              ? (
                                  <img
                                    src={tcHeaderImageUrl}
                                    alt={tcHeaderTitle || "header"}
                                    className="tc-blocksuite-tc-header-avatar-img"
                                  />
                                )
                              : null}
                          </div>
                        )}

                    <input
                      className="tc-blocksuite-tc-header-title"
                      value={tcHeaderTitle}
                      disabled={!canEditTcHeader}
                      placeholder="Title"
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
                      {canEditTcHeader
                        ? (
                            <button
                              type="button"
                              className="tc-blocksuite-tc-header-btn tc-blocksuite-tc-header-btn-ghost"
                              title="清空 blocksuite 内置 doc-title（仅影响旧文档）"
                              onClick={() => void resetBuiltinDocTitle()}
                            >
                              重置内置标题
                            </button>
                          )
                        : null}
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
                      {allowModeSwitch
                        ? (
                            <button
                              type="button"
                              className="tc-blocksuite-tc-header-btn"
                              onClick={() => {
                                docModeProvider.togglePrimaryMode(docId);
                              }}
                            >
                              {currentMode === "page" ? "切换到画布" : "退出画布"}
                            </button>
                          )
                        : null}
                    </div>
                  </div>
                </div>
              </div>
            )
          : null}

        {allowModeSwitch && !tcHeaderEnabled
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
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    docModeProvider.togglePrimaryMode(docId);
                  }}
                >
                  {currentMode === "page" ? "切换到画布" : "退出画布"}
                </button>
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

function BlocksuiteDescriptionEditorIframeHost(props: BlocksuiteDescriptionEditorProps) {
  const {
    workspaceId,
    spaceId,
    docId,
    variant = "embedded",
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

  // 用 React 的 useId 保证 SSR/CSR 一致（即使未来开启 SSR 也不容易触发 hydration mismatch）。
  const instanceId = useId();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
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

  const clearMentionProfilePopoverOpenTimer = () => {
    const t = mentionProfilePopoverOpenTimerRef.current;
    if (t !== null) {
      mentionProfilePopoverOpenTimerRef.current = null;
      try {
        window.clearTimeout(t);
      }
      catch {
        // ignore
      }
    }
  };

  const clearMentionProfilePopoverCloseTimer = () => {
    const t = mentionProfilePopoverCloseTimerRef.current;
    if (t !== null) {
      mentionProfilePopoverCloseTimerRef.current = null;
      try {
        window.clearTimeout(t);
      }
      catch {
        // ignore
      }
    }
  };

  const scheduleMentionProfilePopoverClose = () => {
    clearMentionProfilePopoverCloseTimer();
    mentionProfilePopoverCloseTimerRef.current = window.setTimeout(() => {
      if (mentionProfilePopoverHoveredRef.current)
        return;
      setMentionProfilePopover(null);
    }, 160);
  };

  const scheduleMentionProfilePopoverOpen = (next: BlocksuiteMentionProfilePopoverState) => {
    clearMentionProfilePopoverOpenTimer();
    clearMentionProfilePopoverCloseTimer();
    mentionProfilePopoverOpenTimerRef.current = window.setTimeout(() => {
      mentionProfilePopoverOpenTimerRef.current = null;
      mentionProfilePopoverHoveredRef.current = false;
      setMentionProfilePopover(next);
    }, 240);
  };

  const onNavigateRef = useRef<BlocksuiteDescriptionEditorProps["onNavigate"]>(onNavigate);
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    mentionProfilePopoverStateRef.current = mentionProfilePopover;
  }, [mentionProfilePopover]);

  // 画布全屏状态由 frame 回传的 mode 驱动（宿主不再下发 set-mode）。
  const isEdgelessFullscreenActive = allowModeSwitch && fullscreenEdgeless && frameMode === "edgeless";

  // 父子窗口通信：mode 同步、导航委托、主题同步。
  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const expectedOrigin = window.location.origin;

    const onMessage = (e: MessageEvent) => {
      // Origin 校验：file:// 场景可能是 "null"，此时降级只做 source 校验 + instanceId 校验。
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
        // iframe 侧可能比 onLoad 更晚才真正 ready；此时再同步一次 mode/theme/height，确保体验稳定。
        try {
          postFrameParams();
          const win = iframeRef.current?.contentWindow;
          if (!win)
            return;
          win.postMessage(
            {
              tc: "tc-blocksuite-frame",
              instanceId,
              type: "theme",
              theme: getCurrentAppTheme(),
            },
            getPostMessageTargetOrigin(),
          );
          win.postMessage(
            { tc: "tc-blocksuite-frame", instanceId, type: "request-height" },
            getPostMessageTargetOrigin(),
          );
        }
        catch {
          // ignore
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
          // ignore
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
          // ignore
        }
        return;
      }

      if (data.type === "mention-hover" && (data.state === "enter" || data.state === "leave") && typeof data.userId === "string" && data.userId) {
        if (data.state === "enter") {
          const ar = data.anchorRect as any;
          const anchorRectOk = Boolean(ar)
            && typeof ar.left === "number"
            && typeof ar.top === "number"
            && typeof ar.right === "number"
            && typeof ar.bottom === "number"
            && typeof ar.width === "number"
            && typeof ar.height === "number";

          if (!anchorRectOk)
            return;

          try {
            scheduleMentionProfilePopoverOpen({ userId: data.userId, anchorRect: ar });
          }
          catch {
            // ignore
          }
          return;
        }

        if (data.state === "leave") {
          try {
            const current = mentionProfilePopoverStateRef.current;
            // 若还未真正打开（仅处于 delay 计时），直接取消。
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
            // ignore
          }
          return;
        }
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
          if (entityType && typeof entityId === "number" && entityId > 0) {
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
          // ignore
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

          // Host-side click debug:
          // If the mention picker is rendered outside iframe (portal), then iframe won't see click events.
          // Arm a short window after '@' to capture host pointer/click path summaries.
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
                console.debug("[BlocksuiteHostDebug]", "keydown Enter", { active: summarizeEl(active), probes });
              }
              catch {
                // ignore
              }
            }
          }

          if (isBlocksuiteDebugEnabled()) {
            if (payload && typeof payload === "object") {
              console.debug("[BlocksuiteFrameDebug]", source, message, payload);
            }
            else {
              console.debug("[BlocksuiteFrameDebug]", source, message);
            }
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
  }, [docId, forcedMode, instanceId, navigate, onModeChange, onTcHeaderChange]);

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
  }, [mentionProfilePopover]);

  // 宿主侧捕获 click/pointerdown：用于定位 mention 弹窗是否是 portal 到 iframe 外。
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
        console.debug("[BlocksuiteHostDebug]", type, {
          targetTag: toLower((e.target as any)?.tagName),
          nodes,
        });
      }
      catch {
        // ignore
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

  // 画布全屏：需要由宿主处理（iframe 内的 fixed 只能覆盖 iframe 自己）。
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

  // 主题同步：把站点主题（data-theme / dark class）推送到 iframe 的 html 上。
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
        // ignore
      }
    };

    postTheme();

    const root = document.documentElement;
    let mo: MutationObserver | null = null;
    try {
      mo = new MutationObserver(() => {
        postTheme();
      });
      mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
    }
    catch {
      mo = null;
    }

    return () => {
      try {
        mo?.disconnect?.();
      }
      catch {
        // ignore
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
    frozenTcHeaderImageUrl,
    frozenTcHeaderTitle,
    forcedMode,
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
    for (const [k, v] of Object.entries(frozenInitParams)) {
      if (v === undefined)
        continue;
      params.set(k, String(v));
    }
    return `/blocksuite-frame?${params.toString()}`;
  }, [frozenInitParams]);

  const hasExplicitHeightClass = useMemo(() => {
    const v = (className ?? "").trim();
    if (!v)
      return false;
    // Tailwind 高度相关：h-*, h-[...], min-h-*, max-h-*
    return /(?:^|\s)(?:h-\[|h-|min-h-|max-h-)/.test(v);
  }, [className]);

  const iframeHeightAttr = (!isEdgelessFullscreenActive && variant !== "full" && iframeHeight && iframeHeight > 0)
    ? iframeHeight
    : undefined;

  const shouldHideFrame = !hasFrameReadyOnce && !isFrameReady;

  // 关键：iframe 必须保持“同一个节点”，否则切换到画布全屏时会触发 remount -> iframe reload ->
  // blocksuite-frame 按 URL 的默认 mode 回到 page，并回传 mode，导致出现“白屏一下又回退”。
  // 这里通过始终渲染同一层 wrapper（非全屏时使用 `contents`）来避免 remount。
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
        // full variant 默认填充父容器；但如果外部已显式指定高度（例如 h-[60vh]），不要再追加 h-full 覆盖它。
        (variant === "full" && !hasExplicitHeightClass) ? "h-full" : "",
      ]
        .filter(Boolean)
        .join(" ");

  function postFrameParams() {
    try {
      const win = iframeRef.current?.contentWindow;
      if (!win)
        return;
      win.postMessage(
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
      // ignore
    }
  }

  const syncFrameBasics = () => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (!win)
        return;
      // 同步主题
      win.postMessage(
        {
          tc: "tc-blocksuite-frame",
          instanceId,
          type: "theme",
          theme: getCurrentAppTheme(),
        },
        getPostMessageTargetOrigin(),
      );

      // 请求一次高度（非全屏 embedded 需要）
      win.postMessage(
        { tc: "tc-blocksuite-frame", instanceId, type: "request-height" },
        getPostMessageTargetOrigin(),
      );
    }
    catch {
      // ignore
    }
  };

  useEffect(() => {
    postFrameParams();
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

  /* eslint-disable react-dom/no-unsafe-iframe-sandbox */

  // blocksuiteMentionProfilePopover是“@ 提及用户”的悬浮卡片，放在宿主页面外层，方便在 iframe 外显示（避免被 iframe 限制/裁剪），通过 postMessage 和 iframe 内的编辑器通信。
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
        ref={iframeRef} // 保存 iframe DOM 引用，用于 postMessage/读取 contentWindow
        src={src} // iframe 内加载的路由（/blocksuite-frame）及其初始化参数
        title="blocksuite-editor" // 无障碍标签，描述 iframe 内容
        className={iframeClassName} // 尺寸/布局/样式控制（含全屏/高度策略）
        allow="clipboard-read; clipboard-write; fullscreen" // 允许剪贴板读写与全屏权限
        allowFullScreen // 允许 iframe 内请求全屏（配合 allow）
        sandbox="allow-scripts allow-same-origin" // 沙盒限制，仅放开脚本执行与同源访问
        height={iframeHeightAttr} // 非全屏嵌入态下由子页面回传的高度
        style={{ backgroundColor: "transparent" }}
        onLoad={() => { // iframe 加载完成后同步参数/主题/高度
          postFrameParams();
          syncFrameBasics();
        }}
      />
    </div>
  );
  /* eslint-enable react-dom/no-unsafe-iframe-sandbox */
}

export default function BlocksuiteDescriptionEditor(props: BlocksuiteDescriptionEditorProps) {
  // 重要：不能用 `typeof window`/`window.top` 来做 SSR 分支，否则服务端与客户端首屏树不一致会触发 hydration mismatch（React #418）。
  // 这里用路由路径判断：
  // - /blocksuite-frame：iframe 内页面，渲染真实 editor
  // - 其他页面：顶层窗口，渲染 iframe host（隔离 blocksuite 的全局副作用）
  const location = useLocation();
  const isFrameRoute = location.pathname === "/blocksuite-frame";

  if (isFrameRoute) {
    return <BlocksuiteDescriptionEditorRuntime {...props} />;
  }
  return <BlocksuiteDescriptionEditorIframeHost {...props} />;
}
