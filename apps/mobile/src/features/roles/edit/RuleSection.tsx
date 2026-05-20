import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import type { Rule } from "@tuanchat/openapi-client/models/Rule";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useRoleAbilityListQuery } from "@/features/roles/useAbilityMutations";
import { useRuleDetailQuery, useRulePageQuery } from "@/features/roles/useRuleQueries";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  section: {
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ruleItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  addButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
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
  roleId: number;
  selectedRuleId: number | null;
  onRuleChange: (ruleId: number | null) => void;
};

function OwnedRuleItem({ ruleId, isSelected, onPress, theme }: {
  ruleId: number;
  isSelected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const ruleDetailQuery = useRuleDetailQuery(ruleId, { enabled: true });
  const ruleName = ruleDetailQuery.data?.ruleName ?? `规则 #${ruleId}`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.ruleItem, { backgroundColor: isSelected ? `${theme.accent}18` : theme.background }]}
    >
      <ThemedText type="small" themeColor={isSelected ? "accent" : "text"}>{ruleName}</ThemedText>
      {isSelected && <ThemedText themeColor="accent" type="caption">当前</ThemedText>}
    </Pressable>
  );
}

export function RuleSection({ roleId, selectedRuleId, onRuleChange }: RuleSectionProps) {
  const theme = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const abilitiesQuery = useRoleAbilityListQuery(roleId);
  const rulePageQuery = useRulePageQuery(page, keyword || undefined, 10, { enabled: sheetVisible });

  const ownedRuleIds = useMemo(() => {
    const abilities = abilitiesQuery.data ?? [];
    const ids = [...new Set(abilities.map(a => a.ruleId).filter((id): id is number => typeof id === "number" && id > 0))];
    return ids;
  }, [abilitiesQuery.data]);

  const handleSelectOwned = useCallback((ruleId: number) => {
    onRuleChange(ruleId);
  }, [onRuleChange]);

  const handleSelectFromPicker = useCallback((rule: Rule) => {
    if (rule.ruleId) {
      onRuleChange(rule.ruleId);
    }
    setSheetVisible(false);
  }, [onRuleChange]);

  const renderPickerItem = useCallback(({ item }: { item: Rule }) => {
    const isOwned = ownedRuleIds.includes(item.ruleId ?? 0);
    return (
      <Pressable
        onPress={() => handleSelectFromPicker(item)}
        style={[styles.pickerItem, { borderBottomColor: theme.border }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
          <ThemedText type="smallBold">{item.ruleName ?? "未命名规则"}</ThemedText>
          {isOwned && <ThemedText themeColor="accent" type="caption">已拥有</ThemedText>}
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
  }, [theme.border, handleSelectFromPicker, ownedRuleIds]);

  return (
    <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.sectionHeader}>
        <ThemedText type="heading">规则系统</ThemedText>
        <Pressable onPress={() => setSheetVisible(true)}>
          <ThemedText themeColor="accent" type="small">浏览全部</ThemedText>
        </Pressable>
      </View>

      {abilitiesQuery.isLoading
        ? <ActivityIndicator color={theme.accent} />
        : ownedRuleIds.length === 0
          ? (
              <View style={styles.emptyState}>
                <ThemedText themeColor="textSecondary" type="small">暂无规则，点击浏览全部添加</ThemedText>
              </View>
            )
          : (
              ownedRuleIds.map(ruleId => (
                <OwnedRuleItem
                  key={ruleId}
                  ruleId={ruleId}
                  isSelected={ruleId === selectedRuleId}
                  onPress={() => handleSelectOwned(ruleId)}
                  theme={theme}
                />
              ))
            )}

      <BottomSheetModal visible={sheetVisible} onClose={() => setSheetVisible(false)} maxHeight="70%" backgroundColor={theme.backgroundElement} handleColor={theme.border}>
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, flex: 1 }}>
          <ThemedText type="heading" style={{ marginBottom: Spacing.md }}>浏览规则</ThemedText>

          <TextInput
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
                  renderItem={renderPickerItem}
                  style={{ flex: 1 }}
                />
              )}

          <View style={styles.paginationRow}>
            <Pressable onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ThemedText themeColor={page <= 1 ? "textSecondary" : "accent"} type="small">上一页</ThemedText>
            </Pressable>
            <ThemedText themeColor="textSecondary" type="caption">
              第
              {page}
              {" "}
              页
            </ThemedText>
            <Pressable onPress={() => setPage(p => p + 1)} disabled={rulePageQuery.meta?.isLast === true}>
              <ThemedText themeColor={rulePageQuery.meta?.isLast ? "textSecondary" : "accent"} type="small">下一页</ThemedText>
            </Pressable>
          </View>
        </View>
      </BottomSheetModal>
    </View>
  );
}
