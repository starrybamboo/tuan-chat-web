import { describe, expect, it } from "vitest";

import type { ChatShellBackNavigationState } from "./chatShellBackNavigation";

import { resolveChatShellBackNavigationAction } from "./chatShellBackNavigation";

const BASE_STATE: ChatShellBackNavigationState = {
  actionMenuVisible: false,
  clueScopeOpen: false,
  createRoomVisible: false,
  createSpaceVisible: false,
  currentContactId: null,
  expressionPickerVisible: false,
  isRoutePage: true,
  mapSheetVisible: false,
  profileSheetOpen: false,
  rightDrawerOpen: false,
  roleSwitchVisible: false,
  searchPageVisible: false,
  stShowCardOpen: false,
};

describe("chatShellBackNavigation", () => {
  it("优先关闭当前打开的临时面板", () => {
    expect(resolveChatShellBackNavigationAction({
      ...BASE_STATE,
      actionMenuVisible: true,
      currentContactId: 42,
      isRoutePage: false,
    })).toBe("close-action-menu");

    expect(resolveChatShellBackNavigationAction({
      ...BASE_STATE,
      rightDrawerOpen: true,
      searchPageVisible: true,
      isRoutePage: false,
    })).toBe("close-right-drawer");
  });

  it("搜索页先关闭搜索，不直接退出房间", () => {
    expect(resolveChatShellBackNavigationAction({
      ...BASE_STATE,
      searchPageVisible: true,
      isRoutePage: false,
    })).toBe("close-search");
  });

  it("dm 和 room 页面消费系统返回并回到上一层聊天上下文", () => {
    expect(resolveChatShellBackNavigationAction({
      ...BASE_STATE,
      currentContactId: 99,
      isRoutePage: false,
    })).toBe("back-from-dm");

    expect(resolveChatShellBackNavigationAction({
      ...BASE_STATE,
      isRoutePage: false,
    })).toBe("back-to-route-page");
  });

  it("route page 没有临时面板时才放行系统返回", () => {
    expect(resolveChatShellBackNavigationAction(BASE_STATE)).toBe("allow-system-back");
  });
});
