import type { Rule } from "@tuanchat/openapi-client/models/Rule";

import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useRulePageQuery, useRuleDetailQuery } from "@/features/roles/useRuleQueries";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  section: {
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  ruleDisplay: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    borderRadius: Radius.md,
    fontSize: 14,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  ruleItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  paginationRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
});

interface RuleSectionProps {
  roleId: number;
  selectedRuleId: number | null;
  onRuleChange: (ruleId: number | null) => void;
}

export function RuleSection({ roleId, selectedRuleId, onRuleChange }: RuleSectionProps) {
  const theme = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const rulePageQuery = useRulePageQuery(page, keyword || undefined, 10);
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId ?? 0, { enabled: !!selectedRuleId });

  const selectedRuleName = ruleDetailQuery.data?.ruleName ?? (selectedRuleId ? `规则 #${selectedRuleId}` : "未选择");

  const handleSelectRule = useCallback((rule: Rule) => {
    onRuleChange(rule.ruleId ?? null);
    setSheetVisible(false);
  }, [onRuleChange]);

  const renderRuleItem = useCallback(({ item }: { item: Rule }) => (
    <Pressable
      onPress={() => handleSelectRule(item)}
      style={[styles.ruleItem, { borderBottomColor: theme.border }]}
    >
      <ThemedText type="smallBold">{item.ruleName ?? "未命名规则"}</ThemedText>
      {item.ruleDescription ? (
        <ThemedText themeColor="textSecondary" type="caption" numberOfLines={2}>
          {item.ruleDescription}
        </ThemedText>
      ) : null}
    </Pressable>
  ), [theme.border, handleSelectRule]);

  return (
    <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="heading">规则系统</ThemedText>

      <Pressable
        onPress={() => setSheetVisible(true)}
        style={[styles.ruleDisplay, { backgroundColor: theme.background }]}
      >
        <ThemedText type="small">{selectedRuleName}</ThemedText>
        <ThemedText themeColor="accent" type="small">选择</ThemedText>
      </Pressable>

      <BottomSheetModal visible={sheetVisible} onClose={() => setSheetVisible(false)} maxHeight="70%" backgroundColor={theme.backgroundElement} handleColor={theme.border}>
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, flex: 1 }}>
          <ThemedText type="heading" style={{ marginBottom: Spacing.md }}>选择规则</ThemedText>

          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.background, color: theme.text }]}
            placeholder="搜索规则..."
            placeholderTextColor={theme.textSecondary}
            value={keyword}
            onChangeText={(text) => { setKeyword(text); setPage(1); }}
          />

          {rulePageQuery.isLoading ? (
            <ActivityIndicator color={theme.accent} style={{ paddingVertical: Spacing.xxl }} />
          ) : (
            <FlatList
              data={rulePageQuery.data}
              keyExtractor={(item) => String(item.ruleId)}
              renderItem={renderRuleItem}
              style={{ flex: 1 }}
            />
          )}

          <View style={styles.paginationRow}>
            <Pressable onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ThemedText themeColor={page <= 1 ? "textSecondary" : "accent"} type="small">上一页</ThemedText>
            </Pressable>
            <ThemedText themeColor="textSecondary" type="caption">第 {page} 页</ThemedText>
            <Pressable onPress={() => setPage(p => p + 1)} disabled={rulePageQuery.meta?.isLast === true}>
              <ThemedText themeColor={rulePageQuery.meta?.isLast ? "textSecondary" : "accent"} type="small">下一页</ThemedText>
            </Pressable>
          </View>
        </View>
      </BottomSheetModal>
    </View>
  );
}
