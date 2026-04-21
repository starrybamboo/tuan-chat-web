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

export const NOVELAI_MASK_LAYER_SCALE_FACTOR = 8;

export type MaskDrawShape = "circle" | "square";

export interface MaskBufferSize {
  width: number;
  height: number;
}

export interface MaskRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PixelSnappedCircleMaskStamp {
  centerX: number;
  centerY: number;
  left: number;
  top: number;
  radius: number;
  size: number;
}

export interface MaskOutlineSegment {
  orientation: "horizontal" | "vertical";
  left: number;
  top: number;
  length: number;
}

export type PixelCircleMaskOutlineSegment = MaskOutlineSegment;

export type MaskGridBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function resolveNovelAiMaskBufferSize(sourceWidth: number, sourceHeight: number): MaskBufferSize {
  // NovelAI stores mask layers at 1/8 resolution, then scales them back up for preview/export.
  return {
    width: Math.max(1, Math.floor(Math.max(1, sourceWidth) / NOVELAI_MASK_LAYER_SCALE_FACTOR)),
    height: Math.max(1, Math.floor(Math.max(1, sourceHeight) / NOVELAI_MASK_LAYER_SCALE_FACTOR)),
  };
}

export function mapSourcePointToMaskPoint(
  point: { x: number; y: number },
  sourceSize: MaskBufferSize,
  maskSize: MaskBufferSize,
) {
  if (sourceSize.width <= 0 || sourceSize.height <= 0)
    return { x: point.x, y: point.y };

  return {
    x: point.x * (maskSize.width / sourceSize.width),
    y: point.y * (maskSize.height / sourceSize.height),
  };
}

export function projectMaskRectToSourceRect(
  rect: MaskRectLike,
  sourceSize: MaskBufferSize,
  maskSize: MaskBufferSize,
) {
  const scaleX = maskSize.width > 0 ? sourceSize.width / maskSize.width : 1;
  const scaleY = maskSize.height > 0 ? sourceSize.height / maskSize.height : 1;
  return {
    left: rect.left * scaleX,
    top: rect.top * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

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

export function normalizeMaskBrushSize(brushSize: number, shape: MaskDrawShape) {
  const clampedSize = Math.max(4, Math.min(50, Math.round(brushSize)));
  if (shape === "square")
    return clampedSize;
  return Math.max(4, 2 * Math.round(clampedSize / 2));
}

export function mapDisplaySizeToCanvasSize(displaySize: number, canvasSize: number, renderedSize: number) {
  if (canvasSize <= 0 || renderedSize <= 0)
    return Math.max(1, displaySize);
  return (displaySize * canvasSize) / renderedSize;
}

export function resolveSquareMaskStampRect(centerX: number, centerY: number, size: number) {
  const stampSize = Math.max(1, Math.round(size));
  return {
    left: Math.round(centerX - stampSize / 2),
    top: Math.round(centerY - stampSize / 2),
    width: stampSize,
    height: stampSize,
  };
}

function resolvePixelSnappedBrushCenter(position: number, radius: number) {
  return Math.round(position - radius) + radius;
}

function resolvePixelSnappedCircleCenter(position: number) {
  return Math.floor(position) + 0.5;
}

function resolvePixelSnappedMaskLineStampCount(distance: number, radius: number) {
  return Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.25)));
}

export function resolvePixelSnappedSquareMaskStampRect(centerX: number, centerY: number, size: number) {
  const stampSize = Math.max(1, Math.round(size));
  const radius = stampSize / 2;
  const snappedCenterX = resolvePixelSnappedBrushCenter(centerX, radius);
  const snappedCenterY = resolvePixelSnappedBrushCenter(centerY, radius);
  return {
    left: Math.round(snappedCenterX - radius),
    top: Math.round(snappedCenterY - radius),
    width: stampSize,
    height: stampSize,
  };
}

export function buildPixelSnappedSquareMaskStampRects(
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number,
) {
  const stampSize = Math.max(1, Math.round(size));
  const radius = stampSize / 2;
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance <= 0)
    return [resolvePixelSnappedSquareMaskStampRect(from.x, from.y, stampSize)];

  // Match NovelAI's line-stamp density: ceil(distance / max(1, averageRadius * 0.25)).
  const stampCount = resolvePixelSnappedMaskLineStampCount(distance, radius);
  const rects: Array<ReturnType<typeof resolvePixelSnappedSquareMaskStampRect>> = [];
  let previousRectKey = "";

  for (let index = 0; index <= stampCount; index += 1) {
    const progress = index / stampCount;
    const stampRect = resolvePixelSnappedSquareMaskStampRect(
      from.x + deltaX * progress,
      from.y + deltaY * progress,
      stampSize,
    );
    const rectKey = `${stampRect.left},${stampRect.top},${stampRect.width},${stampRect.height}`;
    if (rectKey === previousRectKey)
      continue;
    previousRectKey = rectKey;
    rects.push(stampRect);
  }

  return rects;
}

export function resolvePixelSnappedCircleMaskStamp(centerX: number, centerY: number, radius: number): PixelSnappedCircleMaskStamp {
  const snappedRadius = Math.max(1, Math.round(radius));
  const snappedCenterX = resolvePixelSnappedCircleCenter(centerX);
  const snappedCenterY = resolvePixelSnappedCircleCenter(centerY);
  const size = snappedRadius * 2 + 1;
  return {
    centerX: snappedCenterX,
    centerY: snappedCenterY,
    left: Math.floor(snappedCenterX) - snappedRadius,
    top: Math.floor(snappedCenterY) - snappedRadius,
    radius: snappedRadius,
    size,
  };
}

