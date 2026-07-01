import { describe, expect, it } from "vitest";

import { resolveSpriteCropperOperationMode } from "./spriteCropperMode";

describe("resolveSpriteCropperOperationMode", () => {
  it("普通多选只有超过一个头像时才进入批量模式", () => {
    expect(resolveSpriteCropperOperationMode({
      isMultiSelectMode: true,
      selectedCount: 1,
    })).toBe("single");

    expect(resolveSpriteCropperOperationMode({
      isMultiSelectMode: true,
      selectedCount: 2,
    })).toBe("batch");
  });

  it("立绘组编辑即使只有一个头像也保持批量语义", () => {
    expect(resolveSpriteCropperOperationMode({
      isMultiSelectMode: true,
      selectedCount: 1,
      forceBatchMode: true,
    })).toBe("batch");
  });
});
