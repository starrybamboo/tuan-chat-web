type RuntimeEnvironmentOptions = {
  isDev?: boolean;
  mode?: string | null | undefined;
  apiBaseUrl?: string | null | undefined;
  hostname?: string | null | undefined;
};

const TEST_ENV_HOSTS = new Set([
  "test.tuan.chat",
  "www.test.tuan.chat",
]);

function normalizeValue(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function resolveHostnameFromUrl(value: string | null | undefined) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return "";
  }

  try {
    return normalizeValue(new URL(normalized, "https://placeholder.local").hostname);
  }
  catch {
    return "";
  }
}

export function isTestEnvironment(options: Omit<RuntimeEnvironmentOptions, "isDev"> = {}) {
  if (normalizeValue(options.mode) === "test") {
    return true;
  }

  const runtimeHostname = normalizeValue(options.hostname);
  if (runtimeHostname && TEST_ENV_HOSTS.has(runtimeHostname)) {
    return true;
  }

  const apiBaseHostname = resolveHostnameFromUrl(options.apiBaseUrl);
  return Boolean(apiBaseHostname) && TEST_ENV_HOSTS.has(apiBaseHostname);
}

export function isDevOrTestEnvironment(options: RuntimeEnvironmentOptions = {}) {
  if (options.isDev) {
    return true;
  }
  return isTestEnvironment(options);
}
