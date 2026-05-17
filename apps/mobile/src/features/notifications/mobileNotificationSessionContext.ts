import { createContext, use } from "react";

import type { MobileNotificationSessionContextValue } from "./mobile-notification-session";

export const MobileNotificationSessionContext = createContext<MobileNotificationSessionContextValue | null>(null);

export function useMobileNotificationSession() {
  const value = use(MobileNotificationSessionContext);
  if (!value) {
    throw new Error("useMobileNotificationSession 必须在 MobileNotificationSessionProvider 内使用。");
  }
  return value;
}
