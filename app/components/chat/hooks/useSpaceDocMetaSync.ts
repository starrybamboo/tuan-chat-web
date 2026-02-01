import { useEffect } from "react";

import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";

type RoomSummary = {
  roomId?: number | null;
  name?: string | null;
};

type UseSpaceDocMetaSyncParams = {
  spaceId?: number | null;
  spaceName?: string | null;
  rooms: RoomSummary[];
};

export default function useSpaceDocMetaSync({ spaceId, spaceName, rooms }: UseSpaceDocMetaSyncParams) {
  useEffect(() => {
    if (typeof window === "undefined")
      return;
    if (!spaceId || spaceId <= 0)
      return;

    let cancelled = false;
    void (async () => {
      try {
        const [{ ensureSpaceDocMeta, getOrCreateSpaceWorkspace }, { deleteSpaceDoc }] = await Promise.all([
          import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry"),
          import("@/components/chat/infra/blocksuite/deleteSpaceDoc"),
        ]);

        if (cancelled)
          return;

        if (spaceName) {
          ensureSpaceDocMeta({
            spaceId,
            docId: buildSpaceDocId({ kind: "space_description", spaceId }),
            title: spaceName,
          });
        }
        for (const room of rooms) {
          const roomId = room?.roomId;
          if (typeof roomId !== "number" || !Number.isFinite(roomId) || roomId <= 0)
            continue;
          const title = String(room?.name ?? "").trim();
          if (!title)
            continue;
          ensureSpaceDocMeta({
            spaceId,
            docId: buildSpaceDocId({ kind: "room_description", roomId }),
            title,
          });
        }

        // 2) Best-effort cleanup: if local workspace still has docs for rooms that no longer exist, purge them.
        const ws = getOrCreateSpaceWorkspace(spaceId) as any;
        const metas = (ws?.meta?.docMetas ?? []) as any[];
        if (!Array.isArray(metas) || metas.length === 0)
          return;

        const validRoomIds = new Set<number>();
        for (const room of rooms) {
          const roomId = room?.roomId;
          if (typeof roomId === "number" && Number.isFinite(roomId) && roomId > 0) {
            validRoomIds.add(roomId);
          }
        }

        const staleDocIds: string[] = [];
        for (const m of metas) {
          const id = String((m as any)?.id ?? "");
          if (!id)
            continue;
          const match = /^room:(\d+):description$/.exec(id);
          if (!match)
            continue;
          const roomId = Number(match[1]);
          if (!Number.isFinite(roomId) || roomId <= 0)
            continue;
          if (!validRoomIds.has(roomId)) {
            staleDocIds.push(id);
          }
        }

        if (staleDocIds.length > 0) {
          await Promise.allSettled(staleDocIds.map(docId => deleteSpaceDoc({ spaceId, docId })));
        }
      }
      catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rooms, spaceId, spaceName]);
}
