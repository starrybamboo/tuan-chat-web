import { describe, expect, it } from "vitest";

import { shouldHideNativeTabBar } from "./nativeTabBarVisibility";

describe("native tab bar visibility", () => {
  it("软键盘显示时在所有标签页隐藏标签栏", () => {
    expect(shouldHideNativeTabBar({
      chatTabBarHidden: false,
      isHomeTab: false,
      isKeyboardVisible: true,
    })).toBe(true);
  });

  it("仅在聊天首页响应工作区覆盖层隐藏状态", () => {
    expect(shouldHideNativeTabBar({
      chatTabBarHidden: true,
      isHomeTab: true,
      isKeyboardVisible: false,
    })).toBe(true);
    expect(shouldHideNativeTabBar({
      chatTabBarHidden: true,
      isHomeTab: false,
      isKeyboardVisible: false,
    })).toBe(false);
  });
});
