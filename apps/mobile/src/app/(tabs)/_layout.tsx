import { Redirect, Tabs } from "expo-router";
import { ChatCircle, Gear, UserCircle } from "phosphor-react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { resolveMobileAuthRedirect } from "@/features/auth/mobile-auth-redirect";
import { useUnreadCountQuery } from "@/features/notifications/useUnreadCountQuery";

const TAB_BADGE_DOT_SIZE = 8;

export default function TabLayout() {
  const { isAuthenticated, isBootstrapping } = useAuthSession();
  const redirectHref = resolveMobileAuthRedirect({
    isAuthenticated,
    isBootstrapping,
    unauthenticatedHref: "/(auth)/login",
  });
  const unreadQuery = useUnreadCountQuery(isAuthenticated);
  const unreadCount = unreadQuery.data ?? 0;

  if (redirectHref) {
    return <Redirect href={redirectHref as any} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0d1117",
          borderTopColor: "#30363d",
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: "#58a6ff",
        tabBarInactiveTintColor: "#8b949e",
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "聊天",
          tabBarIcon: ({ color }) => (
            <ChatCircle size={22} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="role"
        options={{
          title: "角色",
          tabBarIcon: ({ color }) => (
            <UserCircle size={22} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "个人",
          tabBarBadge: unreadCount > 0 ? "" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#f85149",
            borderRadius: TAB_BADGE_DOT_SIZE / 2,
            height: TAB_BADGE_DOT_SIZE,
            maxHeight: TAB_BADGE_DOT_SIZE,
            maxWidth: TAB_BADGE_DOT_SIZE,
            minHeight: TAB_BADGE_DOT_SIZE,
            minWidth: TAB_BADGE_DOT_SIZE,
            width: TAB_BADGE_DOT_SIZE,
          },
          tabBarIcon: ({ color }) => (
            <Gear size={22} color={color} weight="fill" />
          ),
        }}
      />
    </Tabs>
  );
}
