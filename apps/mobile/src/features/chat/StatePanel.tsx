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
  avatar: { borderRadius: 999, height: 28, width: 28 },
  button: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
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
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  pill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  roleHeader: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  row: { gap: Spacing.xs },
  section: { gap: Spacing.md },
  title: { fontSize: 16, fontWeight: "600", marginBottom: Spacing.lg },
});

type StatePanelProps = {
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

export function StatePanel({
  currentRoleId,
  isStateCommandMode,
  messages,
  onAdvanceTurn,
  onEnterStateCommandMode,
  roomRoles,
  ruleId,
}: StatePanelProps) {
  const theme = useTheme();
  const runtime = useRoomStateRuntime({
    currentRoleId,
    messages,
    roomRoles,
    ruleId,
  });
  const displayedRound = runtime.combatRoundActive ? runtime.turn : 0;
  const {
    activeStates,
    baseDisplayValues,
    derivedDisplayValues,
  } = runtime;

  const roleNameById = useMemo(() => {
    return Object.fromEntries(roomRoles.map(role => [role.roleId, role.roleName?.trim() || null]));
  }, [roomRoles]);

  const { rolesWithState, rolesWithoutState } = useMemo(() => {
    const withState: Array<{ activeStates: typeof activeStates; keys: string[]; role: UserRole }> = [];
    const withoutState: UserRole[] = [];

    for (const role of roomRoles) {
      if (role.state === 1)
        continue;
      const baseValues = baseDisplayValues.rolesByRoleId[role.roleId] ?? {};
      const displayValues = derivedDisplayValues.rolesByRoleId[role.roleId] ?? {};
      const keys = [...new Set([...Object.keys(baseValues), ...Object.keys(displayValues)])];
      const roleActiveStates = activeStates.filter(item => item.scope.kind === "role" && item.scope.roleId === role.roleId);

      if (keys.length > 0 || roleActiveStates.length > 0) {
        withState.push({ activeStates: roleActiveStates, keys, role });
      }
      else {
        withoutState.push(role);
      }
    }
    return { rolesWithState: withState, rolesWithoutState: withoutState };
  }, [activeStates, baseDisplayValues.rolesByRoleId, derivedDisplayValues.rolesByRoleId, roomRoles]);

  const recentStateMessages = useMemo(() => {
    return [...messages]
      .filter(message => message.messageType === MESSAGE_TYPE.STATE_EVENT)
      .sort((left, right) => (right.messageId ?? 0) - (left.messageId ?? 0))
      .slice(0, 8);
  }, [messages]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ThemedText style={styles.title}>状态</ThemedText>

      <View style={styles.section}>
        {runtime.isAbilityLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.accent} />
            <ThemedText type="caption" themeColor="textSecondary">正在同步角色基础变量…</ThemedText>
          </View>
        )}

        <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <ThemedText type="caption" themeColor="textSecondary">当前回合</ThemedText>
              <ThemedText type="subtitle">{displayedRound}</ThemedText>
              <View style={[styles.pill, { alignSelf: "flex-start", backgroundColor: runtime.combatRoundActive ? theme.accentMuted : theme.surface }]}>
                <ThemedText type="caption" style={{ color: runtime.combatRoundActive ? theme.accent : theme.textSecondary }}>
                  {runtime.combatRoundActive ? "战斗轮进行中" : "未进入战斗轮"}
                </ThemedText>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: Spacing.sm }}>
              <Pressable onPress={onAdvanceTurn} style={[styles.button, { backgroundColor: theme.accentMuted, borderColor: theme.accent }]}>
                <ThemedText style={{ color: theme.accent }} type="smallBold">下一回合</ThemedText>
              </Pressable>
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
            </View>
          </View>

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
          {rolesWithState.length === 0 && rolesWithoutState.length === 0 ? (
            <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText themeColor="textSecondary">当前房间还没有可展示的角色状态。</ThemedText>
            </View>
          ) : rolesWithState.map(({ activeStates, keys, role }) => {
            const isCurrentRole = currentRoleId === role.roleId;
            const primaryKeys = keys.filter(k => PRIMARY_STAT_KEYS.has(k));
            const secondaryKeys = keys.filter(k => !PRIMARY_STAT_KEYS.has(k));
            return (
              <View
                key={role.roleId}
                style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: isCurrentRole ? theme.accent : theme.border }]}
              >
                <View style={styles.roleHeader}>
                  {role.avatarFileId ? (
                    <CachedImage uri={avatarThumbUrl(role.avatarFileId)} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { alignItems: "center", backgroundColor: theme.surface, justifyContent: "center" }]}>
                      <ThemedText type="caption">{(role.roleName ?? "#").charAt(0)}</ThemedText>
                    </View>
                  )}
                  <ThemedText type="smallBold" style={{ flex: 1 }}>{role.roleName?.trim() || `角色 #${role.roleId}`}</ThemedText>
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

        {rolesWithoutState.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">无状态数据</ThemedText>
            {rolesWithoutState.map(role => (
              <View
                key={role.roleId}
                style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: 0.6 }]}
              >
                <View style={styles.roleHeader}>
                  {role.avatarFileId ? (
                    <CachedImage uri={avatarThumbUrl(role.avatarFileId)} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { alignItems: "center", backgroundColor: theme.surface, justifyContent: "center" }]}>
                      <ThemedText type="caption">{(role.roleName ?? "#").charAt(0)}</ThemedText>
                    </View>
                  )}
                  <ThemedText type="smallBold" themeColor="textSecondary">{role.roleName?.trim() || `角色 #${role.roleId}`}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <ThemedText type="smallBold">最近状态事件</ThemedText>
          {recentStateMessages.length === 0 ? (
            <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText themeColor="textSecondary">还没有状态事件消息。</ThemedText>
            </View>
          ) : recentStateMessages.map((message) => {
            const summary = runtime.messageSummariesByMessageId[message.messageId ?? -1];
            return (
              <View
                key={message.messageId}
                style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              >
                <View style={styles.row}>
                  <ThemedText type="smallBold">{summary?.primaryText ?? (message.content?.trim() || "状态事件")}</ThemedText>
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
