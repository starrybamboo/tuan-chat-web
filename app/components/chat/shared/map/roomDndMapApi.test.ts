import { describe, expect, it } from "vitest";

import { applyRoomDndMapChange } from "./roomDndMapApi";

describe("roomDndMapApi", () => {
  it("通过地图元数据变更更新缓存快照", () => {
    const next = applyRoomDndMapChange(null, {
      roomId: 11,
      op: "map_upsert",
      map: {
        mapFileId: 101,
        gridRows: 12,
        gridCols: 13,
        gridColor: "#123456",
      },
      updatedAt: 1710100000000,
    });

    expect(next).toMatchObject({
      roomId: 11,
      mapFileId: 101,
      gridRows: 12,
      gridCols: 13,
      gridColor: "#123456",
      tokens: [],
      updatedAt: 1710100000000,
    });
  });

  it("地图清除时返回空快照", () => {
    const next = applyRoomDndMapChange({
      roomId: 11,
      mapFileId: 101,
      gridRows: 12,
      gridCols: 13,
      gridColor: "#123456",
      tokens: [{ roleId: 1, rowIndex: 2, colIndex: 3 }],
    }, {
      roomId: 11,
      op: "map_clear",
    });

    expect(next).toBeNull();
  });
});
