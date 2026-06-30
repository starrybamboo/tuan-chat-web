import type { ViewStyle } from "react-native";

import { Redirect, Tabs, usePathname } from "expo-router";
import { ChatCircle, Gear, UserCircle } from "phosphor-react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { resolveMobileAuthRedirect } from "@/features/auth/mobile-auth-redirect";
import { useWorkspaceSession } from "@/features/workspace/workspace-session";

const VISIBLE_TAB_BAR_STYLE: ViewStyle = {
  backgroundColor: "#0d1117",
  borderTopColor: "#30363d",
  borderTopWidth: 0.5,
};
const HIDDEN_TAB_BAR_STYLE: ViewStyle = {
  display: "none",
};

export default function TabLayout() {
  const { isAuthenticated, isBootstrapping } = useAuthSession();
  const pathname = usePathname();
  const { chatTabBarHidden } = useWorkspaceSession();
  const redirectHref = resolveMobileAuthRedirect({
    isAuthenticated,
    isBootstrapping,
    unauthenticatedHref: "/(auth)/login",
  });
  const isHomeTab = pathname === "/";

  if (redirectHref) {
    return <Redirect href={redirectHref as any} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle:
          isHomeTab && chatTabBarHidden
            ? HIDDEN_TAB_BAR_STYLE
            : VISIBLE_TAB_BAR_STYLE,
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
          tabBarIcon: ({ color }) => (
            <Gear size={22} color={color} weight="fill" />
          ),
        }}
      />
    </Tabs>
  );
}
