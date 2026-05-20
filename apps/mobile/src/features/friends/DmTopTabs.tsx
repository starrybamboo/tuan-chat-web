import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { useFriendRequestsQuery } from "./useFriendRequestsQuery";

export type DmTab = "chat" | "friends" | "new-friends";

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 44,
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    height: "100%",
    position: "relative",
  },
  activeIndicator: {
    bottom: 0,
    height: 2,
    left: "20%",
    position: "absolute",
    right: "20%",
    borderRadius: 1,
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 4,
    height: 8,
    position: "absolute",
    right: "20%",
    top: 8,
    width: 8,
  },
});

type DmTopTabsProps = {
  activeTab: DmTab;
  onChangeTab: (tab: DmTab) => void;
};

export function DmTopTabs({ activeTab, onChangeTab }: DmTopTabsProps) {
  const theme = useTheme();
  const requestsQuery = useFriendRequestsQuery();
  const pendingCount = useMemo(() => requestsQuery.data?.length ?? 0, [requestsQuery.data]);

  const tabs: { key: DmTab; label: string; showBadge?: boolean }[] = [
    { key: "chat", label: "私聊" },
    { key: "friends", label: "好友" },
    { key: "new-friends", label: "新朋友", showBadge: pendingCount > 0 },
  ];

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      {tabs.map(tab => (
        <Pressable
          key={tab.key}
          onPress={() => onChangeTab(tab.key)}
          style={styles.tab}
          accessibilityLabel={tab.label}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab.key }}
        >
          <ThemedText
            type="small"
            style={{
              fontWeight: activeTab === tab.key ? "700" : "400",
              color: activeTab === tab.key ? theme.accent : theme.textSecondary,
            }}
          >
            {tab.label}
          </ThemedText>
          {activeTab === tab.key && (
            <View style={[styles.activeIndicator, { backgroundColor: theme.accent }]} />
          )}
          {tab.showBadge && <View style={styles.badge} />}
        </Pressable>
      ))}
    </View>
  );
}
