import { useCallback, useEffect, useRef, useState } from "react";

import type { DocTcHeaderPayload } from "@/components/chat/chatPage.types";
import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";

import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { tuanchat } from "api/instance";

type UseSpaceDocMetaStateParams = {
  activeSpaceId?: number | null;
  canViewDocs: boolean;
  docMetasFromSidebarTree: MinimalDocMeta[];
  isSidebarTreeReady?: boolean;
  onDocHeaderChange?: (payload: { docId: string; title: string; imageUrl: string }) => void;
};

const SPACE_DOC_META_CACHE_KEY_PREFIX = "tc:space-doc-metas:v1:";
const SPACE_DOC_TITLE_SYNC_QUEUE_KEY = "tc:space-doc-title-sync-queue:v1";

type PendingSpaceDocTitleSync = {
  docId: number;
  title: string;
  updatedAt: number;
};

type PendingSpaceDocTitleSyncMap = Record<string, PendingSpaceDocTitleSync>;

function buildSpaceDocMetaCacheKey(spaceId: number): string {
  return `${SPACE_DOC_META_CACHE_KEY_PREFIX}${spaceId}`;
}

function sanitizeDocMetaList(input: unknown): MinimalDocMeta[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const map = new Map<string, MinimalDocMeta>();
  for (const item of input) {
    const id = typeof (item as any)?.id === "string" ? (item as any).id.trim() : "";
    if (!id) {
      continue;
    }
    const title = typeof (item as any)?.title === "string" ? (item as any).title.trim() : "";
    const imageUrl = typeof (item as any)?.imageUrl === "string" ? (item as any).imageUrl.trim() : "";
    const existing = map.get(id);
    if (!existing) {
      map.set(id, {
        id,
        ...(title ? { title } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      });
      continue;
    }
    if (!existing.title && title) {
      existing.title = title;
    }
    if (!existing.imageUrl && imageUrl) {
      existing.imageUrl = imageUrl;
    }
  }
  return [...map.values()];
}

function readSpaceDocMetaCache(spaceId: number): MinimalDocMeta[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(buildSpaceDocMetaCacheKey(spaceId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return sanitizeDocMetaList(parsed);
  }
  catch {
    return [];
  }
}

function writeSpaceDocMetaCache(spaceId: number, list: MinimalDocMeta[] | null | undefined): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      buildSpaceDocMetaCacheKey(spaceId),
      JSON.stringify(sanitizeDocMetaList(list)),
    );
  }
  catch {
    // ignore
  }
}

function readPendingSpaceDocTitleSyncMap(): PendingSpaceDocTitleSyncMap {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(SPACE_DOC_TITLE_SYNC_QUEUE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const map: PendingSpaceDocTitleSyncMap = {};
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") {
        continue;
      }
      const docId = Number((value as any).docId);
      const title = String((value as any).title ?? "").trim();
      const updatedAt = Number((value as any).updatedAt);
      if (!Number.isFinite(docId) || docId <= 0 || !title) {
        continue;
      }
      map[String(docId)] = {
        docId,
        title,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
      };
    }
    return map;
  }
  catch {
    return {};
  }
}

function writePendingSpaceDocTitleSyncMap(map: PendingSpaceDocTitleSyncMap): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SPACE_DOC_TITLE_SYNC_QUEUE_KEY, JSON.stringify(map));
  }
  catch {
    // ignore
  }
}

function upsertPendingSpaceDocTitleSync(item: { docId: number; title: string }): void {
  if (typeof window === "undefined") {
    return;
  }
  const docId = Number(item.docId);
  const title = String(item.title ?? "").trim();
  if (!Number.isFinite(docId) || docId <= 0 || !title) {
    return;
  }
  const map = readPendingSpaceDocTitleSyncMap();
  map[String(docId)] = {
    docId,
    title,
    updatedAt: Date.now(),
  };
  writePendingSpaceDocTitleSyncMap(map);
}

