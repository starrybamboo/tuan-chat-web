import { describe, expect, it } from "vitest";

import {
  applyRoomDndMapUpsert,
  applyRoomDndTokenRemove,
  applyRoomDndTokenUpsert,
} from "./room-dnd-map";

describe("room dnd map optimistic helpers", () => {
  it("地图更新合并网格设置并按请求清空标记", () => {
    expect(applyRoomDndMapUpsert({
      gridColor: "#111111",
      gridCols: 10,
      gridRows: 10,
      roomId: 9,
      tokens: [{ colIndex: 1, roleId: 7, rowIndex: 1 }],
    }, 9, {
      clearTokens: true,
      gridCols: 12,
    })).toEqual({
      gridColor: "#111111",
      gridCols: 12,
      gridRows: 10,
      roomId: 9,
      tokens: [],
    });
  });

  it("标记更新按角色覆盖位置，删除时只移除目标角色", () => {
    const first = applyRoomDndTokenUpsert(null, 9, { colIndex: 2, roleId: 7, rowIndex: 3 });
    const moved = applyRoomDndTokenUpsert(first, 9, { colIndex: 5, roleId: 7, rowIndex: 6 });
    const withSecond = applyRoomDndTokenUpsert(moved, 9, { colIndex: 1, roleId: 8, rowIndex: 1 });

    expect(withSecond.tokens).toEqual([
      { colIndex: 5, roleId: 7, rowIndex: 6 },
      { colIndex: 1, roleId: 8, rowIndex: 1 },
    ]);
    expect(applyRoomDndTokenRemove(withSecond, 7)?.tokens).toEqual([
      { colIndex: 1, roleId: 8, rowIndex: 1 },
    ]);
  });
});
