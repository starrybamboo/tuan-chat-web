import { use } from "react";

import { MobileNotificationSessionContext } from "./mobileNotificationSessionContext";

export function useMobileNotificationSession() {
  const value = use(MobileNotificationSessionContext);
  if (!value) {
    throw new Error("useMobileNotificationSession 必须在 MobileNotificationSessionProvider 内使用。");
  }
  return value;
}
