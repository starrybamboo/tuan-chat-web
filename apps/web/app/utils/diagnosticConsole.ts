type DiagnosticConsoleLevel = "debug" | "log" | "info" | "warn" | "error" | "trace";

type DiagnosticSerializedValue
  = | null
    | boolean
    | number
    | string
    | DiagnosticSerializedValue[]
    | { [key: string]: DiagnosticSerializedValue };

export type DiagnosticConsoleEntry = {
  level: DiagnosticConsoleLevel;
  timestamp: string;
  elapsedMs: number;
  message: string;
  values: DiagnosticSerializedValue[];
};

export type DiagnosticConsoleReport = {
  schemaVersion: 1;
  source: "tuanchat-web-console";
  exportedAt: string;
  startedAt: string;
  feedbackChecklist: string[];
  runtime: {
    url?: string;
    userAgent?: string;
    language?: string;
    platform?: string;
    timezone?: string;
    viewport?: string;
    screen?: string;
  };
  build: {
    mode?: string;
    dev?: boolean;
    apiBaseUrl?: string;
  };
  entries: DiagnosticConsoleEntry[];
};

type DiagnosticConsoleState = {
  entries: DiagnosticConsoleEntry[];
  installed: boolean;
  originals: Partial<Record<DiagnosticConsoleLevel, (...args: unknown[]) => void>>;
  removeListeners: Array<() => void>;
  startedAt: string;
  startedAtMs: number;
};

type DiagnosticRuntime = typeof globalThis & {
  __TC_DIAGNOSTIC_CONSOLE__?: DiagnosticConsoleState;
  console?: Partial<Record<DiagnosticConsoleLevel, (...args: unknown[]) => void>>;
  document?: Document;
  location?: Location;
  navigator?: Navigator;
  screen?: Screen;
  innerWidth?: number;
  innerHeight?: number;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
};

type DiagnosticExportResult
  = | { ok: true; fileName: string; entryCount: number; fileContent: string }
    | { ok: false; error: string };

const MAX_LOG_ENTRIES = 500;
const MAX_STRING_LENGTH = 2000;
const MAX_ARRAY_LENGTH = 50;
const MAX_OBJECT_KEYS = 80;
const MAX_SERIALIZE_DEPTH = 4;
const REDACTED_VALUE = "[redacted]";
const SENSITIVE_KEY_PATTERN
  = /authorization|cookie|token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token|session/i;
const CAPTURED_CONSOLE_LEVELS: DiagnosticConsoleLevel[] = ["debug", "log", "info", "warn", "error", "trace"];

function nowIso() {
  return new Date().toISOString();
}

function getRuntime(): DiagnosticRuntime {
  return globalThis as DiagnosticRuntime;
}

function getNowMs(runtime: DiagnosticRuntime) {
  const now = runtime.performance?.now?.();
  return typeof now === "number" && Number.isFinite(now) ? now : Date.now();
}

function createDiagnosticConsoleState(runtime: DiagnosticRuntime): DiagnosticConsoleState {
  const startedAt = nowIso();
  return {
    entries: [],
    installed: false,
    originals: {},
    removeListeners: [],
    startedAt,
    startedAtMs: getNowMs(runtime),
  };
}

function getDiagnosticConsoleState(runtime: DiagnosticRuntime = getRuntime()) {
  runtime.__TC_DIAGNOSTIC_CONSOLE__ ??= createDiagnosticConsoleState(runtime);
  return runtime.__TC_DIAGNOSTIC_CONSOLE__;
}

function truncateString(value: string) {
  if (value.length <= MAX_STRING_LENGTH)
    return value;
  return `${value.slice(0, MAX_STRING_LENGTH)}... [truncated ${value.length - MAX_STRING_LENGTH} chars]`;
}