function removePendingSpaceDocTitleSync(docId: number): void {
  if (typeof window === "undefined") {
    return;
  }
  const normalizedDocId = Number(docId);
  if (!Number.isFinite(normalizedDocId) || normalizedDocId <= 0) {
    return;
  }
  const map = readPendingSpaceDocTitleSyncMap();
  if (!map[String(normalizedDocId)]) {
    return;
  }
  delete map[String(normalizedDocId)];
  writePendingSpaceDocTitleSyncMap(map);
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
    catch {
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

    if (!title)
      return;

    setSpaceDocMetas((prev) => {
      if (!Array.isArray(prev) || prev.length === 0)
        return prev;

      const idx = prev.findIndex(m => m?.id === docId);
      if (idx < 0)
        return prev;

      const currentTitle = typeof prev[idx]?.title === "string" ? prev[idx]!.title!.trim() : "";
      if (currentTitle === title)
        return prev;

      const next = [...prev];
      next[idx] = { ...next[idx], title };
      return next;
    });

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
        .filter(m => typeof m?.id === "string" && m.id.length > 0)
        .map((m) => {
          const id = String(m.id);
          const title = typeof m?.title === "string" ? m.title : undefined;
          const imageUrl = typeof headerOverrides?.[id]?.imageUrl === "string" ? headerOverrides[id]!.imageUrl : undefined;
          return { id, title, imageUrl } satisfies MinimalDocMeta;
        });
      return list;
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

    const cachedDocMetas = readSpaceDocMetaCache(activeSpaceId);
    if (cachedDocMetas.length > 0) {
      const optimistic = mergeDocMetas(cachedDocMetas, docMetasFromSidebarTree);
      setSpaceDocMetas(prev => (isSameDocMetaList(prev, optimistic) ? prev : optimistic));
    }

    let cancelled = false;
    (async () => {
      const fromWorkspace = await loadSpaceDocMetas();
      const merged = mergeDocMetas(fromWorkspace, docMetasFromSidebarTree, cachedDocMetas);
      if (cancelled)
        return;
      const shouldKeepOptimisticCache = !isSidebarTreeReady && merged.length === 0 && cachedDocMetas.length > 0;
      const nextMetas = shouldKeepOptimisticCache
        ? mergeDocMetas(cachedDocMetas, docMetasFromSidebarTree)
        : merged;
      setSpaceDocMetas(prev => (isSameDocMetaList(prev, nextMetas) ? prev : nextMetas));

      try {
        const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
        for (const m of docMetasFromSidebarTree) {
          if (typeof m?.id !== "string" || !m.id)
            continue;
          registry.ensureSpaceDocMeta({ spaceId: activeSpaceId, docId: m.id, title: m.title });
        }
      }
      catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, canViewDocs, docMetasFromSidebarTree, isSidebarTreeReady, loadSpaceDocMetas, mergeDocMetas]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!activeSpaceId || activeSpaceId <= 0 || !canViewDocs) {
      return;
    }

    let cancelled = false;
    let refreshTimer: number | null = null;
    const unsubscribers: Array<() => void> = [];

    const refreshDocMetas = async () => {
      const fromWorkspace = await loadSpaceDocMetas();
      if (cancelled) {
        return;
      }
      const merged = mergeDocMetas(
        fromWorkspace,
        docMetasFromSidebarTree,
        readSpaceDocMetaCache(activeSpaceId),
      );
      setSpaceDocMetas(prev => (isSameDocMetaList(prev, merged) ? prev : merged));
    };

    const scheduleRefresh = () => {
      if (cancelled) {
        return;
      }
      if (refreshTimer != null) {
        return;
      }
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshDocMetas();
      }, 120);
    };

    void (async () => {
      try {
        const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
        if (cancelled) {
          return;
        }
        const ws = registry.getOrCreateSpaceWorkspace(activeSpaceId) as any;
        const metaSub = ws?.meta?.docMetaUpdated?.subscribe?.(() => {
          scheduleRefresh();
        });
        if (metaSub && typeof metaSub.unsubscribe === "function") {
          unsubscribers.push(() => metaSub.unsubscribe());
        }

        const docListSub = ws?.slots?.docListUpdated?.subscribe?.(() => {
          scheduleRefresh();
        });
        if (docListSub && typeof docListSub.unsubscribe === "function") {
          unsubscribers.push(() => docListSub.unsubscribe());
        }
      }
      catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
      if (refreshTimer != null) {
        window.clearTimeout(refreshTimer);
      }
      for (const unsubscribe of unsubscribers) {
        try {
          unsubscribe();
        }
        catch {
          // ignore
        }
      }
    };
  }, [activeSpaceId, canViewDocs, docMetasFromSidebarTree, loadSpaceDocMetas, mergeDocMetas]);

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
