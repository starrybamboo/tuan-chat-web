import type * as Y from "yjs";

export type BlocksuiteDocHeader = {
  title: string;
  imageUrl: string;
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

function normalizeHeader(raw: Partial<BlocksuiteDocHeader> | null | undefined): BlocksuiteDocHeader {
  return {
    title: String(raw?.title ?? "").trim(),
    imageUrl: String(raw?.imageUrl ?? "").trim(),
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
    });

    // 只在缺失时补齐，避免覆盖已有数据。
    const next: BlocksuiteDocHeader = {
      title: current.title || desired.title,
      imageUrl: current.imageUrl || desired.imageUrl,
    };

    if (next.title !== current.title || next.imageUrl !== current.imageUrl) {
      doc.transact(() => {
        if (next.title !== current.title)
          map.set("title", next.title);
        if (next.imageUrl !== current.imageUrl)
          map.set("imageUrl", next.imageUrl);
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

  try {
    const map = doc.getMap<unknown>(HEADER_MAP_KEY);
    const current = normalizeHeader({
      title: readString(map, "title"),
      imageUrl: readString(map, "imageUrl"),
    });
    const next = normalizeHeader({
      title: hasTitle ? incoming.title : current.title,
      imageUrl: hasImageUrl ? incoming.imageUrl : current.imageUrl,
    });

    if (next.title === current.title && next.imageUrl === current.imageUrl)
      return current;

    doc.transact(() => {
      if (next.title !== current.title)
        map.set("title", next.title);
      if (next.imageUrl !== current.imageUrl)
        map.set("imageUrl", next.imageUrl);
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
