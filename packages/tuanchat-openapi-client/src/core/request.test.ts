import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./ApiError";
import type { ApiRequestOptions } from "./ApiRequestOptions";
import type { OpenAPIConfig } from "./OpenAPI";
import { request } from "./request";

function createConfig(): OpenAPIConfig {
  return {
    BASE: "https://api.example.com",
    VERSION: "1.0",
    WITH_CREDENTIALS: false,
    CREDENTIALS: "include",
  };
}

function createRequestOptions(): ApiRequestOptions {
  return {
    method: "GET",
    url: "/room/info",
  };
}

function mockJsonResponse(body: unknown, init: ResponseInit = {}) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    headers: {
      "Content-Type": "application/json",
    },
  })));
}

function mockEmptyResponse(init: ResponseInit = {}) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, {
    status: init.status ?? 204,
    statusText: init.statusText ?? "No Content",
  })));
}

describe("openapi request ApiResult guard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("HTTP 200 但 success=false 时抛出 ApiError 并保留 errMsg", async () => {
    const body = { success: false, errMsg: "无权限" };
    mockJsonResponse(body);

    await expect(request(createConfig(), createRequestOptions())).rejects.toMatchObject({
      body,
      message: "无权限",
      status: 200,
    });
    await expect(request(createConfig(), createRequestOptions())).rejects.toBeInstanceOf(ApiError);
  });

  it("success=false 缺少 errMsg 时使用 message 或默认文案", async () => {
    mockJsonResponse({ success: false, message: "业务拒绝" });

    await expect(request(createConfig(), createRequestOptions())).rejects.toThrow("业务拒绝");
  });

  it("data 为 falsey 但 success=true 时保持成功响应", async () => {
    const body = { success: true, data: false };
    mockJsonResponse(body);

    await expect(request(createConfig(), createRequestOptions())).resolves.toEqual(body);
  });

  it("data 为 0 或空数组时不会被误判为业务失败", async () => {
    const body = { success: true, data: 0, list: [] };
    mockJsonResponse(body);

    await expect(request(createConfig(), createRequestOptions())).resolves.toEqual(body);
  });

  it("没有 success 字段的响应保持原有成功语义", async () => {
    const body = { data: false };
    mockJsonResponse(body);

    await expect(request(createConfig(), createRequestOptions())).resolves.toEqual(body);
  });

  it("HTTP 204 空响应保持原有成功语义", async () => {
    mockEmptyResponse();

    await expect(request(createConfig(), createRequestOptions())).resolves.toBeUndefined();
  });

  it("HTTP 错误仍走原有状态码错误", async () => {
    const body = { success: false, errMsg: "参数错误" };
    mockJsonResponse(body, { status: 400, statusText: "Bad Request" });

    await expect(request(createConfig(), createRequestOptions())).rejects.toMatchObject({
      body,
      message: "Bad Request",
      status: 400,
    });
  });
});
