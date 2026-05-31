import { describe, expect, it } from "vitest";

import { getNextRunSideDrawerState } from "./runSideDrawerButtons";

describe("runSideDrawerButtons", () => {
  it("webGAL 按钮只切换 WebGAL 预览侧窗", () => {
    expect(getNextRunSideDrawerState("none", "webgal")).toBe("webgal");
    expect(getNextRunSideDrawerState("map", "webgal")).toBe("webgal");
    expect(getNextRunSideDrawerState("webgal", "webgal")).toBe("none");
  });

  it("战斗子面板视为同一个战斗按钮分组", () => {
    expect(getNextRunSideDrawerState("initiative", "combat")).toBe("none");
    expect(getNextRunSideDrawerState("state", "combat")).toBe("none");
    expect(getNextRunSideDrawerState("clue", "combat")).toBe("combat");
  });
});
