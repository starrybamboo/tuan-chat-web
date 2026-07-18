import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { mergeSpaceDocMetas, spaceDocMetasQueryKey } from "@/components/chat/hooks/useSpaceDocMetaState";
import { parseSpaceDocId } from "@/components/chat/infra/doc/space/spaceDocId";
import { buildDocCardCoverReferenceFields } from "@/components/chat/message/docCard/docCardMedia";

import type { MinimalDocMeta } from "./sidebarTree";

type UseRoomSidebarDocMetasParams = {
  activeSpaceId: number | null;
  canViewDocs: boolean;
  docMetas?: MinimalDocMeta[];
};

type UseRoomSidebarDocMetasResult = {
  visibleDocMetas: MinimalDocMeta[];
  docMetaMap: Map<string, MinimalDocMeta>;
  upsertDocMeta: (meta: MinimalDocMeta) => void;
};

export default function useRoomSidebarDocMetas({
  activeSpaceId,
  canViewDocs,
  docMetas,
}: UseRoomSidebarDocMetasParams): UseRoomSidebarDocMetasResult {
  const queryClient = useQueryClient();

  const visibleDocMetas = useMemo(() => {
    if (!canViewDocs) {
      return [] as MinimalDocMeta[];
    }

    const merged = new Map<string, MinimalDocMeta>();
    for (const m of docMetas ?? []) {
      const id = typeof m?.id === "string" ? m.id : "";
      if (!id) {
        continue;
      }
      const parsed = parseSpaceDocId(id);
      if (parsed?.kind !== "independent") {
        continue;
      }

      const title = typeof m?.title === "string" && m.title.trim().length > 0 ? m.title : undefined;
      const imageFileId = typeof m?.imageFileId === "number" && m.imageFileId > 0 ? m.imageFileId : undefined;
      const originalImageFileId = typeof m?.originalImageFileId === "number" && m.originalImageFileId > 0 ? m.originalImageFileId : undefined;
      const imageMediaType = typeof m?.imageMediaType === "string" && m.imageMediaType.trim().length > 0 ? m.imageMediaType : undefined;
      const coverFields = buildDocCardCoverReferenceFields({
        imageFileId,
        originalImageFileId,
        imageMediaType,
      });

      const existing = merged.get(id);
      if (!existing) {
        merged.set(id, {
          id,
          ...(title ? { title } : {}),
          ...coverFields,
        });
        continue;
      }
      if (!existing.title && title) {
        existing.title = title;
      }
      if (!existing.imageFileId && coverFields.imageFileId) {
        existing.imageFileId = coverFields.imageFileId;
      }
      if (!existing.originalImageFileId && coverFields.originalImageFileId) {
        existing.originalImageFileId = coverFields.originalImageFileId;
      }
      if (!existing.imageMediaType && coverFields.imageMediaType) {
        existing.imageMediaType = coverFields.imageMediaType;
      }
    }

    return [...merged.values()];
  }, [canViewDocs, docMetas]);

  const docMetaMap = useMemo(() => {
    const map = new Map<string, MinimalDocMeta>();
    for (const m of visibleDocMetas) {
      if (m?.id) {
        map.set(m.id, m);
      }
    }
    return map;
  }, [visibleDocMetas]);

  const upsertDocMeta = useCallback((meta: MinimalDocMeta) => {
    const id = typeof meta?.id === "string" ? meta.id : "";
    if (!id || !activeSpaceId || activeSpaceId <= 0) {
      return;
    }
    const coverFields = buildDocCardCoverReferenceFields(meta);
    queryClient.setQueryData<MinimalDocMeta[]>(spaceDocMetasQueryKey(activeSpaceId), current => mergeSpaceDocMetas(
      current,
      [{
        id,
        ...(meta.title ? { title: meta.title } : {}),
        ...coverFields,
      }],
    ));
  }, [activeSpaceId, queryClient]);

  return {
    visibleDocMetas,
    docMetaMap,
    upsertDocMeta,
  };
}
