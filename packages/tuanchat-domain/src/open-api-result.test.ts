import type { ApiRequestOptions } from "@tuanchat/openapi-client/core/ApiRequestOptions";

import { ApiError } from "@tuanchat/openapi-client/core/ApiError";
import { describe, expect, it } from "vitest";

import {
  assertOpenApiResultSuccess,
  extractOpenApiErrorMessage,
  isOpenApiBusinessError,
  unwrapOpenApiResultData,
  withOpenApiBusinessFallback,
} from "./open-api-result";

const request: ApiRequestOptions = {
  method: "GET",
  url: "/room/info",
};

function createApiError(body: unknown, message = "ApiResult Error") {
  return new ApiError(request, {
    body,
    ok: true,
    status: 200,
    statusText: "OK",
    url: "https://api.example.com/room/info",
  }, message);
}

describe("open-api-result helpers", () => {
  it("extractOpenApiErrorMessage 优先读取 ApiError body.errMsg", () => {
    const error = createApiError({ success: false, errMsg: "后端业务失败" });

    expect(extractOpenApiErrorMessage(error, "请求失败")).toBe("后端业务失败");
  });

  it("assertOpenApiResultSuccess 会把 success=false 转成后端文案错误", () => {
    expect(() => assertOpenApiResultSuccess({
      success: false,
      errMsg: "不能删除自己",
    }, "删除失败")).toThrow("不能删除自己");
  });

  it("unwrapOpenApiResultData 保留 falsey data", () => {
    expect(unwrapOpenApiResultData({
      success: true,
      data: false,
    }, "请求失败")).toBe(false);
  });

  it("isOpenApiBusinessError 支持识别 ApiError 里的业务错误码", () => {
    const error = createApiError({ success: false, errCode: 8003, errMsg: "能力不存在" });

    expect(isOpenApiBusinessError(error, 8003)).toBe(true);
    expect(isOpenApiBusinessError(error, [8001, 8003])).toBe(true);
    expect(isOpenApiBusinessError(error, 8004)).toBe(false);
  });

  it("withOpenApiBusinessFallback 只把显式允许的业务错误码降级成正常值", async () => {
    const toleratedError = createApiError({ success: false, errCode: 8003, errMsg: "能力不存在" });
    const fatalError = createApiError({ success: false, errCode: 8004, errMsg: "能力已存在" });

    await expect(withOpenApiBusinessFallback(
      () => Promise.reject(toleratedError),
      { errCodes: 8003, fallback: null },
    )).resolves.toBeNull();
    await expect(withOpenApiBusinessFallback(
      () => Promise.reject(fatalError),
      { errCodes: 8003, fallback: null },
    )).rejects.toBe(fatalError);
  });
});
