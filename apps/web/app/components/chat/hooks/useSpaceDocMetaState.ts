import { useCallback, useEffect, useRef, useState } from "react";

import type { DocTcHeaderPayload } from "@/components/chat/chatPage.types";
import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";

import { parseSpaceDocId } from "@/components/chat/infra/doc/space/spaceDocId";
import {
  isSpaceDocTitleSyncNonRetryableError,
  readPendingSpaceDocTitleSyncMap,
  removePendingSpaceDocTitleSync,
  upsertPendingSpaceDocTitleSync,
} from "@/components/chat/infra/doc/space/spaceDocMetaPersistence";
import { tuanchat } from "api/instance";

type UseSpaceDocMetaStateParams = {
  activeSpaceId?: number | null;
  canViewDocs: boolean;
  docMetasFromSidebarTree: MinimalDocMeta[];
};

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
    if ((left.imageFileId ?? 0) !== (right.imageFileId ?? 0))
      return false;
    if ((left.originalImageFileId ?? 0) !== (right.originalImageFileId ?? 0))
      return false;
    if ((left.imageMediaType ?? "") !== (right.imageMediaType ?? ""))
      return false;
  }

  return true;
}

export default function useSpaceDocMetaState({
  activeSpaceId,
  canViewDocs,
  docMetasFromSidebarTree,
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
        const imageFileId = typeof meta?.imageFileId === "number" && meta.imageFileId > 0 ? meta.imageFileId : undefined;
        const originalImageFileId = typeof meta?.originalImageFileId === "number" && meta.originalImageFileId > 0 ? meta.originalImageFileId : undefined;
        const imageMediaType = typeof meta?.imageMediaType === "string" && meta.imageMediaType.trim().length > 0 ? meta.imageMediaType : undefined;

        const existing = map.get(id);
        if (!existing) {
          map.set(id, { id, title, imageUrl, imageFileId, originalImageFileId, imageMediaType });
          continue;
        }
        if (!existing.title && title) {
          existing.title = title;
        }
        if (!existing.imageUrl && imageUrl) {
          existing.imageUrl = imageUrl;
        }
        if (!existing.imageFileId && imageFileId) {
          existing.imageFileId = imageFileId;
        }
        if (!existing.originalImageFileId && originalImageFileId) {
          existing.originalImageFileId = originalImageFileId;
        }
        if (!existing.imageMediaType && imageMediaType) {
          existing.imageMediaType = imageMediaType;
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
      await tuanchat.spaceDocController.renameDoc({
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
    const imageFileId = typeof payload?.header?.imageFileId === "number" && payload.header.imageFileId > 0
      ? payload.header.imageFileId
      : undefined;
    const originalImageFileId = typeof payload?.header?.originalImageFileId === "number" && payload.header.originalImageFileId > 0
      ? payload.header.originalImageFileId
      : undefined;
    const imageMediaType = String(payload?.header?.imageMediaType ?? "").trim();
    setSpaceDocMetas((prev) => {
      if (!Array.isArray(prev) || prev.length === 0)
        return prev;

      const idx = prev.findIndex(m => m?.id === docId);
      if (idx < 0)
        return prev;

      const currentTitle = typeof prev[idx]?.title === "string" ? prev[idx]!.title!.trim() : "";
      const currentImageUrl = typeof prev[idx]?.imageUrl === "string" ? prev[idx]!.imageUrl!.trim() : "";
      const currentImageFileId = prev[idx]?.imageFileId;
      const currentOriginalImageFileId = prev[idx]?.originalImageFileId;
      const currentImageMediaType = typeof prev[idx]?.imageMediaType === "string" ? prev[idx]!.imageMediaType!.trim() : "";
      if (currentTitle === title
        && currentImageUrl === imageUrl
        && currentImageFileId === imageFileId
        && currentOriginalImageFileId === originalImageFileId
        && currentImageMediaType === imageMediaType) {
        return prev;
      }

      const next = [...prev];
      next[idx] = {
        id: next[idx]!.id,
        ...(title ? { title } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(imageFileId ? { imageFileId } : {}),
        ...(originalImageFileId ? { originalImageFileId } : {}),
        ...(imageMediaType ? { imageMediaType } : {}),
      };
      return next;
    });

    if (!title)
      return;

    if (typeof window !== "undefined") {
      try {
        const parsed = parseSpaceDocId(docId);
        if (parsed?.kind !== "independent")
          return;

        spaceDocTitleSyncPendingRef.current = { docId: parsed.docId, title };
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
      }
      catch {
        // ignore
      }
    }
  }, [syncSpaceDocTitle]);

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
    if (!activeSpaceId || activeSpaceId <= 0) {
      return [];
    }

    const result = await tuanchat.spaceDocController.listDocs(activeSpaceId);
    const docs = Array.isArray(result.data) ? result.data : [];
    return mergeDocMetas(docs.map((doc) => {
      const docId = Number(doc.docId ?? doc.roomId);
      const title = typeof doc.title === "string" && doc.title.trim() ? doc.title.trim() : undefined;
      return {
        id: Number.isFinite(docId) && docId > 0 ? String(docId) : "",
        ...(title ? { title } : {}),
      };
    }));
  }, [activeSpaceId, mergeDocMetas]);

  useEffect(() => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      setSpaceDocMetas(null);
      return;
    }
    if (!canViewDocs) {
      setSpaceDocMetas([]);
      return;
    }

    let cancelled = false;
    setSpaceDocMetas(prev => (prev === null ? prev : null));
    void loadSpaceDocMetas()
      .then((remoteMetas) => {
        if (cancelled) {
          return;
        }
        const nextMetas = mergeDocMetas(remoteMetas, docMetasFromSidebarTree);
        setSpaceDocMetas(prev => (isSameDocMetaList(prev, nextMetas) ? prev : nextMetas));
      })
      .catch((error) => {
        console.warn("[space-doc] failed to load remote doc metas", error);
        if (cancelled) {
          return;
        }
        const nextMetas = mergeDocMetas(docMetasFromSidebarTree);
        setSpaceDocMetas(prev => (isSameDocMetaList(prev, nextMetas) ? prev : nextMetas));
      });

    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, canViewDocs, docMetasFromSidebarTree, loadSpaceDocMetas, mergeDocMetas]);

  return {
    spaceDocMetas,
    setSpaceDocMetas,
    mergeDocMetas,
    loadSpaceDocMetas,
    handleDocTcHeaderChange,
  };
}
