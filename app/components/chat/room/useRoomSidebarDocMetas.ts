import { useCallback, useEffect, useMemo, useState } from "react";

import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";

import type { MinimalDocMeta } from "./sidebarTree";

type UseRoomSidebarDocMetasParams = {
  activeSpaceId: number | null;
  isSpaceOwner: boolean;
  docMetas?: MinimalDocMeta[];
};

type UseRoomSidebarDocMetasResult = {
  visibleDocMetas: MinimalDocMeta[];
  docMetaMap: Map<string, MinimalDocMeta>;
  appendExtraDocMeta: (meta: MinimalDocMeta) => void;
};

export default function useRoomSidebarDocMetas({
  activeSpaceId,
  isSpaceOwner,
  docMetas,
}: UseRoomSidebarDocMetasParams): UseRoomSidebarDocMetasResult {
  const [extraDocMetas, setExtraDocMetas] = useState<MinimalDocMeta[]>([]);

  useEffect(() => {
    setExtraDocMetas([]);
  }, [activeSpaceId]);

  const visibleDocMetas = useMemo(() => {
    if (!isSpaceOwner) {
      return [] as MinimalDocMeta[];
    }

    const merged = new Map<string, MinimalDocMeta>();
    for (const m of [...(docMetas ?? []), ...(extraDocMetas ?? [])]) {
      const id = typeof m?.id === "string" ? m.id : "";
      if (!id) {
        continue;
      }
      const parsed = parseSpaceDocId(id);
      if (parsed?.kind !== "independent") {
        continue;
      }

      const title = typeof m?.title === "string" && m.title.trim().length > 0 ? m.title : undefined;
      const imageUrl = typeof m?.imageUrl === "string" && m.imageUrl.trim().length > 0 ? m.imageUrl : undefined;

      const existing = merged.get(id);
      if (!existing) {
        merged.set(id, { id, ...(title ? { title } : {}), ...(imageUrl ? { imageUrl } : {}) });
        continue;
      }
      if (!existing.title && title) {
        existing.title = title;
      }
      if (!existing.imageUrl && imageUrl) {
        existing.imageUrl = imageUrl;
      }
    }

    return [...merged.values()];
  }, [docMetas, extraDocMetas, isSpaceOwner]);

  const docMetaMap = useMemo(() => {
    const map = new Map<string, MinimalDocMeta>();
    for (const m of visibleDocMetas) {
      if (m?.id) {
        map.set(m.id, m);
      }
    }
    return map;
  }, [visibleDocMetas]);

  const appendExtraDocMeta = useCallback((meta: MinimalDocMeta) => {
    const id = typeof meta?.id === "string" ? meta.id : "";
    if (!id) {
      return;
    }
    setExtraDocMetas((prev) => {
      const base = [...(prev ?? [])];
      if (base.some(m => m.id === id)) {
        return base;
      }
      return [...base, meta];
    });
  }, []);

  return {
    visibleDocMetas,
    docMetaMap,
    appendExtraDocMeta,
  };
}
