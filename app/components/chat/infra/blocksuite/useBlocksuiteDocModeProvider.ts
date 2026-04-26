import type { DocMode } from "@blocksuite/affine/model";
import type { DocModeProvider } from "@blocksuite/affine/shared/services";
import type { Dispatch, RefObject, SetStateAction } from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import { Subscription } from "rxjs";

function warnNonFatalBlocksuiteError(message: string, error: unknown) {
  console.warn(message, error);
}

type UseBlocksuiteDocModeProviderParams = {
  workspaceId: string;
  docId: string;
  allowModeSwitch: boolean;
  forcedMode: DocMode;
  onModeChange?: (mode: DocMode) => void;
};

type UseBlocksuiteDocModeProviderResult = {
  currentMode: DocMode;
  setCurrentMode: Dispatch<SetStateAction<DocMode>>;
  currentModeRef: RefObject<DocMode>;
  docModeProvider: DocModeProvider;
};

export function useBlocksuiteDocModeProvider(
  params: UseBlocksuiteDocModeProviderParams,
): UseBlocksuiteDocModeProviderResult {
  const {
    workspaceId,
    docId,
    allowModeSwitch,
    forcedMode,
    onModeChange,
  } = params;

  const [currentMode, setCurrentMode] = useState<DocMode>(forcedMode);
  const currentModeRef = useRef<DocMode>(forcedMode);

  useEffect(() => {
    currentModeRef.current = currentMode;
    onModeChange?.(currentMode);
  }, [currentMode, onModeChange]);

  const docModeProvider: DocModeProvider = useMemo(() => {
    const storageKey = `tc:blocksuite:${workspaceId}:primaryModeByDocId`;
    const primaryModeByDocId = new Map<string, DocMode>();
    const listenersByDocId = new Map<string, Set<(m: DocMode) => void>>();

    const isValidMode = (v: unknown): v is DocMode => v === "page" || v === "edgeless";

    const updateCurrentMode = (mode: DocMode) => {
      currentModeRef.current = mode;
      setCurrentMode(prev => prev === mode ? prev : mode);
    };

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
      catch (error) {
        warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to load primary mode from storage", error);
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
      catch (error) {
        warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to persist primary mode to storage", error);
      }
    };

    loadFromStorage();

    const emit = (id: string, mode: DocMode) => {
      const listeners = listenersByDocId.get(id);
      if (!listeners)
        return;
      for (const fn of listeners)
        fn(mode);
    };

    return {
      setEditorMode: (mode: DocMode) => {
        updateCurrentMode(mode);
      },
      getEditorMode: () => {
        return currentModeRef.current;
      },
      setPrimaryMode: (mode: DocMode, id: string) => {
        primaryModeByDocId.set(id, mode);
        flushToStorage();
        emit(id, mode);
        updateCurrentMode(mode);
      },
      getPrimaryMode: (id: string) => {
        return primaryModeByDocId.get(id) ?? forcedMode;
      },
      togglePrimaryMode: (id: string) => {
        const next = (primaryModeByDocId.get(id) ?? forcedMode) === "page" ? "edgeless" : "page";
        primaryModeByDocId.set(id, next);
        flushToStorage();
        emit(id, next);
        updateCurrentMode(next);
        return next;
      },
      onPrimaryModeChange: (handler: (mode: DocMode) => void, id: string) => {
        let listeners = listenersByDocId.get(id);
        if (!listeners) {
          listeners = new Set();
          listenersByDocId.set(id, listeners);
        }
        listeners.add(handler);

        const subscription = new Subscription();
        subscription.add(() => {
          listenersByDocId.get(id)?.delete(handler);
        });
        return subscription;
      },
    };
  }, [allowModeSwitch, forcedMode, workspaceId]);

  useEffect(() => {
    if (allowModeSwitch) {
      const initial = docModeProvider.getPrimaryMode(docId);
      currentModeRef.current = initial;
      queueMicrotask(() => setCurrentMode(prev => prev === initial ? prev : initial));
      return;
    }

    docModeProvider.setPrimaryMode(forcedMode, docId);
  }, [allowModeSwitch, docId, docModeProvider, forcedMode]);

  return {
    currentMode,
    setCurrentMode,
    currentModeRef,
    docModeProvider,
  };
}
