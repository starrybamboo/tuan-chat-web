export const DOC_REF_MIME = "application/x-tc-doc-ref";

export type DocRefDragPayload = {
  docId: string;
  /** 仅用于同一 space 校验/降级提示 */
  spaceId?: number;
  /** 发送时的标题兜底（预览加载前展示） */
  title?: string;
  /** 发送时的封面兜底（预览加载前展示） */
  imageUrl?: string;
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

  return {
    docId,
    ...(spaceId ? { spaceId } : {}),
    ...(title ? { title } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

export function setDocRefDragData(dataTransfer: DataTransfer, payload: DocRefDragPayload): void {
  try {
    dataTransfer.setData(DOC_REF_MIME, JSON.stringify(payload));
  }
  catch {
    // ignore
  }

  // 兜底：某些环境下自定义 MIME 可能不可用，用 text/plain 留个标记。
  try {
    if (!dataTransfer.getData("text/plain")) {
      dataTransfer.setData("text/plain", `tc-doc-ref:${payload.docId}`);
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
    // 兜底：尝试从 text/plain 读取 `tc-doc-ref:<docId>`
    try {
      const plain = dataTransfer.getData("text/plain") || "";
      const trimmed = plain.trim();
      if (trimmed.startsWith("tc-doc-ref:")) {
        const docId = trimmed.slice("tc-doc-ref:".length).trim();
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
    return Array.from(dataTransfer.types || []).includes(DOC_REF_MIME);
  }
  catch {
    return false;
  }
}
