import type * as Y from "yjs";

export type BlocksuiteDocHeader = {
  title: string;
  imageUrl: string;
  originalImageUrl: string;
  imageFileId?: number;
  originalImageFileId?: number;
  imageMediaType?: string;
};

const HEADER_MAP_KEY = "tc_header";

function isYDocLike(v: any): v is Y.Doc {
  return !!v && typeof v.getMap === "function" && typeof v.transact === "function";
}

function getSpaceDocFromStore(store: any): Y.Doc | null {
  const spaceDoc = store?.spaceDoc;
  return isYDocLike(spaceDoc) ? spaceDoc : null;
}

function readString(map: Y.Map<unknown>, key: string): string {
  const v = map.get(key);
  return typeof v === "string" ? v : "";
}

function readNumber(map: Y.Map<unknown>, key: string): number | undefined {
  const v = map.get(key);
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function normalizeHeader(raw: Partial<BlocksuiteDocHeader> | null | undefined): BlocksuiteDocHeader {
  return {
    title: String(raw?.title ?? "").trim(),
    imageUrl: String(raw?.imageUrl ?? "").trim(),
    originalImageUrl: String(raw?.originalImageUrl ?? "").trim(),
    imageFileId: typeof raw?.imageFileId === "number" && raw.imageFileId > 0 ? raw.imageFileId : undefined,
    originalImageFileId: typeof raw?.originalImageFileId === "number" && raw.originalImageFileId > 0 ? raw.originalImageFileId : undefined,
    imageMediaType: String(raw?.imageMediaType ?? "").trim() || undefined,
  };
}

export function readBlocksuiteDocHeader(store: any): BlocksuiteDocHeader | null {
  const doc = getSpaceDocFromStore(store);
  if (!doc)
    return null;

  try {
    const map = doc.getMap<unknown>(HEADER_MAP_KEY);
    return normalizeHeader({
      title: readString(map, "title"),
      imageUrl: readString(map, "imageUrl"),
      originalImageUrl: readString(map, "originalImageUrl"),
      imageFileId: readNumber(map, "imageFileId"),
      originalImageFileId: readNumber(map, "originalImageFileId"),
      imageMediaType: readString(map, "imageMediaType"),
    });
  }
  catch {
    return null;
  }
}

export function ensureBlocksuiteDocHeader(store: any, fallback?: Partial<BlocksuiteDocHeader>): BlocksuiteDocHeader | null {
  const doc = getSpaceDocFromStore(store);
  if (!doc)
    return null;

  const desired = normalizeHeader(fallback);

  try {
    const map = doc.getMap<unknown>(HEADER_MAP_KEY);
    const current = normalizeHeader({
      title: readString(map, "title"),
      imageUrl: readString(map, "imageUrl"),
      originalImageUrl: readString(map, "originalImageUrl"),
      imageFileId: readNumber(map, "imageFileId"),
      originalImageFileId: readNumber(map, "originalImageFileId"),
      imageMediaType: readString(map, "imageMediaType"),
    });

    // 只在缺失时补齐，避免覆盖已有数据。
    const next: BlocksuiteDocHeader = {
      title: current.title || desired.title,
      imageUrl: current.imageUrl || desired.imageUrl,
      originalImageUrl: current.originalImageUrl || desired.originalImageUrl,
      imageFileId: current.imageFileId || desired.imageFileId,
      originalImageFileId: current.originalImageFileId || desired.originalImageFileId,
      imageMediaType: current.imageMediaType || desired.imageMediaType,
    };

    if (JSON.stringify(next) !== JSON.stringify(current)) {
      doc.transact(() => {
        if (next.title !== current.title)
          map.set("title", next.title);
        if (next.imageUrl !== current.imageUrl)
          map.set("imageUrl", next.imageUrl);
        if (next.originalImageUrl !== current.originalImageUrl)
          map.set("originalImageUrl", next.originalImageUrl);
        if (next.imageFileId !== current.imageFileId)
          setOptionalMapValue(map, "imageFileId", next.imageFileId);
        if (next.originalImageFileId !== current.originalImageFileId)
          setOptionalMapValue(map, "originalImageFileId", next.originalImageFileId);
        if (next.imageMediaType !== current.imageMediaType)
          setOptionalMapValue(map, "imageMediaType", next.imageMediaType);
      }, "tc_header:init");
    }

    return next;
  }
  catch {
    return null;
  }
}

export function setBlocksuiteDocHeader(store: any, patch: Partial<BlocksuiteDocHeader>): BlocksuiteDocHeader | null {
  const doc = getSpaceDocFromStore(store);
  if (!doc)
    return null;

  const incoming = normalizeHeader(patch);
  const hasTitle = Object.prototype.hasOwnProperty.call(patch, "title");
  const hasImageUrl = Object.prototype.hasOwnProperty.call(patch, "imageUrl");
  const hasOriginalImageUrl = Object.prototype.hasOwnProperty.call(patch, "originalImageUrl");
  const hasImageFileId = Object.prototype.hasOwnProperty.call(patch, "imageFileId");
  const hasOriginalImageFileId = Object.prototype.hasOwnProperty.call(patch, "originalImageFileId");
  const hasImageMediaType = Object.prototype.hasOwnProperty.call(patch, "imageMediaType");

  try {
    const map = doc.getMap<unknown>(HEADER_MAP_KEY);
    const current = normalizeHeader({
      title: readString(map, "title"),
      imageUrl: readString(map, "imageUrl"),
      originalImageUrl: readString(map, "originalImageUrl"),
      imageFileId: readNumber(map, "imageFileId"),
      originalImageFileId: readNumber(map, "originalImageFileId"),
      imageMediaType: readString(map, "imageMediaType"),
    });
    const next = normalizeHeader({
      title: hasTitle ? incoming.title : current.title,
      imageUrl: hasImageUrl ? incoming.imageUrl : current.imageUrl,
      originalImageUrl: hasOriginalImageUrl ? incoming.originalImageUrl : current.originalImageUrl,
      imageFileId: hasImageFileId ? incoming.imageFileId : current.imageFileId,
      originalImageFileId: hasOriginalImageFileId ? incoming.originalImageFileId : current.originalImageFileId,
      imageMediaType: hasImageMediaType ? incoming.imageMediaType : current.imageMediaType,
    });

    if (JSON.stringify(next) === JSON.stringify(current))
      return current;

    doc.transact(() => {
      if (next.title !== current.title)
        map.set("title", next.title);
      if (next.imageUrl !== current.imageUrl)
        map.set("imageUrl", next.imageUrl);
      if (next.originalImageUrl !== current.originalImageUrl)
        map.set("originalImageUrl", next.originalImageUrl);
      if (next.imageFileId !== current.imageFileId)
        setOptionalMapValue(map, "imageFileId", next.imageFileId);
      if (next.originalImageFileId !== current.originalImageFileId)
        setOptionalMapValue(map, "originalImageFileId", next.originalImageFileId);
      if (next.imageMediaType !== current.imageMediaType)
        setOptionalMapValue(map, "imageMediaType", next.imageMediaType);
    }, "tc_header:set");

    return next;
  }
  catch {
    return null;
  }
}

export function subscribeBlocksuiteDocHeader(
  store: any,
  onChange: (header: BlocksuiteDocHeader | null) => void,
): () => void {
  const doc = getSpaceDocFromStore(store);
  if (!doc)
    return () => {};

  let map: Y.Map<unknown>;
  try {
    map = doc.getMap<unknown>(HEADER_MAP_KEY);
  }
  catch {
    return () => {};
  }

  const emit = () => {
    try {
      onChange(normalizeHeader({
        title: readString(map, "title"),
        imageUrl: readString(map, "imageUrl"),
        originalImageUrl: readString(map, "originalImageUrl"),
        imageFileId: readNumber(map, "imageFileId"),
        originalImageFileId: readNumber(map, "originalImageFileId"),
        imageMediaType: readString(map, "imageMediaType"),
      }));
    }
    catch {
      onChange(null);
    }
  };

  emit();

  const handler = () => {
    emit();
  };

  try {
    map.observe(handler);
  }
  catch {
    return () => {};
  }

  return () => {
    try {
      map.unobserve(handler);
    }
    catch {
      // ignore
    }
  };
}

function setOptionalMapValue(map: Y.Map<unknown>, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") {
    map.delete(key);
    return;
  }
  map.set(key, value);
}
