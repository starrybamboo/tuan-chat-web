import { router } from "expo-router";
import { useEffect } from "react";

import { useAuthSession } from "@/features/auth/auth-session";

import { resolveMobileNotificationRoute } from "./mobile-notification-routing";
import { useMobileNotificationSession } from "./mobileNotificationSessionContext";

export function NotificationNavigationBridge() {
  const { isAuthenticated, isBootstrapping } = useAuthSession();
  const { acknowledgeTargetPath, pendingTargetPath } = useMobileNotificationSession();

  useEffect(() => {
    if (isBootstrapping || !isAuthenticated || !pendingTargetPath) {
      return;
    }
    const href = resolveMobileNotificationRoute({ targetPath: pendingTargetPath });
    acknowledgeTargetPath(pendingTargetPath);

    if (href) {
      router.replace(href as any);
    }
  }, [acknowledgeTargetPath, isAuthenticated, isBootstrapping, pendingTargetPath]);

  return null;
}
