import { router } from "expo-router";
import { useEffect } from "react";

import { useAuthSession } from "@/features/auth/auth-session";

import { resolveMobileNotificationRoute } from "./mobile-notification-routing";
import { useMobileNotificationSession } from "./mobileNotificationSessionContext";
import { logNotificationTrace } from "./notificationTrace";

export function NotificationNavigationBridge() {
  const { isAuthenticated, isBootstrapping } = useAuthSession();
  const { acknowledgeTargetPath, pendingTargetPath } = useMobileNotificationSession();

  useEffect(() => {
    if (isBootstrapping || !isAuthenticated || !pendingTargetPath) {
      return;
    }
    const href = resolveMobileNotificationRoute({ targetPath: pendingTargetPath });
    logNotificationTrace("navigation.resolve", {
      href,
      pendingTargetPath,
    });

    if (href) {
      logNotificationTrace("navigation.replace", {
        href,
      });
      router.replace(href as any);
      acknowledgeTargetPath(pendingTargetPath);
    }
  }, [acknowledgeTargetPath, isAuthenticated, isBootstrapping, pendingTargetPath]);

  return null;
}
