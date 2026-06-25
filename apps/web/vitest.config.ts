import path from "node:path";
import { defineConfig } from "vitest/config";

import { getWebAliasEntries } from "./tooling/alias-config";

const workspaceRoot = path.resolve(__dirname, "..", "..");

export default defineConfig({
  root: workspaceRoot,
  resolve: {
    alias: getWebAliasEntries(__dirname),
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/*.e2e.test.ts", "**/.codex-tmp/**", "**/node_modules/**", "**/dist/**"],
    maxWorkers: 4,
    css: {
      include: [/\.scss\?raw$/],
    },
    coverage: {
      provider: "v8",
      include: [
        "apps/web/app/components/privateChat/privateUnreadStateStore.ts",
        "apps/web/app/components/privateChat/privateUnreadUtils.ts",
        "apps/web/app/components/privateChat/utils/privateChatTimeline.ts",
        "apps/web/app/components/repository/detail/repositoryDetail.helpers.ts",
        "apps/web/app/utils/mediaUrl.ts",
        "apps/mobile/src/features/auth/login-action.ts",
        "apps/mobile/src/features/auth/mobile-auth-redirect.ts",
        "apps/mobile/src/features/chat/chat-avatar-prefetch.ts",
        "apps/mobile/src/features/chat/expressionSticker.ts",
        "apps/mobile/src/features/chat/initiativeRuntimeRows.ts",
        "apps/mobile/src/features/chat/mapStatusSummary.ts",
        "apps/mobile/src/features/chat/messageListModel.ts",
        "apps/mobile/src/features/chat/messageListScrollState.ts",
        "apps/mobile/src/features/chat/mobileAnnotations.ts",
        "apps/mobile/src/features/chat/mobileRouteSelection.ts",
        "apps/mobile/src/features/drawer/leftDrawerLayout.ts",
        "apps/mobile/src/features/drawer/spaceRailOrder.ts",
        "apps/mobile/src/features/friends/contactListAvatarModel.ts",
        "apps/mobile/src/features/friends/dmChatViewModel.ts",
        "apps/mobile/src/features/friends/dmConversationListModel.ts",
        "apps/mobile/src/features/friends/dmNavigationState.ts",
        "apps/mobile/src/features/friends/mobileDirectMessageCache.ts",
        "apps/mobile/src/features/members/memberUtils.ts",
        "apps/mobile/src/features/messages/mobileAudioPlaybackCoordinator.ts",
        "apps/mobile/src/features/messages/mobileDiceCommandExecutor.ts",
        "apps/mobile/src/features/messages/roomMessageSync.ts",
        "apps/mobile/src/features/notifications/mobile-notification-routing.ts",
        "apps/mobile/src/features/notifications/mobileNotificationTypes.ts",
        "apps/mobile/src/features/roles/edit/roleEditRouteParams.ts",
        "apps/mobile/src/features/workspace/workspaceStorage.ts",
        "apps/mobile/src/lib/confirm.ts",
        "apps/mobile/src/lib/media-url.ts",
        "apps/mobile/src/lib/mobile-image-cache.ts",
        "apps/mobile/src/lib/mobile-media-file-cache.ts",
        "apps/mobile/src/lib/use-mobile-query-snapshot.ts",
        "packages/tuanchat-domain/src/display-labels/index.ts",
        "packages/tuanchat-domain/src/media-url/media-url.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.e2e.test.ts",
        "**/*.d.ts",
      ],
      reportsDirectory: "coverage",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
});
