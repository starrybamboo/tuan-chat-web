const CHAT_DRAG_PREVIEW_SELECTOR = "[data-tuanchat-drag-preview=\"true\"]";

export type DragPreviewVariant = "message" | "room" | "doc" | "category" | "material" | "clue";

type SetDragPreviewParams = {
  dataTransfer: DataTransfer;
  title: string;
  subtitle?: string;
  variant: DragPreviewVariant;
  count?: number;
  sourceElement?: HTMLElement | null;
};

const variantLabels: Record<DragPreviewVariant, string> = {
  message: "消息",
  room: "房间",
  doc: "文档",
  category: "分类",
  material: "素材",
  clue: "线索",
};

export function cleanupDragPreview() {
  document.querySelectorAll(CHAT_DRAG_PREVIEW_SELECTOR).forEach(element => element.remove());
}

function applyTextStyle(element: HTMLElement, fontSize: string, opacity = "1") {
  Object.assign(element.style, {
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize,
    lineHeight: "18px",
    opacity,
  });
}

function sanitizeClonedPreview(preview: HTMLElement) {
  preview
    .querySelectorAll("[data-message-drag-handle=\"true\"], [data-message-insert-action=\"true\"]")
    .forEach(element => element.remove());
  preview.querySelectorAll<HTMLElement>("*").forEach((element) => {
    element.style.pointerEvents = "none";
  });
}

export function setDragPreview({
  dataTransfer,
  sourceElement,
  title,
  subtitle,
  variant,
  count,
}: SetDragPreviewParams) {
  cleanupDragPreview();

  if (sourceElement) {
    const rect = sourceElement.getBoundingClientRect();
    const preview = sourceElement.cloneNode(true) as HTMLElement;
    preview.dataset.tuanchatDragPreview = "true";
    preview.setAttribute("aria-hidden", "true");
    sanitizeClonedPreview(preview);

    Object.assign(preview.style, {
      position: "fixed",
      top: "-10000px",
      left: "-10000px",
      width: `${Math.max(1, rect.width)}px`,
      height: `${Math.max(1, rect.height)}px`,
      maxWidth: `${Math.max(1, rect.width)}px`,
      boxSizing: "border-box",
      margin: "0",
      transform: "none",
      transformOrigin: "top left",
      userSelect: "none",
      pointerEvents: "none",
      opacity: "0.72",
      filter: "drop-shadow(0 12px 24px rgba(0, 0, 0, 0.28))",
      zIndex: "2147483647",
    });

    document.body.appendChild(preview);
    dataTransfer.setDragImage(preview, Math.min(24, Math.max(12, rect.width / 4)), Math.min(24, Math.max(12, rect.height / 2)));
    window.setTimeout(() => preview.remove(), 0);
    return;
  }

  const preview = document.createElement("div");
  preview.dataset.tuanchatDragPreview = "true";
  preview.setAttribute("aria-hidden", "true");

  Object.assign(preview.style, {
    position: "fixed",
    top: "-10000px",
    left: "-10000px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "260px",
    maxWidth: "260px",
    padding: "8px 10px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.34)",
    background: "rgba(15, 23, 42, 0.92)",
    color: "white",
    boxShadow: "0 18px 34px rgba(0, 0, 0, 0.36)",
    pointerEvents: "none",
    opacity: "0.92",
    zIndex: "2147483647",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  });

  const badge = document.createElement("div");
  badge.textContent = variantLabels[variant];
  Object.assign(badge.style, {
    flex: "0 0 auto",
    padding: "2px 6px",
    borderRadius: "999px",
    background: "rgba(45, 212, 191, 0.18)",
    color: "rgb(153, 246, 228)",
    fontSize: "11px",
    lineHeight: "16px",
    fontWeight: "700",
  });

  const text = document.createElement("div");
  Object.assign(text.style, {
    minWidth: "0",
    flex: "1 1 auto",
  });

  const titleNode = document.createElement("div");
  titleNode.textContent = title.trim() || variantLabels[variant];
  applyTextStyle(titleNode, "13px");
  titleNode.style.fontWeight = "700";

  const subtitleText = subtitle?.trim() || (typeof count === "number" && count > 1 ? `${count} 项` : "");
  const subtitleNode = document.createElement("div");
  subtitleNode.textContent = subtitleText;
  applyTextStyle(subtitleNode, "11px", subtitleText ? "0.72" : "0");

  text.append(titleNode, subtitleNode);
  preview.append(badge, text);
  document.body.appendChild(preview);

  dataTransfer.setDragImage(preview, 18, 18);
  window.setTimeout(() => preview.remove(), 0);
}
