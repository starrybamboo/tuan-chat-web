import { useCallback, useEffect, useRef, useState } from "react";

import type { DocTcHeaderPayload } from "@/components/chat/chatPage.types";
import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";

import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { tuanchat } from "api/instance";

type UseSpaceDocMetaStateParams = {
  activeSpaceId?: number | null;
  isKPInSpace: boolean;
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
  }

  return true;
}

export default function useSpaceDocMetaState({
  activeSpaceId,
  isKPInSpace,
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

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && spaceDocTitleSyncTimerRef.current != null) {
        window.clearTimeout(spaceDocTitleSyncTimerRef.current);
      }
    };
  }, []);

  const handleDocTcHeaderChange = useCallback((payload: DocTcHeaderPayload) => {
    const docId = typeof payload?.docId === "string" ? payload.docId : "";
    if (!docId)
      return;

    const title = String(payload?.header?.title ?? "").trim();
    const imageUrl = String(payload?.header?.imageUrl ?? "").trim();
    useDocHeaderOverrideStore.getState().setHeader({ docId, header: { title, imageUrl } });

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

            void tuanchat.spaceDocController.renameDoc2({
              docId: pending.docId,
              title: pending.title,
            }).then(() => {
              spaceDocTitleSyncLastRef.current = pending;
            }).catch(() => {
              // ignore
            });
          }, 800);
        })();
      }
      catch {
        // ignore
      }
    }
  }, []);

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
    if (!isKPInSpace) {
      setSpaceDocMetas([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const fromWorkspace = await loadSpaceDocMetas();
      const merged = mergeDocMetas(fromWorkspace, docMetasFromSidebarTree);
      if (cancelled)
        return;
      setSpaceDocMetas(prev => (isSameDocMetaList(prev, merged) ? prev : merged));

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
  }, [activeSpaceId, docMetasFromSidebarTree, isKPInSpace, loadSpaceDocMetas, mergeDocMetas]);

  return {
    spaceDocMetas,
    setSpaceDocMetas,
    mergeDocMetas,
    loadSpaceDocMetas,
    handleDocTcHeaderChange,
  };
}
