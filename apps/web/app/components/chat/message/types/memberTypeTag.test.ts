import { describe, expect, it } from "vitest";

import { getMemberTypeTagMeta } from "./memberTypeTag";

describe("member type tag", () => {
  it("实色主题标签不再使用同色文字", () => {
    expect(getMemberTypeTagMeta(1)?.color).toContain("bg-error/10 text-error");
    expect(getMemberTypeTagMeta(2)?.color).toContain("bg-info/10 text-info");
  });

  it("未知成员类型不返回标签元数据", () => {
    expect(getMemberTypeTagMeta(undefined)).toBeNull();
    expect(getMemberTypeTagMeta(999)).toBeNull();
  });
});
