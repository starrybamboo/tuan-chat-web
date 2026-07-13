import { describe, expect, it } from "vitest";

import { dialogLayerClassName } from "./DialogFrame";

describe("DialogFrame layer classes", () => {
  it("native 与 inline 默认共用视口居中层", () => {
    expect(dialogLayerClassName("native")).toBe("tc-dialog-root tc-dialog-native tc-dialog-layer");
    expect(dialogLayerClassName("inline")).toBe("tc-dialog-root tc-dialog-inline tc-dialog-open tc-dialog-layer");
  });

  it.each(["absolute", "fixed", "sticky"])("%s 自定义定位退出视口居中层", (positionClassName) => {
    const className = dialogLayerClassName("inline", `${positionClassName} z-50`);

    expect(className).toBe(`tc-dialog-root tc-dialog-inline tc-dialog-open ${positionClassName} z-50`);
    expect(className).not.toMatch(/(?:^|\s)modal(?:-|\s|$)/);
  });
});
