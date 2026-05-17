import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useAuthSession } from "@/features/auth/auth-session";

const styles = StyleSheet.create({
  splash: { alignItems: "center", backgroundColor: "#0d1117", flex: 1, gap: 12, justifyContent: "center" },
});

export default function IndexRedirect() {
  const { isAuthenticated, isBootstrapping } = useAuthSession();

  if (isBootstrapping) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#58a6ff" />
        <ThemedText themeColor="textSecondary">正在恢复登录态…</ThemedText>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href={"/(auth)/login" as any} />;
  }

  return <Redirect href={"/(tabs)" as any} />;
}
