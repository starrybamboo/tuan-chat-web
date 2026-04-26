export type InpaintViewportSize = {
  width: number;
  height: number;
};

export type InpaintViewportTransform = {
  zoom: number;
  panX: number;
  panY: number;
};

const INPAINT_MIN_ZOOM = 0.5;
const INPAINT_MAX_ZOOM = 4;
export const INPAINT_ZOOM_STEP = 1.15;

export function clampInpaintZoom(value: number) {
  if (!Number.isFinite(value))
    return 1;
  return Math.min(INPAINT_MAX_ZOOM, Math.max(INPAINT_MIN_ZOOM, value));
}

export function resolveInpaintViewportSize(element: HTMLDivElement | null): InpaintViewportSize {
  if (!element)
    return { width: 0, height: 0 };
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(0, Math.floor(rect.width)),
    height: Math.max(0, Math.floor(rect.height)),
  };
}

export function resolveCenteredViewportPan(viewport: InpaintViewportSize, content: { width: number; height: number }) {
  return {
    x: (viewport.width - content.width) / 2,
    y: (viewport.height - content.height) / 2,
  };
}

export function clampViewportPan(
  pan: { x: number; y: number },
  viewport: InpaintViewportSize,
  content: { width: number; height: number },
) {
  const centered = resolveCenteredViewportPan(viewport, content);
  return {
    x: content.width <= viewport.width
      ? centered.x
      : Math.min(0, Math.max(viewport.width - content.width, pan.x)),
    y: content.height <= viewport.height
      ? centered.y
      : Math.min(0, Math.max(viewport.height - content.height, pan.y)),
  };
}
