import type { SetStateAction } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { DocTcHeaderPayload } from "@/components/chat/chatPage.types";
import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";

import { parseSpaceDocId } from "@/components/chat/infra/doc/space/spaceDocId";
import {
  isSpaceDocTitleSyncNonRetryableError,
  readPendingSpaceDocTitleSyncMap,
  removePendingSpaceDocTitleSync,
  upsertPendingSpaceDocTitleSync,
} from "@/components/chat/infra/doc/space/spaceDocMetaPersistence";

type UseSpaceDocMetaStateParams = {
  activeSpaceId?: number | null;
  canViewDocs: boolean;
  docMetasFromSidebarTree: MinimalDocMeta[];
};

export function spaceDocMetasQueryKey(spaceId: number) {
  return ["spaceDocMetas", spaceId] as const;
}

export function mergeSpaceDocMetas(
  ...sources: Array<MinimalDocMeta[] | null | undefined>
): MinimalDocMeta[] {
  const map = new Map<string, MinimalDocMeta>();

  for (const list of sources) {
    for (const meta of list ?? []) {
      const id = typeof meta?.id === "string" ? meta.id : "";
      if (!id || parseSpaceDocId(id)?.kind !== "independent")
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
      if (!existing.title && title)
        existing.title = title;
      if (!existing.imageUrl && imageUrl)
        existing.imageUrl = imageUrl;
      if (!existing.imageFileId && imageFileId)
        existing.imageFileId = imageFileId;
      if (!existing.originalImageFileId && originalImageFileId)
        existing.originalImageFileId = originalImageFileId;
      if (!existing.imageMediaType && imageMediaType)
        existing.imageMediaType = imageMediaType;
    }
  }

  return [...map.values()];
}

async function fetchSpaceDocMetas(spaceId: number): Promise<MinimalDocMeta[]> {
  const result = await tuanchat.spaceDocController.listDocs(spaceId);
  const docs = Array.isArray(result.data) ? result.data : [];
  return mergeSpaceDocMetas(docs.map((doc) => {
    const docId = Number(doc.docId ?? doc.roomId);
    const title = typeof doc.title === "string" && doc.title.trim() ? doc.title.trim() : undefined;
    return {
      id: Number.isFinite(docId) && docId > 0 ? String(docId) : "",
      ...(title ? { title } : {}),
    };
  }));
}

export default function useSpaceDocMetaState({
  activeSpaceId,
  canViewDocs,
  docMetasFromSidebarTree,
}: UseSpaceDocMetaStateParams) {
  const queryClient = useQueryClient();
  const normalizedSpaceId = typeof activeSpaceId === "number" && activeSpaceId > 0 ? activeSpaceId : -1;
  const queryKey = useMemo(() => spaceDocMetasQueryKey(normalizedSpaceId), [normalizedSpaceId]);
  const spaceDocQuery = useQuery({
    queryKey,
    queryFn: () => fetchSpaceDocMetas(normalizedSpaceId),
    enabled: normalizedSpaceId > 0 && canViewDocs,
    staleTime: 300_000,
  });
  const mergeDocMetas = mergeSpaceDocMetas;
  const spaceDocMetas = useMemo(() => {
    if (normalizedSpaceId <= 0)
      return null;
    if (!canViewDocs)
      return [];
    if (spaceDocQuery.data)
      return mergeSpaceDocMetas(spaceDocQuery.data, docMetasFromSidebarTree);
    if (spaceDocQuery.isError)
      return mergeSpaceDocMetas(docMetasFromSidebarTree);
    return null;
  }, [canViewDocs, docMetasFromSidebarTree, normalizedSpaceId, spaceDocQuery.data, spaceDocQuery.isError]);
  const setSpaceDocMetas = useCallback((action: SetStateAction<MinimalDocMeta[] | null>) => {
    if (normalizedSpaceId <= 0)
      return;
    queryClient.setQueryData<MinimalDocMeta[] | null>(queryKey, (current) => {
      const previous = current ?? mergeSpaceDocMetas(docMetasFromSidebarTree);
      return typeof action === "function" ? action(previous) : action;
    });
  }, [docMetasFromSidebarTree, normalizedSpaceId, queryClient, queryKey]);

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
  }, [setSpaceDocMetas, syncSpaceDocTitle]);

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
    if (normalizedSpaceId <= 0) {
      return [];
    }
    return queryClient.fetchQuery({
      queryKey,
      queryFn: () => fetchSpaceDocMetas(normalizedSpaceId),
      staleTime: 0,
    }).then(metas => metas ?? []);
  }, [normalizedSpaceId, queryClient, queryKey]);

  return {
    spaceDocMetas,
    setSpaceDocMetas,
    mergeDocMetas,
    loadSpaceDocMetas,
    handleDocTcHeaderChange,
  };
}
