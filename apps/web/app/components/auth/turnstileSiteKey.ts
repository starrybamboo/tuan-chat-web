import { resolveRuntimeApiBaseUrl } from "@/utils/runtimeUrl";

const PRODUCTION_TURNSTILE_SITE_KEY = "0x4AAAAAADuhW4KyzfPxtfWu";
const DEVELOPMENT_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";

const TURNSTILE_TEST_SITE_KEYS = new Set([
  "1x00000000000000000000AA",
  "1x00000000000000000000BB",
  "2x00000000000000000000AB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
]);

function isLoopbackHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalizedHostname === "localhost"
    || normalizedHostname.endsWith(".localhost")
    || normalizedHostname === "::1"
    || normalizedHostname === "0.0.0.0"
    || /^127(?:\.\d{1,3}){3}$/.test(normalizedHostname);
}

function resolveBackendHostname(apiBaseUrl: string | undefined) {
  const resolvedApiBaseUrl = resolveRuntimeApiBaseUrl(apiBaseUrl);
  if (!resolvedApiBaseUrl) {
    return null;
  }

  try {
    const runtimeHref = typeof window === "undefined" ? undefined : window.location?.href;
    return new URL(resolvedApiBaseUrl, runtimeHref).hostname;
  }
  catch {
    return null;
  }
}

type ResolveTurnstileSiteKeyOptions = {
  apiBaseUrl: string | undefined;
  envSiteKey: string | undefined;
};

export function resolveTurnstileSiteKey({
  apiBaseUrl,
  envSiteKey,
}: ResolveTurnstileSiteKeyOptions) {
  const normalizedEnvSiteKey = String(envSiteKey || "").trim();
  const backendHostname = resolveBackendHostname(apiBaseUrl);
  const usesLocalBackend = backendHostname !== null && isLoopbackHostname(backendHostname);

  if (usesLocalBackend) {
    return TURNSTILE_TEST_SITE_KEYS.has(normalizedEnvSiteKey)
      ? normalizedEnvSiteKey
      : DEVELOPMENT_TURNSTILE_SITE_KEY;
  }

  return normalizedEnvSiteKey && !TURNSTILE_TEST_SITE_KEYS.has(normalizedEnvSiteKey)
    ? normalizedEnvSiteKey
    : PRODUCTION_TURNSTILE_SITE_KEY;
}
