import { describe, expect, it } from "vitest";

import { resolveWebGALPreviewState } from "./webGalPreviewState";

describe("webGalPreviewState", () => {
  it("已有 previewUrl 时直接显示 iframe，不再继续卡在启动态", () => {
    expect(resolveWebGALPreviewState({
      previewUrl: "http://127.0.0.1:3000/games/realtime_1/index.html",
      realtimeStatus: "initializing",
      isWebgalPaneActive: true,
    })).toEqual({
      showPreviewFrame: true,
      fallbackTitle: "实时渲染未启动",
      fallbackHint: "点击工具栏中的 WebGAL 按钮开启",
    });
  });

  it("没有 previewUrl 且仍在初始化时显示启动提示", () => {
    expect(resolveWebGALPreviewState({
      previewUrl: null,
      realtimeStatus: "initializing",
      isWebgalPaneActive: true,
    })).toEqual({
      showPreviewFrame: false,
      fallbackTitle: "实时渲染正在启动",
      fallbackHint: "请稍候，正在连接 WebGAL...",
    });
  });
});
