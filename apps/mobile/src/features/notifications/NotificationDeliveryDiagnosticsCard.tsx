import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { AndroidBackgroundPushDiagnostics } from "./androidBackgroundPushGuidance";
import type { AndroidForegroundMessageServiceStatus, AndroidBackgroundPushSettingTarget } from "./androidForegroundMessageService";
import type { MobileNotificationPermissionStatus } from "./mobile-notification-session";

import {
  getAndroidBackgroundPushDiagnostics,
  getAndroidForegroundMessageServiceStatus,
  isAndroidBackgroundPushDiagnosticsSupported,
  openAndroidBackgroundPushSetting,
} from "./androidForegroundMessageService";

type NotificationDeliveryDiagnosticsCardProps = {
  onRefreshPermissionStatus: () => Promise<MobileNotificationPermissionStatus>;
  permissionStatus: MobileNotificationPermissionStatus;
};

type DiagnosticTone = "danger" | "success" | "textSecondary" | "warning";

type DiagnosticItem = {
  detail: string;
  label: string;
  status: string;
  tone: DiagnosticTone;
};

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: Spacing.lg,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.lg,
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  detail: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
});

function getToneColor(theme: ReturnType<typeof useTheme>, tone: DiagnosticTone) {
  switch (tone) {
    case "danger":
      return theme.danger;
    case "success":
      return theme.success;
    case "warning":
      return theme.warning;
    case "textSecondary":
    default:
      return theme.textSecondary;
  }
}

function resolvePermissionItem(
  serviceStatus: AndroidForegroundMessageServiceStatus | null,
  permissionStatus: MobileNotificationPermissionStatus,
): DiagnosticItem {
  if (serviceStatus?.notificationsEnabled === true) {
    return {
      detail: "系统允许应用发送通知。",
      label: "通知权限",
      status: "已开启",
      tone: "success",
    };
  }

  if (serviceStatus?.notificationsEnabled === false || permissionStatus === "denied") {
    return {
      detail: "系统通知总开关关闭时，消息不会弹出通知栏。",
      label: "通知权限",
      status: "未开启",
      tone: "danger",
    };
  }

  if (permissionStatus === "granted") {
    return {
      detail: "系统权限已允许，等待原生诊断同步。",
      label: "通知权限",
      status: "已开启",
      tone: "success",
    };
  }

  if (permissionStatus === "checking") {
    return {
      detail: "正在读取系统通知权限状态。",
      label: "通知权限",
      status: "检查中",
      tone: "textSecondary",
    };
  }

  return {
    detail: "尚未拿到系统通知权限状态。",
    label: "通知权限",
    status: "未知",
    tone: "warning",
  };
}

function resolveChannelItem(serviceStatus: AndroidForegroundMessageServiceStatus | null): DiagnosticItem {
  const importance = serviceStatus?.messageChannelImportance;
  if (importance == null) {
    return {
      detail: "尚未读取到 Android 消息通知渠道状态。",
      label: "通知渠道",
      status: "未知",
      tone: "warning",
    };
  }

  if (importance === 0) {
    return {
      detail: "消息通知渠道已关闭，业务消息不会出现在通知栏。",
      label: "通知渠道",
      status: "已关闭",
      tone: "danger",
    };
  }

  if (importance < 3) {
    return {
      detail: `渠道已开启，但当前重要性为 ${importance}，提醒可能较弱。`,
      label: "通知渠道",
      status: "较低",
      tone: "warning",
    };
  }

  return {
    detail: `消息通知渠道可用，当前重要性为 ${importance}。`,
    label: "通知渠道",
    status: "正常",
    tone: "success",
  };
}

function resolveBatteryItem(diagnostic: AndroidBackgroundPushDiagnostics | null): DiagnosticItem {
  if (diagnostic?.ignoringBatteryOptimizations === true) {
    return {
      detail: "系统已允许应用忽略电池优化。",
      label: "电池优化",
      status: "已放行",
      tone: "success",
    };
  }

  if (diagnostic?.ignoringBatteryOptimizations === false) {
    return {
      detail: "建议关闭电池优化，避免系统在后台限制消息通道。",
      label: "电池优化",
      status: "未放行",
      tone: "warning",
    };
  }

  return {
    detail: "当前系统版本或设备未返回电池优化状态。",
    label: "电池优化",
    status: "未知",
    tone: "textSecondary",
  };
}

