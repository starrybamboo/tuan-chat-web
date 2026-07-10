import { describe, expect, it } from "vitest";

import { getVariantFolderClickAction } from "./variantFolderInteraction";

describe("getVariantFolderClickAction", () => {
  it("首次点击立绘组时选中该组", () => {
    expect(getVariantFolderClickAction(null, "12")).toBe("select");
    expect(getVariantFolderClickAction("7", "12")).toBe("select");
  });

  it("再次点击已选立绘组时进入组内", () => {
    expect(getVariantFolderClickAction("12", "12")).toBe("enter");
  });
});
