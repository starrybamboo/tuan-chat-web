import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useAuthSession } from "@/features/auth/auth-session";
import { resolveMobileAuthRedirect } from "@/features/auth/mobile-auth-redirect";

const styles = StyleSheet.create({
  splash: { alignItems: "center", backgroundColor: "#0d1117", flex: 1, gap: 12, justifyContent: "center" },
});

export default function IndexRedirect() {
  const { isAuthenticated, isBootstrapping } = useAuthSession();
  const redirectHref = resolveMobileAuthRedirect({
    authenticatedHref: "/(tabs)",
    isAuthenticated,
    isBootstrapping,
    unauthenticatedHref: "/(auth)/login",
  });

  if (isBootstrapping) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#58a6ff" />
        <ThemedText themeColor="textSecondary">正在恢复登录态…</ThemedText>
      </View>
    );
  }

  return <Redirect href={redirectHref as any} />;
}
