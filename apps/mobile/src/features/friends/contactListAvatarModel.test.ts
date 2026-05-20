import { describe, expect, it } from "vitest";

import {
  CONTACT_LIST_AVATAR_POINTER_EVENTS,
  getContactAvatarColor,
  getContactAvatarInitial,
} from "./contactListAvatarModel";

describe("contactListAvatarModel", () => {
  it("让联系人头像子树不参与触摸命中，列表行统一接管点击", () => {
    expect(CONTACT_LIST_AVATAR_POINTER_EVENTS).toBe("none");
  });

  it("从显示名生成稳定的头像占位首字", () => {
    expect(getContactAvatarInitial(" Alice ")).toBe("A");
    expect(getContactAvatarInitial("降星驰")).toBe("降");
    expect(getContactAvatarInitial("   ")).toBe("U");
    expect(getContactAvatarInitial(null)).toBe("U");
  });

  it("按数字种子生成稳定的头像占位颜色", () => {
    expect(getContactAvatarColor(0)).toBe("#6366f1");
    expect(getContactAvatarColor(7)).toBe("#6366f1");
    expect(getContactAvatarColor(-1)).toBe("#8b5cf6");
  });
});
