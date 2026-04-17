import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthSessionProvider } from "@/features/auth/auth-session";
import { MobileNotificationSessionProvider } from "@/features/notifications/mobile-notification-session";
import { WorkspaceSessionProvider } from "@/features/workspace/workspace-session";
import { mobileQueryClient } from "@/providers/query-client";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={mobileQueryClient}>
      <AuthSessionProvider>
        <MobileNotificationSessionProvider>
          <WorkspaceSessionProvider>{children}</WorkspaceSessionProvider>
        </MobileNotificationSessionProvider>
      </AuthSessionProvider>
    </QueryClientProvider>
  );
}
