import { describe, expect, it } from "vitest";

import {
  DEFAULT_DM_BACK_TARGET,
  DEFAULT_DM_TAB,
  getDmTabForBackTarget,
  resolveDmEntryNavigationState,
} from "./dmNavigationState";

describe("dmNavigationState", () => {
  it("私聊会话来源一次进入详情并返回私聊 tab", () => {
    expect(resolveDmEntryNavigationState(42, "conversation")).toEqual({
      activeDmTab: "chat",
      backTarget: "conversation",
      currentContactId: 42,
      shouldCloseDrawer: true,
    });
    expect(getDmTabForBackTarget("conversation")).toBe("chat");
  });

  it("好友来源一次进入详情并返回好友 tab", () => {
    expect(resolveDmEntryNavigationState(86, "friend")).toEqual({
      activeDmTab: "friends",
      backTarget: "friend",
      currentContactId: 86,
      shouldCloseDrawer: true,
    });
    expect(getDmTabForBackTarget("friend")).toBe("friends");
  });

  it("外部目标默认按私聊会话来源处理", () => {
    expect(DEFAULT_DM_TAB).toBe("chat");
    expect(DEFAULT_DM_BACK_TARGET).toBe("conversation");
    expect(resolveDmEntryNavigationState(7)).toEqual({
      activeDmTab: "chat",
      backTarget: "conversation",
      currentContactId: 7,
      shouldCloseDrawer: true,
    });
  });

  it("房间来源进入私聊后返回房间，不强制切到私聊列表", () => {
    expect(resolveDmEntryNavigationState(12, "room")).toEqual({
      activeDmTab: "chat",
      backTarget: "room",
      currentContactId: 12,
      shouldCloseDrawer: true,
    });
    expect(getDmTabForBackTarget("room")).toBe("chat");
  });

  it("进入私聊详情时要求关闭抽屉位移，避免停留在高亮列表中间态", () => {
    expect(resolveDmEntryNavigationState(99, "conversation").shouldCloseDrawer).toBe(true);
    expect(resolveDmEntryNavigationState(100, "friend").shouldCloseDrawer).toBe(true);
  });
});
