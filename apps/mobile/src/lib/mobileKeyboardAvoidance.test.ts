import { describe, expect, it } from "vitest";

import { resolveMobileKeyboardAvoidance } from "./mobileKeyboardAvoidance";

describe("resolveMobileKeyboardAvoidance", () => {
  it("Android 普通页面依赖 adjustResize，不叠加 JS 键盘避让", () => {
    expect(resolveMobileKeyboardAvoidance("android", "screen")).toEqual({
      behavior: undefined,
      enabled: false,
    });
  });

  it("iOS 普通页面保留单层 padding 避让", () => {
    expect(resolveMobileKeyboardAvoidance("ios", "screen")).toEqual({
      behavior: "padding",
      enabled: true,
    });
  });

  it("原生 Modal 在 Android 和 iOS 都保留独立避让", () => {
    expect(resolveMobileKeyboardAvoidance("android", "modal")).toEqual({
      behavior: "height",
      enabled: true,
    });
    expect(resolveMobileKeyboardAvoidance("ios", "modal")).toEqual({
      behavior: "padding",
      enabled: true,
    });
  });

  it("Web 不启用原生键盘避让", () => {
    expect(resolveMobileKeyboardAvoidance("web", "screen")).toEqual({
      behavior: undefined,
      enabled: false,
    });
  });
});
