import { describe, expect, it } from "vitest";

import { computeRoomSidebarSplitMetrics, ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT } from "./useRoomSidebarSplitLayout";

describe("useRoomSidebarSplitLayout", () => {
  it("会在常规高度下按比例计算上下分栏高度", () => {
    const metrics = computeRoomSidebarSplitMetrics({
      containerHeight: 600,
      ratio: 0.25,
    });

    expect(metrics.usableHeight).toBe(600 - ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT);
    expect(metrics.topHeight).toBe(147);
    expect(metrics.bottomHeight).toBe(441);
    expect(metrics.minSectionHeight).toBe(120);
  });

  it("会在极端比例下保证底部分栏仍有最小高度", () => {
    const metrics = computeRoomSidebarSplitMetrics({
      containerHeight: 600,
      ratio: 0.99,
    });

    expect(metrics.topHeight).toBe(metrics.usableHeight - metrics.minSectionHeight);
    expect(metrics.bottomHeight).toBe(metrics.minSectionHeight);
  });

  it("会在容器很小时退化为平分布局", () => {
    const metrics = computeRoomSidebarSplitMetrics({
      containerHeight: 100,
      ratio: 0.9,
    });

    expect(metrics.usableHeight).toBe(100 - ROOM_SIDEBAR_SPLIT_HANDLE_HEIGHT);
    expect(metrics.topHeight).toBe(metrics.bottomHeight);
    expect(metrics.minSectionHeight).toBe(metrics.topHeight);
  });
});