function serializeDiagnosticValue(
  value: unknown,
  key = "",
  depth = 0,
  seen = new WeakSet<object>(),
): DiagnosticSerializedValue {
  if (key && SENSITIVE_KEY_PATTERN.test(key))
    return REDACTED_VALUE;

  if (value == null)
    return null;

  if (typeof value === "string")
    return truncateString(value);
  if (typeof value === "number")
    return Number.isFinite(value) ? value : String(value);
  if (typeof value === "boolean")
    return value;
  if (typeof value === "bigint")
    return `${value.toString()}n`;
  if (typeof value === "symbol")
    return value.toString();
  if (typeof value === "function")
    return `[Function ${value.name || "anonymous"}]`;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message),
      stack: value.stack ? truncateString(value.stack) : "",
    };
  }

  if (depth >= MAX_SERIALIZE_DEPTH)
    return "[max-depth]";

  if (seen.has(value))
    return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_LENGTH)
      .map(item => serializeDiagnosticValue(item, "", depth + 1, seen));
    if (value.length > MAX_ARRAY_LENGTH)
      items.push(`[truncated ${value.length - MAX_ARRAY_LENGTH} items]`);
    return items;
  }

  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();

  const result: { [key: string]: DiagnosticSerializedValue } = {};
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [entryKey, entryValue] of entries.slice(0, MAX_OBJECT_KEYS)) {
    result[entryKey] = serializeDiagnosticValue(entryValue, entryKey, depth + 1, seen);
  }
  if (entries.length > MAX_OBJECT_KEYS) {
    result.__truncatedKeys = `[truncated ${entries.length - MAX_OBJECT_KEYS} keys]`;
  }
  return result;
}

function stringifyDiagnosticValue(value: DiagnosticSerializedValue) {
  if (typeof value === "string")
    return value;
  try {
    return JSON.stringify(value);
  }
  catch {
    return String(value);
  }
}

function pushDiagnosticConsoleEntry(
  runtime: DiagnosticRuntime,
  level: DiagnosticConsoleLevel,
  values: unknown[],
) {
  const state = getDiagnosticConsoleState(runtime);
  const serializedValues = values.map(value => serializeDiagnosticValue(value));
  state.entries.push({
    level,
    timestamp: nowIso(),
    elapsedMs: Math.max(0, Math.round(getNowMs(runtime) - state.startedAtMs)),
    message: serializedValues.map(stringifyDiagnosticValue).join(" "),
    values: serializedValues,
  });

  if (state.entries.length > MAX_LOG_ENTRIES) {
    state.entries.splice(0, state.entries.length - MAX_LOG_ENTRIES);
  }
}

function addDiagnosticEventListeners(runtime: DiagnosticRuntime) {
  if (typeof runtime.addEventListener !== "function" || typeof runtime.removeEventListener !== "function")
    return;

  const onError: EventListener = (event) => {
    const errorEvent = event as ErrorEvent;
    pushDiagnosticConsoleEntry(runtime, "error", [
      "[window.error]",
      {
        message: errorEvent.message,
        filename: errorEvent.filename,
        lineno: errorEvent.lineno,
        colno: errorEvent.colno,
        error: errorEvent.error,
      },
    ]);
  };

  const onUnhandledRejection: EventListener = (event) => {
    const rejectionEvent = event as PromiseRejectionEvent;
    pushDiagnosticConsoleEntry(runtime, "error", [
      "[unhandledrejection]",
      rejectionEvent.reason,
    ]);
  };

  runtime.addEventListener("error", onError);
  runtime.addEventListener("unhandledrejection", onUnhandledRejection);
  const state = getDiagnosticConsoleState(runtime);
  state.removeListeners.push(() => runtime.removeEventListener?.("error", onError));
  state.removeListeners.push(() => runtime.removeEventListener?.("unhandledrejection", onUnhandledRejection));
}

