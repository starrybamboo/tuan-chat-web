import type { PropsWithChildren } from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { AuthSessionProvider } from "@/features/auth/auth-session";
import { RoomMessagesLiveSyncBridge } from "@/features/messages/RoomMessagesLiveSyncBridge";
import { MobileNotificationSessionProvider } from "@/features/notifications/mobile-notification-session";
import { NotificationNavigationBridge } from "@/features/notifications/NotificationNavigationBridge";
import { WorkspaceSessionProvider } from "@/features/workspace/workspace-session";
import { mobileQueryClient } from "@/providers/query-client";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={mobileQueryClient}>
      <AuthSessionProvider>
        <MobileNotificationSessionProvider>
          <WorkspaceSessionProvider>
            <NotificationNavigationBridge />
            <RoomMessagesLiveSyncBridge />
            {children}
          </WorkspaceSessionProvider>
        </MobileNotificationSessionProvider>
      </AuthSessionProvider>
    </QueryClientProvider>
  );
}
