import { describe, expect, it } from "vitest";

import { getCommandQuery } from "./mobileCommandQuery";

describe("getCommandQuery", () => {
  it("单独输入命令前缀时返回空查询以展示全量候选", () => {
    expect(getCommandQuery(".")).toBe("");
    expect(getCommandQuery("。")).toBe("");
    expect(getCommandQuery("/")).toBe("");
  });

  it("输入命令名前缀时返回过滤查询", () => {
    expect(getCommandQuery(".r")).toBe("r");
    expect(getCommandQuery("。rc")).toBe("rc");
    expect(getCommandQuery("/ri")).toBe("ri");
  });

  it("排除连续前缀和已进入参数区的文本", () => {
    expect(getCommandQuery("..")).toBeNull();
    expect(getCommandQuery("。。")).toBeNull();
    expect(getCommandQuery("//")).toBeNull();
    expect(getCommandQuery(".r 1d20")).toBeNull();
  });
});
