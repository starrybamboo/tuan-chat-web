import { describe, expect, it } from "vitest";

import { resolveAndroidBackgroundPushGuidance, shouldShowAndroidBackgroundPushOnboarding } from "./androidBackgroundPushGuidance";

describe("androidBackgroundPushGuidance", () => {
  it("会把小米设备标记为高风险并提示系统放行", () => {
    const guidance = resolveAndroidBackgroundPushGuidance({
      brand: "Redmi",
      manufacturer: "Xiaomi",
      model: "24069RA21C",
      ignoringBatteryOptimizations: false,
    });

    expect(guidance.risk).toBe("high");
    expect(guidance.vendorLabel).toBe("小米/Redmi/POCO");
    expect(guidance.title).toBe("后台推送需要系统放行");
    expect(guidance.statusItems).toContain("电池优化：未放行");
  });

  it("会识别 OPPO、vivo、华为、三星等常见后台限制厂商", () => {
    expect(resolveAndroidBackgroundPushGuidance({ manufacturer: "OPPO" }).risk).toBe("high");
    expect(resolveAndroidBackgroundPushGuidance({ brand: "iQOO" }).risk).toBe("high");
    expect(resolveAndroidBackgroundPushGuidance({ manufacturer: "HUAWEI" }).risk).toBe("high");
    expect(resolveAndroidBackgroundPushGuidance({ manufacturer: "samsung" }).risk).toBe("medium");
  });

  it("会保留普通 Android 设备为标准风险", () => {
    const guidance = resolveAndroidBackgroundPushGuidance({
      brand: "google",
      manufacturer: "Google",
      model: "Pixel 10",
      ignoringBatteryOptimizations: true,
      backgroundRestricted: false,
    });

    expect(guidance.risk).toBe("standard");
    expect(guidance.title).toBe("后台推送诊断");
    expect(guidance.statusItems).toContain("电池优化：已放行");
    expect(guidance.statusItems).toContain("后台限制：未检测到限制");
  });

  it("会在缺少原生诊断时给出可读兜底", () => {
    const guidance = resolveAndroidBackgroundPushGuidance(null);

    expect(guidance.vendorLabel).toBe("Android");
    expect(guidance.statusItems).toContain("电池优化：未知");
    expect(guidance.statusItems).toContain("后台限制：未知");
  });

  it("后台推送提醒会在设置未完成时持续显示", () => {
    expect(shouldShowAndroidBackgroundPushOnboarding({
      manufacturer: "Xiaomi",
      ignoringBatteryOptimizations: false,
    }, {
      connected: true,
      messageChannelImportance: 4,
      notificationsEnabled: true,
      running: true,
    }, false)).toBe(true);
    expect(shouldShowAndroidBackgroundPushOnboarding({
      manufacturer: "Xiaomi",
      ignoringBatteryOptimizations: true,
      backgroundRestricted: false,
    }, {
      connected: true,
      messageChannelImportance: 4,
      notificationsEnabled: true,
      running: true,
    }, false)).toBe(false);
    expect(shouldShowAndroidBackgroundPushOnboarding({
      manufacturer: "Google",
      ignoringBatteryOptimizations: true,
      backgroundRestricted: false,
    }, {
      connected: true,
      messageChannelImportance: 4,
      notificationsEnabled: true,
      running: true,
    }, false)).toBe(false);
    expect(shouldShowAndroidBackgroundPushOnboarding({
      manufacturer: "Xiaomi",
      ignoringBatteryOptimizations: false,
    }, {
      connected: true,
      messageChannelImportance: 4,
      notificationsEnabled: true,
      running: true,
    }, true)).toBe(false);
    expect(shouldShowAndroidBackgroundPushOnboarding({
      manufacturer: "Xiaomi",
      ignoringBatteryOptimizations: null,
      backgroundRestricted: false,
    }, {
      connected: true,
      messageChannelImportance: 4,
      notificationsEnabled: true,
      running: true,
    }, false)).toBe(true);
    expect(shouldShowAndroidBackgroundPushOnboarding({
      manufacturer: "Google",
      ignoringBatteryOptimizations: true,
      backgroundRestricted: null,
    }, {
      connected: true,
      messageChannelImportance: 4,
      notificationsEnabled: true,
      running: true,
    }, false)).toBe(true);
    expect(shouldShowAndroidBackgroundPushOnboarding(null, null, false)).toBe(true);
    expect(shouldShowAndroidBackgroundPushOnboarding({
      manufacturer: "Google",
      ignoringBatteryOptimizations: true,
      backgroundRestricted: false,
    }, {
      connected: true,
      messageChannelImportance: 0,
      notificationsEnabled: false,
      running: true,
    }, false)).toBe(true);
    expect(shouldShowAndroidBackgroundPushOnboarding({
      manufacturer: "Google",
      ignoringBatteryOptimizations: true,
      backgroundRestricted: false,
    }, {
      connected: true,
      running: true,
    }, false)).toBe(true);
  });
});
