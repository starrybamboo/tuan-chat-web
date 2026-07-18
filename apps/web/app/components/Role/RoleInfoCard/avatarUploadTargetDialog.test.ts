import { describe, expect, it } from "vitest";

import { resolvePendingAvatarUpload } from "./avatarUploadTargetDialog";

describe("resolvePendingAvatarUpload", () => {
  it("暂不分组时保留已选文件并继续上传", () => {
    const files = [new File(["avatar"], "avatar.png", { type: "image/png" })];

    expect(resolvePendingAvatarUpload(files, { mode: "none" })).toEqual({
      files,
      target: { mode: "none" },
    });
  });

  it("没有待选文件时不创建上传提交", () => {
    expect(resolvePendingAvatarUpload(null, { mode: "none" })).toBeNull();
  });
});
