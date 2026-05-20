import { describe, expect, it } from "vitest";

import { applySpaceRailOrder, moveSpaceRailId, pruneSpaceRailOrder } from "./spaceRailOrder";

describe("spaceRailOrder", () => {
  it("按用户保存顺序排列 space，未知项保留原始相对顺序", () => {
    const spaces = [{ spaceId: 1 }, { spaceId: 2 }, { spaceId: 3 }, { spaceId: 4 }];

    expect(applySpaceRailOrder(spaces, [3, 1]).map(space => space.spaceId)).toEqual([3, 1, 2, 4]);
  });

  it("拖动时把指定 space id 移动到目标索引", () => {
    expect(moveSpaceRailId([1, 2, 3, 4], 1, 3)).toEqual([1, 3, 4, 2]);
    expect(moveSpaceRailId([1, 2, 3, 4], 3, 0)).toEqual([4, 1, 2, 3]);
  });

  it("清理已经不存在和重复的 id，并补齐新增 space", () => {
    const spaces = [{ spaceId: 2 }, { spaceId: 4 }, { spaceId: 5 }];

    expect(pruneSpaceRailOrder([4, 9, 4, 2], spaces)).toEqual([4, 2, 5]);
  });
});
