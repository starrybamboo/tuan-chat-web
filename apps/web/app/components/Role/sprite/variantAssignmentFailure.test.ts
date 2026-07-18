import { describe, expect, it } from "vitest";

import { buildVariantAssignmentFailureToast } from "./variantAssignmentFailure";

describe("buildVariantAssignmentFailureToast", () => {
  it("单个头像绑定失败时展示具体原因", () => {
    expect(buildVariantAssignmentFailureToast(0, [
      new Error("原图尺寸与目标立绘组不一致"),
    ])).toEqual({
      title: "绑定失败",
      description: "原因：原图尺寸与目标立绘组不一致",
    });
  });

  it("部分失败时展示成功失败数量并合并重复原因", () => {
    expect(buildVariantAssignmentFailureToast(2, [
      new Error("图片加载失败"),
      new Error("图片加载失败"),
      new Error("缺少可裁剪的原图"),
    ])).toEqual({
      title: "部分绑定失败",
      description: "成功 2 个，失败 3 个。原因：图片加载失败（2 个）；缺少可裁剪的原图",
    });
  });

  it("异常没有可读信息时明确说明后端未返回原因", () => {
    expect(buildVariantAssignmentFailureToast(0, [null])).toEqual({
      title: "绑定失败",
      description: "原因：系统未返回具体原因，请稍后重试",
    });
  });
});
