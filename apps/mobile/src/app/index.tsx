import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { type LoginMethod, useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/use-current-user-query";
import { DEFAULT_TUANCHAT_API_BASE_URL } from "@/lib/api";
import { useTheme } from "@/hooks/use-theme";

function LoginMethodToggle({
  currentMethod,
  onChange,
}: {
  currentMethod: LoginMethod;
  onChange: (method: LoginMethod) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.methodToggleRow}>
      {(["username", "userId"] as const).map(method => {
        const selected = currentMethod === method;
        return (
          <Pressable
            key={method}
            onPress={() => onChange(method)}
            style={[
              styles.methodChip,
              {
                borderColor: selected ? theme.text : theme.backgroundSelected,
                backgroundColor: selected ? theme.backgroundSelected : theme.background,
              },
            ]}
          >
            <ThemedText type="smallBold">{method === "username" ? "用户名" : "用户 ID"}</ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { session, isAuthenticated, isBootstrapping, isSigningIn, signIn, signOut } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("username");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    try {
      await signIn({
        identifier,
        password,
        method: loginMethod,
      });
      setPassword("");
    }
    catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败。");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.hero}>
            <ThemedText type="title" style={styles.title}>
              团剧共创
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              移动端基础设施已经接入 SecureStore、React Query 和最小登录态。
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">开发环境</ThemedText>
            <ThemedText>默认 API Base：{DEFAULT_TUANCHAT_API_BASE_URL}</ThemedText>
            <ThemedText>建议先用 Android 模拟器或 Expo Web 验证登录流程。</ThemedText>
          </ThemedView>

          {isBootstrapping
            ? (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ActivityIndicator />
                  <ThemedText>正在恢复本地登录态…</ThemedText>
                </ThemedView>
              )
            : isAuthenticated
              ? (
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <ThemedText type="smallBold">当前会话</ThemedText>
                    <ThemedText>token 已保存到 SecureStore</ThemedText>
                    <ThemedText>uid：{String(session?.userId ?? "未同步")}</ThemedText>
                    <ThemedText>用户名：{session?.username ?? "未同步"}</ThemedText>

                    <ThemedView style={styles.separator} />

                    <ThemedText type="smallBold">当前用户信息</ThemedText>
                    {currentUserQuery.isLoading
                      ? <ThemedText>正在获取当前用户信息…</ThemedText>
                      : currentUserQuery.isError
                        ? <ThemedText style={styles.errorText}>拉取当前用户信息失败。</ThemedText>
                        : (
                            <>
                              <ThemedText>用户名：{currentUserQuery.data?.data?.username ?? "未返回"}</ThemedText>
                              <ThemedText>邮箱：{currentUserQuery.data?.data?.email ?? "未返回"}</ThemedText>
                              <ThemedText>简介：{currentUserQuery.data?.data?.description ?? "未填写"}</ThemedText>
                            </>
                          )}

                    <ThemedView style={styles.buttonRow}>
                      <Pressable
                        onPress={() => currentUserQuery.refetch()}
                        style={[styles.secondaryButton, { borderColor: theme.backgroundSelected }]}
                      >
                        <ThemedText>刷新用户信息</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => void signOut()}
                        style={[styles.primaryButton, { backgroundColor: theme.text }]}
                      >
                        <ThemedText style={styles.primaryButtonText}>退出登录</ThemedText>
                      </Pressable>
                    </ThemedView>
                  </ThemedView>
                )
              : (
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <ThemedText type="smallBold">登录</ThemedText>
                    <LoginMethodToggle currentMethod={loginMethod} onChange={setLoginMethod} />

                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={identifier}
                      onChangeText={setIdentifier}
                      placeholder={loginMethod === "username" ? "请输入用户名" : "请输入用户 ID"}
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                    />

                    <TextInput
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      placeholder="请输入密码"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                    />

                    {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}

                    <Pressable
                      onPress={() => void handleLogin()}
                      disabled={isSigningIn}
                      style={[
                        styles.primaryButton,
                        {
                          backgroundColor: theme.text,
                          opacity: isSigningIn ? 0.7 : 1,
                        },
                      ]}
                    >
                      {isSigningIn
                        ? <ActivityIndicator color={theme.background} />
                        : <ThemedText style={styles.primaryButtonText}>登录并初始化会话</ThemedText>}
                    </Pressable>
                  </ThemedView>
                )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  hero: {
    gap: Spacing.three,
  },
  title: {
    textAlign: "left",
  },
  subtitle: {
    opacity: 0.75,
    lineHeight: 22,
  },
  card: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  methodToggleRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  methodChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  errorText: {
    color: "#c0392b",
  },
  primaryButton: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  separator: {
    height: 1,
    opacity: 0.2,
  },
});
