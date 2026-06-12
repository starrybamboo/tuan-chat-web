import { describe, expect, it } from "vitest";

import { createUniqueQuerySlots, mapUniqueQueryResults } from "./querySlots";

describe("querySlots", () => {
  it("会去重相同查询槽并保留原输入的结果索引", () => {
    const slots = createUniqueQuerySlots(
      [12, 12, 7, 0, 0, 12],
      (roleId, index) => roleId > 0 ? String(roleId) : `invalid:${index}`,
    );

    expect(slots.queryItems).toEqual([
      { item: 12, originalIndex: 0 },
      { item: 7, originalIndex: 2 },
      { item: 0, originalIndex: 3 },
      { item: 0, originalIndex: 4 },
    ]);
    expect(slots.resultIndexes).toEqual([0, 0, 1, 2, 3, 0]);
  });

  it("会按原输入顺序回填重复查询结果", () => {
    const slots = createUniqueQuerySlots(
      [2, 3, 2, 4],
      roleId => String(roleId),
    );

    const results = mapUniqueQueryResults(
      ["role-2", "role-3", "role-4"],
      slots.resultIndexes,
    );

    expect(results).toEqual(["role-2", "role-3", "role-2", "role-4"]);
  });

  it("结果槽缺失时会抛错，避免静默错位", () => {
    expect(() => mapUniqueQueryResults(["only"], [0, 1])).toThrow("Missing useQueries result for slot 1");
  });
});
