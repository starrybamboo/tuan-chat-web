import { describe, expect, it } from "vitest";

import { resolveOptionalPositiveRouteParam, resolveRoleEditRouteState } from "./roleEditRouteParams";

describe("resolveRoleEditRouteState", () => {
  it("缺失或空 roleId 时进入创建态", () => {
    expect(resolveRoleEditRouteState(undefined)).toEqual({ kind: "create", roleId: null });
    expect(resolveRoleEditRouteState("")).toEqual({ kind: "create", roleId: null });
    expect(resolveRoleEditRouteState("   ")).toEqual({ kind: "create", roleId: null });
  });

  it("只接受正整数 roleId", () => {
    expect(resolveRoleEditRouteState("42")).toEqual({ kind: "edit", roleId: 42 });
    expect(resolveRoleEditRouteState(["007", "9"])).toEqual({ kind: "edit", roleId: 7 });
  });

  it("拒绝零、负数、小数和非数字参数", () => {
    expect(resolveRoleEditRouteState("0")).toEqual({ kind: "invalid", roleId: null, rawRoleId: "0" });
    expect(resolveRoleEditRouteState("-1")).toEqual({ kind: "invalid", roleId: null, rawRoleId: "-1" });
    expect(resolveRoleEditRouteState("1.5")).toEqual({ kind: "invalid", roleId: null, rawRoleId: "1.5" });
    expect(resolveRoleEditRouteState("abc")).toEqual({ kind: "invalid", roleId: null, rawRoleId: "abc" });
  });
});

describe("resolveOptionalPositiveRouteParam", () => {
  it("解析正整数参数", () => {
    expect(resolveOptionalPositiveRouteParam("15")).toBe(15);
    expect(resolveOptionalPositiveRouteParam(["002", "3"])).toBe(2);
  });

  it("非法或缺失参数返回 null", () => {
    expect(resolveOptionalPositiveRouteParam(undefined)).toBeNull();
    expect(resolveOptionalPositiveRouteParam("")).toBeNull();
    expect(resolveOptionalPositiveRouteParam("0")).toBeNull();
    expect(resolveOptionalPositiveRouteParam("-1")).toBeNull();
    expect(resolveOptionalPositiveRouteParam("1.5")).toBeNull();
    expect(resolveOptionalPositiveRouteParam("abc")).toBeNull();
  });
});
