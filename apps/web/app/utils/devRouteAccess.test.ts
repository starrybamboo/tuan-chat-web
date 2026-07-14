import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import {
  DESIGN_SYSTEM_PATH,
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

  it("提供 Design System 的固定开发路径", () => {
    expect(DESIGN_SYSTEM_PATH).toBe("/design-system");
  });
});
