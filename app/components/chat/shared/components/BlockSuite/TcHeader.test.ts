import { describe, expect, it } from "vitest";

import { resolveTcHeaderUploadPreset } from "./TcHeader";

describe("resolveTcHeaderUploadPreset", () => {
  it("为复用头像裁剪规格的文档返回 avatarThumb", () => {
    expect(resolveTcHeaderUploadPreset("space:1:description")).toBe("avatarThumb");
    expect(resolveTcHeaderUploadPreset("room:2:description")).toBe("avatarThumb");
    expect(resolveTcHeaderUploadPreset("udoc:3:description")).toBe("avatarThumb");
    expect(resolveTcHeaderUploadPreset("sdoc:4:description")).toBe("avatarThumb");
  });

  it("对不支持的 docId 返回 undefined", () => {
    expect(resolveTcHeaderUploadPreset("user:5:readme")).toBeUndefined();
    expect(resolveTcHeaderUploadPreset("invalid-doc-id")).toBeUndefined();
  });
});
