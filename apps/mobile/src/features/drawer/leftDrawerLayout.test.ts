import { describe, expect, it } from "vitest";

import { getLeftDrawerLayoutState } from "./leftDrawerLayout";

describe("leftDrawerLayout", () => {
  it("在私聊模式下仍然显示空间轨道", () => {
    expect(getLeftDrawerLayoutState("dm")).toEqual({
      showRoomsSidebar: false,
      showSpaceRail: true,
    });
  });

  it("在房间模式下同时显示空间轨道和房间侧栏", () => {
    expect(getLeftDrawerLayoutState("rooms")).toEqual({
      showRoomsSidebar: true,
      showSpaceRail: true,
    });
  });
});
