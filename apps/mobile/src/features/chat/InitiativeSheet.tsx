import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import type { Initiative, InitiativeDraft } from "./initiativeTypes";
import { useMemo, useState } from "react";

import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";

import { useTheme } from "@/hooks/use-theme";
import { extractAgilityFromAbilityRecord, extractHpFromAbilityRecord } from "./initiativeAbilityExtractors";
import { useRoomExtra } from "./roomExtra";
import { useRoleAbilitiesByRule } from "./useRoleAbilitiesByRule";

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  row: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  roleInfo: {
    flex: 1,
    gap: 2,
  },
  statBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  inlineInputs: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  button: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.lg,
  },
});

interface InitiativeSheetProps {
  onClose: () => void;
  roomId: number | null;
  roomRoles: UserRole[];
  ruleId: number | null | undefined;
  visible: boolean;
}

function getInitiativeListKey(ruleId: number | null | undefined) {
  return typeof ruleId === "number" && ruleId > 0
    ? `initiativeList-rule-${ruleId}`
    : "initiativeList";
}

function parseInitiativeDraftNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortInitiatives(items: Initiative[]) {
  return [...items].sort((left, right) => right.value - left.value);
}

export function InitiativeSheet({
  onClose,
  roomId,
  roomRoles,
  ruleId,
  visible,
}: InitiativeSheetProps) {
  const theme = useTheme();
  const initiativeState = useRoomExtra<Initiative[]>(roomId, getInitiativeListKey(ruleId), []);
  const initiatives = useMemo(() => sortInitiatives(initiativeState.value), [initiativeState.value]);
  const activeRoles = useMemo(() => roomRoles.filter(role => role.state !== 1), [roomRoles]);
  const { abilityByRoleId } = useRoleAbilitiesByRule(activeRoles.map(role => role.roleId), ruleId);
  const [draft, setDraft] = useState<InitiativeDraft>({
    hp: "",
    maxHp: "",
    name: "",
    value: "",
  });

  const importableRoles = useMemo(() => {
    return activeRoles
      .filter((role) => {
        return !initiatives.some(item => item.roleId === role.roleId || item.name.trim() === (role.roleName ?? "").trim());
      })
      .map((role) => {
        const ability = abilityByRoleId.get(role.roleId) ?? null;
        const hp = extractHpFromAbilityRecord(ability);
        return {
          ability,
          hp,
          role,
          value: extractAgilityFromAbilityRecord(ability),
        };
      })
      .filter(item => item.value != null);
  }, [abilityByRoleId, activeRoles, initiatives]);

  const handleSaveInitiatives = async (next: Initiative[]) => {
    await initiativeState.setValue(sortInitiatives(next));
  };

  const handleImportRole = async (roleId: number) => {
    const matched = importableRoles.find(item => item.role.roleId === roleId);
    if (!matched || matched.value == null) {
      return;
    }
    await handleSaveInitiatives([
      ...initiatives,
      {
        hp: matched.hp?.hp ?? null,
        maxHp: matched.hp?.maxHp ?? null,
        name: matched.role.roleName?.trim() || `角色 #${matched.role.roleId}`,
        roleId: matched.role.roleId,
        value: matched.value,
      },
    ]);
  };

  const handleAddManual = async () => {
    const name = draft.name.trim();
    if (!name) {
      Alert.alert("新增失败", "请填写角色名。");
      return;
    }
    if (initiatives.some(item => item.name.trim() === name)) {
      Alert.alert("新增失败", "该角色已在先攻表中。");
      return;
    }

    await handleSaveInitiatives([
      ...initiatives,
      {
        hp: parseInitiativeDraftNumber(draft.hp),
        maxHp: parseInitiativeDraftNumber(draft.maxHp),
        name,
        value: parseInitiativeDraftNumber(draft.value) ?? 0,
      },
    ]);
    setDraft({
      hp: "",
      maxHp: "",
      name: "",
      value: "",
    });
  };

  const handleDelete = async (name: string) => {
    await handleSaveInitiatives(initiatives.filter(item => item.name !== name));
  };

  const handleNextRound = async () => {
    await handleSaveInitiatives(sortInitiatives(initiatives));
  };

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="78%"
      onClose={onClose}
      visible={visible}
    >
      <ThemedText style={styles.title}>先攻</ThemedText>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => void handleNextRound()}
              style={[styles.button, { backgroundColor: theme.accentMuted, borderColor: theme.accent }]}
            >
              <ThemedText type="smallBold" style={{ color: theme.accent }}>整理顺序</ThemedText>
            </Pressable>
          </View>

          {importableRoles.length > 0
            ? (
                <View style={styles.section}>
                  <ThemedText type="smallBold">从角色导入</ThemedText>
                  {importableRoles.map(({ hp, role, value }) => (
                    <Pressable
                      key={role.roleId}
                      onPress={() => void handleImportRole(role.roleId)}
                      style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                    >
                      <View style={styles.roleInfo}>
                        <ThemedText type="smallBold">{role.roleName?.trim() || `角色 #${role.roleId}`}</ThemedText>
                        <ThemedText themeColor="textSecondary" type="caption">
                          HP
                          {" "}
                          {hp?.hp ?? "--"}
                          /
                          {hp?.maxHp ?? "--"}
                        </ThemedText>
                      </View>
                      <View style={[styles.statBadge, { backgroundColor: theme.accentMuted }]}>
                        <ThemedText type="caption" style={{ color: theme.accent }}>
                          先攻
                          {" "}
                          {value}
                        </ThemedText>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )
            : null}

          <View style={styles.section}>
            <ThemedText type="smallBold">手动新增</ThemedText>
            <TextInput
              onChangeText={name => setDraft(current => ({ ...current, name }))}
              placeholder="角色名"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
              value={draft.name}
            />
            <View style={styles.inlineInputs}>
              <TextInput
                keyboardType="numeric"
                onChangeText={value => setDraft(current => ({ ...current, value }))}
                placeholder="先攻值"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text, flex: 1 }]}
                value={draft.value}
              />
              <TextInput
                keyboardType="numeric"
                onChangeText={hp => setDraft(current => ({ ...current, hp }))}
                placeholder="HP"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text, flex: 1 }]}
                value={draft.hp}
              />
              <TextInput
                keyboardType="numeric"
                onChangeText={maxHp => setDraft(current => ({ ...current, maxHp }))}
                placeholder="Max HP"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text, flex: 1 }]}
                value={draft.maxHp}
              />
            </View>
            <Pressable
              onPress={() => void handleAddManual()}
              style={[styles.button, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <ThemedText type="smallBold">添加</ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">当前先攻表</ThemedText>
            {initiatives.length === 0
              ? (
                  <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText themeColor="textSecondary">还没有先攻记录</ThemedText>
                  </View>
                )
              : initiatives.map((item, index) => (
                  <View
                    key={`${item.roleId ?? item.name}-${index}`}
                    style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                  >
                    <View style={[styles.statBadge, { backgroundColor: theme.accentMuted }]}>
                      <ThemedText type="caption" style={{ color: theme.accent }}>
                        #
                        {index + 1}
                      </ThemedText>
                    </View>
                    <View style={styles.roleInfo}>
                      <ThemedText type="smallBold">{item.name}</ThemedText>
                      <ThemedText themeColor="textSecondary" type="caption">
                        HP
                        {" "}
                        {item.hp ?? "--"}
                        /
                        {item.maxHp ?? "--"}
                      </ThemedText>
                    </View>
                    <View style={[styles.statBadge, { backgroundColor: theme.surface }]}>
                      <ThemedText type="caption">
                        先攻
                        {item.value}
                      </ThemedText>
                    </View>
                    <Pressable onPress={() => void handleDelete(item.name)}>
                      <ThemedText style={{ color: theme.danger }} type="caption">删除</ThemedText>
                    </Pressable>
                  </View>
                ))}
          </View>
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}
