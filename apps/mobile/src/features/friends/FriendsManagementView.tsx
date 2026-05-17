import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { SymbolView } from "expo-symbols";
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

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";

import { useBlacklistQuery } from "./useBlacklistQuery";
import {
  useAcceptFriendRequestMutation,
  useBlockFriendMutation,
  useCheckFriendMutation,
  useDeleteFriendMutation,
  useRejectFriendRequestMutation,
  useSendFriendRequestMutation,
  useUnblockFriendMutation,
} from "./useFriendMutations";
import { useFriendRequestsQuery } from "./useFriendRequestsQuery";
import { useFriendsQuery } from "./useFriendsQuery";

type Tab = "all" | "pending" | "add" | "blacklist";
type SearchMode = "id" | "username";

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
  scrollContent: { gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  friendRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  friendInfo: { flex: 1, gap: 2 },
  actionBtn: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: Spacing.lg,
  },
  inputRow: { gap: Spacing.md },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyText: { fontSize: 13, paddingVertical: Spacing.xl, textAlign: "center" },
  modeToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  modeBtn: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: Spacing.lg,
  },
  statusBadge: {
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
});

interface FriendsManagementViewProps {
  onBack: () => void;
}

export function FriendsManagementView({ onBack }: FriendsManagementViewProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchText, setSearchText] = useState("");

  const friendsQuery = useFriendsQuery();
  const requestsQuery = useFriendRequestsQuery();
  const blacklistQuery = useBlacklistQuery(activeTab === "blacklist");
  const acceptMutation = useAcceptFriendRequestMutation();
  const rejectMutation = useRejectFriendRequestMutation();
  const deleteMutation = useDeleteFriendMutation();
  const sendRequestMutation = useSendFriendRequestMutation();
  const unblockMutation = useUnblockFriendMutation();
  const blockMutation = useBlockFriendMutation();
  const checkFriendMutation = useCheckFriendMutation();

  const [addUserId, setAddUserId] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("id");
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const [resolvedTargetUserId, setResolvedTargetUserId] = useState<number | null>(null);

  const friends: FriendResponse[] = friendsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const blacklist = blacklistQuery.data ?? [];

  const filteredFriends = searchText.trim()
    ? friends.filter(f =>
        (f.username ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        String(f.userId).includes(searchText),
      )
    : friends;

  const handleDeleteFriend = (userId: number, username: string) => {
    Alert.alert("删除好友", `确定要删除好友 ${username} 吗？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => deleteMutation.mutate(userId) },
    ]);
  };

  const handleUnblock = (userId: number, username: string) => {
    Alert.alert("解除拉黑", `确定要解除对 ${username} 的拉黑吗？`, [
      { text: "取消", style: "cancel" },
      { text: "解除", onPress: () => unblockMutation.mutate(userId) },
    ]);
  };

  const handleCheckFriend = async () => {
    const input = addUserId.trim();
    if (!input) {
      Alert.alert("错误", searchMode === "id" ? "请输入有效的用户ID" : "请输入用户名");
      return;
    }
    if (searchMode === "id") {
      const id = Number(input);
      if (!id || id <= 0) {
        Alert.alert("错误", "请输入有效的用户ID");
        return;
      }
      try {
        setResolvedTargetUserId(id);
        const res = await checkFriendMutation.mutateAsync(id);
        setFriendStatus((res as any)?.data?.status ?? (res as any)?.status ?? "unknown");
      } catch {
        setResolvedTargetUserId(null);
        setFriendStatus(null);
        Alert.alert("查询失败", "无法查询该用户状态");
      }
    } else {
      try {
        const userRes = await mobileApiClient.userController.getUserInfoByUsername(input);
        const id = userRes.data?.userId;
        if (!id || id <= 0) {
          setFriendStatus(null);
          setResolvedTargetUserId(null);
          Alert.alert("未找到用户", "请检查用户名是否正确");
          return;
        }
        setResolvedTargetUserId(id);
        const res = await checkFriendMutation.mutateAsync(id);
        setFriendStatus((res as any)?.data?.status ?? (res as any)?.status ?? "unknown");
      } catch {
        setResolvedTargetUserId(null);
        setFriendStatus(null);
        Alert.alert("查询失败", "无法查询该用户状态");
      }
    }
  };

  const handleSendRequest = async () => {
    const id = searchMode === "username" ? resolvedTargetUserId : Number(addUserId.trim());
    if (!id || id <= 0) {
      Alert.alert("错误", searchMode === "username" ? "请先查询并确认用户名" : "请输入有效的用户ID");
      return;
    }
    if (!verifyMsg.trim()) {
      Alert.alert("错误", "请填写验证消息");
      return;
    }
    try {
      await sendRequestMutation.mutateAsync({ targetUserId: id, verifyMsg: verifyMsg.trim() });
      Alert.alert("成功", "好友请求已发送");
      setAddUserId("");
      setVerifyMsg("");
      setFriendStatus(null);
    } catch (e: any) {
      Alert.alert("失败", e?.message ?? "发送失败");
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "friend": return "已是好友";
      case "blocked": return "已拉黑";
      case "pending": return "待处理";
      case "none": return "非好友";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "friend": return { bg: theme.accentMuted, text: theme.accent };
      case "blocked": return { bg: theme.dangerMuted, text: theme.danger };
      case "pending": return { bg: theme.accentMuted, text: theme.textSecondary };
      default: return { bg: theme.backgroundElement, text: theme.textSecondary };
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: `全部 (${friends.length})` },
    { key: "pending", label: `待处理 (${requests.length})` },
    { key: "add", label: "添加" },
    { key: "blacklist", label: "黑名单" },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
            size={18}
            tintColor={theme.text}
            weight="medium"
          />
        </Pressable>
        <ThemedText numberOfLines={1} type="heading" style={{ flex: 1 }}>
          好友管理
        </ThemedText>
      </View>
      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && { borderBottomWidth: 2, borderBottomColor: theme.accent }]}
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
        {activeTab === "all" ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="搜索好友..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
            />
            {friendsQuery.isPending ? (
              <ActivityIndicator color={theme.accent} />
            ) : filteredFriends.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                {searchText ? "未找到匹配的好友" : "暂无好友"}
              </ThemedText>
            ) : (
              filteredFriends.map((friend) => (
                <View key={friend.userId} style={[styles.friendRow, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.friendInfo}>
                    <ThemedText numberOfLines={1}>{friend.username ?? `用户 #${friend.userId}`}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">ID: {friend.userId}</ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteFriend(friend.userId!, friend.username ?? "")}
                    style={[styles.actionBtn, { backgroundColor: theme.dangerMuted }]}
                  >
                    <ThemedText style={{ color: theme.danger, fontSize: 12 }}>删除</ThemedText>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        ) : activeTab === "pending" ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {requestsQuery.isPending ? (
              <ActivityIndicator color={theme.accent} />
            ) : requests.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>暂无待处理请求</ThemedText>
            ) : (
              requests.map((req: any) => (
                <View key={req.friendReqId ?? req.id} style={[styles.friendRow, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.friendInfo}>
                    <ThemedText numberOfLines={1}>{req.username ?? `用户 #${req.userId}`}</ThemedText>
                    {req.verifyMsg ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {req.verifyMsg}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => acceptMutation.mutate(req.friendReqId ?? req.id)}
                    disabled={acceptMutation.isPending}
                    style={[styles.actionBtn, { backgroundColor: theme.accentMuted }]}
                  >
                    <ThemedText style={{ color: theme.accent, fontSize: 12 }}>接受</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => rejectMutation.mutate(req.friendReqId ?? req.id)}
                    disabled={rejectMutation.isPending}
                    style={[styles.actionBtn, { backgroundColor: theme.dangerMuted }]}
                  >
                    <ThemedText style={{ color: theme.danger, fontSize: 12 }}>拒绝</ThemedText>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        ) : activeTab === "add" ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.modeToggle}>
              <ThemedText type="small" themeColor="textSecondary">搜索方式:</ThemedText>
              <Pressable
                onPress={() => { setSearchMode("id"); setFriendStatus(null); setAddUserId(""); }}
                style={[styles.modeBtn, { backgroundColor: searchMode === "id" ? theme.accent : theme.backgroundElement }]}
              >
                <ThemedText style={{ color: searchMode === "id" ? "#fff" : theme.text, fontSize: 12 }}>
                  用户ID
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => { setSearchMode("username"); setFriendStatus(null); setAddUserId(""); }}
                style={[styles.modeBtn, { backgroundColor: searchMode === "username" ? theme.accent : theme.backgroundElement }]}
              >
                <ThemedText style={{ color: searchMode === "username" ? "#fff" : theme.text, fontSize: 12 }}>
                  用户名
                </ThemedText>
              </Pressable>
            </View>
            <View style={styles.inputRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {searchMode === "id" ? "用户ID" : "用户名"}
              </ThemedText>
              <TextInput
                value={addUserId}
                onChangeText={(text) => { setAddUserId(text); setFriendStatus(null); setResolvedTargetUserId(null); }}
                placeholder={searchMode === "id" ? "输入对方用户ID" : "输入对方用户名"}
                placeholderTextColor={theme.textSecondary}
                keyboardType={searchMode === "id" ? "number-pad" : "default"}
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
              />
            </View>
            <Pressable
              onPress={() => void handleCheckFriend()}
              disabled={checkFriendMutation.isPending}
              style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, minHeight: 36, marginTop: Spacing.sm }]}
            >
              <ThemedText style={{ color: theme.accent, fontSize: 13, fontWeight: "500" }}>
                {checkFriendMutation.isPending ? "查询中..." : "查询状态"}
              </ThemedText>
            </Pressable>
            {friendStatus ? (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(friendStatus).bg }]}>
                <ThemedText style={{ color: getStatusColor(friendStatus).text, fontSize: 12 }}>
                  {getStatusLabel(friendStatus)}{resolvedTargetUserId ? ` · ID ${resolvedTargetUserId}` : ""}
                </ThemedText>
              </View>
            ) : null}
            <View style={[styles.inputRow, { marginTop: Spacing.lg }]}>
              <ThemedText type="small" themeColor="textSecondary">验证消息</ThemedText>
              <TextInput
                value={verifyMsg}
                onChangeText={setVerifyMsg}
                placeholder="简单说明你是谁/为何添加"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
              />
            </View>
            <Pressable
              onPress={() => void handleSendRequest()}
              disabled={sendRequestMutation.isPending}
              style={[styles.actionBtn, { backgroundColor: theme.accent, minHeight: 44, marginTop: Spacing.lg }]}
            >
              <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                {sendRequestMutation.isPending ? "发送中..." : "发送好友请求"}
              </ThemedText>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {blacklistQuery.isPending ? (
              <ActivityIndicator color={theme.accent} />
            ) : blacklist.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>黑名单为空</ThemedText>
            ) : (
              blacklist.map((item: any) => (
                <View key={item.userId ?? item.id} style={[styles.friendRow, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.friendInfo}>
                    <ThemedText numberOfLines={1}>{item.username ?? `用户 #${item.userId}`}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">ID: {item.userId}</ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleUnblock(item.userId!, item.username ?? "")}
                    disabled={unblockMutation.isPending}
                    style={[styles.actionBtn, { backgroundColor: theme.accentMuted }]}
                  >
                    <ThemedText style={{ color: theme.accent, fontSize: 12 }}>解除</ThemedText>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </ThemedView>
  );
}
