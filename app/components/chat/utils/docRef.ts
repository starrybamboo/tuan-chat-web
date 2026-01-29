export const DOC_REF_MIME = "application/x-tc-doc-ref";
const DOC_REF_FALLBACK_PREFIX = "tc-doc-ref:";

export type DocRefDragPayload = {
  docId: string;
  /** 仅用于同一 space 校验/降级提示 */
  spaceId?: number;
  /** 发送时的标题兜底（预览加载前展示） */
  title?: string;
  /** 发送时的封面兜底（预览加载前展示） */
  imageUrl?: string;
  /** 发送时的摘要兜底（预览加载前展示） */
  excerpt?: string;
};

function normalizePayload(raw: any): DocRefDragPayload | null {
  const docId = typeof raw?.docId === "string" ? raw.docId.trim() : "";
  if (!docId)
    return null;

  const spaceIdRaw = raw?.spaceId;
  const spaceId = (typeof spaceIdRaw === "number" && Number.isFinite(spaceIdRaw) && spaceIdRaw > 0)
    ? spaceIdRaw
    : undefined;

  const title = typeof raw?.title === "string" ? raw.title.trim() : "";
  const imageUrl = typeof raw?.imageUrl === "string" ? raw.imageUrl.trim() : "";
  const excerpt = typeof raw?.excerpt === "string" ? raw.excerpt.trim() : "";

  return {
    docId,
    ...(spaceId ? { spaceId } : {}),
    ...(title ? { title } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(excerpt ? { excerpt: excerpt.slice(0, 512) } : {}),
  };
}

export function setDocRefDragData(dataTransfer: DataTransfer, payload: DocRefDragPayload): void {
  try {
    dataTransfer.setData(DOC_REF_MIME, JSON.stringify(payload));
  }
  catch {
    // ignore
  }

  // 兜底：某些环境下自定义 MIME 可能不可用。
  // - `text/uri-list` 在不少环境里比自定义 MIME 更稳定
  // - 不覆写现有的 `text/plain`（侧边栏节点移动/排序依赖它）
  try {
    dataTransfer.setData("text/uri-list", `${DOC_REF_FALLBACK_PREFIX}${payload.docId}`);
  }
  catch {
    // ignore
  }

  // 兜底：有些环境下 `text/uri-list` 的非 URL 内容会被吞掉；`text/plain` 通常更可靠。
  // 注意：侧边栏节点移动/排序依赖 `text/plain`，因此仅在当前为空时才写入。
  try {
    const existingPlain = dataTransfer.getData("text/plain") || "";
    if (!existingPlain.trim()) {
      dataTransfer.setData("text/plain", `${DOC_REF_FALLBACK_PREFIX}${payload.docId}`);
    }
  }
  catch {
    // ignore
  }
}

export function getDocRefDragData(dataTransfer: DataTransfer | null | undefined): DocRefDragPayload | null {
  if (!dataTransfer)
    return null;

  try {
    const raw = dataTransfer.getData(DOC_REF_MIME);
    if (!raw)
      throw new Error("no-mime");
    const parsed = JSON.parse(raw);
    return normalizePayload(parsed);
  }
  catch {
    // 兜底 1：尝试从 text/uri-list 读取 `tc-doc-ref:<docId>`
    try {
      const uriList = dataTransfer.getData("text/uri-list") || "";
      const first = uriList.split(/\r?\n/).map(s => s.trim()).find(Boolean) || "";
      if (first.startsWith(DOC_REF_FALLBACK_PREFIX)) {
        const docId = first.slice(DOC_REF_FALLBACK_PREFIX.length).trim();
        return docId ? { docId } : null;
      }
    }
    catch {
      // ignore
    }

    // 兜底：尝试从 text/plain 读取 `tc-doc-ref:<docId>`
    try {
      const plain = dataTransfer.getData("text/plain") || "";
      const trimmed = plain.trim();
      if (trimmed.startsWith(DOC_REF_FALLBACK_PREFIX)) {
        const docId = trimmed.slice(DOC_REF_FALLBACK_PREFIX.length).trim();
        return docId ? { docId } : null;
      }
    }
    catch {
      // ignore
    }
    return null;
  }
}

export function isDocRefDrag(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer)
    return false;
  try {
    const types = Array.from(dataTransfer.types || []);
    if (types.includes(DOC_REF_MIME))
      return true;
    // `text/uri-list` 兜底：用于在 dragover 阶段也能可靠 detect（某些环境下无法读取自定义 MIME 的内容）。
    // 注意：文件拖拽也可能带有 uri-list，因此需排除 Files。
    if (types.includes("text/uri-list") && !types.includes("Files"))
      return true;

    // 兜底：某些环境下只会暴露 `text/plain` 类型（但 getData 仍可读到 `tc-doc-ref:*` 前缀）。
    if (types.includes("text/plain") && !types.includes("Files"))
      return true;

    // 兜底：部分环境 dragover 时 types 可能为空或不可靠，尝试用 payload 识别。
    return Boolean(getDocRefDragData(dataTransfer));
  }
  catch {
    return false;
  }
}