function resolveBackgroundRestrictionItem(diagnostic: AndroidBackgroundPushDiagnostics | null): DiagnosticItem {
  if (diagnostic?.backgroundRestricted === false) {
    return {
      detail: "系统未检测到后台运行限制。",
      label: "后台限制",
      status: "未限制",
      tone: "success",
    };
  }

  if (diagnostic?.backgroundRestricted === true) {
    return {
      detail: "系统正在限制后台运行，需要在系统设置中放行。",
      label: "后台限制",
      status: "已限制",
      tone: "danger",
    };
  }

  return {
    detail: "部分系统无法直接读取后台限制状态，需要到系统管家确认。",
    label: "后台限制",
    status: "无法检测",
    tone: "textSecondary",
  };
}

export function NotificationDeliveryDiagnosticsCard({
  onRefreshPermissionStatus,
  permissionStatus,
}: NotificationDeliveryDiagnosticsCardProps) {
  const theme = useTheme();
  const requestIdRef = useRef(0);
  const [diagnostic, setDiagnostic] = useState<AndroidBackgroundPushDiagnostics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<AndroidForegroundMessageServiceStatus | null>(null);
  const isAndroidDiagnosticsSupported = Platform.OS === "android" && isAndroidBackgroundPushDiagnosticsSupported();

  const refreshDiagnostics = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsRefreshing(true);
    try {
      const [nextDiagnostic, nextServiceStatus] = await Promise.all([
        getAndroidBackgroundPushDiagnostics(),
        getAndroidForegroundMessageServiceStatus(),
        onRefreshPermissionStatus(),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setDiagnostic(nextDiagnostic);
      setServiceStatus(nextServiceStatus);
    }
    finally {
      if (requestId === requestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [onRefreshPermissionStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshDiagnostics();
    }, 0);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void refreshDiagnostics();
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [refreshDiagnostics]);

  const items = useMemo<DiagnosticItem[]>(() => [
    resolvePermissionItem(serviceStatus, permissionStatus),
    resolveChannelItem(serviceStatus),
    resolveBatteryItem(diagnostic),
    resolveBackgroundRestrictionItem(diagnostic),
  ], [diagnostic, permissionStatus, serviceStatus]);

  const openSetting = useCallback((target: AndroidBackgroundPushSettingTarget) => {
    void openAndroidBackgroundPushSetting(target);
  }, []);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" style={styles.cardTitle}>后台推送诊断</ThemedText>
      {!isAndroidDiagnosticsSupported
        ? (
            <ThemedText type="caption" themeColor="textSecondary">
              当前环境暂不支持完整后台推送诊断。
            </ThemedText>
          )
        : null}
      {items.map((item, index) => (
        <View key={item.label}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <ThemedText style={styles.rowLabel}>{item.label}</ThemedText>
              <ThemedText style={[styles.statusText, { color: getToneColor(theme, item.tone) }]}>
                {item.status}
              </ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.detail}>
              {item.detail}
            </ThemedText>
          </View>
        </View>
      ))}
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => void refreshDiagnostics()}
          disabled={isRefreshing}
          style={[styles.action, { backgroundColor: theme.backgroundSelected, opacity: isRefreshing ? 0.6 : 1 }]}
        >
          <ThemedText type="small" themeColor="textSecondary">
            {isRefreshing ? "刷新中…" : "刷新状态"}
          </ThemedText>
        </Pressable>
        {Platform.OS === "android"
          ? (
              <>
                <Pressable
                  onPress={() => openSetting("notificationSettings")}
                  style={[styles.action, { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="small">通知设置</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => openSetting("batteryOptimization")}
                  style={[styles.action, { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="small">电池优化</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => openSetting("manufacturerBackground")}
                  style={[styles.action, { backgroundColor: theme.accentMuted }]}
                >
                  <ThemedText type="small" themeColor="accent">后台权限</ThemedText>
                </Pressable>
              </>
            )
          : null}
      </View>
    </ThemedView>
  );
}
