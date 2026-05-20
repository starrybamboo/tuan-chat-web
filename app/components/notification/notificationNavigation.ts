export const NOTIFICATION_TARGET_FALLBACK_PATH = "/notifications";

export function normalizeNotificationTargetPath(targetPath?: string | null): string | null {
  if (typeof targetPath !== "string") {
    return null;
  }
  const normalized = targetPath.trim();
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return null;
  }
  return normalized;
}

export function resolveNotificationTargetPath(targetPath?: string | null): string {
  return normalizeNotificationTargetPath(targetPath) ?? NOTIFICATION_TARGET_FALLBACK_PATH;
}
