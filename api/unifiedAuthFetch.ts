import { handleUnauthorized } from "@/utils/auth/unauthorized";

import { recoverAuthTokenFromSession } from "./authRecovery";
import { resolveApiBaseUrl } from "./instance";

function readLocalToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return String(window.localStorage.getItem("token") || "").trim();
  }
  catch {
    return "";
  }
}

function buildAuthorizedHeaders(headersInit?: HeadersInit): Headers {
  const headers = new Headers(headersInit);
  const token = readLocalToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

function resolveRecoveryBaseUrl(explicitBaseUrl?: string): string | undefined {
  const normalized = String(explicitBaseUrl || "").trim();
  if (normalized) {
    return normalized;
  }

  return resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
}

export async function fetchWithUnifiedAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: {
    recoveryBaseUrl?: string;
    skipRecovery?: boolean;
  },
): Promise<Response> {
  const execute = () => fetch(input, {
    ...init,
    headers: buildAuthorizedHeaders(init?.headers),
    credentials: init?.credentials ?? "include",
  });

  let response = await execute();
  if (response.status !== 401 || options?.skipRecovery) {
    return response;
  }

  const recoveredToken = await recoverAuthTokenFromSession(resolveRecoveryBaseUrl(options?.recoveryBaseUrl));
  if (recoveredToken) {
    response = await execute();
    if (response.status !== 401) {
      return response;
    }
  }

  handleUnauthorized({ source: "http" });
  return response;
}
