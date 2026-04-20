export type MaskPattern = "solid" | "stripe" | "checker" | "dots" | "grid" | "cross" | "blocks";

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

export const MASK_PATTERN_OPTIONS: Array<{ id: MaskPattern; label: string }> = [
  { id: "solid", label: "Solid" },
  { id: "stripe", label: "Stripe" },
  { id: "checker", label: "Checker" },
  { id: "dots", label: "Dots" },
  { id: "grid", label: "Grid" },
  { id: "cross", label: "Cross" },
  { id: "blocks", label: "Blocks" },
];

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

export function createMaskBorderOffsets(radius: number) {
  const normalizedRadius = Math.max(1, Math.round(radius));
  const offsets: Array<{ x: number; y: number }> = [];

  for (let y = -normalizedRadius; y <= normalizedRadius; y += 1) {
    for (let x = -normalizedRadius; x <= normalizedRadius; x += 1) {
      if (x === 0 && y === 0)
        continue;
      if (Math.hypot(x, y) > normalizedRadius + 0.2)
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

export function buildMaskPaintStyle(
  context: CanvasRenderingContext2D,
  color: string,
  opacity: number,
  pattern: MaskPattern,
) {
  const alpha = Math.max(0.05, Math.min(1, opacity / 100));
  const solidColor = buildMaskSolidColor(color, opacity);
  if (pattern === "solid")
    return solidColor;

  const tile = document.createElement("canvas");
  tile.width = 24;
  tile.height = 24;
  const tileContext = tile.getContext("2d");
  if (!tileContext)
    return solidColor;

  tileContext.clearRect(0, 0, tile.width, tile.height);
  tileContext.strokeStyle = solidColor;
  tileContext.fillStyle = solidColor;

  if (pattern === "stripe") {
    tileContext.lineWidth = 4;
    tileContext.beginPath();
    tileContext.moveTo(-4, 24);
    tileContext.lineTo(24, -4);
    tileContext.stroke();
  }
  else if (pattern === "checker") {
    tileContext.globalAlpha = alpha;
    tileContext.fillRect(0, 0, 8, 8);
    tileContext.fillRect(16, 0, 8, 8);
    tileContext.fillRect(8, 8, 8, 8);
    tileContext.fillRect(0, 16, 8, 8);
    tileContext.fillRect(16, 16, 8, 8);
  }
  else if (pattern === "dots") {
    tileContext.beginPath();
    tileContext.arc(6, 6, 2.1, 0, Math.PI * 2);
    tileContext.arc(18, 6, 2.1, 0, Math.PI * 2);
    tileContext.arc(12, 18, 2.1, 0, Math.PI * 2);
    tileContext.fill();
  }
  else if (pattern === "grid") {
    tileContext.lineWidth = 1.6;
    tileContext.beginPath();
    tileContext.moveTo(0, 8);
    tileContext.lineTo(24, 8);
    tileContext.moveTo(0, 16);
    tileContext.lineTo(24, 16);
    tileContext.moveTo(8, 0);
    tileContext.lineTo(8, 24);
    tileContext.moveTo(16, 0);
    tileContext.lineTo(16, 24);
    tileContext.stroke();
  }
  else if (pattern === "cross") {
    tileContext.lineWidth = 2;
    tileContext.beginPath();
    tileContext.moveTo(6, 6);
    tileContext.lineTo(18, 18);
    tileContext.moveTo(18, 6);
    tileContext.lineTo(6, 18);
    tileContext.stroke();
  }
  else {
    tileContext.fillRect(2, 2, 6, 6);
    tileContext.fillRect(16, 2, 6, 6);
    tileContext.fillRect(2, 16, 6, 6);
    tileContext.fillRect(16, 16, 6, 6);
  }

  return context.createPattern(tile, "repeat") ?? solidColor;
}
