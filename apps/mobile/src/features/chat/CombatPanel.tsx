import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";
import { formatStateKeyLabel, formatStateScopeLabel } from "@tuanchat/domain/state-event";
import { compareStateValueText } from "@tuanchat/domain/state-runtime";

import { buildMobileInitiativeRows } from "./initiativeRuntimeRows";
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
  isStateCommandMode: boolean;
  messages: Message[];
  onAdvanceTurn: () => void;
  onEnterStateCommandMode: () => void;
  roomRoles: UserRole[];
  ruleId: number | null | undefined;
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

export function CombatPanel({
  currentRoleId,
  isStateCommandMode,
  messages,
  onAdvanceTurn,
  onEnterStateCommandMode,
  roomRoles,
  ruleId,
}: CombatPanelProps) {
  const theme = useTheme();
  const runtime = useRoomStateRuntime({
    currentRoleId,
    messages,
    roomRoles,
    ruleId,
  });

  const initiativeRows = useMemo(() => buildMobileInitiativeRows(runtime.participants), [runtime.participants]);

  const roleNameById = useMemo(() => {
    return Object.fromEntries(roomRoles.map(role => [role.roleId, role.roleName?.trim() || null]));
  }, [roomRoles]);

  const rolesWithCombatState = useMemo(() => {
    return roomRoles
      .filter(role => role.state !== 1)
      .map((role) => {
        const participant = runtime.participants.find(item => item.roleId === role.roleId);
        const baseValues = runtime.baseDisplayValues.rolesByRoleId[role.roleId] ?? {};
        const displayValues = runtime.derivedDisplayValues.rolesByRoleId[role.roleId] ?? {};
        const keys = [...new Set([...Object.keys(baseValues), ...Object.keys(displayValues)])];
        const activeStates = runtime.activeStates.filter(item => item.scope.kind === "role" && item.scope.roleId === role.roleId);
        return { activeStates, initiative: participant?.initiative ?? null, keys, role };
      })
      // 先攻不单独开区，但仍算作角色战斗状态，不能只落到辅助参与者列表。
      .filter(item => item.keys.length > 0 || item.activeStates.length > 0 || typeof item.initiative === "number");
  }, [
    roomRoles,
    runtime.activeStates,
    runtime.baseDisplayValues.rolesByRoleId,
    runtime.derivedDisplayValues.rolesByRoleId,
    runtime.participants,
  ]);

  const roleIdsWithCombatState = useMemo(() => {
    return new Set(rolesWithCombatState.map(item => item.role.roleId));
  }, [rolesWithCombatState]);

  const looseParticipantRows = useMemo(() => {
    return initiativeRows.filter((row) => {
      const participant = runtime.participants.find(item => item.participantId === row.participantId);
      if (typeof participant?.roleId !== "number" || participant.roleId <= 0) {
        return true;
      }
      return !roleIdsWithCombatState.has(participant.roleId);
    });
  }, [initiativeRows, roleIdsWithCombatState, runtime.participants]);

  const recentCombatMessages = useMemo(() => {
    return [...messages]
      .filter(message => message.messageType === MESSAGE_TYPE.STATE_EVENT)
      .sort((left, right) => (right.messageId ?? 0) - (left.messageId ?? 0))
      .slice(0, 8);
  }, [messages]);

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
              <ThemedText type="subtitle">{runtime.turn}</ThemedText>
            </View>
            <Pressable onPress={onAdvanceTurn} style={[styles.button, { backgroundColor: theme.accentMuted, borderColor: theme.accent }]}>
              <ThemedText style={{ color: theme.accent }} type="smallBold">下一回合</ThemedText>
            </Pressable>
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

        {looseParticipantRows.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">其他战斗参与者</ThemedText>
            {looseParticipantRows.map(row => (
              <View
                key={row.participantId}
                style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              >
                <View style={[styles.pill, { backgroundColor: theme.accentMuted }]}>
                  <ThemedText type="caption" style={{ color: theme.accent }}>
                    #
                    {row.index + 1}
                  </ThemedText>
                </View>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>{row.name}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="caption">
                    HP
                    {" "}
                    {row.hp ?? "--"}
                    /
                    {row.maxHp ?? "--"}
                    {" "}
                    · 先攻
                    {" "}
                    {row.initiative}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <ThemedText type="smallBold">最近战斗事件</ThemedText>
          {recentCombatMessages.length === 0
            ? (
                <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText themeColor="textSecondary">还没有战斗状态事件。</ThemedText>
                </View>
              )
            : recentCombatMessages.map((message) => {
                const summary = runtime.messageSummariesByMessageId[message.messageId ?? -1];
                return (
                  <View
                    key={message.messageId}
                    style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                  >
                    <View style={{ gap: Spacing.xs }}>
                      <ThemedText type="smallBold">{summary?.primaryText ?? (message.content?.trim() || "战斗事件")}</ThemedText>
                      {summary?.secondaryText && (
                        <ThemedText themeColor="textSecondary" type="caption">{summary.secondaryText}</ThemedText>
                      )}
                    </View>
                    {(summary?.detailLines ?? []).map((line, index) => (
                      <ThemedText key={`${message.messageId}-${index}`} themeColor="textSecondary" type="caption">
                        {line}
                      </ThemedText>
                    ))}
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