export function buildPixelSnappedCircleMaskStamps(
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
) {
  const snappedRadius = Math.max(1, Math.round(radius));
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance <= 0)
    return [resolvePixelSnappedCircleMaskStamp(from.x, from.y, snappedRadius)];

  const stampCount = resolvePixelSnappedMaskLineStampCount(distance, snappedRadius);
  const stamps: PixelSnappedCircleMaskStamp[] = [];
  let previousStampKey = "";

  for (let index = 0; index <= stampCount; index += 1) {
    const progress = index / stampCount;
    const stamp = resolvePixelSnappedCircleMaskStamp(
      from.x + deltaX * progress,
      from.y + deltaY * progress,
      snappedRadius,
    );
    const stampKey = `${stamp.left},${stamp.top},${stamp.radius}`;
    if (stampKey === previousStampKey)
      continue;
    previousStampKey = stampKey;
    stamps.push(stamp);
  }

  return stamps;
}

const pixelCircleMaskDataCache = new Map<number, { data: Uint8Array; size: number }>();
const pixelCircleMaskOutlineDataCache = new Map<number, { data: Uint8Array; size: number }>();
const pixelCircleMaskOutlineSegmentCache = new Map<number, {
  size: number;
  segments: PixelCircleMaskOutlineSegment[];
}>();

export function getPixelCircleMaskData(radius: number) {
  const snappedRadius = Math.max(1, Math.round(radius));
  const cached = pixelCircleMaskDataCache.get(snappedRadius);
  if (cached)
    return cached;

  const size = snappedRadius * 2 + 1;
  const data = new Uint8Array(size * size);
  const markPixel = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size)
      return;
    data[y * size + x] = 1;
  };

  for (let y = 0; y <= snappedRadius; y += 1) {
    for (let x = 0; x <= snappedRadius; x += 1) {
      const outerDistance = Math.sqrt((x + 0.5) * (x + 0.5) + (y + 0.5) * (y + 0.5));
      const innerDistance = Math.sqrt((x - 0.5) * (x - 0.5) + (y - 0.5) * (y - 0.5));
      if (Math.min(outerDistance, innerDistance) > snappedRadius)
        continue;

      markPixel(snappedRadius + x, snappedRadius + y);
      markPixel(snappedRadius - x, snappedRadius + y);
      markPixel(snappedRadius + x, snappedRadius - y);
      markPixel(snappedRadius - x, snappedRadius - y);
    }
  }

  const nextValue = { data, size };
  pixelCircleMaskDataCache.set(snappedRadius, nextValue);
  return nextValue;
}

export function getPixelCircleMaskOutlineData(radius: number) {
  const snappedRadius = Math.max(1, Math.round(radius));
  const cached = pixelCircleMaskOutlineDataCache.get(snappedRadius);
  if (cached)
    return cached;

  const circle = getPixelCircleMaskData(snappedRadius);
  const outline = new Uint8Array(circle.data.length);
  const isFilled = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= circle.size || y >= circle.size)
      return 0;
    return circle.data[y * circle.size + x];
  };

  for (let y = 0; y < circle.size; y += 1) {
    for (let x = 0; x < circle.size; x += 1) {
      const index = y * circle.size + x;
      if (circle.data[index] !== 1)
        continue;
      let hasOutsideNeighbor = false;
      for (let offsetY = -1; offsetY <= 1 && !hasOutsideNeighbor; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0)
            continue;
          if (isFilled(x + offsetX, y + offsetY) !== 1) {
            hasOutsideNeighbor = true;
            break;
          }
        }
      }
      if (hasOutsideNeighbor)
        outline[index] = 1;
    }
  }

  const nextValue = {
    data: outline,
    size: circle.size,
  };
  pixelCircleMaskOutlineDataCache.set(snappedRadius, nextValue);
  return nextValue;
}

export function getPixelCircleMaskOutlineSegments(radius: number) {
  const snappedRadius = Math.max(1, Math.round(radius));
  const cached = pixelCircleMaskOutlineSegmentCache.get(snappedRadius);
  if (cached)
    return cached;

  const circle = getPixelCircleMaskData(snappedRadius);
  const segments = buildMaskOutlineSegments(circle.data, circle.size, circle.size);

  const nextValue = {
    size: circle.size,
    segments,
  };
  pixelCircleMaskOutlineSegmentCache.set(snappedRadius, nextValue);
  return nextValue;
}

export function buildMaskOutlineSegments(mask: Uint8Array, width: number, height: number) {
  const segments: MaskOutlineSegment[] = [];
  const isFilled = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height)
      return 0;
    return mask[y * width + x];
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] !== 1)
        continue;

      if (isFilled(x, y - 1) !== 1) {
        segments.push({
          orientation: "horizontal",
          left: x,
          top: y,
          length: 1,
        });
      }
      if (isFilled(x, y + 1) !== 1) {
        segments.push({
          orientation: "horizontal",
          left: x,
          top: y + 1,
          length: 1,
        });
      }
      if (isFilled(x - 1, y) !== 1) {
        segments.push({
          orientation: "vertical",
          left: x,
          top: y,
          length: 1,
        });
      }
      if (isFilled(x + 1, y) !== 1) {
        segments.push({
          orientation: "vertical",
          left: x + 1,
          top: y,
          length: 1,
        });
      }
    }
  }

  return segments;
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
