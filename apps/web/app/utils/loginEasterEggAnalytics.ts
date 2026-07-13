export type LoginEasterEggAnalyticsEvent
  = "login_page_view"
    | "login_easter_egg_discovered";

type LoginEasterEggAnalyticsDeps = {
  fetchFn: (input: string, init: RequestInit) => Promise<Response>;
  getLocation: () => Pick<Location, "hostname" | "protocol"> | null;
  isProd: boolean;
};

const ANALYTICS_EVENT_PATHS: Record<LoginEasterEggAnalyticsEvent, string> = {
  login_page_view: "/_analytics/login-page-view",
  login_easter_egg_discovered: "/_analytics/login-easter-egg-discovered",
};

const ANALYTICS_HOSTS = new Set([
  "tuan.chat",
  "www.tuan.chat",
  "test.tuan.chat",
]);

function createDefaultDeps(): LoginEasterEggAnalyticsDeps {
  return {
    fetchFn: (input, init) => fetch(input, init),
    getLocation: () => (typeof window === "undefined" ? null : window.location),
    isProd: import.meta.env.PROD,
  };
}

export function createLoginEasterEggAnalyticsReporter(
  rawDeps: Partial<LoginEasterEggAnalyticsDeps> = {},
) {
  const deps = {
    ...createDefaultDeps(),
    ...rawDeps,
  } satisfies LoginEasterEggAnalyticsDeps;

  return async (event: LoginEasterEggAnalyticsEvent) => {
    const location = deps.getLocation();
    if (
      !deps.isProd
      || location?.protocol !== "https:"
      || !ANALYTICS_HOSTS.has(location.hostname.toLowerCase())
    ) {
      return false;
    }

    try {
      const response = await deps.fetchFn(ANALYTICS_EVENT_PATHS[event], {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
      });
      return response.status === 204;
    }
    catch {
      return false;
    }
  };
}

export const reportLoginEasterEggAnalytics = createLoginEasterEggAnalyticsReporter();
