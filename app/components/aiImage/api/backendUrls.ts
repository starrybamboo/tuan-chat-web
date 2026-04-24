export function resolveBackendNovelApiUrl(novelApiPath: string) {
  const path = `/api/novelapi${novelApiPath}`;
  const envBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (!envBase)
    return path;

  const appendPath = (basePath: string) => {
    const normalized = basePath.replace(/\/+$/, "");
    if (!normalized || normalized === "/")
      return path;
    if (normalized.endsWith("/api"))
      return `${normalized}/novelapi${novelApiPath}`;
    return `${normalized}${path}`;
  };

  try {
    const baseUrl = typeof window === "undefined"
      ? new URL(envBase, "http://localhost")
      : new URL(envBase, window.location.href);

    baseUrl.pathname = appendPath(baseUrl.pathname);
    baseUrl.search = "";
    baseUrl.hash = "";
    return baseUrl.toString();
  }
  catch {
    const normalizedBase = envBase.replace(/\/+$/, "");
    if (!normalizedBase)
      return path;
    if (normalizedBase.endsWith("/api"))
      return `${normalizedBase}/novelapi${novelApiPath}`;
    return `${normalizedBase}${path}`;
  }
}

export function resolveBackendGenerateImageUrl() {
  return resolveBackendNovelApiUrl("/ai/generate-image");
}

export function resolveBackendAugmentImageUrl() {
  return resolveBackendNovelApiUrl("/ai/augment-image");
}
