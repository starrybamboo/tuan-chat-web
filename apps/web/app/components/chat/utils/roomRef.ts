const ROOM_REF_MIME = "application/x-tc-room-ref";
const ROOM_REF_FALLBACK_PREFIX = "tc-room-ref:";

export type RoomRefDragPayload = {
  roomId: number;
  spaceId?: number;
  roomName?: string;
  categoryName?: string;
};

function normalizePayload(raw: any): RoomRefDragPayload | null {
  const roomIdRaw = raw?.roomId;
  const roomId = typeof roomIdRaw === "number" && Number.isFinite(roomIdRaw)
    ? Math.floor(roomIdRaw)
    : (typeof roomIdRaw === "string" ? Number.parseInt(roomIdRaw, 10) : Number.NaN);
  if (!Number.isFinite(roomId) || roomId <= 0) {
    return null;
  }

  const spaceIdRaw = raw?.spaceId;
  const spaceId = typeof spaceIdRaw === "number" && Number.isFinite(spaceIdRaw) && spaceIdRaw > 0
    ? Math.floor(spaceIdRaw)
    : (typeof spaceIdRaw === "string" ? Number.parseInt(spaceIdRaw, 10) : undefined);
  const roomName = typeof raw?.roomName === "string" ? raw.roomName.trim() : "";
  const categoryName = typeof raw?.categoryName === "string" ? raw.categoryName.trim() : "";

  return {
    roomId,
    ...(spaceId && Number.isFinite(spaceId) && spaceId > 0 ? { spaceId } : {}),
    ...(roomName ? { roomName: roomName.slice(0, 120) } : {}),
    ...(categoryName ? { categoryName: categoryName.slice(0, 120) } : {}),
  };
}

export function setRoomRefDragData(dataTransfer: DataTransfer, payload: RoomRefDragPayload): void {
  try {
    dataTransfer.setData(ROOM_REF_MIME, JSON.stringify(payload));
  }
  catch {
    // ignore
  }

  try {
    dataTransfer.setData("text/uri-list", `${ROOM_REF_FALLBACK_PREFIX}${payload.roomId}`);
  }
  catch {
    // ignore
  }
}

export function getRoomRefDragData(dataTransfer: DataTransfer | null | undefined): RoomRefDragPayload | null {
  if (!dataTransfer) {
    return null;
  }

  try {
    const raw = dataTransfer.getData(ROOM_REF_MIME);
    if (!raw) {
      throw new Error("no-mime");
    }
    const parsed = JSON.parse(raw);
    return normalizePayload(parsed);
  }
  catch {
    try {
      const uriList = dataTransfer.getData("text/uri-list") || "";
      const first = uriList.split(/\r?\n/).map(s => s.trim()).find(Boolean) || "";
      if (first.startsWith(ROOM_REF_FALLBACK_PREFIX)) {
        const roomId = Number.parseInt(first.slice(ROOM_REF_FALLBACK_PREFIX.length), 10);
        if (Number.isFinite(roomId) && roomId > 0) {
          return { roomId };
        }
      }
    }
    catch {
      // ignore
    }
    return null;
  }
}

export function isRoomRefDrag(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }
  try {
    const types = Array.from(dataTransfer.types || []);
    if (types.includes(ROOM_REF_MIME)) {
      return true;
    }
    if (types.includes("text/uri-list") && !types.includes("Files")) {
      const uriList = dataTransfer.getData("text/uri-list") || "";
      const first = uriList.split(/\r?\n/).map(s => s.trim()).find(Boolean) || "";
      if (first.startsWith(ROOM_REF_FALLBACK_PREFIX)) {
        return true;
      }
    }
    return Boolean(getRoomRefDragData(dataTransfer));
  }
  catch {
    return false;
  }
}
