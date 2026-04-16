import { ApiError } from "@tuanchat/openapi-client/core/ApiError";

const ROLE_NOT_FOUND_ERROR_CODES = new Set([8005, 8007]);
const ROLE_NOT_FOUND_TEXT = "角色不存在";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumericCode(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readBackendErrorCode(body: unknown): number | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  const directCode = readNumericCode(body.errorCode ?? body.errCode ?? body.code);
  if (directCode != null) {
    return directCode;
  }

  const data = isRecord(body.data) ? body.data : undefined;
  const dataCode = readNumericCode(data?.errorCode ?? data?.errCode ?? data?.code);
  if (dataCode != null) {
    return dataCode;
  }

  const trace = readString(body.trace ?? data?.trace ?? body.stackTrace ?? body.stack);
  if (!trace) {
    return undefined;
  }

  const matched = trace.match(/errorCode\s*=\s*(\d+)/i);
  return matched?.[1] ? Number(matched[1]) : undefined;
}

function includesRoleNotFoundText(value: unknown): boolean {
  const text = readString(value);
  return text ? text.includes(ROLE_NOT_FOUND_TEXT) : false;
}

export function isRoleNotFoundApiError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  const errorCode = readBackendErrorCode(error.body);
  if (errorCode != null && ROLE_NOT_FOUND_ERROR_CODES.has(errorCode)) {
    return true;
  }

  if (!isRecord(error.body)) {
    return false;
  }

  const body = error.body;
  return includesRoleNotFoundText(body.message)
    || includesRoleNotFoundText(body.errMsg)
    || includesRoleNotFoundText(body.error)
    || includesRoleNotFoundText(body.trace);
}

export function shouldRetryRoleQueryError(failureCount: number, error: unknown): boolean {
  const statusCode = (error as any)?.status ?? (error as any)?.response?.status;
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return false;
  }
  if (isRoleNotFoundApiError(error)) {
    return false;
  }
  return failureCount < 2;
}
