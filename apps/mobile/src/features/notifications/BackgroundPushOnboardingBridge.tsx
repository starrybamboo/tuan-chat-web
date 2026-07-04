import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";

import { resolveAndroidBackgroundPushGuidance, shouldShowAndroidBackgroundPushOnboarding } from "./androidBackgroundPushGuidance";
import {
  getAndroidBackgroundPushDiagnostics,
  getAndroidForegroundMessageServiceStatus,
  isAndroidBackgroundPushDiagnosticsSupported,
  openAndroidBackgroundPushSetting,
} from "./androidForegroundMessageService";
import { hasDisabledBackgroundPushReminder, markBackgroundPushReminderDisabled } from "./backgroundPushOnboardingStorage";

type BackgroundPushOnboardingDiagnostic = Awaited<ReturnType<typeof getAndroidBackgroundPushDiagnostics>>;

const theme = Colors.dark;

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.xxl,
  },
  dialog: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.lg,
    maxWidth: 420,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
    width: "100%",
  },
  action: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
  },
  actionRow: {
    gap: Spacing.md,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  statusList: {
    gap: Spacing.sm,
  },
  statusPill: {
    backgroundColor: theme.backgroundSelected,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});

export function BackgroundPushOnboardingBridge() {
  const [diagnostic, setDiagnostic] = useState<BackgroundPushOnboardingDiagnostic>(null);
  const [visible, setVisible] = useState(false);
  const checkRequestIdRef = useRef(0);
  const guidance = resolveAndroidBackgroundPushGuidance(diagnostic);

  const refreshReminder = useCallback(async () => {
    if (Platform.OS !== "android" || !isAndroidBackgroundPushDiagnosticsSupported()) {
      return;
    }

    const requestId = ++checkRequestIdRef.current;
    try {
      const [isDisabled, nextDiagnostic, nextServiceStatus] = await Promise.all([
        hasDisabledBackgroundPushReminder(),
        getAndroidBackgroundPushDiagnostics(),
        getAndroidForegroundMessageServiceStatus(),
      ]);

      if (requestId !== checkRequestIdRef.current) {
        return;
      }

      setDiagnostic(nextDiagnostic);

      if (isDisabled) {
        setVisible(false);
        return;
      }

      const nextVisible = shouldShowAndroidBackgroundPushOnboarding(nextDiagnostic, nextServiceStatus, false);
      setVisible(nextVisible);
    }
    catch {
      // 引导失败不能影响应用启动；用户仍可通过系统设置自行开启。
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshReminder();
    }, 0);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void refreshReminder();
      }
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [refreshReminder]);

  const disableReminder = useCallback(async () => {
    try {
      await markBackgroundPushReminderDisabled();
    }
    finally {
      setVisible(false);
    }
  }, []);

  const dismissCurrentReminder = useCallback(() => {
    void refreshReminder();
  }, [refreshReminder]);

  const openSetting = useCallback((target: "batteryOptimization" | "manufacturerBackground" | "notificationSettings") => {
    void openAndroidBackgroundPushSetting(target);
  }, []);

  return (
    <Modal animationType="fade" onRequestClose={dismissCurrentReminder} transparent visible={visible}>
      <Pressable style={styles.backdrop} onPress={dismissCurrentReminder}>
        <Pressable style={styles.dialog} onPress={event => event.stopPropagation()}>
          <ThemedText type="heading">后台推送提醒</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.body}>
            {guidance.detail}
          </ThemedText>
          <View style={styles.statusList}>
            {guidance.statusItems.map(item => (
              <View key={item} style={styles.statusPill}>
                <ThemedText type="small" themeColor="textSecondary">{item}</ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => void openSetting("manufacturerBackground")}
              style={[styles.action, { backgroundColor: theme.accent }]}
            >
              <ThemedText style={{ color: "#fff", fontWeight: "700" }}>去开启后台权限</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void openSetting("batteryOptimization")}
              style={[styles.action, { backgroundColor: theme.backgroundSelected }]}
            >
              <ThemedText>关闭电池优化</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void openSetting("notificationSettings")}
              style={[styles.action, { backgroundColor: theme.backgroundSelected }]}
            >
              <ThemedText>检查通知权限</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void disableReminder()}
              style={[styles.action, { backgroundColor: theme.dangerMuted }]}
            >
              <ThemedText style={{ color: theme.danger, fontWeight: "600" }}>不再提醒</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
