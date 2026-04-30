import { describe, expect, it } from "vitest";

import { isInitialQueryReady, isRoomBlocksuitePrewarmReady } from "./roomPrewarmReadiness";

describe("isInitialQueryReady", () => {
  it("查询首次成功或失败后都视为完成，避免预热永久等待失败接口", () => {
    expect(isInitialQueryReady({ isFetched: true })).toBe(true);
    expect(isInitialQueryReady({ isError: true })).toBe(true);
    expect(isInitialQueryReady({ isFetched: false, isError: false })).toBe(false);
  });
});

describe("isRoomBlocksuitePrewarmReady", () => {
  const readyParams = {
    abilityLoading: false,
    historyLoading: false,
    membersReady: true,
    roomInfoReady: true,
    rolesReady: true,
    spaceInfoReady: true,
  };

  it("关键聊天数据和状态能力首载都完成后允许预热", () => {
    expect(isRoomBlocksuitePrewarmReady(readyParams)).toBe(true);
  });

  it("历史消息或能力还在首载时不允许预热", () => {
    expect(isRoomBlocksuitePrewarmReady({
      ...readyParams,
      historyLoading: true,
    })).toBe(false);
    expect(isRoomBlocksuitePrewarmReady({
      ...readyParams,
      abilityLoading: true,
    })).toBe(false);
  });
});
