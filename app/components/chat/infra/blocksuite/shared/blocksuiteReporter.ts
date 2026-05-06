import { isBlocksuiteDebugEnabled } from "./debugFlags";

export type BlocksuiteReportKind = "event" | "error";
export type BlocksuiteReportLevel = "info" | "warn" | "error";
export type BlocksuiteReportPhase = string;

export type BlocksuiteReportToast = {
  id?: string;
  message: string;
};

export type BlocksuiteReportContext = {
  instanceId: string;
  workspaceId: string;
  docId: string;
  phase: BlocksuiteReportPhase;
  errorCode: string;
};

export type BlocksuiteReportEntry = BlocksuiteReportContext & {
  at: number;
  kind: BlocksuiteReportKind;
  level: BlocksuiteReportLevel;
  name: string;
  message?: string;
  details?: Record<string, unknown>;
  toast?: BlocksuiteReportToast;
};

type BlocksuiteReportSink = (entry: BlocksuiteReportEntry) => void;

type ReportOwner = {
  __tcBlocksuiteReportHistory?: BlocksuiteReportEntry[];
  __tcBlocksuiteReportLast?: BlocksuiteReportEntry;
  __tcBlocksuiteReportSink?: BlocksuiteReportSink;
};

const BLOCKSUITE_REPORT_HISTORY_LIMIT = 300;
const BLOCKSUITE_NO_ERROR = "none";

function getReportOwner(): ReportOwner {
  let owner: ReportOwner = globalThis as unknown as ReportOwner;

  if (typeof window !== "undefined") {
    try {
      const top = window.top;
      if (top && top.location?.origin === window.location.origin) {
        owner = top as unknown as ReportOwner;
      }
    }
    catch {
      owner = window as unknown as ReportOwner;
    }
  }

  owner.__tcBlocksuiteReportHistory ??= [];
  return owner;
}

function now() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.timeOrigin + performance.now();
  }
  return Date.now();
}

function normalizeText(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function normalizeDetails(details: Record<string, unknown> | undefined, error: unknown): Record<string, unknown> | undefined {
  const next: Record<string, unknown> = { ...(details ?? {}) };

  if (error instanceof Error) {
    next.errorName ??= error.name;
    next.errorMessage ??= error.message;
    if (error.stack) {
      next.errorStack ??= error.stack;
    }
  }
  else if (typeof error !== "undefined") {
    next.errorMessage ??= String(error);
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function commitEntry(entry: BlocksuiteReportEntry) {
  const owner = getReportOwner();
  owner.__tcBlocksuiteReportLast = entry;
  owner.__tcBlocksuiteReportHistory = [
    entry,
    ...(owner.__tcBlocksuiteReportHistory ?? []).slice(0, BLOCKSUITE_REPORT_HISTORY_LIMIT - 1),
  ];
  return owner;
}

function emitConsole(entry: BlocksuiteReportEntry) {
  if (!import.meta.env.DEV && !isBlocksuiteDebugEnabled() && entry.kind !== "error") {
    return;
  }

  if (entry.kind === "error") {
    console.error("[BlocksuiteReport]", entry);
    return;
  }

  console.warn("[BlocksuiteReport]", entry);
}

function notifySink(owner: ReportOwner, entry: BlocksuiteReportEntry) {
  try {
    owner.__tcBlocksuiteReportSink?.(entry);
  }
  catch {
  }
}

function finalizeEntry(entry: BlocksuiteReportEntry) {
  const owner = commitEntry(entry);
  emitConsole(entry);
  notifySink(owner, entry);
  return entry;
}

export function getBlocksuiteNoErrorCode(): string {
  return BLOCKSUITE_NO_ERROR;
}

export function reportBlocksuiteEvent(params: BlocksuiteReportContext & {
  name: string;
  level?: Exclude<BlocksuiteReportLevel, "error">;
  message?: string;
  details?: Record<string, unknown>;
  toast?: BlocksuiteReportToast;
}): BlocksuiteReportEntry {
  return finalizeEntry({
    at: now(),
    kind: "event",
    level: params.level ?? "info",
    name: normalizeText(params.name, "blocksuite-event"),
    instanceId: normalizeText(params.instanceId, "unknown-instance"),
    workspaceId: normalizeText(params.workspaceId, "unknown-workspace"),
    docId: normalizeText(params.docId, "unknown-doc"),
    phase: normalizeText(params.phase, "unknown-phase"),
    errorCode: normalizeText(params.errorCode, BLOCKSUITE_NO_ERROR),
    message: typeof params.message === "string" && params.message.trim().length > 0 ? params.message.trim() : undefined,
    details: params.details,
    toast: params.toast,
  });
}

export function reportBlocksuiteError(params: BlocksuiteReportContext & {
  name: string;
  message: string;
  error?: unknown;
  level?: Extract<BlocksuiteReportLevel, "warn" | "error">;
  details?: Record<string, unknown>;
  toast?: BlocksuiteReportToast;
}): BlocksuiteReportEntry {
  return finalizeEntry({
    at: now(),
    kind: "error",
    level: params.level ?? "error",
    name: normalizeText(params.name, "blocksuite-error"),
    instanceId: normalizeText(params.instanceId, "unknown-instance"),
    workspaceId: normalizeText(params.workspaceId, "unknown-workspace"),
    docId: normalizeText(params.docId, "unknown-doc"),
    phase: normalizeText(params.phase, "unknown-phase"),
    errorCode: normalizeText(params.errorCode, "unknown-error"),
    message: normalizeText(params.message, "Blocksuite error"),
    details: normalizeDetails(params.details, params.error),
    toast: params.toast,
  });
}

export function getBlocksuiteReportHistory(): BlocksuiteReportEntry[] {
  return [...(getReportOwner().__tcBlocksuiteReportHistory ?? [])];
}

export function setBlocksuiteReportSink(sink: BlocksuiteReportSink | null) {
  const owner = globalThis as unknown as ReportOwner;
  if (!sink) {
    delete owner.__tcBlocksuiteReportSink;
    return;
  }
  owner.__tcBlocksuiteReportSink = sink;
}
