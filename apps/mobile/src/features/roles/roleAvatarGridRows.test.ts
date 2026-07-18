import { describe, expect, it } from "vitest";

import { buildRoleAvatarGridRows } from "./roleAvatarGridRows";

describe("buildRoleAvatarGridRows", () => {
  it("把头像完整拆成固定列数的静态行，避免嵌套纵向列表裁剪", () => {
    const items = Array.from({ length: 16 }, (_, index) => index + 1);

    expect(buildRoleAvatarGridRows(items, 4)).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
  });

  it("最后一行保留不足列数的头像", () => {
    expect(buildRoleAvatarGridRows([1, 2, 3, 4, 5], 4)).toEqual([[1, 2, 3, 4], [5]]);
  });
});
