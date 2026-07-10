import { describe, expect, it } from "vitest";

import {
  isActiveModalLayer,
  shouldCloseEscapeLayer,
} from "@/components/common/customHooks/useEscapeToClose";

describe("shouldCloseEscapeLayer", () => {
  const currentLayer = {};
  const baseEvent = {
    key: "Escape",
    defaultPrevented: false,
    isComposing: false,
  };

  it("仅允许最上层弹窗响应 Escape", () => {
    expect(shouldCloseEscapeLayer(baseEvent, currentLayer, currentLayer)).toBe(true);
    expect(shouldCloseEscapeLayer(baseEvent, currentLayer, {})).toBe(false);
  });

  it("忽略已被消费、输入法组合中和其他按键", () => {
    expect(shouldCloseEscapeLayer({
      ...baseEvent,
      defaultPrevented: true,
    }, currentLayer, currentLayer)).toBe(false);
    expect(shouldCloseEscapeLayer({
      ...baseEvent,
      isComposing: true,
    }, currentLayer, currentLayer)).toBe(false);
    expect(shouldCloseEscapeLayer({
      ...baseEvent,
      key: "Enter",
    }, currentLayer, currentLayer)).toBe(false);
  });
});

describe("isActiveModalLayer", () => {
  it("过滤关闭状态和显式隐藏的弹窗", () => {
    expect(isActiveModalLayer({
      tagName: "DIALOG",
      hasOpenAttribute: false,
      isRegistered: false,
      hidden: false,
      ariaHidden: null,
    })).toBe(false);
    expect(isActiveModalLayer({
      tagName: "DIV",
      hasOpenAttribute: false,
      isRegistered: true,
      hidden: true,
      ariaHidden: null,
    })).toBe(false);
  });

  it("保留原生打开或已注册的活动弹窗", () => {
    expect(isActiveModalLayer({
      tagName: "DIALOG",
      hasOpenAttribute: true,
      isRegistered: false,
      hidden: false,
      ariaHidden: null,
    })).toBe(true);
    expect(isActiveModalLayer({
      tagName: "DIALOG",
      hasOpenAttribute: false,
      isRegistered: true,
      hidden: false,
      ariaHidden: null,
    })).toBe(true);
  });
});
