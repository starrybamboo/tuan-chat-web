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

export function buildBinaryMaskGrid(data: Uint8ClampedArray, alphaThreshold = 1) {
  const mask = new Uint8Array(Math.floor(data.length / 4));
  for (let pixelIndex = 0; pixelIndex < mask.length; pixelIndex += 1) {
    mask[pixelIndex] = data[pixelIndex * 4 + 3] >= alphaThreshold ? 1 : 0;
  }
  return mask;
}

export function dilateMaskGrid(mask: Uint8Array, width: number, height: number, radius: number, shape: "round" | "square" = "round") {
  if (radius <= 0)
    return mask.slice();

  const expanded = mask.slice();
  const offsets = createMaskBorderOffsets(radius, shape);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index] !== 1)
        continue;
      expanded[index] = 1;
      for (const offset of offsets) {
        const nextX = x + offset.x;
        const nextY = y + offset.y;
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height)
          continue;
        expanded[nextY * width + nextX] = 1;
      }
    }
  }
  return expanded;
}

export function fillClosedMaskGrid(mask: Uint8Array, width: number, height: number) {
  const outside = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let head = 0;
  let tail = 0;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height)
      return;
    const index = y * width + x;
    if (mask[index] === 1 || outside[index] === 1)
      return;
    outside[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  const filled = mask.slice();
  for (let index = 0; index < filled.length; index += 1) {
    if (outside[index] === 0)
      filled[index] = 1;
  }
  return filled;
}

export function buildSolidInpaintMaskGrid(data: Uint8ClampedArray, width: number, height: number, options?: {
  alphaThreshold?: number;
  closeRadius?: number;
  shape?: "round" | "square";
}) {
  const alphaThreshold = options?.alphaThreshold ?? 1;
  const closeRadius = options?.closeRadius ?? 2;
  const shape = options?.shape ?? "round";
  const strokeMask = buildBinaryMaskGrid(data, alphaThreshold);
  const closedMask = dilateMaskGrid(strokeMask, width, height, closeRadius, shape);
  return fillClosedMaskGrid(closedMask, width, height);
}

export function renderMaskGridToRgba(mask: Uint8Array) {
  const rgba = new Uint8ClampedArray(mask.length * 4);
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] === 1 ? 255 : 0;
    const baseIndex = index * 4;
    rgba[baseIndex] = value;
    rgba[baseIndex + 1] = value;
    rgba[baseIndex + 2] = value;
    rgba[baseIndex + 3] = 255;
  }
  return rgba;
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
