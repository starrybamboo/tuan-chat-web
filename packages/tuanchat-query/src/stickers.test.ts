import { describe, expect, it } from "vitest";

import { assertStickerApiResult } from "./stickers";

describe("stickers", () => {
  it("会把 success=false 的表情接口响应转成错误", () => {
    expect(() => assertStickerApiResult({
      success: false,
      errMsg: "文件不属于表情包场景",
    }, "创建表情包失败。")).toThrow("文件不属于表情包场景");
  });

  it("会保留 success=true 的表情接口响应", () => {
    const result = {
      success: true,
      data: 7,
    };

    expect(assertStickerApiResult(result, "创建表情包失败。")).toBe(result);
  });
});
