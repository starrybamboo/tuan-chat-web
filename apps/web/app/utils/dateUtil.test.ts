import { afterEach, describe, expect, it, vi } from "vitest";

import { formatTimeSmartly } from "./dateUtil";

describe("formatTimeSmartly", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("支持 ISO 时间字符串", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 21, 13, 0, 0));
    const localNoonIso = new Date(2026, 4, 21, 12, 0, 0).toISOString();

    expect(formatTimeSmartly(localNoonIso)).toBe("下午12:00");
    expect(formatTimeSmartly("2026-05-21T12:00:00")).toBe("下午12:00");
  });
});
