import { describe, expect, it } from "vitest";

import { isInitialQueryReady, isRoomDocumentPrewarmReady } from "./roomPrewarmReadiness";

describe("isInitialQueryReady", () => {
  it("查询首次成功或失败后都视为完成，避免预热永久等待失败接口", () => {
    expect(isInitialQueryReady({ isFetched: true })).toBe(true);
    expect(isInitialQueryReady({ isError: true })).toBe(true);
    expect(isInitialQueryReady({ isFetched: false, isError: false })).toBe(false);
  });
});

describe("isRoomDocumentPrewarmReady", () => {
  const readyParams = {
    abilityLoading: false,
    historyLoading: false,
    membersReady: true,
    roomInfoReady: true,
    rolesReady: true,
    spaceInfoReady: true,
  };

  it("关键聊天数据和状态能力首载都完成后允许预热", () => {
    expect(isRoomDocumentPrewarmReady(readyParams)).toBe(true);
  });

  it("历史消息或能力还在首载时不允许预热", () => {
    expect(isRoomDocumentPrewarmReady({
      ...readyParams,
      historyLoading: true,
    })).toBe(false);
    expect(isRoomDocumentPrewarmReady({
      ...readyParams,
      abilityLoading: true,
    })).toBe(false);
  });
});
