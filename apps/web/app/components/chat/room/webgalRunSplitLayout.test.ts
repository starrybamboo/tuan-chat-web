import { describe, expect, it } from "vitest";

import {
  computeWebgalRunSplitMetrics,
  WEBGAL_RUN_SPLIT_HANDLE_HEIGHT,
} from "./webgalRunSplitLayout";

describe("webgalRunSplitLayout", () => {
  it("按比例分配 WebGAL 和跑团上下高度", () => {
    const metrics = computeWebgalRunSplitMetrics({
      containerHeight: 812,
      ratio: 0.45,
    });

    expect(metrics.usableHeight).toBe(812 - WEBGAL_RUN_SPLIT_HANDLE_HEIGHT);
    expect(metrics.webgalHeight).toBe(360);
    expect(metrics.runHeight).toBe(440);
    expect(metrics.ratio).toBe(0.45);
  });

  it("保留上下两块的最小可用高度", () => {
    expect(computeWebgalRunSplitMetrics({
      containerHeight: 612,
      ratio: 0.02,
    })).toMatchObject({
      webgalHeight: 180,
      runHeight: 420,
    });

    expect(computeWebgalRunSplitMetrics({
      containerHeight: 612,
      ratio: 0.98,
    })).toMatchObject({
      webgalHeight: 420,
      runHeight: 180,
    });
  });
});