export function installDiagnosticConsoleCapture(runtime: DiagnosticRuntime = getRuntime()) {
  const state = getDiagnosticConsoleState(runtime);
  if (state.installed)
    return;

  const runtimeConsole = runtime.console;
  if (!runtimeConsole)
    return;

  for (const level of CAPTURED_CONSOLE_LEVELS) {
    const original = runtimeConsole[level];
    if (typeof original !== "function")
      continue;

    state.originals[level] = original.bind(runtimeConsole);
    runtimeConsole[level] = (...args: unknown[]) => {
      pushDiagnosticConsoleEntry(runtime, level, args);
      state.originals[level]?.(...args);
    };
  }

  addDiagnosticEventListeners(runtime);
  state.installed = true;
}

export function recordDiagnosticConsoleEntry(
  level: DiagnosticConsoleLevel,
  values: unknown[],
  runtime: DiagnosticRuntime = getRuntime(),
) {
  pushDiagnosticConsoleEntry(runtime, level, values);
}

function getRuntimeMetadata(runtime: DiagnosticRuntime) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    url: runtime.location?.href,
    userAgent: runtime.navigator?.userAgent,
    language: runtime.navigator?.language,
    platform: runtime.navigator?.platform,
    timezone,
    viewport: typeof runtime.innerWidth === "number" && typeof runtime.innerHeight === "number"
      ? `${runtime.innerWidth}x${runtime.innerHeight}`
      : undefined,
    screen: runtime.screen ? `${runtime.screen.width}x${runtime.screen.height}` : undefined,
  };
}

function getBuildMetadata() {
  const env = import.meta.env;
  return {
    mode: typeof env.MODE === "string" ? env.MODE : undefined,
    dev: typeof env.DEV === "boolean" ? env.DEV : undefined,
    apiBaseUrl: typeof env.VITE_API_BASE_URL === "string" ? env.VITE_API_BASE_URL : undefined,
  };
}

export function buildDiagnosticConsoleReport(runtime: DiagnosticRuntime = getRuntime()): DiagnosticConsoleReport {
  const state = getDiagnosticConsoleState(runtime);
  return {
    schemaVersion: 1,
    source: "tuanchat-web-console",
    exportedAt: nowIso(),
    startedAt: state.startedAt,
    feedbackChecklist: [
      "请同时提供触发问题的具体复现步骤。",
      "请说明出现问题的页面、空间、房间或角色。",
      "如果界面异常，请补充截图或录屏。",
    ],
    runtime: getRuntimeMetadata(runtime),
    build: getBuildMetadata(),
    entries: [...state.entries],
  };
}

export function buildDiagnosticConsoleFileName(date = new Date()) {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `tuanchat-console-${timestamp}.json`;
}

export function buildDiagnosticConsoleFileContent(report: DiagnosticConsoleReport) {
  return JSON.stringify(report, null, 2);
}

export function exportDiagnosticConsoleFile(runtime: DiagnosticRuntime = getRuntime()): DiagnosticExportResult {
  const documentRef = runtime.document;
  if (!documentRef)
    return { ok: false, error: "当前环境无法创建下载文件" };

  const report = buildDiagnosticConsoleReport(runtime);
  const fileName = buildDiagnosticConsoleFileName();
  const fileContent = buildDiagnosticConsoleFileContent(report);
  const blob = new Blob([fileContent], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = documentRef.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  runtime.setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    ok: true,
    fileName,
    entryCount: report.entries.length,
    fileContent,
  };
}

export function resetDiagnosticConsoleForTests(runtime: DiagnosticRuntime = getRuntime()) {
  const state = runtime.__TC_DIAGNOSTIC_CONSOLE__;
  if (!state)
    return;

  const runtimeConsole = runtime.console;
  if (runtimeConsole) {
    for (const level of CAPTURED_CONSOLE_LEVELS) {
      const original = state.originals[level];
      if (original)
        runtimeConsole[level] = original;
    }
  }

  for (const removeListener of state.removeListeners) {
    removeListener();
  }
  delete runtime.__TC_DIAGNOSTIC_CONSOLE__;
}
