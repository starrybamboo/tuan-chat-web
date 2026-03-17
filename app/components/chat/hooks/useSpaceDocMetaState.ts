import { useCallback, useEffect, useRef, useState } from "react";

import type { DocTcHeaderPayload } from "@/components/chat/chatPage.types";
import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";

import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import {
  isSpaceDocTitleSyncNonRetryableError,
  readPendingSpaceDocTitleSyncMap,
  readSpaceDocMetaCache,
  removePendingSpaceDocTitleSync,
  upsertPendingSpaceDocTitleSync,
  writeSpaceDocMetaCache,
} from "@/components/chat/infra/blocksuite/spaceDocMetaPersistence";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { tuanchat } from "api/instance";

type UseSpaceDocMetaStateParams = {
  activeSpaceId?: number | null;
  canViewDocs: boolean;
  docMetasFromSidebarTree: MinimalDocMeta[];
  isSidebarTreeReady?: boolean;
  onDocHeaderChange?: (payload: { docId: string; title: string; imageUrl: string }) => void;
};

type DocHeaderOverrideMap = Record<string, { title?: string; imageUrl?: string }>;

function applyDocHeaderOverrides(list: MinimalDocMeta[], headerOverrides: DocHeaderOverrideMap): MinimalDocMeta[] {
  return list.map((meta) => {
    const override = headerOverrides[meta.id];
    if (!override) {
      return meta;
    }

    const overrideTitle = typeof override.title === "string" ? override.title.trim() : "";
    const overrideImageUrl = typeof override.imageUrl === "string" ? override.imageUrl.trim() : "";
    const nextTitle = overrideTitle || meta.title;
    const nextImageUrl = overrideImageUrl || meta.imageUrl;
    if (nextTitle === meta.title && nextImageUrl === meta.imageUrl) {
      return meta;
    }

    return {
      id: meta.id,
      ...(nextTitle ? { title: nextTitle } : {}),
      ...(nextImageUrl ? { imageUrl: nextImageUrl } : {}),
    };
  });
}

function isSameDocMetaList(a: MinimalDocMeta[] | null, b: MinimalDocMeta[] | null): boolean {
  if (a === b)
    return true;
  if (!a || !b)
    return false;
  if (a.length !== b.length)
    return false;

  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (!left || !right)
      return false;
    if (left.id !== right.id)
      return false;
    if ((left.title ?? "") !== (right.title ?? ""))
      return false;
    if ((left.imageUrl ?? "") !== (right.imageUrl ?? ""))
      return false;
  }

  return true;
}

