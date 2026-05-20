import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { LoginMethod } from "@/features/auth/auth-session";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { executeLoginAction } from "@/features/auth/login-action";
import { useTheme } from "@/hooks/use-theme";
import { DEFAULT_TUANCHAT_API_BASE_URL } from "@/lib/api";

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
  hero: { gap: Spacing.md, marginBottom: Spacing.lg },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  methodRow: { flexDirection: "row", gap: Spacing.md },
  methodChip: {
    alignItems: "center",
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
});

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAuthenticated, isSigningIn, signIn } = useAuthSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("username");
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await executeLoginAction({
        identifier,
        loginMethod,
        password,
        router: {
          replace: (href) => {
            router.replace(href as any);
          },
        },
        signIn,
      });
      setPassword("");
    }
    catch (error) {
      setLoginError(
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "登录失败。",
      );
    }
  };

  if (isAuthenticated) {
    return <Redirect href={"/(tabs)" as any} />;
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <ThemedText type="subtitle">团剧聊天</ThemedText>
            <ThemedText themeColor="textSecondary">
              登录后进入聊天工作台，与网页端体验一致。
            </ThemedText>
          </View>

          <View
            style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <ThemedText type="heading">登录</ThemedText>

            <View style={styles.methodRow}>
              {(["username", "userId"] as const).map((method) => {
                const selected = loginMethod === method;
                return (
                  <Pressable
                    key={method}
                    onPress={() => setLoginMethod(method)}
                    style={[
                      styles.methodChip,
                      {
                        backgroundColor: selected ? theme.accentMuted : "transparent",
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <ThemedText type="smallBold" style={selected ? { color: theme.accent } : undefined}>
                      {method === "username" ? "用户名" : "用户 ID"}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setIdentifier}
              placeholder={loginMethod === "username" ? "请输入用户名" : "请输入用户 ID"}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              value={identifier}
            />
            <TextInput
              onChangeText={setPassword}
              placeholder="请输入密码"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              value={password}
            />

            <ThemedText themeColor="textSecondary" type="small">
              API：
              {DEFAULT_TUANCHAT_API_BASE_URL}
            </ThemedText>

            {loginError ? <ThemedText style={{ color: theme.danger, fontSize: 13 }}>{loginError}</ThemedText> : null}

            <Pressable
              disabled={isSigningIn}
              onPress={() => void handleLogin()}
              style={[
                styles.input,
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
                : <ThemedText style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>登录</ThemedText>}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
