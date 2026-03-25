import { useEffect } from "react";

import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/space/spaceDocId";

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
        const { ensureSpaceDocMetaIfWorkspaceExists } = await import("@/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry");

        if (cancelled)
          return;

        if (spaceName) {
          ensureSpaceDocMetaIfWorkspaceExists({
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
          ensureSpaceDocMetaIfWorkspaceExists({
            spaceId,
            docId: buildSpaceDocId({ kind: "room_description", roomId }),
            title,
          });
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
