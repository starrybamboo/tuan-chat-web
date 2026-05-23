export interface FloatingMenuPoint {
  x: number;
  y: number;
}

export interface FloatingMenuSize {
  width: number;
  height: number;
}

export function clampFloatingMenuPosition(
  anchor: FloatingMenuPoint,
  menuSize: FloatingMenuSize,
  viewportSize: FloatingMenuSize,
  padding = 8,
): FloatingMenuPoint {
  const maxLeft = Math.max(padding, viewportSize.width - menuSize.width - padding);
  const maxTop = Math.max(padding, viewportSize.height - menuSize.height - padding);

  return {
    x: Math.min(Math.max(padding, anchor.x), maxLeft),
    y: Math.min(Math.max(padding, anchor.y), maxTop),
  };
}
