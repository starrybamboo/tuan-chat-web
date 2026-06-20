import { describe, expect, it } from "vitest";

import {
  assertSuccessfulAbilityApiResult,
  readSuccessfulAbilityApiResultData,
} from "./role-abilities";

describe("role-abilities success guard", () => {
  it("业务失败时抛出后端错误信息", () => {
    expect(() => assertSuccessfulAbilityApiResult({
      success: false,
      errMsg: "无权限",
    }, "更新角色能力失败")).toThrow("无权限");
  });

  it("缺少 errMsg 时使用调用方兜底文案", () => {
    expect(() => assertSuccessfulAbilityApiResult({
      success: false,
    }, "更新角色能力失败")).toThrow("更新角色能力失败");
  });

  it("查询能力时只把成功响应的 null data 当成空态", () => {
    expect(readSuccessfulAbilityApiResultData({
      success: true,
      data: null,
    }, "获取角色能力失败")).toBeNull();

    expect(() => readSuccessfulAbilityApiResultData({
      success: false,
      errMsg: "能力不存在",
      data: null,
    }, "获取角色能力失败")).toThrow("能力不存在");
  });
});
