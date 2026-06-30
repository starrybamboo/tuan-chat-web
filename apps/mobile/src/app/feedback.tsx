import { router, useLocalSearchParams } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import { useMemo, useState } from "react";
import {
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
import { readMobileFeedbackDraft } from "@/features/feedback/feedbackDraft";
import { useTheme } from "@/hooks/use-theme";
import {
  buildFeedbackLogContent,
  clearLogs,
  copyLogs,
  exportLogsToPickedDirectory,
  getFormattedLogs,
  shareLogs,
} from "@/lib/logger";

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { gap: Spacing.xxl, paddingBottom: 120, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl },
  header: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  headerBackButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  card: { borderRadius: Radius.lg, gap: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  logBox: { borderRadius: Radius.md, maxHeight: 300, padding: Spacing.lg },
  logText: { fontFamily: "monospace", fontSize: 11 },
  input: { borderRadius: Radius.md, borderWidth: 1, fontSize: 14, minHeight: 80, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: Spacing.md },
  btn: { alignItems: "center", borderRadius: Radius.md, flex: 1, justifyContent: "center", minHeight: 44 },
});

export default function FeedbackScreen() {
  const theme = useTheme();
  const searchParams = useLocalSearchParams<{ title?: string | string[]; content?: string | string[] }>();
  const initialDraft = useMemo(() => readMobileFeedbackDraft(searchParams), [searchParams]);
  const [description, setDescription] = useState(() => initialDraft?.content ?? "");
  const logs = getFormattedLogs();
  const initialTitle = initialDraft?.title ?? "";

  const handleShare = async () => {
    const text = buildFeedbackLogContent(description);
    try {
      await shareLogs(text);
    }
    catch {
      Alert.alert("分享失败", "请稍后重试");
    }
  };

  const handleCopy = async () => {
    const text = buildFeedbackLogContent(description);
    try {
      await copyLogs(text);
      Alert.alert("已复制", "日志已复制到剪贴板");
    }
    catch {
      Alert.alert("复制失败", "请稍后重试");
    }
  };

  const handleExportFile = async () => {
    try {
      const file = await exportLogsToPickedDirectory(buildFeedbackLogContent(description));
      Alert.alert("已导出", `日志文件已保存：${file.fileName}`);
    }
    catch {
      Alert.alert("导出失败", "请稍后重试");
    }
  };

  const handleClear = () => {
    Alert.alert("清除日志", "确定要清除所有日志吗？", [
      { text: "取消", style: "cancel" },
      { text: "清除", style: "destructive", onPress: () => clearLogs() },
    ]);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.headerBackButton}
              accessibilityLabel="返回"
              accessibilityRole="button"
            >
              <CaretLeft size={22} color={theme.text} weight="bold" />
            </Pressable>
            <ThemedText type="title">问题反馈</ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{initialTitle || "问题描述（可选）"}</ThemedText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholderTextColor={theme.textSecondary}
              placeholder="描述你遇到的问题…"
              multiline
            />
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <ThemedText type="smallBold">运行日志</ThemedText>
              <Pressable onPress={handleClear}>
                <ThemedText themeColor="danger" type="small">清除</ThemedText>
              </Pressable>
            </View>
            <ScrollView style={[styles.logBox, { backgroundColor: theme.background }]} nestedScrollEnabled>
              <ThemedText style={[styles.logText, { color: theme.textSecondary }]}>{logs}</ThemedText>
            </ScrollView>
          </ThemedView>

          <View style={styles.actions}>
            <Pressable onPress={() => void handleCopy()} style={[styles.btn, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText>复制日志</ThemedText>
            </Pressable>
            <Pressable onPress={() => void handleShare()} style={[styles.btn, { backgroundColor: theme.accent }]}>
              <ThemedText style={{ color: "#fff", fontWeight: "600" }}>分享日志文本</ThemedText>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={() => void handleExportFile()} style={[styles.btn, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText>导出日志文件</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
