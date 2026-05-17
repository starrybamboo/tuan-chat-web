import type { NativeAppNotificationPayload } from "./mobileNotificationTypes";

import { normalizeNotificationTargetPath } from "./mobileNotificationTypes";

function parsePositiveInteger(value: string | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildRouteHref(pathname: string, params?: Record<string, number | string | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value == null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }

  const queryString = query.toString();
  return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
}

function normalizeRoutePath(targetPath: string) {
  const pathOnly = targetPath.split(/[?#]/, 1)[0] ?? targetPath;
  return pathOnly.trim();
}

export function resolveMobileNotificationRoute(payload: Pick<NativeAppNotificationPayload, "resourceId" | "resourceType" | "targetPath">) {
  const normalizedTargetPath = normalizeNotificationTargetPath(payload.targetPath);
  const normalizedPath = normalizedTargetPath ? normalizeRoutePath(normalizedTargetPath) : "";

  if (normalizedPath.startsWith("/chat/private/")) {
    const contactId = parsePositiveInteger(normalizedPath.split("/")[3]);
    return contactId ? buildRouteHref("/(tabs)", { contactId }) : "/(tabs)";
  }

  if (normalizedPath.startsWith("/chat/")) {
    const segments = normalizedPath.split("/").filter(Boolean);
    const spaceId = parsePositiveInteger(segments[1]);
    const roomId = parsePositiveInteger(segments[2]);
    if (spaceId && roomId) {
      return buildRouteHref("/(tabs)", { spaceId, roomId });
    }
    return "/(tabs)";
  }

  if (normalizedPath === "/chat") {
    return "/(tabs)";
  }

  if (normalizedPath === "/role" || normalizedPath === "/roles") {
    return "/(tabs)/role";
  }

  if (normalizedPath === "/notifications" || normalizedPath === "/profile") {
    return "/(tabs)/explore";
  }

  if (normalizedTargetPath) {
    return "/(tabs)/explore";
  }

  if (payload.resourceId != null || payload.resourceType) {
    return "/(tabs)/explore";
  }

  return null;
}
