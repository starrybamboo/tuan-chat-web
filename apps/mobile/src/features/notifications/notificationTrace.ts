type TraceDetail = Record<string, unknown> | string | number | boolean | null | undefined;

const TRACE_ENABLED = (() => {
  return process.env.EXPO_PUBLIC_MOBILE_NOTIFICATION_TRACE === "1"
    || process.env.EXPO_PUBLIC_MOBILE_NOTIFICATION_TRACE === "true";
})();

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      message: value.message,
      stack: value.stack,
      name: value.name,
    };
  }

  if (typeof value === "string") {
    return value.length > 1200 ? `${value.slice(0, 1200)}…` : value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, sanitizeValue(entry)]),
    );
  }

  return value;
}

function formatDetail(detail: TraceDetail) {
  if (typeof detail === "string") {
    return detail;
  }

  if (typeof detail === "number" || typeof detail === "boolean" || detail == null) {
    return String(detail);
  }

  return JSON.stringify(sanitizeValue(detail));
}

export function logNotificationTrace(event: string, detail?: TraceDetail): void {
  if (!TRACE_ENABLED) {
    return;
  }

  if (detail === undefined) {
    console.warn(`[mobile-notify-chain] ${event}`);
    return;
  }

  console.warn(`[mobile-notify-chain] ${event}`, formatDetail(detail));
}

export function logNotificationTraceError(event: string, error: unknown, detail?: TraceDetail): void {
  if (!TRACE_ENABLED) {
    return;
  }

  const errorDetail = error instanceof Error
    ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      }
    : { message: String(error) };

  if (detail === undefined) {
    console.warn(`[mobile-notify-chain] ${event}`, formatDetail(errorDetail));
    return;
  }

  console.warn(`[mobile-notify-chain] ${event}`, formatDetail({ ...errorDetail, detail: sanitizeValue(detail) }));
}
