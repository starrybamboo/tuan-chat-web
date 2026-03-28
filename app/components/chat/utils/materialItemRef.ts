import type { MaterialMessageItem } from "../../../../api/models/MaterialMessageItem";

const MATERIAL_ITEM_REF_MIME = "application/x-tc-material-item";
const MATERIAL_ITEM_REF_PREFIX = "tc-material-item:";

export type MaterialItemDragPayload = {
  spacePackageId: number;
  packageName?: string;
  itemName?: string;
  itemNote?: string;
  itemPath?: string;
  messages: MaterialMessageItem[];
};

function normalizeMessage(raw: any): MaterialMessageItem | null {
  const messageType = typeof raw?.messageType === "number" && Number.isFinite(raw.messageType)
    ? raw.messageType
    : undefined;
  const content = typeof raw?.content === "string" ? raw.content : undefined;
  const annotations = Array.isArray(raw?.annotations)
    ? raw.annotations.filter((item: unknown): item is string => typeof item === "string")
    : undefined;
  const extra = raw?.extra && typeof raw.extra === "object" ? raw.extra : undefined;
  const webgal = raw?.webgal && typeof raw.webgal === "object" ? raw.webgal : undefined;
  const roleId = typeof raw?.roleId === "number" && Number.isFinite(raw.roleId) ? raw.roleId : undefined;
  const avatarId = typeof raw?.avatarId === "number" && Number.isFinite(raw.avatarId) ? raw.avatarId : undefined;
  const customRoleName = typeof raw?.customRoleName === "string" ? raw.customRoleName.trim() : "";

  if (messageType == null && !content && !extra && !webgal) {
    return null;
  }

  return {
    ...(messageType != null ? { messageType } : {}),
    ...(content !== undefined ? { content } : {}),
    ...(annotations?.length ? { annotations } : {}),
    ...(extra ? { extra } : {}),
    ...(webgal ? { webgal } : {}),
    ...(roleId != null ? { roleId } : {}),
    ...(avatarId != null ? { avatarId } : {}),
    ...(customRoleName ? { customRoleName } : {}),
  };
}

function normalizePayload(raw: any): MaterialItemDragPayload | null {
  const spacePackageIdRaw = raw?.spacePackageId;
  const spacePackageId = typeof spacePackageIdRaw === "number" && Number.isFinite(spacePackageIdRaw)
    ? Math.floor(spacePackageIdRaw)
    : (typeof spacePackageIdRaw === "string" ? Number.parseInt(spacePackageIdRaw, 10) : Number.NaN);
  if (!Number.isFinite(spacePackageId) || spacePackageId <= 0) {
    return null;
  }

  const packageName = typeof raw?.packageName === "string" ? raw.packageName.trim() : "";
  const itemName = typeof raw?.itemName === "string" ? raw.itemName.trim() : "";
  const itemNote = typeof raw?.itemNote === "string" ? raw.itemNote.trim() : "";
  const itemPath = typeof raw?.itemPath === "string" ? raw.itemPath.trim() : "";
  const messages = Array.isArray(raw?.messages)
    ? raw.messages
      .map(normalizeMessage)
      .filter((item: MaterialMessageItem | null): item is MaterialMessageItem => item !== null)
    : [];

  if (messages.length === 0) {
    return null;
  }

  return {
    spacePackageId,
    ...(packageName ? { packageName: packageName.slice(0, 120) } : {}),
    ...(itemName ? { itemName: itemName.slice(0, 120) } : {}),
    ...(itemNote ? { itemNote: itemNote.slice(0, 400) } : {}),
    ...(itemPath ? { itemPath: itemPath.slice(0, 240) } : {}),
    messages,
  };
}

export function setMaterialItemDragData(dataTransfer: DataTransfer, payload: MaterialItemDragPayload): void {
  const serialized = JSON.stringify(payload);
  try {
    dataTransfer.setData(MATERIAL_ITEM_REF_MIME, serialized);
  }
  catch {
    // ignore
  }

  try {
    dataTransfer.setData("text/plain", `${MATERIAL_ITEM_REF_PREFIX}${encodeURIComponent(serialized)}`);
  }
  catch {
    // ignore
  }
}

export function getMaterialItemDragData(dataTransfer: DataTransfer | null | undefined): MaterialItemDragPayload | null {
  if (!dataTransfer) {
    return null;
  }

  try {
    const raw = dataTransfer.getData(MATERIAL_ITEM_REF_MIME);
    if (!raw) {
      throw new Error("no-mime");
    }
    return normalizePayload(JSON.parse(raw));
  }
  catch {
    try {
      const plain = dataTransfer.getData("text/plain") || "";
      const trimmed = plain.trim();
      if (!trimmed.startsWith(MATERIAL_ITEM_REF_PREFIX)) {
        return null;
      }
      const encoded = trimmed.slice(MATERIAL_ITEM_REF_PREFIX.length);
      return normalizePayload(JSON.parse(decodeURIComponent(encoded)));
    }
    catch {
      return null;
    }
  }
}

export function isMaterialItemDrag(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }

  try {
    const types = Array.from(dataTransfer.types || []);
    if (types.includes(MATERIAL_ITEM_REF_MIME)) {
      return true;
    }
    if (types.includes("text/plain")) {
      const plain = dataTransfer.getData("text/plain") || "";
      if (plain.trim().startsWith(MATERIAL_ITEM_REF_PREFIX)) {
        return true;
      }
    }
    return Boolean(getMaterialItemDragData(dataTransfer));
  }
  catch {
    return false;
  }
}
