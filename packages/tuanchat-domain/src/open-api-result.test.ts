import type { ApiRequestOptions } from "@tuanchat/openapi-client/core/ApiRequestOptions";

import { ApiError } from "@tuanchat/openapi-client/core/ApiError";
import { describe, expect, it } from "vitest";

import {
  assertOpenApiResultSuccess,
  extractOpenApiErrorMessage,
  unwrapOpenApiResultData,
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
});
