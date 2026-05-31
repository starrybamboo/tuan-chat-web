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
  getDocument: () => CloudflareWebAnalyticsDocument | null;
  getWindow: () => CloudflareWebAnalyticsWindow | null;
  setTimeoutFn: typeof setTimeout;
  timeoutMs: number;
};

const CLOUDFLARE_WEB_ANALYTICS_SCRIPT_ID = "tc-cloudflare-web-analytics";
const CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SRC = "https://static.cloudflareinsights.com/beacon.min.js";
const CLOUDFLARE_WEB_ANALYTICS_TOKEN = "bd3746d5fcac46db97172d382492de26";
const CLOUDFLARE_WEB_ANALYTICS_SCRIPT_STATE_KEY = "tcCfAnalyticsState";
const CLOUDFLARE_WEB_ANALYTICS_HOSTS = new Set([
  "tuan.chat",
  "www.tuan.chat",
  "test.tuan.chat",
  "www.test.tuan.chat",
]);
const DEFAULT_ANALYTICS_BLOCK_TIMEOUT_MS = 4000;

function createDefaultDeps(): CloudflareWebAnalyticsDeps {
  return {
    isProd: import.meta.env.PROD,
    getDocument: () => (typeof document === "undefined" ? null : (document as unknown as CloudflareWebAnalyticsDocument)),
    getWindow: () => (typeof window === "undefined" ? null : (window as unknown as CloudflareWebAnalyticsWindow)),
    setTimeoutFn: setTimeout,
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

function applyCloudflareWebAnalyticsScriptAttrs(script: CloudflareWebAnalyticsScript) {
  script.id = CLOUDFLARE_WEB_ANALYTICS_SCRIPT_ID;
  script.src = CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SRC;
  script.defer = true;
  script.setAttribute("data-cf-beacon", JSON.stringify({
    token: CLOUDFLARE_WEB_ANALYTICS_TOKEN,
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
  hostname?: string | null | undefined;
  isProd: boolean;
  protocol?: string | null | undefined;
}) {
  return options.isProd
    && options.protocol === "https:"
    && CLOUDFLARE_WEB_ANALYTICS_HOSTS.has(normalizeHostname(options.hostname));
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
      isProd: deps.isProd,
      protocol: runtimeWindow?.location.protocol,
      hostname: runtimeWindow?.location.hostname,
    });
  };

  const ensureLoaded = async () => {
    if (!isEligibleRuntime()) {
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
    applyCloudflareWebAnalyticsScriptAttrs(script);

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
      deps.setTimeoutFn(() => {
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
