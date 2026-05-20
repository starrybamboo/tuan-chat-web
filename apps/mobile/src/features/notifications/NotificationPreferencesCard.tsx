import { StyleSheet, Switch, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { NotificationPreferences } from "./notificationPreferences";

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  cardTitle: { marginBottom: Spacing.sm },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 40 },
  rowLabel: { flex: 1, fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth },
});

type NotificationPreferencesCardProps = {
  prefs: NotificationPreferences;
  onUpdate: (patch: Partial<NotificationPreferences>) => void;
};

export function NotificationPreferencesCard({ prefs, onUpdate }: NotificationPreferencesCardProps) {
  const theme = useTheme();

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
