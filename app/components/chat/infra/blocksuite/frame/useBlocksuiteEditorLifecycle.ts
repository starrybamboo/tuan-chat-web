import type { DocMode } from "@blocksuite/affine/model";
import type { DocModeProvider } from "@blocksuite/affine/shared/services";
import type { RefObject } from "react";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";

import { isBlocksuiteDebugEnabled } from "@/components/chat/infra/blocksuite/debugFlags";
import { ensureBlocksuiteDocHeader, subscribeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import { finishBlocksuiteOpenSession, markBlocksuiteOpenSession } from "@/components/chat/infra/blocksuite/perf";
import { loadBlocksuiteRuntime } from "@/components/chat/infra/blocksuite/runtime/runtimeLoader.browser";
import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import {
  INITIAL_REMOTE_HYDRATION_WAIT_MS,
  LATE_REMOTE_HYDRATION_WAIT_MS,
  shouldDelayRenderReady,
  shouldEnsureTcHeaderFallback,
  warmDescriptionRemoteSnapshot,
  waitForRemoteHydrationSettled,
} from "./blocksuiteEditorLifecycleHydration";

function warnNonFatalBlocksuiteError(message: string, error: unknown) {
  console.warn(message, error);
}

type TcHeaderState = {
  docId: string;
  header: BlocksuiteDocHeader;
} | null;

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
  currentModeRef: RefObject<DocMode>;
  isFull: boolean;
  postToParent: (payload: any) => boolean;
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
    currentModeRef,
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
  const [tcHeaderState, setTcHeaderState] = useState<TcHeaderState>(null);
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

    void (async () => {
      const runtime = await loadBlocksuiteRuntime();
      runtimeRef.current = runtime;
      if (abort.signal.aborted)
        return;

      runtime.retainWorkspace(workspaceId);
      retainedRuntime = runtime;

      const workspace = runtime.getOrCreateWorkspace(workspaceId);
      docRuntimeRef.current = { workspace, docId };
      void warmDescriptionRemoteSnapshot(docId);

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

      const initialHydrationState = await waitForRemoteHydrationSettled({
        workspace: workspace as any,
        docId,
        signal: abort.signal,
        timeoutMs: INITIAL_REMOTE_HYDRATION_WAIT_MS,
      });
      if (abort.signal.aborted)
        return;

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
          unsubscribeHeader = subscribeBlocksuiteDocHeader(store, (header) => {
            applyHeaderState(header);
          });

          if (shouldEnsureTcHeaderFallback({
            tcHeaderEnabled,
            hydrationState: initialHydrationState,
          })) {
            applyHeaderState(ensureBlocksuiteDocHeader(store, {
              title: tcHeaderFallbackTitle,
              imageUrl: tcHeaderFallbackImageUrl,
            }));
          }
          else {
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
                  title: tcHeaderFallbackTitle,
                  imageUrl: tcHeaderFallbackImageUrl,
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
              tc: "tc-blocksuite-frame",
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

      (editor as any).style.display = "block";
      (editor as any).style.width = "100%";
      (editor as any).style.minHeight = "8rem";
      (editor as any).style.height = isFull ? "100%" : "auto";

      if (readOnlyRef.current) {
        (editor as any).readOnly = true;
        (editor as any).readonly = true;
        (editor as any).setAttribute?.("readonly", "true");
      }

      editorRef.current = editor as unknown as HTMLElement;
      storeRef.current = store;

      container.replaceChildren(editor as unknown as Node);

      const postRenderReady = () => {
        if (hasPostedRenderReady)
          return;
        hasPostedRenderReady = true;
        requestAnimationFrame(() => {
          if (abort.signal.aborted)
            return;
          markBlocksuiteOpenSession(instanceIdRef.current ?? "", "render-ready");
          finishBlocksuiteOpenSession(instanceIdRef.current ?? "");
          postToParent({ tc: "tc-blocksuite-frame", instanceId: instanceIdRef.current, type: "render-ready" });
        });
      };

      if (shouldDelayRenderReady(initialHydrationState)) {
        void waitForRemoteHydrationSettled({
          workspace: workspace as any,
          docId,
          signal: abort.signal,
          timeoutMs: LATE_REMOTE_HYDRATION_WAIT_MS,
        }).finally(() => {
          postRenderReady();
        });
      }
      else {
        postRenderReady();
      }

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

      try {
        (editor as any).switchEditor(currentModeRef.current);
      }
      catch (error) {
        warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to sync initial editor mode", error);
      }

      if (typeof window !== "undefined" && import.meta.env.DEV) {
        const g = globalThis as any;
        g.editor = editor;
        g.blocksuiteStore = store;
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
    currentModeRef,
    docId,
    docModeProvider,
    isFull,
    postToParent,
    readOnly,
    reloadEpoch,
    spaceId,
    tcHeaderEnabled,
    tcHeaderFallbackImageUrl,
    tcHeaderFallbackTitle,
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

  return {
    hostContainerRef,
    fullscreenRootRef,
    editorRef,
    storeRef,
    runtimeRef,
    tcHeaderState,
    setTcHeaderState,
    reloadEpoch,
    triggerReload,
  };
}
