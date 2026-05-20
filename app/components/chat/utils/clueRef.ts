const CLUE_REF_MIME = "application/x-tc-clue-ref";
const CLUE_REF_FALLBACK_PREFIX = "tc-clue-ref:";

export type ClueRefDragPayload = {
  snapshot: {
    content: string;
    extra?: unknown;
    messageType: number;
  };
};

function normalizePayload(raw: any): ClueRefDragPayload | null {
  const snapshot = raw?.snapshot && typeof raw.snapshot === "object" && !Array.isArray(raw.snapshot)
    ? raw.snapshot
    : null;
  const messageType = typeof snapshot?.messageType === "number" && Number.isFinite(snapshot.messageType) && snapshot.messageType > 0
    ? Math.floor(snapshot.messageType)
    : undefined;
  if (!messageType) {
    return null;
  }

  return {
    snapshot: {
      messageType,
      content: typeof snapshot.content === "string" ? snapshot.content : "",
      ...(snapshot.extra !== undefined ? { extra: snapshot.extra } : {}),
    },
  };
}

export function setClueRefDragData(dataTransfer: DataTransfer, payload: ClueRefDragPayload): void {
  try {
    dataTransfer.setData(CLUE_REF_MIME, JSON.stringify(payload));
  }
  catch {
    // ignore
  }

  try {
    dataTransfer.setData("text/uri-list", `${CLUE_REF_FALLBACK_PREFIX}${encodeURIComponent(String(payload.snapshot.messageType))}`);
  }
  catch {
    // ignore
  }
}

export function getClueRefDragData(dataTransfer: DataTransfer | null | undefined): ClueRefDragPayload | null {
  if (!dataTransfer) {
    return null;
  }

  try {
    const raw = dataTransfer.getData(CLUE_REF_MIME);
    if (!raw) {
      throw new Error("no-mime");
    }
    return normalizePayload(JSON.parse(raw));
  }
  catch {
    return null;
  }
}

export function isClueRefDrag(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }
  try {
    const types = Array.from(dataTransfer.types || []);
    if (types.includes(CLUE_REF_MIME)) {
      return true;
    }
    return Boolean(getClueRefDragData(dataTransfer));
  }
  catch {
    return false;
  }
}
