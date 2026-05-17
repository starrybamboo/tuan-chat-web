import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";

import { useAuthSession } from "@/features/auth/auth-session";
import { resolveMobileAuthRedirect } from "@/features/auth/mobile-auth-redirect";
import { useUnreadCountQuery } from "@/features/notifications/useUnreadCountQuery";

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
            <SymbolView
              name={{ ios: "message.fill", android: "chat", web: "chat" }}
              tintColor={color}
              size={22}
              weight="medium"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="role"
        options={{
          title: "角色",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "person.crop.circle.fill", android: "account_circle", web: "account_circle" }}
              tintColor={color}
              size={22}
              weight="medium"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "个人",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#f85149", fontSize: 10 },
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "gearshape.fill", android: "settings", web: "settings" }}
              tintColor={color}
              size={22}
              weight="medium"
            />
          ),
        }}
      />
    </Tabs>
  );
}
