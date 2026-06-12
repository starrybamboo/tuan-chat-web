import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { formatStateKeyLabel, formatStateScopeLabel } from "@tuanchat/domain/state-event";
import { compareStateValueText } from "@tuanchat/domain/state-runtime";
import { memo, useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

import type { RoomStateRuntimeValue } from "./useRoomStateRuntime";

import { useRoomStateRuntime } from "./useRoomStateRuntime";

const PRIMARY_STAT_COLORS: Record<string, { bg: string; text: string }> = {
  hp: { bg: "#fecaca", text: "#dc2626" },
  HP: { bg: "#fecaca", text: "#dc2626" },
  mp: { bg: "#bfdbfe", text: "#2563eb" },
  MP: { bg: "#bfdbfe", text: "#2563eb" },
  san: { bg: "#fef3c7", text: "#d97706" },
  SAN: { bg: "#fef3c7", text: "#d97706" },
  sp: { bg: "#bbf7d0", text: "#16a34a" },
  SP: { bg: "#bbf7d0", text: "#16a34a" },
};

const PRIMARY_STAT_KEYS = new Set(["hp", "HP", "mp", "MP", "san", "SAN", "sp", "SP"]);

const styles = StyleSheet.create({
  avatar: { borderRadius: Radius.full, height: 28, width: 28 },
  button: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
  },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  currentBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  panel: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  pill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  roleHeader: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  row: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rowText: { flex: 1, gap: 2 },
  section: { gap: Spacing.md },
  title: { fontSize: 18, fontWeight: "700", marginBottom: Spacing.lg },
});

type CombatPanelProps = {
  currentRoleId: number | null;
  isKP: boolean;
  isSendingCombatRoundEvent: boolean;
  isStateCommandMode: boolean;
  messages: Message[];
  onAdvanceTurn: () => void;
  onEndCombat: () => void;
  onEnterStateCommandMode: () => void;
  onStartCombat: () => void;
  roomRoles: UserRole[];
  roomStateRuntime?: RoomStateRuntimeValue;
  ruleId: number | null | undefined;
};

type CombatPanelContentProps = Omit<CombatPanelProps, "messages" | "roomStateRuntime" | "ruleId"> & {
  runtime: RoomStateRuntimeValue;
};

function getStatColor(key: string) {
  return PRIMARY_STAT_COLORS[key] ?? null;
}

function formatStatValue(baseValue: number, derivedValue: number): string {
  if (baseValue === derivedValue) {
    return String(derivedValue);
  }
  return `${derivedValue}/${baseValue}`;
}

