import { describe, expect, it } from "vitest";

import { findFocusedMaskBounds, resolveFocusedCropRect, resolveFocusedTargetSize } from "@/components/aiImage/inpaintFocusUtils";

describe("inpaintFocusUtils", () => {
  it("finds mask bounds from opaque pixels", () => {
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

    expect(findFocusedMaskBounds(data, width, height)).toEqual({
      left: 2,
      top: 1,
      right: 4,
      bottom: 3,
      width: 3,
      height: 3,
    });
  });

  it("keeps focused crop inside image bounds and scales target size to valid multiples", () => {
    const cropRect = resolveFocusedCropRect({
      left: 300,
      top: 320,
      right: 420,
      bottom: 450,
      width: 121,
      height: 131,
    }, 832, 1216);

    expect(cropRect.left).toBeGreaterThanOrEqual(0);
    expect(cropRect.top).toBeGreaterThanOrEqual(0);
    expect(cropRect.left + cropRect.width).toBeLessThanOrEqual(832);
    expect(cropRect.top + cropRect.height).toBeLessThanOrEqual(1216);

    const targetSize = resolveFocusedTargetSize(cropRect.width, cropRect.height);
    expect(targetSize.width % 64).toBe(0);
    expect(targetSize.height % 64).toBe(0);
    expect(targetSize.width).toBeLessThanOrEqual(1024);
    expect(targetSize.height).toBeLessThanOrEqual(1024);
    expect(targetSize.width).toBeGreaterThanOrEqual(256);
    expect(targetSize.height).toBeGreaterThanOrEqual(256);
  });
});
