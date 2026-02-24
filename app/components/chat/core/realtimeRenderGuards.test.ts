import {
  shouldProcessHistoryDelta,
  shouldRenderInitialHistory,
  shouldRerenderForSettingsChange,
} from "./realtimeRenderGuards";

describe("realtimeRenderGuards", () => {
  it("在渲染器激活且数据就绪时允许首次历史渲染（不依赖 connected）", () => {
    expect(shouldRenderInitialHistory({
      isRealtimeActive: true,
      hasRenderedHistory: false,
      isRenderingHistory: false,
      hasHistoryMessages: true,
      chatHistoryLoading: false,
      hasRoom: true,
    })).toBe(true);
  });

  it("已渲染过历史时阻止重复首次渲染", () => {
    expect(shouldRenderInitialHistory({
      isRealtimeActive: true,
      hasRenderedHistory: true,
      isRenderingHistory: false,
      hasHistoryMessages: true,
      chatHistoryLoading: false,
      hasRoom: true,
    })).toBe(false);
  });

  it("设置变更且已有历史时允许触发全量重渲染", () => {
    expect(shouldRerenderForSettingsChange({
      hasChanges: true,
      isRealtimeActive: true,
      hasHistoryMessages: true,
      hasRenderedHistory: true,
      isRenderingHistory: false,
    })).toBe(true);
  });

  it("设置未变更时不触发全量重渲染", () => {
    expect(shouldRerenderForSettingsChange({
      hasChanges: false,
      isRealtimeActive: true,
      hasHistoryMessages: true,
      hasRenderedHistory: true,
      isRenderingHistory: false,
    })).toBe(false);
  });

  it("历史增量同步在活跃且已完成首轮历史渲染时允许执行", () => {
    expect(shouldProcessHistoryDelta({
      isRealtimeActive: true,
      chatHistoryLoading: false,
      hasRenderedHistory: true,
      isRenderingHistory: false,
      hasHistoryMessages: true,
    })).toBe(true);
  });

  it("历史仍在加载时阻止增量同步", () => {
    expect(shouldProcessHistoryDelta({
      isRealtimeActive: true,
      chatHistoryLoading: true,
      hasRenderedHistory: true,
      isRenderingHistory: false,
      hasHistoryMessages: true,
    })).toBe(false);
  });
});
