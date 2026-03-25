import { ApiError } from "api";

type ApiResultLike<T> = {
  success?: boolean;
  errMsg?: string;
  data?: T;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readErrorText(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (isRecord(payload)) {
    const errMsg = payload.errMsg;
    if (typeof errMsg === "string" && errMsg.trim()) {
      return errMsg.trim();
    }

    const message = payload.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}

export function compactRequestBody<T extends Record<string, unknown>>(body: T): Partial<T> {
  const nextBody: Record<string, unknown> = {};
  Object.entries(body).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    nextBody[key] = value;
  });
  return nextBody as Partial<T>;
}

export function extractOpenApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return readErrorText(error.body, error.message || fallback);
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

export function unwrapOpenApiResultData<T>(
  result: ApiResultLike<T> | null | undefined,
  fallback = "请求失败",
  invalidResponseFallback = "接口返回了无效响应",
) {
  if (!result) {
    throw new Error(invalidResponseFallback);
  }

  if (result.success === false) {
    throw new Error(readErrorText(result, fallback));
  }

  if (typeof result.data === "undefined") {
    throw new TypeError(invalidResponseFallback);
  }

  return result.data;
}

export function assertOpenApiResultSuccess(
  result: ApiResultLike<unknown> | null | undefined,
  fallback = "请求失败",
  invalidResponseFallback = "接口返回了无效响应",
) {
  if (!result) {
    throw new Error(invalidResponseFallback);
  }

  if (result.success === false) {
    throw new Error(readErrorText(result, fallback));
  }

  return result;
}
