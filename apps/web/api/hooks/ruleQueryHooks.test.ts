import { describe, expect, it } from "vitest";

import { rulePageInfiniteQueryKey } from "./ruleQueryHooks";

describe("ruleQueryHooks", () => {
  it("不同独立 pageSize 不会复用同一无限分页缓存", () => {
    const request = { keyword: "克苏鲁" };

    expect(rulePageInfiniteQueryKey(request, 10)).not.toEqual(rulePageInfiniteQueryKey(request, 20));
  });
});
