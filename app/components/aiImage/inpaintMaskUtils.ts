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

export type MaskGridBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

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

export function erodeMaskGrid(mask: Uint8Array, width: number, height: number, radius: number, shape: "round" | "square" = "round") {
  if (radius <= 0)
    return mask.slice();

  const eroded = mask.slice();
  const offsets = createMaskBorderOffsets(radius, shape);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index] !== 1) {
        eroded[index] = 0;
        continue;
      }

      for (const offset of offsets) {
        const nextX = x + offset.x;
        const nextY = y + offset.y;
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
          eroded[index] = 0;
          break;
        }
        if (mask[nextY * width + nextX] !== 1) {
          eroded[index] = 0;
          break;
        }
      }
    }
  }
  return eroded;
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

export function findMaskGridBounds(mask: Uint8Array, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index] !== 1)
        continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY)
    return null;

  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  } satisfies MaskGridBounds;
}

export function buildRoundedRectMaskGrid(bounds: MaskGridBounds, width: number, height: number, options?: {
  padding?: number;
  cornerRadius?: number;
}) {
  const padding = Math.max(0, Math.round(options?.padding ?? 0));
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(width - 1, bounds.right + padding);
  const bottom = Math.min(height - 1, bounds.bottom + padding);
  const rectWidth = right - left + 1;
  const rectHeight = bottom - top + 1;
  const radius = Math.max(0, Math.min(
    Math.round(options?.cornerRadius ?? 0),
    Math.floor(rectWidth / 2),
    Math.floor(rectHeight / 2),
  ));
  const mask = new Uint8Array(width * height);

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      let inside = true;
      if (radius > 0) {
        const cornerLeft = left + radius;
        const cornerRight = right - radius;
        const cornerTop = top + radius;
        const cornerBottom = bottom - radius;
        if (x < cornerLeft && y < cornerTop) {
          const dx = x - cornerLeft;
          const dy = y - cornerTop;
          inside = dx * dx + dy * dy <= radius * radius;
        }
        else if (x > cornerRight && y < cornerTop) {
          const dx = x - cornerRight;
          const dy = y - cornerTop;
          inside = dx * dx + dy * dy <= radius * radius;
        }
        else if (x < cornerLeft && y > cornerBottom) {
          const dx = x - cornerLeft;
          const dy = y - cornerBottom;
          inside = dx * dx + dy * dy <= radius * radius;
        }
        else if (x > cornerRight && y > cornerBottom) {
          const dx = x - cornerRight;
          const dy = y - cornerBottom;
          inside = dx * dx + dy * dy <= radius * radius;
        }
      }
      if (inside)
        mask[y * width + x] = 1;
    }
  }

  return mask;
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
