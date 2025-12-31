import type { RefObject } from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { BlocksuiteEditorHandles, BlocksuiteEditorOptions, BlocksuiteEditorStatus } from "../types";

import { disposeBlocksuiteEditor, mountBlocksuiteEditor } from "../core/engine";

type UseBlocksuiteEditorResult = {
  hostRef: RefObject<HTMLDivElement | null>;
  status: BlocksuiteEditorStatus;
  error: Error | null;
  handlesRef: RefObject<BlocksuiteEditorHandles | null>;
  reload: () => void;
};

/**
 * 负责初始化 Blocksuite Workspace 与 EditorContainer，并与 DOM 挂载点解耦。
 */
export function useBlocksuiteEditor(options: BlocksuiteEditorOptions = {}): UseBlocksuiteEditorResult {
  const {
    docId = "doc:default",
    engine,
    autofocus,
    mode,
    disableEdgeless,
    onReady,
  } = options;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const handlesRef = useRef<BlocksuiteEditorHandles | null>(null);
  const [status, setStatus] = useState<BlocksuiteEditorStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const mountOptions = useMemo(
    () => ({ docId, engine, autofocus, mode, disableEdgeless }),
    [autofocus, disableEdgeless, docId, engine, mode],
  );

  const cleanup = useCallback(() => {
    const handles = handlesRef.current;
    if (handles) {
      disposeBlocksuiteEditor(handles);
    }
    handlesRef.current = null;
    const host = hostRef.current;
    if (host) {
      host.innerHTML = "";
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    async function bootstrap() {
      setStatus("loading");
      setError(null);

      try {
        const host = hostRef.current;
        if (!host) {
          throw new Error("Missing editor host element");
        }

        const handles = await mountBlocksuiteEditor(host, mountOptions);

        if (disposed) {
          disposeBlocksuiteEditor(handles);
          return;
        }

        handlesRef.current = handles;
        setStatus("ready");
        onReady?.(handles);
      }
      catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        if (!disposed) {
          console.error("Failed to initialise Blocksuite editor", errorObj);
          setError(errorObj);
          setStatus("error");
          cleanup();
        }
      }
    }

    bootstrap();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [cleanup, mountOptions, onReady, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken(prev => prev + 1);
    setStatus("idle");
  }, []);

  return useMemo(() => ({ hostRef, status, error, handlesRef, reload }), [error, reload, status]);
}
