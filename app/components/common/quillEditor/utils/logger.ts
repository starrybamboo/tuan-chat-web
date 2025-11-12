/*
 Lightweight scoped logger for Quill editor refactor
 - Enable by env: NEXT_PUBLIC_DEBUG_QUILL=1 (all)
 - Or per-domain: NEXT_PUBLIC_DEBUG_QUILL_DOM / MENTION / SLASH / PASTE / MARKDOWN / BACKSPACE / TOOLBAR / CORE
 - Optionally enable via options.enabledOverride per instance (OR logic)
 Usage:
   const log = createLogger("Mentions", { domainKey: "MENTION", enabledOverride: debugSelection });
   log.debug("activated", { index });
   log.time("insert");
   // ... work ...
   log.timeEnd("insert");
*/

export type Logger = {
  scope: string;
  enabled: () => boolean;
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  time: (label: string) => void;
  timeEnd: (label: string, extra?: unknown) => void;
  child: (subscope: string, opts?: LoggerOptions) => Logger;
};

export type LoggerOptions = {
  domainKey?:
    | "DOM"
    | "MENTION"
    | "SLASH"
    | "PASTE"
    | "MARKDOWN"
    | "BACKSPACE"
    | "TOOLBAR"
    | "CORE"
    | string;
  enabledOverride?: boolean;
};

function truthy(v: unknown): boolean {
  if (v == null)
    return false;
  const s = String(v);
  return s === "1" || s === "true" || s === "TRUE" || s === "on" || s === "ON";
}

function readEnvFlag(name: string): boolean {
  try {
    // In frameworks like Next or Node bundlers, process.env.* may be inlined
    const v = (typeof process !== "undefined" ? (process as any).env?.[name] : undefined) ?? "";
    return truthy(v);
  }
  catch {
    return false;
  }
}

function computeEnabled(domainKey?: string, enabledOverride?: boolean): boolean {
  // Build-time env (Next, Node bundlers)
  const allEnv = readEnvFlag("NEXT_PUBLIC_DEBUG_QUILL") || readEnvFlag("QUILL_DEBUG");
  const domainEnv = domainKey
    ? (readEnvFlag(`NEXT_PUBLIC_DEBUG_QUILL_${domainKey.toUpperCase()}`)
      || readEnvFlag(`QUILL_DEBUG_${domainKey.toUpperCase()}`))
    : false;

  // Runtime: window flags, localStorage and URLSearchParams (React Router / Vite / plain React)
  let allRuntime = false;
  let domainRuntime = false;
  try {
    if (typeof window !== "undefined") {
      const w: any = window as any;
      allRuntime = truthy(w.QUILL_DEBUG) || truthy(window.localStorage?.getItem?.("QUILL_DEBUG"));
      const usp = new URLSearchParams(window.location?.search || "");
      allRuntime = allRuntime || truthy(usp.get("QUILL_DEBUG"));
      if (domainKey) {
        const key = `QUILL_DEBUG_${domainKey.toUpperCase()}`;
        domainRuntime = truthy(w[key]) || truthy(window.localStorage?.getItem?.(key)) || truthy(usp.get(key));
      }
    }
  }
  catch {
    // ignore
  }

  return !!(enabledOverride || allEnv || domainEnv || allRuntime || domainRuntime);
}

export function createLogger(scope: string, options: LoggerOptions = {}): Logger {
  const { domainKey, enabledOverride } = options;
  const prefix = `[Quill/${scope}]`;
  const timers = new Map<string, number>();

  const safeNow = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

  const base: Logger = {
    scope,
    enabled: () => computeEnabled(domainKey, enabledOverride),
    debug: (message, data) => {
      if (!computeEnabled(domainKey, enabledOverride))
        return;
      // project lint allows only warn/error; use warn for debug channel
      console.warn(prefix, message, data ?? "");
    },
    info: (message, data) => {
      if (!computeEnabled(domainKey, enabledOverride))
        return;
      // project lint allows only warn/error; use warn for info channel
      console.warn(prefix, message, data ?? "");
    },
    warn: (message, data) => {
      if (!computeEnabled(domainKey, enabledOverride))
        return;
      console.warn(prefix, message, data ?? "");
    },
    time: (label) => {
      if (!computeEnabled(domainKey, enabledOverride))
        return;
      timers.set(label, safeNow());
    },
    timeEnd: (label, extra) => {
      if (!computeEnabled(domainKey, enabledOverride))
        return;
      const start = timers.get(label);
      const end = safeNow();
      const dur = start != null ? Math.max(0, end - start) : undefined;
      // project lint allows only warn/error; use warn for timing channel
      console.warn(prefix, `${label}: ${dur != null ? `${dur.toFixed(2)}ms` : "n/a"}`, extra ?? "");
      if (start != null)
        timers.delete(label);
    },
    child: (subscope: string, opts?: LoggerOptions) =>
      createLogger(`${scope}/${subscope}`, {
        domainKey: opts?.domainKey ?? domainKey,
        enabledOverride: (opts?.enabledOverride ?? false) || enabledOverride,
      }),
  };

  return base;
}

// A disabled no-op logger for convenience
export const noopLogger: Logger = {
  scope: "noop",
  enabled: () => false,
  debug: () => {},
  info: () => {},
  warn: () => {},
  time: () => {},
  timeEnd: () => {},
  child: () => noopLogger,
};
