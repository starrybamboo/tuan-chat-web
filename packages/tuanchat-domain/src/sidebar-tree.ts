import type { Room } from "@tuanchat/openapi-client/models/Room";

export type SidebarLeafNode = {
  nodeId: string;
  type: "room" | "doc";
  targetId: number | string;
  fallbackTitle?: string;
  /** 文档封面/缩略图缓存（用于 sidebarTree 首屏快速展示） */
  fallbackImageUrl?: string;
  fallbackImageFileId?: number;
  fallbackOriginalImageFileId?: number;
  fallbackImageMediaType?: string;
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

export type MinimalDocMeta = {
  id: string;
  title?: string;
  imageUrl?: string;
  imageFileId?: number;
  originalImageFileId?: number;
  imageMediaType?: string;
};

type SidebarDocCoverSource = {
  imageFileId?: unknown;
  imageMediaType?: unknown;
  imageUrl?: unknown;
  originalImageFileId?: unknown;
};

function toPositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return undefined;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildSidebarDocCoverReferenceFields(
  source: SidebarDocCoverSource | null | undefined,
): Pick<MinimalDocMeta, "imageFileId" | "imageMediaType" | "imageUrl" | "originalImageFileId"> {
  const imageFileId = toPositiveNumber(source?.imageFileId);
  const originalImageFileId = toPositiveNumber(source?.originalImageFileId);
  const imageMediaType = normalizeText(source?.imageMediaType);
  const imageUrl = normalizeText(source?.imageUrl);

  if (imageFileId || originalImageFileId) {
    return {
      ...(imageFileId ? { imageFileId } : {}),
      ...(originalImageFileId ? { originalImageFileId } : {}),
      ...(imageMediaType ? { imageMediaType } : {}),
    };
  }

  return {
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageMediaType ? { imageMediaType } : {}),
  };
}

function normalizeSidebarDocId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    return normalized;
  }

  return null;
}

function isSidebarVisibleDocId(docId: unknown): boolean {
  return normalizeSidebarDocId(docId) != null;
}

export function extractDocMetasFromSidebarTree(tree: SidebarTree | null | undefined): MinimalDocMeta[] {
  const list: MinimalDocMeta[] = [];
  const seen = new Set<string>();

  for (const cat of tree?.categories ?? []) {
    for (const node of cat?.items ?? []) {
      if (node?.type !== "doc")
        continue;
      const id = normalizeSidebarDocId(node.targetId);
      if (!id)
        continue;
      if (seen.has(id))
        continue;
      seen.add(id);
      const coverFields = buildSidebarDocCoverReferenceFields({
        imageUrl: node.fallbackImageUrl,
        imageFileId: node.fallbackImageFileId,
        originalImageFileId: node.fallbackOriginalImageFileId,
        imageMediaType: node.fallbackImageMediaType,
      });
      list.push({
        id,
        title: node.fallbackTitle,
        ...coverFields,
      });
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
      if (item.type === "doc") {
        const id = normalizeSidebarDocId((item as any).targetId);
        if (id) {
          ids.add(id);
        }
      }
    }
  }
  return ids;
}

export function findSidebarCategoryIdForTarget(
  tree: SidebarTree | null | undefined,
  target: { type: "room"; id: number } | { type: "doc"; id: string },
): string | null {
  if (target.type === "room") {
    for (const category of tree?.categories ?? []) {
      for (const item of category.items ?? []) {
        if (item.type !== "room")
          continue;
        const roomId = normalizeRoomId(item.targetId);
        if (roomId === target.id) {
          return category.categoryId;
        }
      }
    }
    return null;
  }

  const docId = normalizeSidebarDocId(target.id);
  if (!docId) {
    return null;
  }
  for (const category of tree?.categories ?? []) {
    for (const item of category.items ?? []) {
      if (item.type !== "doc")
        continue;
      if (normalizeSidebarDocId(item.targetId) === docId) {
        return category.categoryId;
      }
    }
  }
  return null;
}

