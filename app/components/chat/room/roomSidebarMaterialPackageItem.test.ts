import { describe, expect, it } from "vitest";

import { isMaterialNodeOnActivePath } from "./roomSidebarMaterialPackageItem";

describe("roomSidebarMaterialPackageItem active path guard", () => {
  it("当前节点命中激活节点时返回 true", () => {
    expect(isMaterialNodeOnActivePath("0.1", "0.1")).toBe(true);
  });

  it("当前节点是激活节点祖先时返回 true", () => {
    expect(isMaterialNodeOnActivePath("0", "0.1.2")).toBe(true);
  });

  it("无关节点不会被视为激活路径", () => {
    expect(isMaterialNodeOnActivePath("0.2", "0.1.2")).toBe(false);
  });
});
