import { createMaskBorderOffsets, hasAnyMaskAlpha } from "@/components/aiImage/inpaintMaskUtils";

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
});