export function applySidebarDocFallbackCache(params: {
  tree: SidebarTree;
  docMetaMap: Map<string, MinimalDocMeta>;
  docHeaderOverrides: Record<string, {
    title?: string;
    imageUrl?: string;
    imageFileId?: number;
    originalImageFileId?: number;
    imageMediaType?: string;
  }>;
}): SidebarTree {
  const base = JSON.parse(JSON.stringify(params.tree)) as SidebarTree;
  for (const cat of base.categories ?? []) {
    for (const node of cat.items ?? []) {
      if (node?.type !== "doc")
        continue;

      const docId = normalizeSidebarDocId(node.targetId);
      if (!docId)
        continue;

      const meta = params.docMetaMap.get(docId);
      const override = params.docHeaderOverrides[docId];

      const overrideTitle = typeof override?.title === "string" ? override.title.trim() : "";
      const overrideImageUrl = typeof override?.imageUrl === "string" ? override.imageUrl.trim() : "";
      const overrideImageFileId = typeof override?.imageFileId === "number" && override.imageFileId > 0 ? override.imageFileId : undefined;
      const overrideOriginalImageFileId = typeof override?.originalImageFileId === "number" && override.originalImageFileId > 0 ? override.originalImageFileId : undefined;
      const overrideImageMediaType = typeof override?.imageMediaType === "string" ? override.imageMediaType.trim() : "";

      const metaTitle = typeof meta?.title === "string" ? meta.title.trim() : "";
      const metaImageUrl = typeof meta?.imageUrl === "string" ? meta.imageUrl.trim() : "";
      const metaImageFileId = typeof meta?.imageFileId === "number" && meta.imageFileId > 0 ? meta.imageFileId : undefined;
      const metaOriginalImageFileId = typeof meta?.originalImageFileId === "number" && meta.originalImageFileId > 0 ? meta.originalImageFileId : undefined;
      const metaImageMediaType = typeof meta?.imageMediaType === "string" ? meta.imageMediaType.trim() : "";

      const currentFallbackTitle = typeof (node as any)?.fallbackTitle === "string" ? String((node as any).fallbackTitle).trim() : "";
      const currentFallbackImageUrl = typeof (node as any)?.fallbackImageUrl === "string" ? String((node as any).fallbackImageUrl).trim() : "";
      const currentFallbackImageFileId = typeof (node as any)?.fallbackImageFileId === "number" && (node as any).fallbackImageFileId > 0
        ? (node as any).fallbackImageFileId
        : undefined;
      const currentFallbackOriginalImageFileId = typeof (node as any)?.fallbackOriginalImageFileId === "number" && (node as any).fallbackOriginalImageFileId > 0
        ? (node as any).fallbackOriginalImageFileId
        : undefined;
      const currentFallbackImageMediaType = typeof (node as any)?.fallbackImageMediaType === "string" ? String((node as any).fallbackImageMediaType).trim() : "";

      const nextTitle = overrideTitle || metaTitle || currentFallbackTitle || docId;
      const nextImageUrl = overrideImageUrl || metaImageUrl || currentFallbackImageUrl;
      const nextImageFileId = overrideImageFileId || metaImageFileId || currentFallbackImageFileId;
      const nextOriginalImageFileId = overrideOriginalImageFileId || metaOriginalImageFileId || currentFallbackOriginalImageFileId;
      const nextImageMediaType = overrideImageMediaType || metaImageMediaType || currentFallbackImageMediaType;
      const coverFields = buildSidebarDocCoverReferenceFields({
        imageUrl: nextImageUrl,
        imageFileId: nextImageFileId,
        originalImageFileId: nextOriginalImageFileId,
        imageMediaType: nextImageMediaType,
      });

      (node as any).fallbackTitle = nextTitle;
      if (coverFields.imageUrl) {
        (node as any).fallbackImageUrl = coverFields.imageUrl;
      }
      else {
        delete (node as any).fallbackImageUrl;
      }
      if (coverFields.imageFileId) {
        (node as any).fallbackImageFileId = coverFields.imageFileId;
      }
      else {
        delete (node as any).fallbackImageFileId;
      }
      if (coverFields.originalImageFileId) {
        (node as any).fallbackOriginalImageFileId = coverFields.originalImageFileId;
      }
      else {
        delete (node as any).fallbackOriginalImageFileId;
      }
      if (coverFields.imageMediaType) {
        (node as any).fallbackImageMediaType = coverFields.imageMediaType;
      }
      else {
        delete (node as any).fallbackImageMediaType;
      }
    }
  }
  return base;
}

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
  return normalizeSidebarDocId(v);
}

