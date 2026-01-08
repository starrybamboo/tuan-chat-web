import type { DocMode } from "@blocksuite/affine/model";
import type { DocModeProvider } from "@blocksuite/affine/shared/services";
import { base64ToUint8Array } from "@/components/chat/infra/blocksuite/base64";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { getRemoteSnapshot } from "@/components/chat/infra/blocksuite/descriptionDocRemote";
import { createEmbeddedAffineEditor } from "@/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor";
import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import { ensureDocMeta, getOrCreateDoc, getOrCreateWorkspace } from "@/components/chat/infra/blocksuite/spaceWorkspaceRegistry";
import { ensureBlocksuiteCoreElementsDefined } from "@/components/chat/infra/blocksuite/spec/coreElements";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Subscription } from "rxjs";

interface BlocksuiteDescriptionEditorProps {
  /** Blocksuite workspaceId，比如 `space:123` / `user:1` */
  workspaceId: string;
  /** 仅 space 场景使用：用于路由跳转 & mentions */
  spaceId?: number;
  docId: string;
  /** 默认嵌入式；`full` 用于全屏/DocRoute 场景 */
  variant?: "embedded" | "full";
  /** 外部强制模式（allowModeSwitch=false 时生效） */
  mode?: DocMode;
  /** 是否允许在 page/edgeless 间切换 */
  allowModeSwitch?: boolean;
  /** 画布模式下是否支持全屏 */
  fullscreenEdgeless?: boolean;
  /** 隐藏内置的“切换到画布/退出画布”按钮（用于把按钮放到外层 topbar） */
  hideModeSwitchButton?: boolean;
  /** 对外暴露 editor mode 的控制能力；卸载时会回传 null */
  onActionsChange?: (actions: BlocksuiteDescriptionEditorActions | null) => void;
  /** editor mode 变化回调（page/edgeless） */
  onModeChange?: (mode: DocMode) => void;
  className?: string;
}

