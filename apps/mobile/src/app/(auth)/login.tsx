import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { executeLoginAction } from "@/features/auth/login-action";
import { useTheme } from "@/hooks/use-theme";
import { DEFAULT_TUANCHAT_API_BASE_URL, LOCAL_TUANCHAT_API_BASE_URL } from "@/lib/api";

const SHOW_LOCAL_ACCOUNT_LOGIN = process.env.EXPO_PUBLIC_ENABLE_LOCAL_ACCOUNT_LOGIN === "1"
  || DEFAULT_TUANCHAT_API_BASE_URL === LOCAL_TUANCHAT_API_BASE_URL;

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
    gap: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
  const { push, replace } = useRouter();
  const { isAuthenticated, isSigningIn, signIn } = useAuthSession();
  const [identifier, setIdentifier] = useState(SHOW_LOCAL_ACCOUNT_LOGIN ? "10001" : "");
  const [password, setPassword] = useState(SHOW_LOCAL_ACCOUNT_LOGIN ? "enter123" : "");

  const handleLogin = () => {
    push("/(auth)/web-login");
  };

  const handleLocalLogin = async () => {
    try {
      await executeLoginAction({
        identifier,
        loginMethod: "userId",
        password,
        replace,
        signIn,
      });
    }
    catch (error) {
      Alert.alert("登录失败", error instanceof Error ? error.message : String(error));
    }
  };

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            {SHOW_LOCAL_ACCOUNT_LOGIN
              ? (
                  <>
                    <TextInput
                      accessibilityLabel="本地后端账号"
                      autoCapitalize="none"
                      editable={!isSigningIn}
                      inputMode="numeric"
                      onChangeText={setIdentifier}
                      placeholder="账号 ID"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={identifier}
                    />
                    <TextInput
                      accessibilityLabel="本地后端密码"
                      autoCapitalize="none"
                      editable={!isSigningIn}
                      onChangeText={setPassword}
                      placeholder="密码"
                      placeholderTextColor={theme.textSecondary}
                      secureTextEntry
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={password}
                    />
                    <Pressable
                      accessibilityLabel="本地后端登录"
                      disabled={isSigningIn}
                      onPress={handleLocalLogin}
                      style={[
                        styles.primaryButton,
                        {
                          backgroundColor: theme.accent,
                          borderColor: theme.accent,
                          opacity: isSigningIn ? 0.6 : 1,
                        },
                      ]}
                    >
                      {isSigningIn
                        ? <ActivityIndicator color="#ffffff" />
                        : <ThemedText style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>本地后端登录</ThemedText>}
                    </Pressable>
                  </>
                )
              : null}
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
