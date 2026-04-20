import {
  createMaskBorderOffsets,
  hasAnyMaskAlpha,
  mapDisplaySizeToCanvasSize,
  mapBrushCursorDisplaySize,
} from "@/components/aiImage/inpaintMaskUtils";

describe("inpaintMaskUtils", () => {
  it("detects whether the mask contains any alpha", () => {
    const emptyMask = new Uint8ClampedArray([
      0, 0, 0, 0,
      0, 0, 0, 0,
    ]);
    const paintedMask = new Uint8ClampedArray([
      0, 0, 0, 0,
      255, 255, 255, 180,
    ]);

    expect(hasAnyMaskAlpha(emptyMask)).toBe(false);
    expect(hasAnyMaskAlpha(paintedMask)).toBe(true);
  });

  it("builds unique border offsets around the mask body", () => {
    const offsets = createMaskBorderOffsets(1);
    const serializedOffsets = offsets.map(offset => `${offset.x},${offset.y}`);

    expect(serializedOffsets).toEqual([
      "0,-1",
      "-1,0",
      "1,0",
      "0,1",
    ]);
    expect(new Set(serializedOffsets).size).toBe(serializedOffsets.length);
  });

  it("builds square border offsets when requested", () => {
    const offsets = createMaskBorderOffsets(1, "square");
    const serializedOffsets = offsets.map(offset => `${offset.x},${offset.y}`);

    expect(serializedOffsets).toEqual([
      "-1,-1",
      "0,-1",
      "1,-1",
      "-1,0",
      "1,0",
      "-1,1",
      "0,1",
      "1,1",
    ]);
  });

  it("maps pen size to the requested preview dimensions", () => {
    expect(mapBrushCursorDisplaySize(4)).toBe(30);
    expect(mapBrushCursorDisplaySize(50)).toBe(385);
    expect(mapBrushCursorDisplaySize(27)).toBe(208);
  });

  it("maps preview size back to canvas size using the rendered ratio", () => {
    expect(mapDisplaySizeToCanvasSize(30, 1000, 500)).toBe(60);
    expect(mapDisplaySizeToCanvasSize(385, 2000, 1000)).toBe(770);
    expect(mapDisplaySizeToCanvasSize(20, 0, 0)).toBe(20);
  });
});
