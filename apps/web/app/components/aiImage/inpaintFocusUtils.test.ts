import { describe, expect, it } from "vitest";

import {
  normalizeInpaintFocusRect,
  resolveFocusedTargetSize,
  resolveInpaintCompositeMaskGrid,
  resolveInpaintFocusRectFromPoints,
} from "@/components/aiImage/inpaintFocusUtils";

describe("inpaintFocusUtils", () => {
  it("preserves authored mask geometry when original-image overlay is enabled", () => {
    const width = 8;
    const height = 6;
    const data = new Uint8ClampedArray(width * height * 4);
    const setPixel = (x: number, y: number) => {
      const index = (y * width + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = 255;
    };
    setPixel(2, 1);
    setPixel(4, 3);

    const mask = resolveInpaintCompositeMaskGrid(data, width, height, true);
    expect([...mask].filter(Boolean)).toHaveLength(2);
    expect(mask[1 * width + 2]).toBe(1);
    expect(mask[3 * width + 4]).toBe(1);
    expect(mask[2 * width + 3]).toBe(0);
  });

  it("expands the authored mask before feathering when original-image overlay is disabled", () => {
    const width = 11;
    const height = 11;
    const data = new Uint8ClampedArray(width * height * 4);
    data[(5 * width + 5) * 4 + 3] = 255;

    const mask = resolveInpaintCompositeMaskGrid(data, width, height, false);
    expect(mask[5 * width + 5]).toBe(1);
    expect(mask[5 * width + 1]).toBe(1);
    expect(mask[1 * width + 5]).toBe(1);
    expect(mask[1 * width + 1]).toBe(0);
  });

  it("uses only an explicit focused-area drag and clamps it inside the image", () => {
    const cropRect = resolveInpaintFocusRectFromPoints(
      { x: 420, y: 450 },
      { x: 300, y: 320 },
      832,
      1216,
    );

    expect(cropRect).toEqual({ left: 300, top: 320, width: 120, height: 130 });
    expect(normalizeInpaintFocusRect({
      left: -20,
      top: 1200,
      width: 900,
      height: 100,
    }, 832, 1216)).toEqual({ left: 0, top: 1200, width: 832, height: 16 });

    const targetSize = resolveFocusedTargetSize(cropRect!.width, cropRect!.height);
    expect(targetSize.width % 64).toBe(0);
    expect(targetSize.height % 64).toBe(0);
    expect(targetSize.width).toBeLessThanOrEqual(1024);
    expect(targetSize.height).toBeLessThanOrEqual(1024);
    expect(targetSize.width).toBeGreaterThanOrEqual(256);
    expect(targetSize.height).toBeGreaterThanOrEqual(256);
  });
});
