import { ApiError } from "api";

const NON_RETRYABLE_BLOCKSUITE_DOC_TEXTS = ["文档不存在", "文档已删除"] as const;
const NON_RETRYABLE_BLOCKSUITE_DOC_ERROR_CODES = new Set([101]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumericCode(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function includesNonRetryableText(value: unknown): boolean {
  const text = readString(value);
  if (!text) {
    return false;
  }
  return NON_RETRYABLE_BLOCKSUITE_DOC_TEXTS.some(keyword => text.includes(keyword));
}

export class NonRetryableBlocksuiteDocError extends Error {
  readonly cause: unknown;

  constructor(error: unknown, message = "blocksuite doc is unavailable") {
    super(message);
    this.name = "NonRetryableBlocksuiteDocError";
    this.cause = error;
  }
}

export function isNonRetryableBlocksuiteDocError(error: unknown): boolean {
  if (error instanceof NonRetryableBlocksuiteDocError) {
    return true;
  }
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.status === 404) {
    return true;
  }

  const errorCode = readBackendErrorCode(error.body);
  if (errorCode != null && NON_RETRYABLE_BLOCKSUITE_DOC_ERROR_CODES.has(errorCode)) {
    return true;
  }

  if (!isRecord(error.body)) {
    return includesNonRetryableText(error.message);
  }

  const body = error.body;
  const data = isRecord(body.data) ? body.data : undefined;
  return includesNonRetryableText(body.message)
    || includesNonRetryableText(body.errMsg)
    || includesNonRetryableText(body.errorMsg)
    || includesNonRetryableText(body.error)
    || includesNonRetryableText(body.trace)
    || includesNonRetryableText(data?.message)
    || includesNonRetryableText(data?.errMsg)
    || includesNonRetryableText(data?.errorMsg)
    || includesNonRetryableText(data?.trace)
    || includesNonRetryableText(error.message);
}