export interface BlocksuiteDescriptionEditorActions {
  toggleMode: () => DocMode;
  setMode: (mode: DocMode) => void;
  getMode: () => DocMode;
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

export default function BlocksuiteDescriptionEditor(props: BlocksuiteDescriptionEditorProps) {
  const {
    workspaceId,
    spaceId,
    docId,
    className,
    variant = "embedded",
    allowModeSwitch = false,
    fullscreenEdgeless = false,
    mode: forcedMode = "page",
    hideModeSwitchButton = false,
    onActionsChange,
    onModeChange,
  } = props;

  const navigate = useNavigate();
  const isFull = variant === "full";

  const [currentMode, setCurrentMode] = useState<DocMode>(forcedMode);
  const currentModeRef = useRef<DocMode>(forcedMode);

  useEffect(() => {
    currentModeRef.current = currentMode;
    onModeChange?.(currentMode);
  }, [currentMode]);

  const hostContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const storeRef = useRef<any>(null);
  const prevModeRef = useRef<DocMode>(forcedMode);

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
        currentModeRef.current = next;
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

  const externalActions: BlocksuiteDescriptionEditorActions = useMemo(() => {
    return {
      toggleMode: () => {
        return docModeProvider.togglePrimaryMode(docId);
      },
      setMode: (mode: DocMode) => {
        docModeProvider.setPrimaryMode(mode, docId);
      },
      getMode: () => {
        return docModeProvider.getEditorMode() ?? forcedMode;
      },
    };
  }, [docId, docModeProvider, forcedMode]);

  useEffect(() => {
    onActionsChange?.(externalActions);
    return () => {
      onActionsChange?.(null);
    };
  }, [externalActions, onActionsChange]);

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

    // 主题跟随：把站点主题（data-theme / dark class）同步到 viewport。
    const syncPortalsTheme = (theme: "light" | "dark") => {
      // Slash menu / tooltip 等弹层通过 portal 挂到 body 下的 `.blocksuite-portal` 容器。
      // 如果只给 viewport 设置 data-theme，弹层会继承不到 `[data-theme=...]` 下的 affine 变量，导致“样式不对”。
      // 这里仅给 blocksuite 自己的 portal 容器打标，不改 body/html，避免影响站点（例如 daisyUI 的 data-theme）。
      const portals = document.querySelectorAll<HTMLElement>(".blocksuite-portal");
      for (const el of portals) {
        el.dataset.theme = theme;
      }
    };

    const syncTheme = () => {
      const theme = getCurrentAppTheme();
      container.dataset.theme = theme;
      syncPortalsTheme(theme);
    };
    syncTheme();

    const root = document.documentElement;
    const mo = new MutationObserver(() => syncTheme());
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });

    // 监听 portal 的创建（比如打开 slash menu 时才创建），确保后创建的 portal 也能拿到正确主题。
    const body = document.body;
    const portalMo = new MutationObserver((mutations) => {
      const theme = container.dataset.theme === "dark" ? "dark" : "light";

      for (const m of mutations) {
        for (const added of m.addedNodes) {
          if (!(added instanceof HTMLElement))
            continue;
          if (added.classList.contains("blocksuite-portal")) {
            added.dataset.theme = theme;
            continue;
          }
          const nested = added.querySelectorAll?.(".blocksuite-portal");
          if (!nested?.length)
            continue;
          for (const el of nested) {
            if (el instanceof HTMLElement)
              el.dataset.theme = theme;
          }
        }
      }
    });
    portalMo.observe(body, { childList: true, subtree: true });

    ensureBlocksuiteCoreElementsDefined();

    const workspace = getOrCreateWorkspace(workspaceId);
    const abort = new AbortController();
    let createdEditor: any = null;
    let createdStore: any = null;

    // Hydrate first (restore semantics), then render editor.
    // This avoids binding the UI to an empty initialized root.
    (async () => {
      await import("@/components/chat/infra/blocksuite/styles/blocksuiteRuntime.css");
      if (abort.signal.aborted)
        return;

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
      ensureDocMeta({ workspaceId, docId });
      const store = getOrCreateDoc({ workspaceId, docId });
      createdStore = store;

      if (typeof window !== "undefined" && import.meta.env.DEV) {
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

      const editor = createEmbeddedAffineEditor({
        store,
        workspace: workspace as any,
        docModeProvider,
        spaceId,
        autofocus: true,
        onNavigateToDoc: ({ spaceId, docId }) => {
          const parsed = parseSpaceDocId(docId);

          if (parsed?.kind === "room_description") {
            navigate(`/chat/${spaceId}/${parsed.roomId}/setting`);
            return;
          }

          if (parsed?.kind === "space_description") {
            navigate(`/chat/${spaceId}/setting`);
            return;
          }

          navigate(`/doc/${spaceId}/${encodeURIComponent(docId)}`);
        },
      });
      createdEditor = editor;

      (editor as any).style.display = "block";
      (editor as any).style.width = "100%";
      (editor as any).style.minHeight = "8rem";
      (editor as any).style.height = isFullInEffect ? "100%" : "auto";

      editorRef.current = editor as unknown as HTMLElement;
      storeRef.current = store;
      container.replaceChildren(editor as unknown as Node);

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
  }, [docId, docModeProvider, isFull, spaceId, workspaceId]);

  const isEdgelessFullscreen = allowModeSwitch && fullscreenEdgeless && currentMode === "edgeless";

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
      editor.style.height = isEdgelessFullscreen || isFull ? "100%" : "auto";
    }
    catch {
      // ignore
    }

    // If edgeless DOM exists but user can't see it, it's often a viewport transform/zoom issue.
    // On entering edgeless, try to fit/center once (best-effort; won't run on every render).
    const prev = prevModeRef.current;
    prevModeRef.current = currentMode;

    if (prev !== "edgeless" && currentMode === "edgeless") {
      const run = () => {
        const e = editorRef.current as any;
        const s = storeRef.current;
        if (!e || !s)
          return;
        tryFocusEdgelessViewport(e, s);
      };

      // Delay a bit to allow host/root/service to be ready.
      requestAnimationFrame(() => {
        setTimeout(run, 0);
        setTimeout(run, 120);
        setTimeout(run, 300);
      });
    }
  }, [currentMode, isEdgelessFullscreen, isFull]);

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

  const rootClassName = ["tc-blocksuite-scope", className, isEdgelessFullscreen ? "fixed inset-0 z-50 p-2 bg-base-100" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      <div
        className={`relative bg-base-100 border border-base-300 overflow-hidden${isEdgelessFullscreen ? " h-full" : " rounded-box"}${isFull || isEdgelessFullscreen ? " flex flex-col" : ""}`}
      >
        {allowModeSwitch
          ? (
              hideModeSwitchButton
                ? null
                : (
                    <div className="flex items-center justify-end p-2 border-b border-base-300">
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
            )
          : null}

        {allowModeSwitch && hideModeSwitchButton && currentMode === "edgeless"
          ? (
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    docModeProvider.setPrimaryMode("page", docId);
                  }}
                >
                  返回页面
                </button>
              </div>
            )
          : null}
        <div
          ref={hostContainerRef}
          className={`${isFull || isEdgelessFullscreen ? "flex-1 min-h-0" : "min-h-32"} w-full ${currentMode === "edgeless" ? "affine-edgeless-viewport" : "affine-page-viewport"}`}
        />
      </div>
    </div>
  );
}
