export type NativeAppNotificationPayload = {
  body?: string;
  tag?: string;
  targetPath?: string | null;
  title?: string;
};

export function normalizeNotificationTargetPath(targetPath?: string | null) {
  if (typeof targetPath !== "string") {
    return null;
  }

  const normalized = targetPath.trim();
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return null;
  }

  return normalized;
}
