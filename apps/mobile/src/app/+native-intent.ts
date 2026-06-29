import { resolveMobileNotificationRoute } from "../features/notifications/mobile-notification-routing";

function toSystemPath(href: string | null) {
  if (!href) {
    return href;
  }

  if (href === "/(tabs)") {
    return "/";
  }
  if (href.startsWith("/(tabs)?")) {
    return `/${href.slice("/(tabs)".length)}`;
  }
  if (href.startsWith("/(tabs)/")) {
    return href.slice("/(tabs)".length);
  }

  return href;
}

export function redirectSystemPath({ path }: { initial: boolean; path: string }) {
  try {
    return toSystemPath(resolveMobileNotificationRoute({ targetPath: path }));
  }
  catch {
    return "/";
  }
}
