import { Linking, Platform, Pressable, StyleSheet, Switch, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { MobileNotificationPermissionStatus } from "./mobile-notification-session";
import type { NotificationPreferences } from "./notificationPreferences";

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  cardTitle: { marginBottom: Spacing.sm },
  statusBox: { borderRadius: Radius.md, borderWidth: 1, gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  statusHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: Spacing.md },
  statusText: { flex: 1, fontSize: 13, lineHeight: 18 },
  statusActionRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  statusAction: { borderRadius: Radius.md, minHeight: 32, justifyContent: "center", paddingHorizontal: Spacing.lg },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 40 },
  rowLabel: { flex: 1, fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth },
});

type NotificationPreferencesCardProps = {
  onRefreshPermissionStatus: () => Promise<MobileNotificationPermissionStatus>;
  prefs: NotificationPreferences;
  permissionStatus: MobileNotificationPermissionStatus;
  onUpdate: (patch: Partial<NotificationPreferences>) => void;
};

function getPermissionStatusCopy(permissionStatus: MobileNotificationPermissionStatus, prefsEnabled: boolean) {
  if (!prefsEnabled) {
    return {
      title: "偏好已关闭",
      detail: "站内通知列表仍会保留；打开总开关后，移动端才会尝试展示系统推送。",
      colorKey: "textSecondary" as const,
    };
  }

  switch (permissionStatus) {
    case "checking":
      return {
        title: "正在检查系统权限",
        detail: "稍后会显示系统通知权限状态；站内通知列表不受影响。",
        colorKey: "textSecondary" as const,
      };
    case "granted":
      return {
        title: "系统权限已允许",
        detail: "符合偏好设置的通知会展示为系统推送，同时保留在站内通知列表。",
        colorKey: "success" as const,
      };
    case "denied":
      return {
        title: "系统权限已拒绝",
        detail: "可前往系统设置开启通知；暂不开启时，仍可在这里查看站内通知。",
        colorKey: "danger" as const,
      };
    case "unavailable":
      return {
        title: "当前平台不支持系统推送",
        detail: "Web 或不支持推送的平台会保留站内通知列表，不展示系统通知。",
        colorKey: "warning" as const,
      };
    case "unknown":
    default:
      return {
        title: "系统权限尚未确认",
        detail: "触发推送时会请求系统权限；也可以刷新当前权限状态。",
        colorKey: "warning" as const,
      };
  }
}

export function NotificationPreferencesCard({ onRefreshPermissionStatus, prefs, permissionStatus, onUpdate }: NotificationPreferencesCardProps) {
  const theme = useTheme();
  const permissionCopy = getPermissionStatusCopy(permissionStatus, prefs.enabled);
  const statusColor = theme[permissionCopy.colorKey];
  const canOpenSettings = Platform.OS !== "web" && permissionStatus === "denied" && prefs.enabled;
  const canRefreshPermission = Platform.OS !== "web" && prefs.enabled;

  const items: { key: keyof NotificationPreferences; label: string }[] = [
    { key: "enabled", label: "启用推送通知" },
    { key: "messages", label: "消息通知" },
    { key: "system", label: "系统通知" },
    { key: "friendRequests", label: "好友请求" },
    { key: "sound", label: "通知声音" },
    { key: "vibration", label: "振动" },
  ];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" style={styles.cardTitle}>通知设置</ThemedText>
      <View style={[styles.statusBox, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
        <View style={styles.statusHeader}>
          <ThemedText type="smallBold" style={[styles.statusText, { color: statusColor }]}>
            {permissionCopy.title}
          </ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.statusText}>
          {permissionCopy.detail}
        </ThemedText>
        {canOpenSettings || canRefreshPermission
          ? (
              <View style={styles.statusActionRow}>
                {canOpenSettings
                  ? (
                      <Pressable
                        accessibilityHint="打开系统通知设置，用于允许消息通知提醒"
                        accessibilityLabel="打开系统通知设置"
                        accessibilityRole="button"
                        onPress={() => void Linking.openSettings()}
                        style={[styles.statusAction, { backgroundColor: theme.accentMuted }]}
                      >
                        <ThemedText type="small" themeColor="accent">打开系统设置</ThemedText>
                      </Pressable>
                    )
                  : null}
                {canRefreshPermission
                  ? (
                      <Pressable
                        accessibilityHint="重新读取系统通知权限状态"
                        accessibilityLabel="刷新权限状态"
                        accessibilityRole="button"
                        onPress={() => void onRefreshPermissionStatus()}
                        style={[styles.statusAction, { backgroundColor: theme.backgroundElement }]}
                      >
                        <ThemedText type="small" themeColor="textSecondary">刷新权限状态</ThemedText>
                      </Pressable>
                    )
                  : null}
              </View>
            )
          : null}
      </View>
      {items.map((item, index) => {
        const disabled = item.key !== "enabled" && !prefs.enabled;
        return (
          <View key={item.key}>
            {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
            <View style={styles.row}>
              <ThemedText style={[styles.rowLabel, disabled && { opacity: 0.4 }]}>{item.label}</ThemedText>
              <Switch
                value={prefs[item.key]}
                onValueChange={val => onUpdate({ [item.key]: val })}
                disabled={disabled}
                trackColor={{ false: theme.backgroundSelected, true: theme.accent }}
                thumbColor="#fff"
              />
            </View>
          </View>
        );
      })}
    </ThemedView>
  );
}
