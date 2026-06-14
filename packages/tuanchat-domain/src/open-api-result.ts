import { ApiError } from "@tuanchat/openapi-client/core/ApiError";

type ApiResultLike<T> = {
  success?: boolean;
  errMsg?: string;
  data?: T;
};

type OpenApiBusinessErrorBody = {
  success?: unknown;
  errCode?: unknown;
  errorCode?: unknown;
  code?: unknown;
};

type OpenApiBusinessFallbackOptions<T> = {
  errCodes: number | readonly number[];
  fallback: T | ((error: unknown) => T | Promise<T>);
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

function readOpenApiErrorBody(error: unknown): OpenApiBusinessErrorBody | null {
  if (error instanceof ApiError && isRecord(error.body)) {
    return error.body;
  }

  if (!isRecord(error)) {
    return null;
  }

  const directBody = error.body;
  if (isRecord(directBody)) {
    return directBody;
  }

  const response = error.response;
  if (isRecord(response)) {
    const responseBody = response.body;
    if (isRecord(responseBody)) {
      return responseBody;
    }
    const responseData = response.data;
    if (isRecord(responseData)) {
      return responseData;
    }
  }

  return null;
}

function readOpenApiBusinessErrorCode(body: OpenApiBusinessErrorBody): number | null {
  const rawCode = body.errCode ?? body.errorCode ?? body.code;
  if (typeof rawCode === "number" && Number.isFinite(rawCode)) {
    return rawCode;
  }
  if (typeof rawCode === "string" && rawCode.trim() !== "") {
    const parsed = Number(rawCode);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isOpenApiBusinessError(error: unknown, errCodes: number | readonly number[]): boolean {
  const body = readOpenApiErrorBody(error);
  if (!body || body.success !== false) {
    return false;
  }

  const actualCode = readOpenApiBusinessErrorCode(body);
  if (actualCode === null) {
    return false;
  }

  const expectedCodes = Array.isArray(errCodes) ? errCodes : [errCodes];
  return expectedCodes.includes(actualCode);
}

export async function withOpenApiBusinessFallback<T>(
  task: () => Promise<T>,
  options: OpenApiBusinessFallbackOptions<T>,
): Promise<T> {
  try {
    return await task();
  }
  catch (error) {
    if (!isOpenApiBusinessError(error, options.errCodes)) {
      throw error;
    }
    return typeof options.fallback === "function"
      ? await (options.fallback as (error: unknown) => T | Promise<T>)(error)
      : options.fallback;
  }
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