export default function useSpaceDocMetaState({
  activeSpaceId,
  canViewDocs,
  docMetasFromSidebarTree,
  isSidebarTreeReady = false,
  onDocHeaderChange,
}: UseSpaceDocMetaStateParams) {
  const [spaceDocMetas, setSpaceDocMetas] = useState<MinimalDocMeta[] | null>(null);

  const mergeDocMetas = useCallback((...sources: Array<MinimalDocMeta[] | null | undefined>): MinimalDocMeta[] => {
    const map = new Map<string, MinimalDocMeta>();

    for (const list of sources) {
      for (const meta of list ?? []) {
        const id = typeof meta?.id === "string" ? meta.id : "";
        if (!id)
          continue;
        if (parseSpaceDocId(id)?.kind !== "independent")
          continue;
        const title = typeof meta?.title === "string" && meta.title.trim().length > 0 ? meta.title : undefined;
        const imageUrl = typeof meta?.imageUrl === "string" && meta.imageUrl.trim().length > 0 ? meta.imageUrl : undefined;

        const existing = map.get(id);
        if (!existing) {
          map.set(id, { id, title, imageUrl });
          continue;
        }
        if (!existing.title && title) {
          existing.title = title;
        }
        if (!existing.imageUrl && imageUrl) {
          existing.imageUrl = imageUrl;
        }
      }
    }

    return [...map.values()];
  }, []);

  const buildLocalSpaceDocMetas = useCallback((headerOverrides?: DocHeaderOverrideMap): MinimalDocMeta[] | null => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      return null;
    }

    const resolvedHeaderOverrides = headerOverrides ?? useDocHeaderOverrideStore.getState().headers;
    const cachedDocMetas = readSpaceDocMetaCache(activeSpaceId);
    const sidebarDocIds = new Set(docMetasFromSidebarTree.map(meta => meta.id));
    const filteredCachedDocMetas = isSidebarTreeReady
      ? cachedDocMetas.filter(meta => sidebarDocIds.has(meta.id))
      : cachedDocMetas;
    const merged = isSidebarTreeReady
      ? mergeDocMetas(docMetasFromSidebarTree, filteredCachedDocMetas)
      : mergeDocMetas(filteredCachedDocMetas, docMetasFromSidebarTree);

    if (!isSidebarTreeReady && merged.length === 0) {
      return null;
    }

    return applyDocHeaderOverrides(merged, resolvedHeaderOverrides);
  }, [activeSpaceId, docMetasFromSidebarTree, isSidebarTreeReady, mergeDocMetas]);

  const spaceDocTitleSyncTimerRef = useRef<number | null>(null);
  const spaceDocTitleSyncPendingRef = useRef<{ docId: number; title: string } | null>(null);
  const spaceDocTitleSyncLastRef = useRef<{ docId: number; title: string } | null>(null);
  const spaceDocTitleSyncQueueFlushingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && spaceDocTitleSyncTimerRef.current != null) {
        window.clearTimeout(spaceDocTitleSyncTimerRef.current);
      }
    };
  }, []);

  const syncSpaceDocTitle = useCallback(async (pending: { docId: number; title: string }) => {
    const normalizedDocId = Number(pending.docId);
    const normalizedTitle = String(pending.title ?? "").trim();
    if (!Number.isFinite(normalizedDocId) || normalizedDocId <= 0 || !normalizedTitle) {
      return;
    }
    const last = spaceDocTitleSyncLastRef.current;
    if (last && last.docId === normalizedDocId && last.title === normalizedTitle) {
      removePendingSpaceDocTitleSync(normalizedDocId);
      return;
    }

    try {
      await tuanchat.spaceDocController.renameDoc2({
        docId: normalizedDocId,
        title: normalizedTitle,
      });
      spaceDocTitleSyncLastRef.current = { docId: normalizedDocId, title: normalizedTitle };
      removePendingSpaceDocTitleSync(normalizedDocId);
    }
    catch (error) {
      if (isSpaceDocTitleSyncNonRetryableError(error)) {
        removePendingSpaceDocTitleSync(normalizedDocId);
        return;
      }
      upsertPendingSpaceDocTitleSync({
        docId: normalizedDocId,
        title: normalizedTitle,
      });
    }
  }, []);

  const flushPendingSpaceDocTitleSyncQueue = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    if (spaceDocTitleSyncQueueFlushingRef.current) {
      return;
    }
    if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
      return;
    }

    const map = readPendingSpaceDocTitleSyncMap();
    const queue = Object.values(map).sort((a, b) => (a.updatedAt - b.updatedAt));
    if (queue.length === 0) {
      return;
    }

    spaceDocTitleSyncQueueFlushingRef.current = true;
    try {
      for (const item of queue) {
        await syncSpaceDocTitle({
          docId: item.docId,
          title: item.title,
        });
      }
    }
    finally {
      spaceDocTitleSyncQueueFlushingRef.current = false;
    }
  }, [syncSpaceDocTitle]);

  const handleDocTcHeaderChange = useCallback((payload: DocTcHeaderPayload) => {
    const docId = typeof payload?.docId === "string" ? payload.docId : "";
    if (!docId)
      return;

    const title = String(payload?.header?.title ?? "").trim();
    const imageUrl = String(payload?.header?.imageUrl ?? "").trim();
    useDocHeaderOverrideStore.getState().setHeader({ docId, header: { title, imageUrl } });
    onDocHeaderChange?.({ docId, title, imageUrl });

    setSpaceDocMetas((prev) => {
      if (!Array.isArray(prev) || prev.length === 0)
        return prev;

      const idx = prev.findIndex(m => m?.id === docId);
      if (idx < 0)
        return prev;

      const currentTitle = typeof prev[idx]?.title === "string" ? prev[idx]!.title!.trim() : "";
      const currentImageUrl = typeof prev[idx]?.imageUrl === "string" ? prev[idx]!.imageUrl!.trim() : "";
      if (currentTitle === title && currentImageUrl === imageUrl)
        return prev;

      const next = [...prev];
      next[idx] = {
        id: next[idx]!.id,
        ...(title ? { title } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      };
      return next;
    });

    if (!title)
      return;

    if (typeof window !== "undefined") {
      try {
        void (async () => {
          const { parseDescriptionDocId } = await import("@/components/chat/infra/blocksuite/descriptionDocId");
          const key = parseDescriptionDocId(docId);
          if (!key || key.entityType !== "space_doc")
            return;

          spaceDocTitleSyncPendingRef.current = { docId: key.entityId, title };
          if (spaceDocTitleSyncTimerRef.current != null) {
            window.clearTimeout(spaceDocTitleSyncTimerRef.current);
          }
          spaceDocTitleSyncTimerRef.current = window.setTimeout(() => {
            const pending = spaceDocTitleSyncPendingRef.current;
            if (!pending)
              return;
            const last = spaceDocTitleSyncLastRef.current;
            if (last && last.docId === pending.docId && last.title === pending.title)
              return;
            void syncSpaceDocTitle({
              docId: pending.docId,
              title: pending.title,
            });
          }, 800);
        })();
      }
      catch {
        // ignore
      }
    }
  }, [onDocHeaderChange, syncSpaceDocTitle]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    void flushPendingSpaceDocTitleSyncQueue();
    const onOnline = () => {
      void flushPendingSpaceDocTitleSyncQueue();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void flushPendingSpaceDocTitleSyncQueue();
      }
    };
    const timer = window.setInterval(() => {
      void flushPendingSpaceDocTitleSyncQueue();
    }, 15000);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [flushPendingSpaceDocTitleSyncQueue]);

  const loadSpaceDocMetas = useCallback(async (): Promise<MinimalDocMeta[]> => {
    if (typeof window === "undefined")
      return [];
    if (!activeSpaceId || activeSpaceId <= 0)
      return [];

    try {
      const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
      const ws = registry.getOrCreateSpaceWorkspace(activeSpaceId) as any;
      const metas = (ws?.meta?.docMetas ?? []) as any[];
      const headerOverrides = useDocHeaderOverrideStore.getState().headers;
      const list = metas
        .filter((m) => {
          const id = typeof m?.id === "string" ? m.id : "";
          return id.length > 0 && parseSpaceDocId(id)?.kind === "independent";
        })
        .map((m) => {
          const id = String(m.id);
          const title = typeof m?.title === "string" ? m.title : undefined;
          return { id, title } satisfies MinimalDocMeta;
        });
      return applyDocHeaderOverrides(list, headerOverrides);
    }
    catch {
      return [];
    }
  }, [activeSpaceId]);

  useEffect(() => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      setSpaceDocMetas(null);
      return;
    }
    if (!canViewDocs) {
      setSpaceDocMetas([]);
      return;
    }

    const nextMetas = buildLocalSpaceDocMetas();
    if (nextMetas == null) {
      setSpaceDocMetas(prev => (prev === null ? prev : null));
      return;
    }

    setSpaceDocMetas(prev => (isSameDocMetaList(prev, nextMetas) ? prev : nextMetas));
  }, [activeSpaceId, buildLocalSpaceDocMetas, canViewDocs]);

  useEffect(() => {
    if (!activeSpaceId || activeSpaceId <= 0 || !canViewDocs) {
      return;
    }

    return useDocHeaderOverrideStore.subscribe((state, prevState) => {
      if (state.headers === prevState.headers) {
        return;
      }

      const nextMetas = buildLocalSpaceDocMetas(state.headers);
      if (nextMetas == null) {
        setSpaceDocMetas(prev => (prev === null ? prev : null));
        return;
      }
      setSpaceDocMetas(prev => (isSameDocMetaList(prev, nextMetas) ? prev : nextMetas));
    });
  }, [activeSpaceId, buildLocalSpaceDocMetas, canViewDocs]);

  useEffect(() => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      return;
    }
    if (!canViewDocs) {
      return;
    }
    if (!Array.isArray(spaceDocMetas)) {
      return;
    }
    writeSpaceDocMetaCache(activeSpaceId, spaceDocMetas);
  }, [activeSpaceId, canViewDocs, spaceDocMetas]);

  return {
    spaceDocMetas,
    setSpaceDocMetas,
    mergeDocMetas,
    loadSpaceDocMetas,
    handleDocTcHeaderChange,
  };
}
