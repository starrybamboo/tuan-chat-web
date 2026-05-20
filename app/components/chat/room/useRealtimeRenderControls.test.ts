import { describe, expect, it } from "vitest";

import { shouldMountRealtimeRenderOrchestrator } from "./useRealtimeRenderControls";

describe("useRealtimeRenderControls", () => {
  it("普通 room 首屏不挂载 WebGAL 实时渲染控制器", () => {
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: false,
      isEnabled: false,
      sideDrawerState: "none",
      loadRequested: false,
    })).toBe(false);
  });

  it("用户请求、已启用、运行中或打开 WebGAL 侧栏时才挂载控制器", () => {
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: false,
      isEnabled: false,
      sideDrawerState: "none",
      loadRequested: true,
    })).toBe(true);
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: false,
      isEnabled: true,
      sideDrawerState: "none",
      loadRequested: false,
    })).toBe(true);
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: true,
      isEnabled: false,
      sideDrawerState: "none",
      loadRequested: false,
    })).toBe(true);
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: false,
      isEnabled: false,
      sideDrawerState: "webgal",
      loadRequested: false,
    })).toBe(true);
  });
});
