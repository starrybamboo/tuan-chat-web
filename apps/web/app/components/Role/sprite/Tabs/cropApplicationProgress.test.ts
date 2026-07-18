import { describe, expect, it } from "vitest";

import {
  createBatchCropApplicationProgress,
  createSingleCropApplicationProgress,
} from "./cropApplicationProgress";

describe("cropApplicationProgress", () => {
  it("单体裁剪阶段提供连续的可访问进度", () => {
    expect(createSingleCropApplicationProgress("waitingForUpload")).toEqual({
      current: 2,
      total: 5,
      label: "正在等待图片上传",
      detail: "上传完成后会自动继续",
    });
    expect(createSingleCropApplicationProgress("updatingPreview").current).toBe(5);
  });

  it("批量裁剪显示当前阶段与条目完成数", () => {
    expect(createBatchCropApplicationProgress("uploading", {
      completed: 3,
      itemTotal: 8,
      success: 2,
      failed: 1,
    })).toEqual({
      current: 4,
      total: 5,
      label: "正在上传裁剪结果",
      detail: "已处理 3/8 · 成功 2 · 失败 1",
    });
  });

  it("批量完成数限制在有效范围内", () => {
    expect(createBatchCropApplicationProgress("cropping", {
      completed: 9,
      itemTotal: 4,
    }).detail).toContain("已处理 4/4");
    expect(createBatchCropApplicationProgress("loading", {
      completed: -2,
      itemTotal: -1,
    }).detail).toBe("正在整理待处理图片");
  });
});
