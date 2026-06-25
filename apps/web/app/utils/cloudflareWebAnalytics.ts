export type CloudflareWebAnalyticsStatus = "disabled" | "idle" | "loading" | "loaded" | "blocked";

type CloudflareWebAnalyticsScript = {
  id: string;
  src: string;
  defer: boolean;
  dataset: Record<string, string | undefined>;
  isConnected?: boolean;
  addEventListener: (
    type: "load" | "error",
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
};

type CloudflareWebAnalyticsDocument = {
  baseURI?: string;
  head?: {
    appendChild: (node: CloudflareWebAnalyticsScript) => void;
  } | null;
  createElement: (tag: string) => CloudflareWebAnalyticsScript;
  getElementById: (id: string) => unknown;
  querySelectorAll: (selectors: string) => Iterable<unknown>;
};

type CloudflareWebAnalyticsWindow = {
  location: {
    protocol?: string;
    hostname?: string;
  };
};

type CloudflareWebAnalyticsDeps = {
  isProd: boolean;
  analyticsConfig: CloudflareWebAnalyticsConfig | null;
  getDocument: () => CloudflareWebAnalyticsDocument | null;
  getWindow: () => CloudflareWebAnalyticsWindow | null;
  setTimeoutFn: (handler: () => void, timeoutMs: number) => ReturnType<typeof setTimeout>;
  timeoutMs: number;
};

type CloudflareWebAnalyticsConfig = {
  environment: "production" | "test";
  hosts: ReadonlySet<string>;
  token: string;
};

const CLOUDFLARE_WEB_ANALYTICS_SCRIPT_ID = "tc-cloudflare-web-analytics";
const CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SRC = "https://static.cloudflareinsights.com/beacon.min.js";
const CLOUDFLARE_WEB_ANALYTICS_PRODUCTION_TOKEN = "ecffe13cc26a481880812c11e3489111";
const CLOUDFLARE_WEB_ANALYTICS_TEST_TOKEN = "bd9e06f17e3b4f19bd7d6def90fdc7e5";
const CLOUDFLARE_WEB_ANALYTICS_SCRIPT_STATE_KEY = "tcCfAnalyticsState";
const DEFAULT_ANALYTICS_BLOCK_TIMEOUT_MS = 4000;

function createDefaultCloudflareWebAnalyticsConfig(): CloudflareWebAnalyticsConfig | null {
  if (import.meta.env.MODE === "production") {
    return {
      environment: "production",
      token: CLOUDFLARE_WEB_ANALYTICS_PRODUCTION_TOKEN,
      hosts: new Set(["tuan.chat", "www.tuan.chat"]),
    };
  }

  if (import.meta.env.MODE === "test") {
    return {
      environment: "test",
      token: CLOUDFLARE_WEB_ANALYTICS_TEST_TOKEN,
      hosts: new Set(["test.tuan.chat", "www.test.tuan.chat"]),
    };
  }

  return null;
}

function createDefaultDeps(): CloudflareWebAnalyticsDeps {
  return {
    isProd: import.meta.env.PROD,
    analyticsConfig: createDefaultCloudflareWebAnalyticsConfig(),
    getDocument: () => (typeof document === "undefined" ? null : (document as unknown as CloudflareWebAnalyticsDocument)),
    getWindow: () => (typeof window === "undefined" ? null : (window as unknown as CloudflareWebAnalyticsWindow)),
    setTimeoutFn: (handler, timeoutMs) => setTimeout(handler, timeoutMs),
    timeoutMs: DEFAULT_ANALYTICS_BLOCK_TIMEOUT_MS,
  };
}

function normalizeHostname(hostname: string | null | undefined) {
  return typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
}

function normalizeScriptUrl(rawUrl: string, baseURI: string | undefined) {
  try {
    return new URL(rawUrl, baseURI || CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SRC).href;
  }
  catch {
    return rawUrl;
  }
}

function isCloudflareWebAnalyticsScript(value: unknown): value is CloudflareWebAnalyticsScript {
  return typeof value === "object"
    && value !== null
    && "addEventListener" in value
    && "setAttribute" in value
    && "getAttribute" in value
    && "dataset" in value;
}

function readCloudflareWebAnalyticsScriptState(script: CloudflareWebAnalyticsScript): CloudflareWebAnalyticsStatus | null {
  const state = script.dataset[CLOUDFLARE_WEB_ANALYTICS_SCRIPT_STATE_KEY];
  return state === "loaded" || state === "blocked" ? state : null;
}

function writeCloudflareWebAnalyticsScriptState(
  script: CloudflareWebAnalyticsScript,
  status: Extract<CloudflareWebAnalyticsStatus, "loaded" | "blocked">,
) {
  script.dataset[CLOUDFLARE_WEB_ANALYTICS_SCRIPT_STATE_KEY] = status;
}

function applyCloudflareWebAnalyticsScriptAttrs(script: CloudflareWebAnalyticsScript, token: string) {
  script.id = CLOUDFLARE_WEB_ANALYTICS_SCRIPT_ID;
  script.src = CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SRC;
  script.defer = true;
  script.setAttribute("data-cfasync", "false");
  script.setAttribute("data-cf-beacon", JSON.stringify({
    token,
    spa: true,
  }));
}

function findExistingCloudflareWebAnalyticsScript(
  runtimeDocument: CloudflareWebAnalyticsDocument,
): CloudflareWebAnalyticsScript | null {
  const byId = runtimeDocument.getElementById(CLOUDFLARE_WEB_ANALYTICS_SCRIPT_ID);
  if (isCloudflareWebAnalyticsScript(byId)) {
    return byId;
  }

  const expectedUrl = normalizeScriptUrl(
    CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SRC,
    runtimeDocument.baseURI,
  );

  for (const candidate of runtimeDocument.querySelectorAll("script[src]")) {
    if (!isCloudflareWebAnalyticsScript(candidate)) {
      continue;
    }
    const currentUrl = normalizeScriptUrl(candidate.src || candidate.getAttribute("src") || "", runtimeDocument.baseURI);
    if (currentUrl === expectedUrl) {
      return candidate;
    }
  }

  return null;
}

export function shouldEnableCloudflareWebAnalytics(options: {
  analyticsConfig: CloudflareWebAnalyticsConfig | null;
  hostname?: string | null | undefined;
  isProd: boolean;
  protocol?: string | null | undefined;
}) {
  return options.isProd
    && options.protocol === "https:"
    && !!options.analyticsConfig
    && options.analyticsConfig.hosts.has(normalizeHostname(options.hostname));
}

export function resolveCloudflareWebAnalyticsConfig(options: {
  analyticsConfig: CloudflareWebAnalyticsConfig | null;
  hostname?: string | null | undefined;
  isProd: boolean;
  protocol?: string | null | undefined;
}) {
  if (!shouldEnableCloudflareWebAnalytics(options)) {
    return null;
  }

  const hostname = normalizeHostname(options.hostname);
  const analyticsConfig = options.analyticsConfig;
  if (!analyticsConfig || !analyticsConfig.hosts.has(hostname)) {
    return null;
  }

  return {
    environment: analyticsConfig.environment,
    token: analyticsConfig.token,
  } as const;
}

export function createCloudflareWebAnalyticsController(rawDeps: Partial<CloudflareWebAnalyticsDeps> = {}) {
  const deps = {
    ...createDefaultDeps(),
    ...rawDeps,
  } satisfies CloudflareWebAnalyticsDeps;

  let currentStatus: CloudflareWebAnalyticsStatus = "idle";
  let loadingPromise: Promise<CloudflareWebAnalyticsStatus> | null = null;
  const listeners = new Set<(status: CloudflareWebAnalyticsStatus) => void>();

  const setStatus = (nextStatus: CloudflareWebAnalyticsStatus) => {
    if (currentStatus === nextStatus) {
      return;
    }
    currentStatus = nextStatus;
    for (const listener of listeners) {
      listener(nextStatus);
    }
  };

  const isEligibleRuntime = () => {
    const runtimeWindow = deps.getWindow();
    return shouldEnableCloudflareWebAnalytics({
      analyticsConfig: deps.analyticsConfig,
      isProd: deps.isProd,
      protocol: runtimeWindow?.location.protocol,
      hostname: runtimeWindow?.location.hostname,
    });
  };

  const ensureLoaded = async () => {
    const runtimeWindow = deps.getWindow();
    const analyticsConfig = resolveCloudflareWebAnalyticsConfig({
      analyticsConfig: deps.analyticsConfig,
      isProd: deps.isProd,
      protocol: runtimeWindow?.location.protocol,
      hostname: runtimeWindow?.location.hostname,
    });

    if (!analyticsConfig) {
      setStatus("disabled");
      return "disabled" as const;
    }

    if (currentStatus === "loaded" || currentStatus === "blocked") {
      return currentStatus;
    }

    if (loadingPromise) {
      return loadingPromise;
    }

    const runtimeDocument = deps.getDocument();
    if (!runtimeDocument?.head) {
      setStatus("blocked");
      return "blocked" as const;
    }

    setStatus("loading");

    const script = findExistingCloudflareWebAnalyticsScript(runtimeDocument)
      ?? runtimeDocument.createElement("script");
    applyCloudflareWebAnalyticsScriptAttrs(script, analyticsConfig.token);

    const existingState = readCloudflareWebAnalyticsScriptState(script);
    if (existingState) {
      setStatus(existingState);
      return existingState;
    }

    loadingPromise = new Promise<CloudflareWebAnalyticsStatus>((resolve) => {
      let resolved = false;

      const resolveOnce = (status: CloudflareWebAnalyticsStatus) => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve(status);
      };

      const markLoaded = () => {
        writeCloudflareWebAnalyticsScriptState(script, "loaded");
        setStatus("loaded");
        resolveOnce("loaded");
      };

      const markBlocked = () => {
        if (readCloudflareWebAnalyticsScriptState(script) === "loaded") {
          return;
        }
        writeCloudflareWebAnalyticsScriptState(script, "blocked");
        setStatus("blocked");
        resolveOnce("blocked");
      };

      script.addEventListener("load", markLoaded as EventListener, { once: true });
      script.addEventListener("error", markBlocked as EventListener, { once: true });

      // 广告拦截器有时会直接吞掉请求，不一定触发 error；超时后按被拦截处理。
      const scheduleTimeout = deps.setTimeoutFn;
      scheduleTimeout(() => {
        if (readCloudflareWebAnalyticsScriptState(script) === "loaded") {
          return;
        }
        markBlocked();
      }, deps.timeoutMs);

      if (!script.isConnected) {
        runtimeDocument.head!.appendChild(script);
      }
    });

    try {
      return await loadingPromise;
    }
    finally {
      loadingPromise = null;
    }
  };

  const subscribe = (listener: (status: CloudflareWebAnalyticsStatus) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    ensureLoaded,
    getStatus: () => currentStatus,
    isEligibleRuntime,
    subscribe,
  };
}

export const cloudflareWebAnalytics = createCloudflareWebAnalyticsController();
