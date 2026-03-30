import type { MessageDraft } from "@/types/messageDraft";

const MATERIAL_ITEM_MIME = "application/x-tc-material-item";
const MATERIAL_ITEM_FALLBACK_PREFIX = "tc-material-item:";
const materialItemRegistry = new Map<string, MaterialItemDragPayload>();

export type MaterialItemDragPayload = {
  itemKind: "material" | "asset";
  spacePackageId: number;
  packageName?: string;
  materialPathKey: string;
  materialName: string;
  messageCount: number;
  assetIndex?: number;
  messages: MessageDraft[];
};

function createRegistryKey(): string {
  return `material-item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRegistryKeyFromDataTransfer(dataTransfer: DataTransfer): string {
  try {
    const raw = dataTransfer.getData(MATERIAL_ITEM_MIME);
    if (raw) {
      const parsed = JSON.parse(raw) as { key?: string };
      if (typeof parsed?.key === "string" && parsed.key.trim()) {
        return parsed.key.trim();
      }
    }
  }
  catch {
    // ignore
  }

  try {
    const uriList = dataTransfer.getData("text/uri-list") || "";
    const first = uriList.split(/\r?\n/).map(item => item.trim()).find(Boolean) || "";
    if (first.startsWith(MATERIAL_ITEM_FALLBACK_PREFIX)) {
      return first.slice(MATERIAL_ITEM_FALLBACK_PREFIX.length).trim();
    }
  }
  catch {
    // ignore
  }

  return "";
}

export function setMaterialItemDragData(dataTransfer: DataTransfer, payload: MaterialItemDragPayload): void {
  const key = createRegistryKey();
  materialItemRegistry.set(key, payload);

  try {
    dataTransfer.setData(MATERIAL_ITEM_MIME, JSON.stringify({ key }));
  }
  catch {
    // ignore
  }

  try {
    dataTransfer.setData("text/uri-list", `${MATERIAL_ITEM_FALLBACK_PREFIX}${key}`);
  }
  catch {
    // ignore
  }
}

export function getMaterialItemDragData(dataTransfer: DataTransfer | null | undefined): MaterialItemDragPayload | null {
  if (!dataTransfer) {
    return null;
  }

  const key = getRegistryKeyFromDataTransfer(dataTransfer);
  if (!key) {
    return null;
  }

  return materialItemRegistry.get(key) ?? null;
}

export function isMaterialItemDrag(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }

  try {
    const types = Array.from(dataTransfer.types || []);
    if (types.includes(MATERIAL_ITEM_MIME)) {
      return true;
    }
    if (types.includes("text/uri-list")) {
      const uriList = dataTransfer.getData("text/uri-list") || "";
      const first = uriList.split(/\r?\n/).map(item => item.trim()).find(Boolean) || "";
      if (first.startsWith(MATERIAL_ITEM_FALLBACK_PREFIX)) {
        return true;
      }
    }
    return Boolean(getMaterialItemDragData(dataTransfer));
  }
  catch {
    return false;
  }
}
