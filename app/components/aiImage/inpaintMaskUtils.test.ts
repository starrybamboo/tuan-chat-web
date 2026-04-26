import {
  buildBinaryMaskGrid,
  buildMaskOutlineSegments,
  buildPixelSnappedCircleMaskStamps,
  buildPixelSnappedSquareMaskStampRects,
  buildRoundedRectMaskGrid,
  buildSolidInpaintMaskGrid,
  createMaskBorderOffsets,
  dilateMaskGrid,
  erodeMaskGrid,
  fillClosedMaskGrid,
  findMaskGridBounds,
  getPixelCircleMaskData,
  getPixelCircleMaskOutlineData,
  getPixelCircleMaskOutlineSegments,
  hasAnyMaskAlpha,
  mapBrushCursorDisplaySize,
  mapDisplaySizeToCanvasSize,
  mapSourcePointToMaskPoint,
  normalizeMaskBrushSize,
  projectMaskRectToSourceRect,
  renderMaskGridToRgba,
  resolveNovelAiMaskBufferSize,
  resolvePixelSnappedCircleMaskStamp,
  resolvePixelSnappedSquareMaskStampRect,
  resolveSquareMaskStampRect,
} from "@/components/aiImage/inpaintMaskUtils";

describe("inpaintMaskUtils", () => {
  it("detects whether the mask contains any alpha", () => {
    const emptyMask = new Uint8ClampedArray([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ]);
    const paintedMask = new Uint8ClampedArray([
      0,
      0,
      0,
      0,
      255,
      255,
      255,
      180,
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

  it("normalizes circle mask sizes to even values like NovelAI", () => {
    expect(normalizeMaskBrushSize(9, "circle")).toBe(10);
    expect(normalizeMaskBrushSize(10, "circle")).toBe(10);
    expect(normalizeMaskBrushSize(9, "square")).toBe(9);
  });

  it("maps preview size back to canvas size using the rendered ratio", () => {
    expect(mapDisplaySizeToCanvasSize(30, 1000, 500)).toBe(60);
    expect(mapDisplaySizeToCanvasSize(385, 2000, 1000)).toBe(770);
    expect(mapDisplaySizeToCanvasSize(20, 0, 0)).toBe(20);
  });

  it("resolves NovelAI-style mask buffers at 1/8 source resolution", () => {
    expect(resolveNovelAiMaskBufferSize(1024, 1024)).toEqual({
      width: 128,
      height: 128,
    });
    expect(resolveNovelAiMaskBufferSize(832, 1216)).toEqual({
      width: 104,
      height: 152,
    });
  });

  it("maps source-space pointer coordinates into mask-space coordinates", () => {
    expect(mapSourcePointToMaskPoint(
      { x: 80, y: 40 },
      { width: 1024, height: 1024 },
      { width: 128, height: 128 },
    )).toEqual({
      x: 10,
      y: 5,
    });
  });

  it("projects mask-space stamp bounds back into source-space bounds", () => {
    expect(projectMaskRectToSourceRect(
      { left: 10, top: 5, width: 4, height: 4 },
      { width: 1024, height: 1024 },
      { width: 128, height: 128 },
    )).toEqual({
      left: 80,
      top: 40,
      width: 32,
      height: 32,
    });
  });

  it("builds an integer-aligned square stamp rect", () => {
    expect(resolveSquareMaskStampRect(10.3, 7.8, 5.2)).toEqual({
      left: 8,
      top: 5,
      width: 5,
      height: 5,
    });
  });

  it("snaps square brush stamps with the NovelAI-style pixelSnap origin", () => {
    expect(resolvePixelSnappedSquareMaskStampRect(10.8, 7.2, 5)).toEqual({
      left: 8,
      top: 5,
      width: 5,
      height: 5,
    });
  });

  it("builds dense pixel-snapped square stroke stamps from raw pointer coordinates", () => {
    expect(buildPixelSnappedSquareMaskStampRects(
      { x: 10.8, y: 7.2 },
      { x: 12.2, y: 7.2 },
      5,
    )).toEqual([
      {
        left: 8,
        top: 5,
        width: 5,
        height: 5,
      },
      {
        left: 9,
        top: 5,
        width: 5,
        height: 5,
      },
      {
        left: 10,
        top: 5,
        width: 5,
        height: 5,
      },
    ]);
  });

  it("snaps circle brush stamps to half-pixel centers like NovelAI et(...)", () => {
    expect(resolvePixelSnappedCircleMaskStamp(10.8, 7.2, 2.4)).toEqual({
      centerX: 10.5,
      centerY: 7.5,
      left: 8,
      top: 5,
      radius: 2,
      size: 5,
    });
  });

  it("builds dense pixel-snapped circle stroke stamps from raw pointer coordinates", () => {
    expect(buildPixelSnappedCircleMaskStamps(
      { x: 10.2, y: 7.2 },
      { x: 12.8, y: 7.2 },
      2,
    )).toEqual([
      {
        centerX: 10.5,
        centerY: 7.5,
        left: 8,
        top: 5,
        radius: 2,
        size: 5,
      },
      {
        centerX: 11.5,
        centerY: 7.5,
        left: 9,
        top: 5,
        radius: 2,
        size: 5,
      },
      {
        centerX: 12.5,
        centerY: 7.5,
        left: 10,
        top: 5,
        radius: 2,
        size: 5,
      },
    ]);
  });

  it("builds a pixel circle bitmap instead of a generic anti-aliased arc", () => {
    const { data, size } = getPixelCircleMaskData(2);
    expect(size).toBe(5);
    expect(data[2 * size + 2]).toBe(1);
    expect(data[0]).toBe(0);
    expect(data[2]).toBe(1);
    expect(data[2 * size + 0]).toBe(1);
  });

  it("builds a pixel circle outline bitmap for cursor rendering", () => {
    const fill = getPixelCircleMaskData(2);
    const outline = getPixelCircleMaskOutlineData(2);

    expect(outline.size).toBe(fill.size);
    expect(outline.data[2 * outline.size + 2]).toBe(0);
    expect(outline.data[2]).toBe(1);

    let outlineCount = 0;
    for (let index = 0; index < outline.data.length; index += 1) {
      if (outline.data[index] !== 1)
        continue;
      outlineCount += 1;
      expect(fill.data[index]).toBe(1);
    }

    expect(outlineCount).toBeGreaterThan(0);
  });

  it("builds pixel circle outline segments on the outer edge for cursor rendering", () => {
    const outline = getPixelCircleMaskOutlineSegments(2);
    const serializedSegments = outline.segments.map(segment =>
      `${segment.orientation}:${segment.left},${segment.top},${segment.length}`);

    expect(outline.size).toBe(5);
    expect(serializedSegments).toContain("horizontal:2,0,1");
    expect(serializedSegments).toContain("vertical:0,2,1");
    expect(serializedSegments).not.toContain("horizontal:2,2,1");
    expect(serializedSegments.length).toBeGreaterThan(0);
  });

  it("builds generic mask outline segments without adding a full outer cell ring", () => {
    const mask = new Uint8Array([
      0,
      1,
      0,
      1,
      1,
      0,
      0,
      0,
      0,
    ]);
    const serializedSegments = buildMaskOutlineSegments(mask, 3, 3)
      .map(segment => `${segment.orientation}:${segment.left},${segment.top},${segment.length}`);

    expect(serializedSegments).toContain("horizontal:1,0,1");
    expect(serializedSegments).toContain("vertical:0,1,1");
    expect(serializedSegments).toContain("horizontal:0,2,1");
    expect(serializedSegments).not.toContain("horizontal:0,0,1");
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

  it("builds a padded rounded rectangle mask from bounds", () => {
    const mask = buildRoundedRectMaskGrid({
      left: 3,
      top: 3,
      right: 5,
      bottom: 5,
      width: 3,
      height: 3,
    }, 12, 12, {
      padding: 2,
      cornerRadius: 2,
    });

    expect(mask[5 * 12 + 5]).toBe(1);
    expect(mask[1 * 12 + 1]).toBe(0);
    expect(mask[3 * 12 + 3]).toBe(1);
    expect(mask[2 * 12 + 1]).toBe(0);
  });
});
