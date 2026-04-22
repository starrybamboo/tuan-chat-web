import type { InternalHistoryImageDragPayload } from "@/components/aiImage/types";

import { INTERNAL_HISTORY_IMAGE_DRAG_MIME } from "@/components/aiImage/constants";

export function extractImageFilesFromTransfer(dataTransfer: DataTransfer | null | undefined): File[] {
  if (!dataTransfer)
    return [];

  const fromItems = Array.from(dataTransfer.items ?? [])
    .filter(item => item.kind === "file")
    .map(item => item.getAsFile())
    .filter((file): file is File => Boolean(file))
    .filter((file) => {
      const type = String(file.type || "").toLowerCase();
      if (type.startsWith("image/"))
        return true;
      return /\.(?:png|jpe?g|gif|webp|bmp|avif)$/i.test(file.name);
    });
  if (fromItems.length)
    return fromItems;

  return Array.from(dataTransfer.files ?? []).filter((file) => {
    const type = String(file.type || "").toLowerCase();
    if (type.startsWith("image/"))
      return true;
    return /\.(?:png|jpe?g|gif|webp|bmp|avif)$/i.test(file.name);
  });
}

export function hasFileDrag(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer)
    return false;
  return Array.from(dataTransfer.types || []).includes("Files");
}

export function hasInternalHistoryImageDrag(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer)
    return false;
  return Array.from(dataTransfer.types || []).includes(INTERNAL_HISTORY_IMAGE_DRAG_MIME);
}

export function extractInternalHistoryImageDragPayload(dataTransfer: DataTransfer | null | undefined): InternalHistoryImageDragPayload | null {
  if (!dataTransfer || !hasInternalHistoryImageDrag(dataTransfer))
    return null;

  const raw = dataTransfer.getData(INTERNAL_HISTORY_IMAGE_DRAG_MIME);
  if (!raw)
    return null;

  try {
    const parsed = JSON.parse(raw) as Partial<InternalHistoryImageDragPayload>;
    if (!parsed || typeof parsed.dataUrl !== "string" || !parsed.dataUrl.trim())
      return null;
    return {
      dataUrl: parsed.dataUrl,
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : "history-image.png",
    };
  }
  catch {
    return null;
  }
}
