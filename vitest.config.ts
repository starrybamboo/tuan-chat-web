import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@tuanchat\/openapi-client$/,
        replacement: path.resolve(__dirname, "./packages/tuanchat-openapi-client/src/index.ts"),
      },
      {
        find: /^@tuanchat\/openapi-client\/(.*)$/,
        replacement: path.resolve(__dirname, "./packages/tuanchat-openapi-client/src/$1"),
      },
      {
        find: /^@tuanchat\/query$/,
        replacement: path.resolve(__dirname, "./packages/tuanchat-query/src/index.ts"),
      },
      {
        find: /^@tuanchat\/query\/(.*)$/,
        replacement: path.resolve(__dirname, "./packages/tuanchat-query/src/$1"),
      },
      {
        find: /^api$/,
        replacement: path.resolve(__dirname, "./api/index.ts"),
      },
      {
        find: /^api\/(.*)$/,
        replacement: path.resolve(__dirname, "./api/$1"),
      },
      {
        find: /^app\/(.*)$/,
        replacement: path.resolve(__dirname, "./app/$1"),
      },
      {
        find: /^@tuanchat\/galgame-ai-contract$/,
        replacement: path.resolve(__dirname, "./packages/galgame-ai-contract/src/index.ts"),
      },
      {
        find: /^@tuanchat\/galgame-ai-contract\/(.*)$/,
        replacement: path.resolve(__dirname, "./packages/galgame-ai-contract/src/$1"),
      },
      {
        find: /^@\//,
        replacement: `${path.resolve(__dirname, "./app")}/`,
      },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/*.e2e.test.ts", "**/.codex-tmp/**", "**/node_modules/**", "**/dist/**"],
    maxWorkers: 4,
    server: {
      deps: {
        inline: [/^@blocksuite\//, /[\\/]node_modules[\\/]@blocksuite[\\/]/],
      },
    },
    coverage: {
      provider: "v8",
      include: [
        "app/components/privateChat/privateUnreadStateStore.ts",
        "app/components/privateChat/privateUnreadUtils.ts",
        "app/components/privateChat/utils/privateChatTimeline.ts",
        "app/components/repository/detail/repositoryDetail.helpers.ts",
        "app/components/resource/utils/resourceMedia.ts",
        "app/utils/mediaUrl.ts",
        "apps/mobile/src/features/auth/login-action.ts",
        "apps/mobile/src/features/auth/mobile-auth-redirect.ts",
        "apps/mobile/src/features/chat/chat-avatar-prefetch.ts",
        "apps/mobile/src/features/chat/expressionSticker.ts",
        "apps/mobile/src/features/chat/initiativeRuntimeRows.ts",
        "apps/mobile/src/features/chat/mapStatusSummary.ts",
        "apps/mobile/src/features/chat/messageListModel.ts",
        "apps/mobile/src/features/chat/messageListScrollState.ts",
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
        "packages/galgame-ai-contract/src/schemas.ts",
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