function collectCombatDisplayKeys(recordedKeys: string[], activeStates: RoomStateRuntimeValue["activeStates"]): string[] {
  const keys = new Set(recordedKeys);
  activeStates.forEach((state) => {
    state.modifiers.forEach(modifier => keys.add(modifier.key));
  });
  return [...keys].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function CombatPanelInner(props: CombatPanelProps) {
  if (props.roomStateRuntime) {
    return <CombatPanelContent {...props} runtime={props.roomStateRuntime} />;
  }
  return <CombatPanelWithRuntime {...props} />;
}

export const CombatPanel = memo(CombatPanelInner);

function CombatPanelWithRuntime({ roomStateRuntime: _roomStateRuntime, ...props }: CombatPanelProps) {
  const runtime = useRoomStateRuntime({
    currentRoleId: props.currentRoleId,
    messages: props.messages,
    roomRoles: props.roomRoles,
    ruleId: props.ruleId,
  });
  return <CombatPanelContent {...props} runtime={runtime} />;
}

function CombatPanelContent({
  currentRoleId,
  isKP,
  isSendingCombatRoundEvent,
  isStateCommandMode,
  onAdvanceTurn,
  onEndCombat,
  onEnterStateCommandMode,
  onStartCombat,
  runtime,
  roomRoles,
}: CombatPanelContentProps) {
  const theme = useTheme();
  const displayedRound = runtime.combatRoundActive ? runtime.turn : 0;

  const roleNameById = useMemo(() => {
    return Object.fromEntries(roomRoles.map(role => [role.roleId, role.roleName?.trim() || null]));
  }, [roomRoles]);

  const rolesWithCombatState = useMemo(() => {
    return roomRoles
      .filter(role => role.state !== 1)
      .map((role) => {
        const baseValues = runtime.baseDisplayValues.rolesByRoleId[role.roleId] ?? {};
        const displayValues = runtime.derivedDisplayValues.rolesByRoleId[role.roleId] ?? {};
        const activeStates = runtime.activeStates.filter(item => item.scope.kind === "role" && item.scope.roleId === role.roleId);
        const keys = collectCombatDisplayKeys(runtime.recordedRoleValueKeysByRoleId[role.roleId] ?? [], activeStates);
        const initiative = displayValues.initiative ?? baseValues.initiative ?? null;
        return { activeStates, initiative, keys, role };
      })
      // 先攻不单独开区，但仍算作角色战斗状态，不能只落到辅助参与者列表。
      .filter(item => item.keys.length > 0 || item.activeStates.length > 0 || typeof item.initiative === "number");
  }, [
    roomRoles,
    runtime.activeStates,
    runtime.baseDisplayValues.rolesByRoleId,
    runtime.derivedDisplayValues.rolesByRoleId,
    runtime.recordedRoleValueKeysByRoleId,
  ]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ThemedText style={styles.title}>战斗</ThemedText>

      <View style={styles.section}>
        {runtime.isAbilityLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.accent} />
            <ThemedText type="caption" themeColor="textSecondary">正在同步角色基础变量...</ThemedText>
          </View>
        )}

        <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: Spacing.md }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" themeColor="textSecondary">当前回合</ThemedText>
              <ThemedText type="subtitle">{displayedRound}</ThemedText>
              <View style={[styles.pill, { alignSelf: "flex-start", backgroundColor: runtime.combatRoundActive ? theme.accentMuted : theme.surface }]}>
                <ThemedText type="caption" style={{ color: runtime.combatRoundActive ? theme.accent : theme.textSecondary }}>
                  {runtime.combatRoundActive ? "战斗轮进行中" : "未进入战斗轮"}
                </ThemedText>
              </View>
            </View>
            <View style={{ gap: Spacing.sm }}>
              {isKP
                ? (
                    <Pressable
                      disabled={runtime.combatRoundActive || isSendingCombatRoundEvent}
                      onPress={onStartCombat}
                      style={[
                        styles.button,
                        {
                          backgroundColor: runtime.combatRoundActive || isSendingCombatRoundEvent ? theme.surface : theme.accentMuted,
                          borderColor: runtime.combatRoundActive || isSendingCombatRoundEvent ? theme.border : theme.accent,
                          opacity: runtime.combatRoundActive || isSendingCombatRoundEvent ? 0.55 : 1,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: runtime.combatRoundActive ? theme.textSecondary : theme.accent }} type="smallBold">
                        {isSendingCombatRoundEvent ? "处理中..." : "开始战斗"}
                      </ThemedText>
                    </Pressable>
                  )
                : null}
              <Pressable
                disabled={!runtime.combatRoundActive || isSendingCombatRoundEvent}
                onPress={onAdvanceTurn}
                style={[
                  styles.button,
                  {
                    backgroundColor: runtime.combatRoundActive && !isSendingCombatRoundEvent ? theme.accentMuted : theme.surface,
                    borderColor: runtime.combatRoundActive && !isSendingCombatRoundEvent ? theme.accent : theme.border,
                    opacity: runtime.combatRoundActive && !isSendingCombatRoundEvent ? 1 : 0.55,
                  },
                ]}
              >
                <ThemedText style={{ color: runtime.combatRoundActive ? theme.accent : theme.textSecondary }} type="smallBold">下一回合</ThemedText>
              </Pressable>
              {isKP
                ? (
                    <Pressable
                      disabled={!runtime.combatRoundActive || isSendingCombatRoundEvent}
                      onPress={onEndCombat}
                      style={[
                        styles.button,
                        {
                          backgroundColor: runtime.combatRoundActive && !isSendingCombatRoundEvent ? theme.surface : theme.surface,
                          borderColor: runtime.combatRoundActive && !isSendingCombatRoundEvent ? theme.danger : theme.border,
                          opacity: runtime.combatRoundActive && !isSendingCombatRoundEvent ? 1 : 0.55,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: runtime.combatRoundActive ? theme.danger : theme.textSecondary }} type="smallBold">结束战斗</ThemedText>
                    </Pressable>
                  )
                : null}
            </View>
          </View>

          <Pressable
            onPress={onEnterStateCommandMode}
            style={[
              styles.button,
              {
                backgroundColor: isStateCommandMode ? theme.accentMuted : theme.surface,
                borderColor: isStateCommandMode ? theme.accent : theme.border,
              },
            ]}
          >
            <ThemedText
              style={{ color: isStateCommandMode ? theme.accent : theme.textSecondary }}
              type="smallBold"
            >
              状态指令
            </ThemedText>
          </Pressable>

          {Object.keys(runtime.derivedDisplayValues.room).length > 0 && (
            <View style={styles.pillRow}>
              {Object.keys(runtime.derivedDisplayValues.room).map(key => (
                <View key={key} style={[styles.pill, { backgroundColor: theme.surface }]}>
                  <ThemedText type="caption">
                    {formatStateKeyLabel(key)}
                    {" "}
                    {compareStateValueText(runtime.baseDisplayValues.room[key] ?? 0, runtime.derivedDisplayValues.room[key] ?? 0)}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">角色状态</ThemedText>
          {rolesWithCombatState.length === 0
            ? (
                <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText themeColor="textSecondary">当前房间还没有可展示的角色状态。</ThemedText>
                </View>
              )
            : rolesWithCombatState.map(({ activeStates, initiative, keys, role }) => {
                const isCurrentRole = currentRoleId === role.roleId;
                const primaryKeys = keys.filter(k => PRIMARY_STAT_KEYS.has(k));
                const secondaryKeys = keys.filter(k => !PRIMARY_STAT_KEYS.has(k));
                return (
                  <View
                    key={role.roleId}
                    style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: isCurrentRole ? theme.accent : theme.border }]}
                  >
                    <View style={styles.roleHeader}>
                      {role.avatarFileId
                        ? <CachedImage uri={avatarThumbUrl(role.avatarFileId)} style={styles.avatar} />
                        : (
                            <View style={[styles.avatar, { alignItems: "center", backgroundColor: theme.surface, justifyContent: "center" }]}>
                              <ThemedText type="caption">{(role.roleName ?? "#").charAt(0)}</ThemedText>
                            </View>
                          )}
                      <ThemedText type="smallBold" numberOfLines={1} style={{ flex: 1 }}>{role.roleName?.trim() || `角色 #${role.roleId}`}</ThemedText>
                      <View style={[styles.pill, { backgroundColor: theme.surface }]}>
                        <ThemedText type="caption">
                          先攻
                          {" "}
                          {typeof initiative === "number" ? initiative : "--"}
                        </ThemedText>
                      </View>
                      {isCurrentRole && (
                        <View style={[styles.currentBadge, { backgroundColor: theme.accentMuted }]}>
                          <ThemedText type="caption" style={{ color: theme.accent }}>当前</ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={styles.pillRow}>
                      {primaryKeys.map((key) => {
                        const color = getStatColor(key);
                        const base = runtime.baseDisplayValues.rolesByRoleId[role.roleId]?.[key] ?? 0;
                        const derived = runtime.derivedDisplayValues.rolesByRoleId[role.roleId]?.[key] ?? 0;
                        return (
                          <View key={`${role.roleId}-${key}`} style={[styles.pill, { backgroundColor: color?.bg ?? theme.surface }]}>
                            <ThemedText type="caption" style={{ color: color?.text ?? theme.text }}>
                              {formatStateKeyLabel(key)}
                              {" "}
                              {formatStatValue(base, derived)}
                            </ThemedText>
                          </View>
                        );
                      })}
                      {secondaryKeys.map((key) => {
                        const base = runtime.baseDisplayValues.rolesByRoleId[role.roleId]?.[key] ?? 0;
                        const derived = runtime.derivedDisplayValues.rolesByRoleId[role.roleId]?.[key] ?? 0;
                        return (
                          <View key={`${role.roleId}-${key}`} style={[styles.pill, { backgroundColor: theme.surface }]}>
                            <ThemedText type="caption">
                              {formatStateKeyLabel(key)}
                              {" "}
                              {formatStatValue(base, derived)}
                            </ThemedText>
                          </View>
                        );
                      })}
                      {activeStates.map(state => (
                        <View key={state.instanceId} style={[styles.pill, { backgroundColor: theme.accentMuted }]}>
                          <ThemedText style={{ color: theme.accent }} type="caption">
                            {state.statusName}
                            {typeof state.remainingTurns === "number" ? ` ${state.remainingTurns}T` : ""}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
        </View>

        {runtime.unresolvedStates.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="smallBold">未解析状态</ThemedText>
            {runtime.unresolvedStates.map((item, index) => (
              <View
                key={`${item.messageId}-${item.statusId}-${index}`}
                style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.warning }]}
              >
                <ThemedText type="smallBold">{item.statusId}</ThemedText>
                <ThemedText themeColor="textSecondary" type="caption">
                  消息 #
                  {item.messageId}
                  {" "}
                  ·
                  {" "}
                  {formatStateScopeLabel(item.scope, { roleNameById })}
                  {" "}
                  ·
                  {" "}
                  {item.reason}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
