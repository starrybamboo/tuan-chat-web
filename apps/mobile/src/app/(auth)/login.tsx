import { Redirect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    gap: Spacing.xl,
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
});

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated, isSigningIn } = useAuthSession();

  const handleLogin = () => {
    router.push("/(auth)/web-login" as any);
  };

  if (isAuthenticated) {
    return <Redirect href={"/(tabs)" as any} />;
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <Pressable
              disabled={isSigningIn}
              onPress={handleLogin}
              style={[
                styles.primaryButton,
                {
                  alignItems: "center",
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                  justifyContent: "center",
                  opacity: isSigningIn ? 0.6 : 1,
                },
              ]}
            >
              {isSigningIn
                ? <ActivityIndicator color="#ffffff" />
                : <ThemedText style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>网页登录</ThemedText>}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
