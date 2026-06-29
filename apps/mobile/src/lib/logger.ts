import { Directory, File, Paths } from "expo-file-system";
import { Platform, Share } from "react-native";

import { setStringAsync } from "./clipboard";

export type LogEntry = {
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  stack?: string;
};

const MAX_ENTRIES = 300;
const LOG_EXPORT_DIR_NAME = "feedback-logs";
const entries: LogEntry[] = [];

function push(entry: LogEntry) {
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.shift();
  }
}

function formatEntry(e: LogEntry): string {
  const base = `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}`;
  return e.stack ? `${base}\n${e.stack}` : base;
}

function stringifyLogArg(arg: unknown): string {
  if (typeof arg === "string") {
    return arg;
  }
  if (arg instanceof Error) {
    return arg.stack ?? arg.message;
  }

  try {
    return JSON.stringify(arg);
  }
  catch {
    return String(arg);
  }
}

function formatConsoleArgs(args: unknown[]): string {
  return args.map(stringifyLogArg).join(" ");
}

export function getLogEntries(): readonly LogEntry[] {
  return entries;
}

export function getFormattedLogs(): string {
  if (entries.length === 0)
    return "暂无日志";
  return entries.map(formatEntry).join("\n\n");
}

export function buildFeedbackLogContent(description?: string): string {
  const normalizedDescription = description?.trim();
  const logs = getFormattedLogs();
  return normalizedDescription
    ? `【问题描述】\n${normalizedDescription}\n\n【日志】\n${logs}`
    : logs;
}

export function buildLogFileName(date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `tuanchat-mobile-log-${timestamp}.txt`;
}

function ensureLogExportDirectory(): Directory {
  const directory = new Directory(Paths.document, LOG_EXPORT_DIR_NAME);
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }
  return directory;
}

export function writeLogFile(content = getFormattedLogs()): { fileName: string; uri: string } {
  const fileName = buildLogFileName();
  const file = new File(ensureLogExportDirectory(), fileName);
  if (file.exists) {
    file.delete();
  }
  file.write(content);
  return { fileName, uri: file.uri };
}

export async function exportLogsToPickedDirectory(content = getFormattedLogs()): Promise<{ fileName: string; uri: string }> {
  const fileName = buildLogFileName();
  const directory = await Directory.pickDirectoryAsync(Paths.document.uri);
  const file = new File(directory, fileName);
  if (file.exists) {
    file.delete();
  }
  file.write(content);
  return { fileName, uri: file.uri };
}

export async function copyLogs(content?: string): Promise<void> {
  await setStringAsync(content ?? getFormattedLogs());
}

export async function shareLogs(content?: string): Promise<void> {
  const text = content ?? getFormattedLogs();
  const file = writeLogFile(text);
  await Share.share(
    Platform.OS === "ios"
      ? { message: text, url: file.uri }
      : { message: `TuanChat 日志文件已生成：${file.uri}`, title: "TuanChat 日志" },
  );
}

export function clearLogs(): void {
  entries.length = 0;
}

export function installGlobalHandlers(): void {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    push({
      timestamp: new Date().toISOString(),
      level: "error",
      message: formatConsoleArgs(args),
    });
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    push({
      timestamp: new Date().toISOString(),
      level: "warn",
      message: formatConsoleArgs(args),
    });
    originalConsoleWarn.apply(console, args);
  };

  const originalConsoleInfo = console.info;
  console.info = (...args: unknown[]) => {
    push({
      timestamp: new Date().toISOString(),
      level: "info",
      message: formatConsoleArgs(args),
    });
    originalConsoleInfo.apply(console, args);
  };

  const originalConsoleLog = console.log;
  console.log = (...args: unknown[]) => {
    push({
      timestamp: new Date().toISOString(),
      level: "info",
      message: formatConsoleArgs(args),
    });
    originalConsoleLog.apply(console, args);
  };

  const handler = (event: { reason?: unknown }) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    push({ timestamp: new Date().toISOString(), level: "error", message: `[UnhandledRejection] ${message}`, stack });
  };

  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("unhandledrejection", handler as EventListener);
  }
}

export function logError(error: Error, context?: string): void {
  push({
    timestamp: new Date().toISOString(),
    level: "error",
    message: context ? `[${context}] ${error.message}` : error.message,
    stack: error.stack,
  });
}
