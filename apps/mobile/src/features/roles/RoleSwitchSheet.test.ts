import { describe, expect, it } from "vitest";

import { isRoleSwitchNarratorSelected } from "./roleSwitchSelectionState";

describe("RoleSwitchSheet", () => {
  it("只有明确选择旁白时才显示旁白选中态", () => {
    expect(isRoleSwitchNarratorSelected(-1)).toBe(true);
    expect(isRoleSwitchNarratorSelected(undefined)).toBe(false);
    expect(isRoleSwitchNarratorSelected(0)).toBe(false);
    expect(isRoleSwitchNarratorSelected(7)).toBe(false);
  });
});
