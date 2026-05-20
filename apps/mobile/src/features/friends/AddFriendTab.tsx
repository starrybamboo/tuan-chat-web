import type { ReactNode } from "react";

import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl } from "@/lib/media-url";

import { useCheckFriendMutation, useSendFriendRequestMutation } from "./useFriendMutations";

type SearchMode = "id" | "username";

const AVATAR_SIZE = 44;
const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

const styles = StyleSheet.create({
  scrollContent: { gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  modeToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modeBtn: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: Spacing.lg,
  },
  inputRow: { gap: Spacing.sm },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  actionBtn: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 36,
  },
  resultCard: {
    borderRadius: Radius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  avatar: { borderRadius: Radius.full, height: AVATAR_SIZE, width: AVATAR_SIZE },
  avatarFallback: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: AVATAR_SIZE,
    justifyContent: "center",
    width: AVATAR_SIZE,
  },
  resultInfo: { flex: 1, gap: 2 },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    marginTop: Spacing.sm,
  },
});

type SearchedUser = {
  userId: number;
  username?: string;
  avatarFileId?: number | null;
};

type AddFriendTabProps = {
  pendingRequestsContent?: ReactNode;
};

export function AddFriendTab({ pendingRequestsContent }: AddFriendTabProps = {}) {
  const theme = useTheme();
  const [searchMode, setSearchMode] = useState<SearchMode>("id");
  const [addUserId, setAddUserId] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [statusDesc, setStatusDesc] = useState<string | null>(null);

  const checkFriendMutation = useCheckFriendMutation();
  const sendRequestMutation = useSendFriendRequestMutation();

  const canSendRequest = friendStatus !== null
    && friendStatus !== "friend"
    && friendStatus !== "blocked"
    && friendStatus !== "pending"
    && searchedUser != null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "friend": return { bg: theme.accentMuted, text: theme.accent };
      case "blocked": return { bg: theme.dangerMuted, text: theme.danger };
      case "pending": return { bg: theme.accentMuted, text: theme.textSecondary };
      default: return { bg: theme.backgroundElement, text: theme.textSecondary };
    }
  };

  const getStatusLabel = (status: string): string => {
    if (statusDesc)
      return statusDesc;
    switch (status) {
      case "friend": return "已是好友";
      case "blocked": return "已拉黑";
      case "pending": return "已申请";
      case "none": return "非好友";
      default: return status;
    }
  };

  const parseCheckResult = (res: any) => {
    const data = res?.data ?? res;
    const isFriendVal = data?.isFriend === true;
    const status = data?.status;
    const desc = data?.statusDesc;

    setStatusDesc(desc ?? null);

    if (isFriendVal)
      return "friend";
    if (status === 3)
      return "blocked";
    if (status === 1)
      return "pending";
    return "none";
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
        const userRes = await mobileApiClient.userController.getUserInfo(id);
        const userData = userRes.data;
        if (!userData?.userId) {
          setSearchedUser(null);
          setFriendStatus(null);
          Alert.alert("未找到用户", "该用户ID不存在");
          return;
        }
        setSearchedUser({ userId: userData.userId, username: userData.username, avatarFileId: userData.avatarFileId });
        const res = await checkFriendMutation.mutateAsync(id);
        setFriendStatus(parseCheckResult(res));
      }
      catch {
        setSearchedUser(null);
        setFriendStatus(null);
        Alert.alert("查询失败", "无法查询该用户状态");
      }
    }
    else {
      try {
        const userRes = await mobileApiClient.userController.getUserInfoByUsername(input);
        const userData = userRes.data;
        if (!userData?.userId) {
          setSearchedUser(null);
          setFriendStatus(null);
          Alert.alert("未找到用户", "请检查用户名是否正确");
          return;
        }
        setSearchedUser({ userId: userData.userId, username: userData.username, avatarFileId: userData.avatarFileId });
        const res = await checkFriendMutation.mutateAsync(userData.userId);
        setFriendStatus(parseCheckResult(res));
      }
      catch {
        setSearchedUser(null);
        setFriendStatus(null);
        Alert.alert("查询失败", "无法查询该用户状态");
      }
    }
  };

  const handleSendRequest = async () => {
    if (!searchedUser?.userId) {
      Alert.alert("错误", "请先查询用户");
      return;
    }
    if (!verifyMsg.trim()) {
      Alert.alert("错误", "请填写验证消息");
      return;
    }
    try {
      await sendRequestMutation.mutateAsync({ targetUserId: searchedUser.userId, verifyMsg: verifyMsg.trim() });
      Alert.alert("成功", "好友请求已发送");
      setAddUserId("");
      setVerifyMsg("");
      setFriendStatus(null);
      setSearchedUser(null);
      setStatusDesc(null);
    }
    catch (e: any) {
      const msg = e?.body?.errMsg || e?.message || "发送失败";
      Alert.alert("失败", msg);
    }
  };

  const resetSearch = () => {
    setFriendStatus(null);
    setSearchedUser(null);
    setStatusDesc(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.modeToggle}>
        <ThemedText type="small" themeColor="textSecondary">搜索方式:</ThemedText>
        <Pressable
          onPress={() => { setSearchMode("id"); resetSearch(); setAddUserId(""); }}
          style={[styles.modeBtn, { backgroundColor: searchMode === "id" ? theme.accent : theme.backgroundElement }]}
          accessibilityLabel="按用户ID搜索"
          accessibilityRole="button"
        >
          <ThemedText style={{ color: searchMode === "id" ? "#fff" : theme.text, fontSize: 12 }}>
            用户ID
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => { setSearchMode("username"); resetSearch(); setAddUserId(""); }}
          style={[styles.modeBtn, { backgroundColor: searchMode === "username" ? theme.accent : theme.backgroundElement }]}
          accessibilityLabel="按用户名搜索"
          accessibilityRole="button"
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
          onChangeText={(text) => { setAddUserId(text); resetSearch(); }}
          placeholder={searchMode === "id" ? "输入对方用户ID" : "输入对方用户名"}
          placeholderTextColor={theme.textSecondary}
          keyboardType={searchMode === "id" ? "number-pad" : "default"}
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
          accessibilityLabel={searchMode === "id" ? "用户ID输入框" : "用户名输入框"}
          returnKeyType="search"
          onSubmitEditing={() => void handleCheckFriend()}
        />
      </View>

      <Pressable
        onPress={() => void handleCheckFriend()}
        disabled={checkFriendMutation.isPending}
        style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, marginTop: Spacing.sm }]}
        accessibilityLabel="查询用户状态"
        accessibilityRole="button"
      >
        <ThemedText style={{ color: theme.accent, fontSize: 13, fontWeight: "500" }}>
          {checkFriendMutation.isPending ? "查询中..." : "查询状态"}
        </ThemedText>
      </Pressable>

      {pendingRequestsContent}

      {searchedUser && (
        <View style={[styles.resultCard, { backgroundColor: theme.backgroundElement }]}>
          {avatarThumbUrl(searchedUser.avatarFileId)
            ? (
                <CachedImage uri={avatarThumbUrl(searchedUser.avatarFileId)} style={styles.avatar} />
              )
            : (
                <View style={[styles.avatarFallback, { backgroundColor: AVATAR_COLORS[searchedUser.userId % AVATAR_COLORS.length] }]}>
                  <ThemedText style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                    {(searchedUser.username || "U").slice(0, 1)}
                  </ThemedText>
                </View>
              )}
          <View style={styles.resultInfo}>
            <ThemedText numberOfLines={1} style={{ fontWeight: "600" }}>
              {searchedUser.username || `用户 #${searchedUser.userId}`}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ID:
              {" "}
              {searchedUser.userId}
            </ThemedText>
            {friendStatus && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(friendStatus).bg }]}>
                <ThemedText style={{ color: getStatusColor(friendStatus).text, fontSize: 11 }}>
                  {getStatusLabel(friendStatus)}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      )}

      {friendStatus === "blocked" && (
        <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.sm }}>
          已拉黑，无法发送好友申请
        </ThemedText>
      )}

      {canSendRequest && (
        <>
          <View style={[styles.inputRow, { marginTop: Spacing.lg }]}>
            <ThemedText type="small" themeColor="textSecondary">验证消息</ThemedText>
            <TextInput
              value={verifyMsg}
              onChangeText={setVerifyMsg}
              placeholder="简单说明你是谁/为何添加"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
              accessibilityLabel="验证消息输入框"
            />
          </View>

          <Pressable
            onPress={() => void handleSendRequest()}
            disabled={sendRequestMutation.isPending}
            style={[styles.actionBtn, { backgroundColor: theme.accent, minHeight: 44, marginTop: Spacing.lg }]}
            accessibilityLabel="发送好友请求"
            accessibilityRole="button"
          >
            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
              {sendRequestMutation.isPending ? "发送中..." : "发送好友请求"}
            </ThemedText>
          </Pressable>
        </>
      )}

      {friendStatus === "pending" && (
        <Pressable
          disabled
          style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, minHeight: 44, marginTop: Spacing.lg }]}
          accessibilityLabel="已申请"
        >
          <ThemedText style={{ color: theme.textSecondary, fontWeight: "600" }}>
            已申请
          </ThemedText>
        </Pressable>
      )}
    </ScrollView>
  );
}
