import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";

import { useCheckFriendMutation, useSendFriendRequestMutation } from "./useFriendMutations";

type SearchMode = "id" | "username";

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
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
});

export function AddFriendTab() {
  const theme = useTheme();
  const [searchMode, setSearchMode] = useState<SearchMode>("id");
  const [addUserId, setAddUserId] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const [resolvedTargetUserId, setResolvedTargetUserId] = useState<number | null>(null);

  const checkFriendMutation = useCheckFriendMutation();
  const sendRequestMutation = useSendFriendRequestMutation();

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

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.modeToggle}>
        <ThemedText type="small" themeColor="textSecondary">搜索方式:</ThemedText>
        <Pressable
          onPress={() => { setSearchMode("id"); setFriendStatus(null); setAddUserId(""); }}
          style={[styles.modeBtn, { backgroundColor: searchMode === "id" ? theme.accent : theme.backgroundElement }]}
          accessibilityLabel="按用户ID搜索"
          accessibilityRole="button"
        >
          <ThemedText style={{ color: searchMode === "id" ? "#fff" : theme.text, fontSize: 12 }}>
            用户ID
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => { setSearchMode("username"); setFriendStatus(null); setAddUserId(""); }}
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
          onChangeText={(text) => { setAddUserId(text); setFriendStatus(null); setResolvedTargetUserId(null); }}
          placeholder={searchMode === "id" ? "输入对方用户ID" : "输入对方用户名"}
          placeholderTextColor={theme.textSecondary}
          keyboardType={searchMode === "id" ? "number-pad" : "default"}
          style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
          accessibilityLabel={searchMode === "id" ? "用户ID输入框" : "用户名输入框"}
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
    </ScrollView>
  );
}
