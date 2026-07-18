import { Redirect, usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

import { useAuthSession } from "@/features/auth/auth-session";
import { resolveMobileAuthRedirect } from "@/features/auth/mobile-auth-redirect";
import { useWorkspaceSession } from "@/features/workspace/workspace-session";

import { shouldHideNativeTabBar } from "./nativeTabBarVisibility";

const TAB_ACTIVE_COLOR = "#58a6ff";
const TAB_BACKGROUND_COLOR = "#0d1117";
const TAB_INACTIVE_COLOR = "#8b949e";
const TAB_SHADOW_COLOR = "#30363d";

export default function TabLayout() {
  const { isAuthenticated, isBootstrapping } = useAuthSession();
  const pathname = usePathname();
  const { chatTabBarHidden } = useWorkspaceSession();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const redirectHref = resolveMobileAuthRedirect({
    isAuthenticated,
    isBootstrapping,
    unauthenticatedHref: "/(auth)/login",
  });
  const isHomeTab = pathname === "/";
  const tabBarHidden = shouldHideNativeTabBar({
    chatTabBarHidden,
    isHomeTab,
    isKeyboardVisible,
  });

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setIsKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (redirectHref) {
    return <Redirect href={redirectHref} />;
  }

  // Android 聊天页由 ChatShell 统一处理底部安全区，避免 NativeTabs 重复添加 inset。
  return (
    <NativeTabs
      backgroundColor={TAB_BACKGROUND_COLOR}
      hidden={tabBarHidden}
      iconColor={{
        default: TAB_INACTIVE_COLOR,
        selected: TAB_ACTIVE_COLOR,
      }}
      labelVisibilityMode="unlabeled"
      labelStyle={{
        default: { color: TAB_INACTIVE_COLOR },
        selected: { color: TAB_ACTIVE_COLOR },
      }}
      shadowColor={TAB_SHADOW_COLOR}
    >
      <NativeTabs.Trigger disableAutomaticContentInsets={Platform.OS === "android"} name="index">
        <NativeTabs.Trigger.Icon
          md="chat"
          sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }}
        />
        <NativeTabs.Trigger.Label>聊天</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="role">
        <NativeTabs.Trigger.Icon
          md="account_circle"
          sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }}
        />
        <NativeTabs.Trigger.Label>角色</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon
          md="settings"
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
        />
        <NativeTabs.Trigger.Label>个人</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
