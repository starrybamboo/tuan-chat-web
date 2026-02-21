export type RoomJumpPayload = {
  roomId: number;
  spaceId?: number;
  roomName?: string;
  categoryName?: string;
  spaceName?: string;
  label?: string;
};

export type RoomJumpCommandPayload = {
  roomId: number;
  spaceId?: number;
  label?: string;
};

function normalizePositiveInt(value: unknown): number | undefined {
  const numeric = typeof value === "number"
    ? value
    : (typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }
  return Math.floor(numeric);
}

function normalizeText(value: unknown, maxLength = 80): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, maxLength);
}

export function extractRoomJumpPayload(extra: unknown): RoomJumpPayload | null {
  const raw = (extra as any)?.roomJump ?? extra;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const roomId = normalizePositiveInt((raw as any).roomId);
  if (!roomId) {
    return null;
  }
  const spaceId = normalizePositiveInt((raw as any).spaceId);
  const roomName = normalizeText((raw as any).roomName);
  const categoryName = normalizeText((raw as any).categoryName);
  const spaceName = normalizeText((raw as any).spaceName);
  const label = normalizeText((raw as any).label, 120);

  return {
    roomId,
    ...(spaceId ? { spaceId } : {}),
    ...(roomName ? { roomName } : {}),
    ...(categoryName ? { categoryName } : {}),
    ...(spaceName ? { spaceName } : {}),
    ...(label ? { label } : {}),
  };
}

const ROOM_JUMP_COMMAND_REGEXP = /^\/(?:roomjump|jumproom)\b/i;

export function isRoomJumpCommandText(input: string): boolean {
  return ROOM_JUMP_COMMAND_REGEXP.test(String(input ?? "").trim());
}

export function parseRoomJumpCommand(input: string): RoomJumpCommandPayload | null {
  const raw = String(input ?? "").trim();
  if (!isRoomJumpCommandText(raw)) {
    return null;
  }

  const rest = raw.replace(ROOM_JUMP_COMMAND_REGEXP, "").trim();
  if (!rest) {
    return null;
  }

  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }

  const first = normalizePositiveInt(tokens[0]);
  if (!first) {
    return null;
  }

  const second = tokens.length > 1 ? normalizePositiveInt(tokens[1]) : undefined;
  if (second) {
    const label = normalizeText(tokens.slice(2).join(" "), 120);
    return {
      spaceId: first,
      roomId: second,
      ...(label ? { label } : {}),
    };
  }

  const label = normalizeText(tokens.slice(1).join(" "), 120);
  return {
    roomId: first,
    ...(label ? { label } : {}),
  };
}
