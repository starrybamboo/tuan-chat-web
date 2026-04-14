import { describe, expect, it } from "vitest";

import {
  MAX_GRID_DIMENSION,
  MIN_GRID_DIMENSION,
  buildTokenPositionStyle,
  clampGridDimension,
  resolveGridCellAtPoint,
} from "./roomDndMapGeometry";

describe("roomDndMapGeometry", () => {
  it("把网格尺寸裁剪到 1 到 1000 之间", () => {
    expect(clampGridDimension(0)).toBe(MIN_GRID_DIMENSION);
    expect(clampGridDimension(200.8)).toBe(200);
    expect(clampGridDimension(MAX_GRID_DIMENSION + 1)).toBe(MAX_GRID_DIMENSION);
  });

  it("把点击坐标准确映射到网格索引", () => {
    const cell = resolveGridCellAtPoint({
      clientX: 175,
      clientY: 260,
      rect: { left: 100, top: 200, width: 200, height: 100 },
      gridRows: 10,
      gridCols: 20,
    });

    expect(cell).toEqual({ rowIndex: 6, colIndex: 7 });
  });

  it("在右下边界上仍然落到最后一个格子", () => {
    const cell = resolveGridCellAtPoint({
      clientX: 300,
      clientY: 300,
      rect: { left: 100, top: 200, width: 200, height: 100 },
      gridRows: 10,
      gridCols: 20,
    });

    expect(cell).toEqual({ rowIndex: 9, colIndex: 19 });
  });

  it("超出网格区域时返回空结果", () => {
    const cell = resolveGridCellAtPoint({
      clientX: 99,
      clientY: 250,
      rect: { left: 100, top: 200, width: 200, height: 100 },
      gridRows: 10,
      gridCols: 20,
    });

    expect(cell).toBeNull();
  });

  it("按格子中心输出 token 定位百分比", () => {
    expect(buildTokenPositionStyle(1, 2, 4, 8)).toMatchObject({
      left: "31.25%",
      top: "37.5%",
      transform: "translate(-50%, -50%)",
    });
  });
});
