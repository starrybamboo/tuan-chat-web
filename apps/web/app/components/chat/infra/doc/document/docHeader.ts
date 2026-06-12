/**
 * 文档卡片与侧边栏共用的标题/封面信息。
 */
export type DocumentHeader = {
  title: string;
  imageUrl: string;
  originalImageUrl: string;
  imageFileId?: number;
  originalImageFileId?: number;
  imageMediaType?: string;
};

/**
 * 规整文档标题/封面信息，保证 UI 层拿到稳定字段。
 */
export function normalizeDocumentHeader(raw: Partial<DocumentHeader> | null | undefined): DocumentHeader {
  return {
    title: String(raw?.title ?? "").trim(),
    imageUrl: String(raw?.imageUrl ?? "").trim(),
    originalImageUrl: String(raw?.originalImageUrl ?? "").trim(),
    imageFileId: typeof raw?.imageFileId === "number" && raw.imageFileId > 0 ? raw.imageFileId : undefined,
    originalImageFileId: typeof raw?.originalImageFileId === "number" && raw.originalImageFileId > 0 ? raw.originalImageFileId : undefined,
    imageMediaType: String(raw?.imageMediaType ?? "").trim() || undefined,
  };
}
