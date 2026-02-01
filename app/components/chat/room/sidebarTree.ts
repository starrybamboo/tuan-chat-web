import type { Room } from "api";

export type SidebarLeafNode = {
  nodeId: string;
  type: "room" | "doc";
  targetId: number | string;
  fallbackTitle?: string;
  /** 文档封面/缩略图缓存（用于 sidebarTree 首屏快速展示） */
  fallbackImageUrl?: string;
};

export type SidebarCategoryNode = {
  categoryId: string;
  name: string;
  collapsed?: boolean;
  items: SidebarLeafNode[];
};

export type SidebarTree = {
  schemaVersion: 2;
  categories: SidebarCategoryNode[];
};

export type MinimalDocMeta = { id: string; title?: string; imageUrl?: string };

export function extractDocMetasFromSidebarTree(tree: SidebarTree | null | undefined): MinimalDocMeta[] {
  const list: MinimalDocMeta[] = [];
  const seen = new Set<string>();

  for (const cat of tree?.categories ?? []) {
    for (const node of cat?.items ?? []) {
      if (node?.type !== "doc")
        continue;
      const id = typeof node.targetId === "string" ? node.targetId : "";
      if (!id)
        continue;
      if (seen.has(id))
        continue;
      seen.add(id);
      list.push({ id, title: node.fallbackTitle, imageUrl: node.fallbackImageUrl });
    }
  }

  return list;
}

export function collectExistingRoomIds(tree: SidebarTree | null | undefined): Set<number> {
  const ids = new Set<number>();
  for (const cat of tree?.categories ?? []) {
    for (const item of cat.items ?? []) {
      if (item.type === "room" && typeof (item as any).targetId === "number") {
        ids.add((item as any).targetId);
      }
    }
  }
  return ids;
}

export function collectExistingDocIds(tree: SidebarTree | null | undefined): Set<string> {
  const ids = new Set<string>();
  for (const cat of tree?.categories ?? []) {
    for (const item of cat.items ?? []) {
      if (item.type === "doc" && typeof (item as any).targetId === "string") {
        ids.add((item as any).targetId);
      }
    }
  }
  return ids;
}

type SidebarTreeV1 = {
  schemaVersion: 1;
  categories: Array<{
    categoryId: "TEXT" | "VOICE" | "DOC";
    items: SidebarLeafNode[];
  }>;
};

function normalizeRoomId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

function normalizeDocId(v: unknown): string | null {
  if (typeof v === "string" && v.trim().length > 0) {
    return v;
  }
  return null;
}

function buildRoomNode(roomId: number, fallbackTitle?: string): SidebarLeafNode {
  return {
    nodeId: `room:${roomId}`,
    type: "room",
    targetId: roomId,
    fallbackTitle,
  };
}

function buildDocNode(docId: string, fallbackTitle?: string, fallbackImageUrl?: string): SidebarLeafNode {
  return {
    nodeId: `doc:${docId}`,
    type: "doc",
    targetId: docId,
    fallbackTitle,
    fallbackImageUrl,
  };
}

