import type { ReactNode } from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import {
  useAbilityByRuleAndRoleQuery,
  useSetRoleAbilityMutation,
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "@/features/roles/useAbilityMutations";
import { useRuleDetailQuery } from "@/features/roles/useRuleQueries";
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
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tagItem: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  numericColumns: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  numericColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  numericRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sheetContent: {
    gap: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  sheetKeyboardAvoiding: {
    maxHeight: "100%",
  },
  sheetLabel: {
    marginBottom: Spacing.xs,
  },
  sheetInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sheetActions: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheetButton: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  createSection: {
    alignItems: "center",
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
});

type SectionKey = "act" | "basic" | "ability" | "skill" | "record" | "extra";

const SECTION_LABELS: Record<SectionKey, string> = {
  act: "表演",
  basic: "基础",
  ability: "属性",
  skill: "技能",
  record: "记录",
  extra: "额外",
};

const NUMERIC_SECTIONS: SectionKey[] = ["basic", "ability", "skill"];

function isNumericValue(value: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(value.trim());
}

function AbilitySheetContent({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={24}
      style={styles.sheetKeyboardAvoiding}
    >
      <ScrollView
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type AbilitySectionProps = {
  roleId: number;
  ruleId: number;
};

export function AbilitySection({ roleId, ruleId }: AbilitySectionProps) {
  const theme = useTheme();
  const abilityQuery = useAbilityByRuleAndRoleQuery(roleId, ruleId);
  const ruleDetailQuery = useRuleDetailQuery(ruleId);
  const setAbilityMutation = useSetRoleAbilityMutation();
  const updateAbilityMutation = useUpdateRoleAbilityByRoleIdMutation();
  const updateFieldMutation = useUpdateKeyFieldByRoleIdMutation();

  const [editingField, setEditingField] = useState<{
    section: SectionKey;
    key: string;
    value: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingSection, setAddingSection] = useState<SectionKey | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [renamingField, setRenamingField] = useState<{
    section: SectionKey;
    key: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const ability = abilityQuery.data;
  const rule = ruleDetailQuery.data;

  const sections = useMemo(() => {
    const result: { key: SectionKey; label: string; fields: Record<string, string> }[] = [];
    const sectionKeys: SectionKey[] = ["act", "basic", "ability", "skill", "record", "extra"];

    for (const key of sectionKeys) {
      const data = (ability as any)?.[key] as Record<string, string> | undefined;
      const template = key === "act"
        ? rule?.actTemplate
        : key === "basic"
          ? rule?.basicDefault
          : key === "ability"
            ? rule?.abilityFormula
            : key === "skill"
              ? rule?.skillDefault
              : undefined;

      const merged = { ...(template as Record<string, string> ?? {}), ...(data ?? {}) };
      if (Object.keys(merged).length > 0) {
        result.push({ key, label: SECTION_LABELS[key], fields: merged });
      }
    }
    return result;
  }, [ability, rule]);

  const handleFieldPress = useCallback((section: SectionKey, key: string, value: string) => {
    setEditingField({ section, key, value });
    setEditValue(value);
  }, []);

  const handleFieldSave = useCallback(async () => {
    if (!editingField)
      return;
    try {
      await updateAbilityMutation.mutateAsync({
        roleId,
        ruleId,
        [editingField.section]: { [editingField.key]: editValue },
      });
      setEditingField(null);
    }
    catch (e: any) {
      Alert.alert("保存失败", e?.message ?? "请稍后重试");
    }
  }, [editingField, editValue, roleId, ruleId, updateAbilityMutation]);

  const handleFieldDelete = useCallback(async () => {
    if (!editingField)
      return;
    const doDelete = async () => {
      try {
        const fieldKey = `${editingField.section}Fields` as const;
        await updateFieldMutation.mutateAsync({
          roleId,
          ruleId,
          [fieldKey]: { [editingField.key]: null },
        } as any);
        setEditingField(null);
      }
      catch (e: any) {
        Alert.alert("删除失败", e?.message ?? "请稍后重试");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`确定要删除 "${editingField.key}" 吗？`))
        void doDelete();
    }
    else {
      Alert.alert("删除字段", `确定要删除 "${editingField.key}" 吗？`, [
        { text: "取消", style: "cancel" },
        { text: "删除", style: "destructive", onPress: () => void doDelete() },
      ]);
    }
  }, [editingField, roleId, ruleId, updateFieldMutation]);

  const handleFieldRename = useCallback(() => {
    if (!editingField)
      return;
    setRenamingField({ section: editingField.section, key: editingField.key });
    setRenameValue(editingField.key);
    setEditingField(null);
  }, [editingField]);

  const handleRenameConfirm = useCallback(async () => {
    if (!renamingField || !renameValue.trim() || renameValue.trim() === renamingField.key) {
      setRenamingField(null);
      return;
    }
    try {
      const fieldKey = `${renamingField.section}Fields` as const;
      await updateFieldMutation.mutateAsync({
        roleId,
        ruleId,
        [fieldKey]: { [renamingField.key]: renameValue.trim() },
      } as any);
      setRenamingField(null);
    }
    catch (e: any) {
      Alert.alert("重命名失败", e?.message ?? "请稍后重试");
    }
  }, [renamingField, renameValue, roleId, ruleId, updateFieldMutation]);

  const handleAddField = useCallback(async () => {
    if (!addingSection || !newFieldName.trim())
      return;
    try {
      await updateAbilityMutation.mutateAsync({
        roleId,
        ruleId,
        [addingSection]: { [newFieldName.trim()]: "" },
      });
      setAddingSection(null);
      setNewFieldName("");
    }
    catch (e: any) {
      Alert.alert("添加失败", e?.message ?? "请稍后重试");
    }
  }, [addingSection, newFieldName, roleId, ruleId, updateAbilityMutation]);

  const handleCreateAbility = useCallback(async () => {
    try {
      await setAbilityMutation.mutateAsync({
        roleId,
        ruleId,
        act: (rule?.actTemplate as Record<string, string>) ?? {},
        basic: (rule?.basicDefault as Record<string, string>) ?? {},
        ability: (rule?.abilityFormula as Record<string, string>) ?? {},
        skill: (rule?.skillDefault as Record<string, string>) ?? {},
      });
    }
    catch (e: any) {
      Alert.alert("创建失败", e?.message ?? "请稍后重试");
    }
  }, [roleId, ruleId, rule, setAbilityMutation]);

  const autoCreatedRef = useRef(false);
  useEffect(() => {
    if (!ability && !abilityQuery.isLoading && rule && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      void handleCreateAbility();
    }
  }, [ability, abilityQuery.isLoading, rule, handleCreateAbility]);

  useEffect(() => {
    autoCreatedRef.current = false;
  }, [ruleId]);

  if (!ability) {
    return null;
  }

  return (
    <>
      {sections.map(({ key: sectionKey, label, fields }) => {
        const entries = Object.entries(fields);
        const useNumericLayout = NUMERIC_SECTIONS.includes(sectionKey)
          && entries.some(([, v]) => isNumericValue(String(v ?? "")));

        return (
          <View key={sectionKey} style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.sectionHeader}>
              <ThemedText type="heading">{label}</ThemedText>
              <Pressable onPress={() => { setAddingSection(sectionKey); setNewFieldName(""); }}>
                <ThemedText themeColor="accent" type="small">+ 添加</ThemedText>
              </Pressable>
            </View>

            {useNumericLayout
              ? (
                  <View style={styles.numericColumns}>
                    <View style={styles.numericColumn}>
                      {entries.filter((_, i) => i % 2 === 0).map(([fieldKey, fieldValue]) => (
                        <Pressable
                          key={fieldKey}
                          onPress={() => handleFieldPress(sectionKey, fieldKey, String(fieldValue ?? ""))}
                          style={[styles.numericRow, { backgroundColor: theme.background }]}
                        >
                          <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>
                            {fieldKey}
                          </ThemedText>
                          <ThemedText type="smallBold" themeColor="accent">
                            {String(fieldValue ?? "0")}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.numericColumn}>
                      {entries.filter((_, i) => i % 2 === 1).map(([fieldKey, fieldValue]) => (
                        <Pressable
                          key={fieldKey}
                          onPress={() => handleFieldPress(sectionKey, fieldKey, String(fieldValue ?? ""))}
                          style={[styles.numericRow, { backgroundColor: theme.background }]}
                        >
                          <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>
                            {fieldKey}
                          </ThemedText>
                          <ThemedText type="smallBold" themeColor="accent">
                            {String(fieldValue ?? "0")}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )
              : (
                  <View style={styles.tagGrid}>
                    {entries.map(([fieldKey, fieldValue]) => {
                      const displayText = fieldValue
                        ? `${fieldKey}: ${String(fieldValue).slice(0, 12)}${String(fieldValue).length > 12 ? "…" : ""}`
                        : fieldKey;
                      return (
                        <Pressable
                          key={fieldKey}
                          onPress={() => handleFieldPress(sectionKey, fieldKey, String(fieldValue ?? ""))}
                          style={[styles.tagItem, { borderColor: theme.border }]}
                        >
                          <ThemedText type="small" numberOfLines={1}>{displayText}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
          </View>
        );
      })}

      {/* Edit field sheet */}
      <BottomSheetModal visible={!!editingField} onClose={() => setEditingField(null)} backgroundColor={theme.backgroundElement} handleColor={theme.border}>
        <AbilitySheetContent>
          <ThemedText type="heading">{editingField?.key}</ThemedText>
          <View>
            <ThemedText themeColor="textSecondary" type="caption" style={styles.sheetLabel}>值</ThemedText>
            <TextInput
              style={[styles.sheetInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="输入值"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
          </View>
          <View style={styles.sheetActions}>
            <Pressable onPress={handleFieldDelete} style={{ marginRight: "auto" }}>
              <ThemedText style={{ color: "#ef4444" }} type="small">删除</ThemedText>
            </Pressable>
            <Pressable onPress={handleFieldRename}>
              <ThemedText themeColor="textSecondary" type="small">重命名</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleFieldSave}
              style={[styles.sheetButton, { backgroundColor: theme.accent }]}
            >
              <ThemedText style={{ color: "#fff" }} type="small">保存</ThemedText>
            </Pressable>
          </View>
        </AbilitySheetContent>
      </BottomSheetModal>

      {/* Rename field sheet */}
      <BottomSheetModal visible={!!renamingField} onClose={() => setRenamingField(null)} backgroundColor={theme.backgroundElement} handleColor={theme.border}>
        <AbilitySheetContent>
          <ThemedText type="heading">重命名字段</ThemedText>
          <View>
            <ThemedText themeColor="textSecondary" type="caption" style={styles.sheetLabel}>新名称</ThemedText>
            <TextInput
              style={[styles.sheetInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="新字段名称"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
          </View>
          <View style={styles.sheetActions}>
            <Pressable onPress={() => setRenamingField(null)}>
              <ThemedText themeColor="textSecondary" type="small">取消</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleRenameConfirm}
              disabled={!renameValue.trim() || renameValue.trim() === renamingField?.key}
              style={[styles.sheetButton, { backgroundColor: theme.accent, opacity: (!renameValue.trim() || renameValue.trim() === renamingField?.key) ? 0.5 : 1 }]}
            >
              <ThemedText style={{ color: "#fff" }} type="small">确认</ThemedText>
            </Pressable>
          </View>
        </AbilitySheetContent>
      </BottomSheetModal>

      {/* Add field sheet */}
      <BottomSheetModal visible={!!addingSection} onClose={() => setAddingSection(null)} backgroundColor={theme.backgroundElement} handleColor={theme.border}>
        <AbilitySheetContent>
          <ThemedText type="heading">
            添加到「
            {addingSection ? SECTION_LABELS[addingSection] : ""}
            」
          </ThemedText>
          <View>
            <ThemedText themeColor="textSecondary" type="caption" style={styles.sheetLabel}>字段名称</ThemedText>
            <TextInput
              style={[styles.sheetInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
              value={newFieldName}
              onChangeText={setNewFieldName}
              placeholder="输入字段名称"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
          </View>
          <View style={styles.sheetActions}>
            <Pressable onPress={() => setAddingSection(null)}>
              <ThemedText themeColor="textSecondary" type="small">取消</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleAddField}
              disabled={!newFieldName.trim()}
              style={[styles.sheetButton, { backgroundColor: theme.accent, opacity: !newFieldName.trim() ? 0.5 : 1 }]}
            >
              <ThemedText style={{ color: "#fff" }} type="small">添加</ThemedText>
            </Pressable>
          </View>
        </AbilitySheetContent>
      </BottomSheetModal>
    </>
  );
}
