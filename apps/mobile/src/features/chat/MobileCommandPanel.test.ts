import { describe, expect, it } from "vitest";

import { resolveCommandPanelMaxHeight } from "./mobileCommandPanelLayout";
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

describe("resolveCommandPanelMaxHeight", () => {
  it("没有父级高度时使用默认候选面板高度", () => {
    expect(resolveCommandPanelMaxHeight()).toBe(256);
  });

  it("有父级高度时按实际可用高度计算", () => {
    expect(resolveCommandPanelMaxHeight(640)).toBe(636);
  });

  it("可用高度不足时不强行抬高到最小高度，避免顶部被裁切", () => {
    expect(resolveCommandPanelMaxHeight(80)).toBe(76);
  });
});
