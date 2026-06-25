import { describe, expect, it } from "vitest";

import { shouldMountRealtimeRenderOrchestrator } from "./useRealtimeRenderControls";

describe("useRealtimeRenderControls", () => {
  it("普通 room 首屏不挂载 WebGAL 实时渲染控制器", () => {
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: false,
      isEnabled: false,
      webgalOpen: false,
      loadRequested: false,
    })).toBe(false);
  });

  it("用户请求、已启用、运行中或打开 WebGAL 预览时才挂载控制器", () => {
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: false,
      isEnabled: false,
      webgalOpen: false,
      loadRequested: true,
    })).toBe(true);
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: false,
      isEnabled: true,
      webgalOpen: false,
      loadRequested: false,
    })).toBe(true);
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: true,
      isEnabled: false,
      webgalOpen: false,
      loadRequested: false,
    })).toBe(true);
    expect(shouldMountRealtimeRenderOrchestrator({
      isActive: false,
      isEnabled: false,
      webgalOpen: true,
      loadRequested: false,
    })).toBe(true);
  });
});
