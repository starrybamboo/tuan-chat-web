export const MASK_COLOR_OPTIONS = [
  "#5b6dff",
  "#f0bd2d",
  "#d85ec3",
  "#46c6cf",
  "#f05d52",
  "#4fca67",
  "#b06bf1",
  "#f39d3f",
  "#4f99e0",
  "#c9c13e",
] as const;

export function hasAnyMaskAlpha(data: Uint8ClampedArray) {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] > 0)
      return true;
  }
  return false;
}

export function mapBrushCursorDisplaySize(brushSize: number) {
  const clampedSize = Math.min(50, Math.max(4, brushSize));
  return Math.round(30 + ((clampedSize - 4) * (385 - 30)) / (50 - 4));
}

export function mapDisplaySizeToCanvasSize(displaySize: number, canvasSize: number, renderedSize: number) {
  if (canvasSize <= 0 || renderedSize <= 0)
    return Math.max(1, displaySize);
  return (displaySize * canvasSize) / renderedSize;
}

export function createMaskBorderOffsets(radius: number, shape: "round" | "square" = "round") {
  const normalizedRadius = Math.max(1, Math.round(radius));
  const offsets: Array<{ x: number; y: number }> = [];

  for (let y = -normalizedRadius; y <= normalizedRadius; y += 1) {
    for (let x = -normalizedRadius; x <= normalizedRadius; x += 1) {
      if (x === 0 && y === 0)
        continue;
      if (shape === "round" && Math.hypot(x, y) > normalizedRadius + 0.2)
        continue;
      offsets.push({ x, y });
    }
  }

  return offsets;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized))
    return `rgba(246, 110, 139, ${alpha})`;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function buildMaskSolidColor(color: string, opacity: number) {
  const alpha = Math.max(0.05, Math.min(1, opacity / 100));
  return hexToRgba(color, alpha);
}
