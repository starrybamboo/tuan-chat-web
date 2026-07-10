import type { Rule } from "@tuanchat/openapi-client/models/Rule";

import { GearSix, List } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useRuleDetailQuery, useRulePageQuery } from "@/features/roles/useRuleQueries";
import { useTheme } from "@/hooks/use-theme";

const DEFAULT_RULE_ID = 1;
const DEFAULT_RULE_NAME = "coc7th";

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xxl,
  },
  summaryTextRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  summaryTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ruleNameButton: {
    flexShrink: 1,
    minWidth: 0,
  },
  listIcon: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sectionDivider: {
    alignSelf: "stretch",
    height: StyleSheet.hairlineWidth,
  },
  searchInput: {
    borderRadius: Radius.md,
    fontSize: 14,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  ruleList: {
    flex: 1,
    minHeight: 180,
  },
  pickerItem: {
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

type RuleSectionProps = {
  selectedRuleId: number | null;
  onRuleChange: (ruleId: number | null) => void;
};

export function RuleSection({ selectedRuleId, onRuleChange }: RuleSectionProps) {
  const theme = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const normalizedRuleId = typeof selectedRuleId === "number" && selectedRuleId > 0
    ? selectedRuleId
    : DEFAULT_RULE_ID;
  const selectedRuleQuery = useRuleDetailQuery(normalizedRuleId, { enabled: normalizedRuleId !== DEFAULT_RULE_ID });
  const rulePageQuery = useRulePageQuery(page, keyword || undefined, 10, { enabled: sheetVisible });
  const selectedRuleName = normalizedRuleId === DEFAULT_RULE_ID
    ? DEFAULT_RULE_NAME
    : selectedRuleQuery.data?.ruleName ?? `规则 #${normalizedRuleId}`;

  const handleSelectFromPicker = useCallback((rule: Rule) => {
    if (rule.ruleId) {
      onRuleChange(rule.ruleId);
    }
    setSheetVisible(false);
  }, [onRuleChange]);

  const renderPickerItem = useCallback(({ item }: { item: Rule }) => {
    const isSelected = item.ruleId === normalizedRuleId;
    return (
      <Pressable
        accessibilityLabel={`选择规则 ${item.ruleName ?? "未命名规则"}${isSelected ? "，当前已选中" : ""}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={() => handleSelectFromPicker(item)}
        style={[styles.pickerItem, { borderBottomColor: theme.border }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
          <ThemedText type="smallBold">{item.ruleName ?? "未命名规则"}</ThemedText>
          {isSelected && <ThemedText themeColor="accent" type="caption">当前</ThemedText>}
        </View>
        {item.ruleDescription
          ? (
              <ThemedText themeColor="textSecondary" type="caption" numberOfLines={2}>
                {item.ruleDescription}
              </ThemedText>
            )
          : null}
      </Pressable>
    );
  }, [theme.border, handleSelectFromPicker, normalizedRuleId]);

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityLabel="浏览规则"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setSheetVisible(true)}
        style={styles.summaryRow}
      >
        <View style={styles.summaryTextRow}>
          <View style={styles.summaryTitleRow}>
            <GearSix size={19} color={theme.text} weight="bold" />
            <ThemedText type="heading">规则系统：</ThemedText>
          </View>
          <View style={styles.ruleNameButton}>
            <ThemedText type="heading" themeColor="textSecondary" numberOfLines={1}>
              {selectedRuleName}
            </ThemedText>
          </View>
        </View>
        <View style={styles.listIcon}>
          <List size={24} color={theme.accent} weight="bold" />
        </View>
      </Pressable>

      <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />

      <BottomSheetModal
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        maxHeight="70%"
        backgroundColor={theme.backgroundElement}
        handleColor={theme.border}
        sheetStyle={{ height: "70%" }}
      >
        <View style={styles.sheetContent}>
          <ThemedText type="heading" style={{ marginBottom: Spacing.md }}>浏览规则</ThemedText>

          <TextInput
            accessibilityLabel="搜索规则"
            style={[styles.searchInput, { backgroundColor: theme.background, color: theme.text }]}
            placeholder="搜索规则..."
            placeholderTextColor={theme.textSecondary}
            value={keyword}
            onChangeText={(text) => { setKeyword(text); setPage(1); }}
          />

          {rulePageQuery.isLoading
            ? (
                <ActivityIndicator color={theme.accent} style={{ paddingVertical: Spacing.xxl }} />
              )
            : (
                <FlatList
                  data={rulePageQuery.data}
                  keyExtractor={item => String(item.ruleId)}
                  ListEmptyComponent={(
                    <ThemedText type="small" themeColor="textSecondary" style={{ paddingVertical: Spacing.xl }}>
                      没有找到规则
                    </ThemedText>
                  )}
                  renderItem={renderPickerItem}
                  style={styles.ruleList}
                />
              )}

          <View style={styles.paginationRow}>
            <Pressable
              accessibilityLabel="上一页规则"
              accessibilityRole="button"
              accessibilityState={{ disabled: page <= 1 }}
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ThemedText themeColor={page <= 1 ? "textSecondary" : "accent"} type="small">上一页</ThemedText>
            </Pressable>
            <ThemedText themeColor="textSecondary" type="caption">
              第
              {page}
              {" "}
              页
            </ThemedText>
            <Pressable
              accessibilityLabel="下一页规则"
              accessibilityRole="button"
              accessibilityState={{ disabled: rulePageQuery.meta?.isLast === true }}
              onPress={() => setPage(p => p + 1)}
              disabled={rulePageQuery.meta?.isLast === true}
            >
              <ThemedText themeColor={rulePageQuery.meta?.isLast ? "textSecondary" : "accent"} type="small">下一页</ThemedText>
            </Pressable>
          </View>
        </View>
      </BottomSheetModal>
    </View>
  );
}
