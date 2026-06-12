import { getDefaultCreateInCategoryMode } from "./createInCategoryMode";

describe("getDefaultCreateInCategoryMode", () => {
  it("cat:docs 且 KP：默认 doc", () => {
    expect(getDefaultCreateInCategoryMode({ categoryId: "cat:docs", isKPInSpace: true })).toBe("doc");
  });

  it("cat:docs 但非 KP：回退 room（避免默认落在禁用选项）", () => {
    expect(getDefaultCreateInCategoryMode({ categoryId: "cat:docs", isKPInSpace: false })).toBe("room");
  });

  it("其他分类：默认 room", () => {
    expect(getDefaultCreateInCategoryMode({ categoryId: "cat:channels", isKPInSpace: true })).toBe("room");
  });
});
