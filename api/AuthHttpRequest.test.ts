import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiRequestOptions } from "@tuanchat/openapi-client/core/ApiRequestOptions";
import { ApiError } from "@tuanchat/openapi-client/core/ApiError";
import { CancelablePromise } from "@tuanchat/openapi-client/core/CancelablePromise";
import type { OpenAPIConfig } from "@tuanchat/openapi-client/core/OpenAPI";

const {
  requestMock,
  recoverAuthTokenFromSessionMock,
  handleUnauthorizedMock,
} = vi.hoisted(() => ({
  requestMock: vi.fn(),
  recoverAuthTokenFromSessionMock: vi.fn(),
  handleUnauthorizedMock: vi.fn(),
}));

vi.mock("@tuanchat/openapi-client/core/request", () => ({
  request: requestMock,
}));

vi.mock("./authRecovery", () => ({
  recoverAuthTokenFromSession: recoverAuthTokenFromSessionMock,
}));

vi.mock("@/utils/auth/unauthorized", () => ({
  handleUnauthorized: handleUnauthorizedMock,
}));

import { AuthHttpRequest } from "./AuthHttpRequest";

function createRequestOptions(url: string): ApiRequestOptions {
  return {
    method: "GET",
    url,
  };
}

function createConfig(): OpenAPIConfig {
  return {
    BASE: "https://api.example.com",
    VERSION: "1.0",
    WITH_CREDENTIALS: true,
    CREDENTIALS: "include",
  };
}

function createApiError(url: string, status = 401, statusText = "Unauthorized") {
  return new ApiError(
    createRequestOptions(url),
    {
      url,
      ok: false,
      status,
      statusText,
      body: { errMsg: statusText },
    },
    statusText,
  );
}

function createResolvedPromise<T>(value: T): CancelablePromise<T> {
  return new CancelablePromise<T>((resolve) => {
    resolve(value);
  });
}

function createRejectedPromise<T>(error: unknown): CancelablePromise<T> {
  return new CancelablePromise<T>((_resolve, reject) => {
    reject(error);
  });
}

describe("AuthHttpRequest", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("401 后能恢复 token 时，应重试原请求", async () => {
    const requestOptions = createRequestOptions("/room/info");
    const unauthorizedError = createApiError(requestOptions.url);

    requestMock
      .mockReturnValueOnce(createRejectedPromise(unauthorizedError))
      .mockReturnValueOnce(createResolvedPromise({ success: true }));
    recoverAuthTokenFromSessionMock.mockResolvedValue("new-token");

    const httpRequest = new AuthHttpRequest(createConfig());

    await expect(httpRequest.request(requestOptions)).resolves.toEqual({ success: true });
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(recoverAuthTokenFromSessionMock).toHaveBeenCalledWith("https://api.example.com");
    expect(handleUnauthorizedMock).not.toHaveBeenCalled();
  });

  it("401 后恢复失败时，应触发统一未授权处理", async () => {
    const requestOptions = createRequestOptions("/room/info");
    const unauthorizedError = createApiError(requestOptions.url);

    requestMock.mockReturnValueOnce(createRejectedPromise(unauthorizedError));
    recoverAuthTokenFromSessionMock.mockResolvedValue(null);

    const httpRequest = new AuthHttpRequest(createConfig());

    await expect(httpRequest.request(requestOptions)).rejects.toBe(unauthorizedError);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(recoverAuthTokenFromSessionMock).toHaveBeenCalledWith("https://api.example.com");
    expect(handleUnauthorizedMock).toHaveBeenCalledWith({ source: "http" });
  });

  it("请求 /user/token 返回 401 时，不应递归触发恢复或跳转", async () => {
    const requestOptions = createRequestOptions("/user/token");
    const unauthorizedError = createApiError(requestOptions.url);

    requestMock.mockReturnValueOnce(createRejectedPromise(unauthorizedError));

    const httpRequest = new AuthHttpRequest(createConfig());

    await expect(httpRequest.request(requestOptions)).rejects.toBe(unauthorizedError);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(recoverAuthTokenFromSessionMock).not.toHaveBeenCalled();
    expect(handleUnauthorizedMock).not.toHaveBeenCalled();
  });
});

