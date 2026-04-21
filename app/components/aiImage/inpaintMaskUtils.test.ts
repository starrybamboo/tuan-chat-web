import {
  buildBinaryMaskGrid,
  buildSolidInpaintMaskGrid,
  createMaskBorderOffsets,
  dilateMaskGrid,
  erodeMaskGrid,
  findMaskGridBounds,
  fillClosedMaskGrid,
  hasAnyMaskAlpha,
  mapDisplaySizeToCanvasSize,
  mapBrushCursorDisplaySize,
  renderMaskGridToRgba,
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

  it("fills enclosed areas for a closed stroke mask", () => {
    const width = 7;
    const height = 7;
    const mask = new Uint8ClampedArray(width * height * 4);
    const paint = (x: number, y: number) => {
      const index = (y * width + x) * 4 + 3;
      mask[index] = 255;
    };

    for (let x = 1; x <= 5; x += 1) {
      paint(x, 1);
      paint(x, 5);
    }
    for (let y = 1; y <= 5; y += 1) {
      paint(1, y);
      paint(5, y);
    }

    const solid = buildSolidInpaintMaskGrid(mask, width, height, { closeRadius: 0 });
    expect(solid[3 * width + 3]).toBe(1);
    expect(solid[0]).toBe(0);
    expect(solid[width * height - 1]).toBe(0);
  });

  it("closes small gaps before filling the interior", () => {
    const width = 7;
    const height = 7;
    const raw = new Uint8ClampedArray(width * height * 4);
    const paint = (x: number, y: number) => {
      raw[(y * width + x) * 4 + 3] = 255;
    };

    for (let x = 1; x <= 5; x += 1) {
      if (x !== 3)
        paint(x, 1);
      paint(x, 5);
    }
    for (let y = 1; y <= 5; y += 1) {
      paint(1, y);
      paint(5, y);
    }

    const stroke = buildBinaryMaskGrid(raw);
    const closed = dilateMaskGrid(stroke, width, height, 1);
    const filled = fillClosedMaskGrid(closed, width, height);
    expect(filled[3 * width + 3]).toBe(1);

    const rgba = renderMaskGridToRgba(filled);
    expect(rgba[(3 * width + 3) * 4]).toBe(255);
    expect(rgba[(0 * width + 0) * 4]).toBe(0);
  });

  it("finds bounds and erodes the solid mask inward", () => {
    const width = 7;
    const height = 7;
    const mask = new Uint8Array(width * height);
    for (let y = 1; y <= 5; y += 1) {
      for (let x = 1; x <= 5; x += 1) {
        mask[y * width + x] = 1;
      }
    }

    expect(findMaskGridBounds(mask, width, height)).toEqual({
      left: 1,
      top: 1,
      right: 5,
      bottom: 5,
      width: 5,
      height: 5,
    });

    const eroded = erodeMaskGrid(mask, width, height, 1);
    expect(eroded[3 * width + 3]).toBe(1);
    expect(eroded[1 * width + 1]).toBe(0);
    expect(eroded[1 * width + 3]).toBe(0);
  });
});
