import { describe, expect, it } from "vitest";

import { resolveNextTabValue } from "./Tabs";

const options = [
  { value: "first", label: "第一项" },
  { value: "disabled", label: "禁用项", disabled: true },
  { value: "last", label: "最后一项" },
] as const;

describe("resolveNextTabValue", () => {
  it("方向键循环切换并跳过禁用页签", () => {
    expect(resolveNextTabValue({ options, currentValue: "first", key: "ArrowRight" })).toBe("last");
    expect(resolveNextTabValue({ options, currentValue: "last", key: "ArrowRight" })).toBe("first");
    expect(resolveNextTabValue({ options, currentValue: "first", key: "ArrowLeft" })).toBe("last");
  });

  it("Home 与 End 定位首尾可用页签", () => {
    expect(resolveNextTabValue({ options, currentValue: "last", key: "Home" })).toBe("first");
    expect(resolveNextTabValue({ options, currentValue: "first", key: "End" })).toBe("last");
  });
});