function generateCategoryId(): string {
  // 保持短且可读，避免依赖 crypto 在旧环境不可用
  return `cat:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function migrateV1ToV2(treeV1: SidebarTreeV1): SidebarTree {
  const byId = new Map<string, SidebarLeafNode[]>();
  for (const c of treeV1.categories ?? []) {
    if (!c)
      continue;
    byId.set(c.categoryId, Array.isArray(c.items) ? c.items : []);
  }

  // VOICE 直接并入频道分类，避免丢失旧数据
  const rooms = [...(byId.get("TEXT") ?? []), ...(byId.get("VOICE") ?? [])]
    .filter(n => n?.type === "room");
  const docs = (byId.get("DOC") ?? []).filter(n => n?.type === "doc");

  const categories: SidebarCategoryNode[] = [
    {
      categoryId: "cat:channels",
      name: "频道",
      items: rooms,
    },
    {
      categoryId: "cat:docs",
      name: "文档",
      items: docs,
    },
  ];

  return {
    schemaVersion: 2,
    categories,
  };
}

export function parseSidebarTree(treeJson: string | null | undefined): SidebarTree | null {
  if (!treeJson || treeJson.trim().length === 0) {
    return null;
  }
  try {
    const obj = JSON.parse(treeJson) as any;

    if (obj?.schemaVersion === 2 && Array.isArray(obj.categories)) {
      return obj as SidebarTree;
    }

    // 兼容旧 schemaVersion=1：自动迁移到 v2
    if (obj?.schemaVersion === 1 && Array.isArray(obj.categories)) {
      return migrateV1ToV2(obj as SidebarTreeV1);
    }

    return null;
  }
  catch {
    return null;
  }
}

export function buildDefaultSidebarTree(params: {
  roomsInSpace: Room[];
  docMetas: MinimalDocMeta[];
  includeDocs: boolean;
}): SidebarTree {
  const roomItems: SidebarLeafNode[] = params.roomsInSpace
    .filter((r): r is Room & { roomId: number } => {
      return typeof r.roomId === "number" && Number.isFinite(r.roomId);
    })
    .map((r) => {
      return buildRoomNode(r.roomId, r.name ?? String(r.roomId));
    });

  const categories: SidebarCategoryNode[] = [
    {
      categoryId: "cat:channels",
      name: "频道",
      items: roomItems,
    },
  ];

  if (params.includeDocs) {
    const docItems: SidebarLeafNode[] = params.docMetas
      .filter(m => typeof m?.id === "string" && m.id.length > 0)
      .map(m => ({
        ...buildDocNode(m.id, m.title ?? m.id, m.imageUrl),
      }));
    categories.push({
      categoryId: "cat:docs",
      name: "文档",
      items: docItems,
    });
  }

  return {
    schemaVersion: 2,
    categories,
  };
}

/**
 * 规范化频道树：
 * - 分类可自定义（类似 Discord 分类/文件夹）
 * - 过滤不存在的 room/doc（doc 仅在 includeDocs=true 时保留）
 * - 过滤不存在的 room/doc
 * - nodeId/targetId 统一格式，并去重
 */
export function normalizeSidebarTree(params: {
  tree?: SidebarTree | null;
  roomsInSpace: Room[];
  docMetas: MinimalDocMeta[];
  includeDocs: boolean;
}): SidebarTree {
  const roomMap = new Map<number, Room>();
  for (const r of params.roomsInSpace) {
    if (typeof r.roomId === "number" && Number.isFinite(r.roomId)) {
      roomMap.set(r.roomId, r);
    }
  }

  const docMetaMap = new Map<string, MinimalDocMeta>();
  for (const m of params.docMetas) {
    if (typeof m?.id === "string" && m.id.length > 0) {
      docMetaMap.set(m.id, m);
    }
  }
  const hasDocMetas = docMetaMap.size > 0;

  let base: SidebarTree;
  const inputTree = params.tree as any;
  if (inputTree?.schemaVersion === 2) {
    base = inputTree as SidebarTree;
  }
  else if (inputTree?.schemaVersion === 1) {
    base = migrateV1ToV2(inputTree as SidebarTreeV1);
  }
  else {
    base = buildDefaultSidebarTree({
      roomsInSpace: params.roomsInSpace,
      docMetas: params.docMetas,
      includeDocs: params.includeDocs,
    });
  }

  const usedCategoryIds = new Set<string>();
  const usedNodeIds = new Set<string>();

  const normalizeNode = (raw: SidebarLeafNode | any): SidebarLeafNode | null => {
    if (!raw || (raw.type !== "room" && raw.type !== "doc"))
      return null;

    if (raw.type === "room") {
      const roomId = normalizeRoomId(raw?.targetId);
      if (roomId == null)
        return null;
      const room = roomMap.get(roomId);
      if (!room)
        return null;
      return buildRoomNode(roomId, raw?.fallbackTitle ?? room.name ?? String(roomId));
    }

    // doc
    if (!params.includeDocs)
      return null;
    const docId = normalizeDocId(raw?.targetId);
    if (!docId)
      return null;
    const meta = docMetaMap.get(docId);
    // docMetas 可能是异步加载的：在还未加载到任何 meta 之前，允许保留 sidebarTree 里的 doc 节点，先展示缓存。
    if (!meta && hasDocMetas)
      return null;

    const title = raw?.fallbackTitle ?? meta?.title ?? docId;
    const imageUrl = raw?.fallbackImageUrl ?? meta?.imageUrl;
    return buildDocNode(docId, title, imageUrl);
  };

  const categories: SidebarCategoryNode[] = [];
  for (const c of base.categories ?? []) {
    if (!c)
      continue;
    let categoryId = typeof c.categoryId === "string" && c.categoryId.trim().length > 0
      ? c.categoryId
      : generateCategoryId();
    if (usedCategoryIds.has(categoryId)) {
      categoryId = generateCategoryId();
    }
    usedCategoryIds.add(categoryId);

    const name = typeof c.name === "string" && c.name.trim().length > 0
      ? c.name.trim()
      : "未命名";

    const items: SidebarLeafNode[] = [];
    for (const raw of (Array.isArray(c.items) ? c.items : [])) {
      const node = normalizeNode(raw);
      if (!node)
        continue;
      if (usedNodeIds.has(node.nodeId))
        continue;
      usedNodeIds.add(node.nodeId);
      items.push(node);
    }

    categories.push({
      categoryId,
      name,
      collapsed: Boolean((c as any).collapsed),
      items,
    });
  }

  if (categories.length === 0) {
    return buildDefaultSidebarTree({
      roomsInSpace: params.roomsInSpace,
      docMetas: params.docMetas,
      includeDocs: params.includeDocs,
    });
  }

  return {
    schemaVersion: 2,
    categories,
  };
}
