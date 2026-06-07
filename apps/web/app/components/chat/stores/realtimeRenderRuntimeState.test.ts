import { describe, expect, it } from "vitest";

import type { RealtimeRenderRuntimeState } from "./realtimeRenderRuntimeState";

import { mergeRealtimeRenderRuntimeState } from "./realtimeRenderRuntimeState";

describe("realtimeRenderRuntimeState", () => {
  const initialState: RealtimeRenderRuntimeState = {
    status: "connected",
    initProgress: {
      phase: "ready",
      current: 1,
      total: 1,
      message: "初始化完成",
    },
    isActive: true,
    previewUrl: "http://127.0.0.1:3000/games/realtime_1/index.html",
  };

  it("允许显式清空 previewUrl 和 initProgress", () => {
    expect(mergeRealtimeRenderRuntimeState(initialState, {
      initProgress: null,
      isActive: false,
      previewUrl: null,
    })).toEqual({
      status: "connected",
      initProgress: null,
      isActive: false,
      previewUrl: null,
    });
  });

  it("未传入的字段保持原值", () => {
    expect(mergeRealtimeRenderRuntimeState(initialState, {
      status: "initializing",
    })).toEqual({
      status: "initializing",
      initProgress: initialState.initProgress,
      isActive: true,
      previewUrl: initialState.previewUrl,
    });
  });
});
