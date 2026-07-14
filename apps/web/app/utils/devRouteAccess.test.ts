import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import {
  DESIGN_SYSTEM_PATH,
  isDesignSystemPath,
  requireDevelopmentRoute,
} from "@/utils/devRouteAccess";

describe("requireDevelopmentRoute", () => {
  it("允许开发环境继续加载", () => {
    expect(() => requireDevelopmentRoute(true)).not.toThrow();
  });

  it("让生产环境进入 404", () => {
    let thrown: unknown;

    try {
      requireDevelopmentRoute(false);
    }
    catch (error) {
      thrown = error;
    }

    expect(isNotFound(thrown)).toBe(true);
  });

  it("只识别 Design System 的固定开发路径", () => {
    expect(isDesignSystemPath(DESIGN_SYSTEM_PATH)).toBe(true);
    expect(isDesignSystemPath(`${DESIGN_SYSTEM_PATH}/`)).toBe(true);
    expect(isDesignSystemPath("/settings")).toBe(false);
  });
});
