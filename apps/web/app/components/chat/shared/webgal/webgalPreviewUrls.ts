function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeEditorBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  }
  catch {
    return trimTrailingSlash(value);
  }

  const isLocalHost = parsed.hostname === "localhost"
    || parsed.hostname === "127.0.0.1"
    || parsed.hostname === "[::1]";

  // 本地 Terre API 跑在 3001，但编辑器页经常由本地反代暴露在默认 http 端口。
  if (parsed.protocol === "http:" && isLocalHost && parsed.port === "3001") {
    parsed.port = "";
  }

  return trimTrailingSlash(parsed.toString());
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  }
  catch {
    return value;
  }
}

function parseWebGALPreviewUrl(previewUrl: string | null | undefined): { baseUrl: string; gameName: string } | null {
  const normalized = String(previewUrl ?? "").trim();
  if (!normalized) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  }
  catch {
    return null;
  }

  const hashGameMatch = parsed.hash.match(/^#\/game\/([^/?#]+)/);
  if (hashGameMatch?.[1]) {
    parsed.search = "";
    parsed.hash = "";
    return {
      baseUrl: trimTrailingSlash(parsed.toString()),
      gameName: decodePathSegment(hashGameMatch[1]),
    };
  }

  const pathSegments = parsed.pathname.split("/");
  const gamesIndex = pathSegments.findIndex(segment => segment === "games");
  const gameSegment = gamesIndex >= 0 ? pathSegments[gamesIndex + 1] : undefined;
  if (!gameSegment) {
    return null;
  }

  const basePath = pathSegments.slice(0, gamesIndex).join("/") || "/";
  parsed.pathname = basePath;
  parsed.search = "";
  parsed.hash = "";

  return {
    baseUrl: trimTrailingSlash(parsed.toString()),
    gameName: decodePathSegment(gameSegment),
  };
}

export function buildWebGALEditorUrl(params: {
  previewUrl: string | null | undefined;
  fallbackGameName?: string | null;
  terreBaseUrl: string;
}): string | null {
  const previewInfo = parseWebGALPreviewUrl(params.previewUrl);
  const gameName = previewInfo?.gameName || String(params.fallbackGameName ?? "").trim();
  if (!gameName) {
    return null;
  }

  const baseUrl = previewInfo?.baseUrl || trimTrailingSlash(params.terreBaseUrl);
  return `${normalizeEditorBaseUrl(baseUrl)}/#/game/${encodeURIComponent(gameName)}`;
}
