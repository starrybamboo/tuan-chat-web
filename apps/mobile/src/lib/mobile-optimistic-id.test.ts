import { describe, expect, it } from "vitest";

import { createMobileOptimisticMessageId, createMobileOptimisticMessageIdSeed } from "./mobile-optimistic-id";

describe("mobile optimistic message id", () => {
  it("按启动时间生成彼此隔离的负数区间", () => {
    expect(createMobileOptimisticMessageIdSeed(1_000)).toBe(-1_000_000);
    expect(createMobileOptimisticMessageIdSeed(1_001)).toBe(-1_001_000);
  });

  it("在当前进程内持续生成唯一递减 ID", () => {
    const first = createMobileOptimisticMessageId();
    const second = createMobileOptimisticMessageId();

    expect(first).toBeLessThan(0);
    expect(second).toBe(first - 1);
  });
});
