import { CaretLeft } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { FriendReqResponse } from "@tuanchat/openapi-client/models/FriendReqResponse";
import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { AddFriendTab } from "./AddFriendTab";
import { AllFriendsTab } from "./AllFriendsTab";
import { BlacklistTab } from "./BlacklistTab";
import { PendingRequestsTab } from "./PendingRequestsTab";
import { useBlacklistQuery } from "./useBlacklistQuery";
import {
  useAcceptFriendRequestMutation,
  useBlockFriendMutation,
  useDeleteFriendMutation,
  useRejectFriendRequestMutation,
  useUnblockFriendMutation,
} from "./useFriendMutations";
import { useFriendRequestsQuery } from "./useFriendRequestsQuery";
import { useFriendsQuery } from "./useFriendsQuery";

type Tab = "all" | "pending" | "add" | "blacklist";

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 44,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    marginRight: Spacing.md,
    width: 32,
  },
  tabs: { borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row" },
  tab: { alignItems: "center", flex: 1, paddingVertical: Spacing.lg },
  content: { flex: 1 },
});

type FriendsManagementViewProps = {
  onBack: () => void;
  onStartChat?: (userId: number) => void;
};

export function FriendsManagementView({ onBack, onStartChat }: FriendsManagementViewProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const friendsQuery = useFriendsQuery();
  const requestsQuery = useFriendRequestsQuery();
  const blacklistQuery = useBlacklistQuery(activeTab === "blacklist");
  const acceptMutation = useAcceptFriendRequestMutation();
  const rejectMutation = useRejectFriendRequestMutation();
  const deleteMutation = useDeleteFriendMutation();
  const blockMutation = useBlockFriendMutation();
  const unblockMutation = useUnblockFriendMutation();

  const friends: FriendResponse[] = friendsQuery.data ?? [];
  const requests: FriendReqResponse[] = requestsQuery.data ?? [];
  const blacklist: FriendResponse[] = blacklistQuery.data ?? [];

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: `全部 (${friends.length})` },
    { key: "pending", label: `待处理 (${requests.length})` },
    { key: "add", label: "添加" },
    { key: "blacklist", label: "黑名单" },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityLabel="返回" accessibilityRole="button">
          <CaretLeft size={18} color={theme.text} weight="bold" />
        </Pressable>
        <ThemedText numberOfLines={1} type="heading" style={{ flex: 1 }}>
          好友管理
        </ThemedText>
      </View>

      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && { borderBottomWidth: 2, borderBottomColor: theme.accent }]}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <ThemedText
              type="small"
              themeColor={activeTab === tab.key ? "accent" : "textSecondary"}
              style={{ fontWeight: activeTab === tab.key ? "600" : "400" }}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.content}>
        {activeTab === "all"
          ? (
              <AllFriendsTab
                friends={friends}
                isPending={friendsQuery.isPending}
                onDeleteFriend={userId => deleteMutation.mutate(userId)}
                onBlockFriend={userId => blockMutation.mutate(userId)}
                isBlocking={blockMutation.isPending}
                onStartChat={userId => onStartChat?.(userId)}
              />
            )
          : activeTab === "pending"
            ? (
                <PendingRequestsTab
                  requests={requests}
                  isPending={requestsQuery.isPending}
                  onAccept={id => acceptMutation.mutate(id)}
                  onReject={id => rejectMutation.mutate(id)}
                  isAccepting={acceptMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              )
            : activeTab === "add"
              ? (
                  <AddFriendTab />
                )
              : (
                  <BlacklistTab
                    blacklist={blacklist}
                    isPending={blacklistQuery.isPending}
                    onUnblock={userId => unblockMutation.mutate(userId)}
                    isUnblocking={unblockMutation.isPending}
                  />
                )}
      </View>
    </ThemedView>
  );
}