export function buildSidebarRoomNode(roomId: number, fallbackTitle?: string): SidebarLeafNode {
  return {
    nodeId: `room:${roomId}`,
    type: "room",
    targetId: roomId,
    fallbackTitle,
  };
}

export function buildSidebarDocNode(docId: string, fallbackTitle?: string, fallbackImageUrl?: string, fallback?: {
  imageFileId?: number;
  originalImageFileId?: number;
  imageMediaType?: string;
}): SidebarLeafNode {
  const coverFields = buildSidebarDocCoverReferenceFields({
    imageUrl: fallbackImageUrl,
    imageFileId: fallback?.imageFileId,
    originalImageFileId: fallback?.originalImageFileId,
    imageMediaType: fallback?.imageMediaType,
  });
  return {
    nodeId: `doc:${docId}`,
    type: "doc",
    targetId: docId,
    fallbackTitle,
    ...(coverFields.imageUrl ? { fallbackImageUrl: coverFields.imageUrl } : {}),
    ...(coverFields.imageFileId ? { fallbackImageFileId: coverFields.imageFileId } : {}),
    ...(coverFields.originalImageFileId ? { fallbackOriginalImageFileId: coverFields.originalImageFileId } : {}),
    ...(coverFields.imageMediaType ? { fallbackImageMediaType: coverFields.imageMediaType } : {}),
  };
}

function generateCategoryId(): string {
  // 保持短且可读，避免依赖 crypto 在旧环境不可用。
  return `cat:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
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
      return buildSidebarRoomNode(r.roomId, r.name ?? String(r.roomId));
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
      .filter(m => typeof m?.id === "string" && m.id.length > 0 && isSidebarVisibleDocId(m.id))
      .map(m => ({
        ...buildSidebarDocNode(m.id, m.title ?? m.id, m.imageUrl, {
          imageFileId: m.imageFileId,
          originalImageFileId: m.originalImageFileId,
          imageMediaType: m.imageMediaType,
        }),
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

export function appendSidebarNodeToCategory(params: {
  tree: SidebarTree;
  categoryId: string;
  node: SidebarLeafNode;
}): SidebarTree {
  const next = JSON.parse(JSON.stringify(params.tree)) as SidebarTree;
  const categories = Array.isArray(next.categories) ? next.categories : [];
  const target = categories.find(c => c?.categoryId === params.categoryId) ?? categories[0];
  if (!target)
    return next;
  target.items = Array.isArray(target.items) ? target.items : [];
  if (categories.some(category => (category.items ?? []).some(item => item?.nodeId === params.node.nodeId)))
    return next;
  target.items.push(params.node);
  return next;
}

/**
 * 规范化频道树：
 * - 分类可自定义（类似 Discord 分类/文件夹）
 * - 过滤不存在的 room/doc（doc 仅在 includeDocs=true 时保留）
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
    if (typeof m?.id === "string" && m.id.length > 0 && isSidebarVisibleDocId(m.id)) {
      docMetaMap.set(m.id, m);
    }
  }
  const hasDocMetas = docMetaMap.size > 0;

  let base: SidebarTree;
  const inputTree = params.tree as any;
  if (inputTree?.schemaVersion === 2) {
    base = inputTree as SidebarTree;
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
      return buildSidebarRoomNode(roomId, raw?.fallbackTitle ?? room.name ?? String(roomId));
    }

    if (raw.type === "doc") {
      if (!params.includeDocs)
        return null;
      const docId = normalizeDocId(raw?.targetId);
      if (!docId)
        return null;
      if (!isSidebarVisibleDocId(docId))
        return null;
      const meta = docMetaMap.get(docId);
      // docMetas 可能是异步加载的：还未加载到任何 meta 前，允许先展示 sidebarTree 里的缓存。
      if (!meta && hasDocMetas)
        return null;

      const title = raw?.fallbackTitle ?? meta?.title ?? docId;
      const imageUrl = raw?.fallbackImageUrl ?? meta?.imageUrl;
      const imageFileId = raw?.fallbackImageFileId ?? meta?.imageFileId;
      const originalImageFileId = raw?.fallbackOriginalImageFileId ?? meta?.originalImageFileId;
      const imageMediaType = raw?.fallbackImageMediaType ?? meta?.imageMediaType;
      return buildSidebarDocNode(docId, title, imageUrl, { imageFileId, originalImageFileId, imageMediaType });
    }

    return null;
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
