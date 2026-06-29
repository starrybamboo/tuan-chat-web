import React from "react";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { buildMobileFeedbackDraftParams } from "@/features/feedback/feedbackDraft";
import { buildFeedbackLogContent, copyLogs, exportLogsToPickedDirectory, getFormattedLogs, logError, shareLogs } from "@/lib/logger";

const theme = Colors.dark;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  safe: { flex: 1, padding: Spacing.xxl, gap: Spacing.xxl },
  title: { fontSize: 20, fontWeight: "700", color: theme.text },
  subtitle: { fontSize: 14, color: theme.textSecondary },
  logBox: { flex: 1, backgroundColor: theme.backgroundElement, borderRadius: Radius.md, padding: Spacing.xl },
  logText: { fontSize: 11, fontFamily: "monospace", color: theme.textSecondary },
  actions: { flexDirection: "row", gap: Spacing.md },
  btn: { flex: 1, alignItems: "center", borderRadius: Radius.md, minHeight: 44, justifyContent: "center" },
});

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError(error, `ErrorBoundary${info.componentStack ? `\n${info.componentStack}` : ""}`);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleShareLogs = async () => {
    try {
      await shareLogs();
    }
    catch {
      Alert.alert("分享失败", "请稍后重试");
    }
  };

  handleExportLogs = async () => {
    try {
      const file = await exportLogsToPickedDirectory();
      Alert.alert("已导出", `日志文件已保存：${file.fileName}`);
    }
    catch {
      Alert.alert("导出失败", "请稍后重试");
    }
  };

  handleOpenFeedback = async () => {
    const description = this.state.error?.message ?? "发生了未知错误";
    try {
      await shareLogs(buildFeedbackLogContent(description));
    }
    catch {
      Alert.alert("分享失败", "请稍后重试");
    }

    router.replace({
      pathname: "/feedback",
      params: buildMobileFeedbackDraftParams({
        title: `页面报错：${description}`,
        content: description,
      }),
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const logs = getFormattedLogs();

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={{ gap: Spacing.md }}>
            <ThemedText style={styles.title}>应用出错了</ThemedText>
            <ThemedText style={styles.subtitle}>
              {this.state.error?.message ?? "发生了未知错误"}
            </ThemedText>
          </View>

          <ScrollView style={styles.logBox} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
            <ThemedText style={styles.logText}>{logs}</ThemedText>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={() => void copyLogs()} style={[styles.btn, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText>复制日志</ThemedText>
            </Pressable>
            <Pressable onPress={() => void this.handleShareLogs()} style={[styles.btn, { backgroundColor: theme.accent }]}>
              <ThemedText style={{ color: "#fff", fontWeight: "600" }}>分享日志文本</ThemedText>
            </Pressable>
          </View>

          <Pressable onPress={() => void this.handleExportLogs()} style={[styles.btn, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText>导出日志文件</ThemedText>
          </Pressable>

          <Pressable onPress={() => void this.handleOpenFeedback()} style={[styles.btn, { backgroundColor: theme.accent }]}>
            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>提交反馈</ThemedText>
          </Pressable>

          <Pressable onPress={this.handleRestart} style={[styles.btn, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText themeColor="accent">重试</ThemedText>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }
}
