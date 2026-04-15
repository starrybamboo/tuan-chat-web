import { describe, expect, it } from "vitest";

import { buildDicerReplyContent, selectWeightedCopywritingSuffix, stripDicerTags } from "./dicerReplyPreparation";

describe("dicerReplyPreparation", () => {
  it("会移除骰娘消息里的头像标签", () => {
    expect(stripDicerTags("检定失败 #沮丧#")).toBe("检定失败");
  });

  it("按权重选择文案并保留换行前缀", () => {
    expect(selectWeightedCopywritingSuffix("失败", {
      失败: ["::2::这次没有如愿。", "下次一定。"],
    }, 0.1)).toBe("\n这次没有如愿。");
    expect(selectWeightedCopywritingSuffix("失败", {
      失败: ["::2::这次没有如愿。", "下次一定。"],
    }, 0.95)).toBe("\n下次一定。");
  });

  it("生成最终骰娘消息时一开始就带上风味文案", () => {
    expect(buildDicerReplyContent("射击检定：D100=33/20 失败 #沮丧#", "\n骰子有点调皮，这次没有如愿。 #沮丧#"))
      .toBe("射击检定：D100=33/20 失败\n骰子有点调皮，这次没有如愿。");
  });
});
