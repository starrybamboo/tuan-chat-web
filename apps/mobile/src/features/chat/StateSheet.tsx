import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatStateKeyLabel, formatStateScopeLabel } from "@tuanchat/domain/state-event";
import { compareStateValueText } from "@tuanchat/domain/state-runtime";

import { useRoomStateRuntime } from "./useRoomStateRuntime";

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  panel: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  row: {
    gap: Spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
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

type StateSheetProps = {
  currentRoleId: number | null;
  isStateCommandMode: boolean;
  messages: Message[];
  onAdvanceTurn: () => void;
  onClose: () => void;
  onEnterStateCommandMode: () => void;
  roomRoles: UserRole[];
  ruleId: number | null | undefined;
  visible: boolean;
};

export function StateSheet({
  currentRoleId,
  isStateCommandMode,
  messages,
  onAdvanceTurn,
  onClose,
  onEnterStateCommandMode,
  roomRoles,
  ruleId,
  visible,
}: StateSheetProps) {
  const theme = useTheme();
  const runtime = useRoomStateRuntime({
    currentRoleId,
    messages,
    roomRoles,
    ruleId,
  });

  const roleNameById = useMemo(() => {
    return Object.fromEntries(roomRoles.map(role => [role.roleId, role.roleName?.trim() || null]));
  }, [roomRoles]);

  const roleRows = useMemo(() => {
    return roomRoles
      .filter(role => role.state !== 1)
      .map((role) => {
        const baseValues = runtime.baseDisplayValues.rolesByRoleId[role.roleId] ?? {};
        const displayValues = runtime.derivedDisplayValues.rolesByRoleId[role.roleId] ?? {};
        const keys = [...new Set([...Object.keys(baseValues), ...Object.keys(displayValues)])];
        const activeStates = runtime.activeStates.filter(item => item.scope.kind === "role" && item.scope.roleId === role.roleId);
        return {
          activeStates,
          keys,
          role,
        };
      })
      .filter(item => item.keys.length > 0 || item.activeStates.length > 0);
  }, [roomRoles, runtime.activeStates, runtime.baseDisplayValues.rolesByRoleId, runtime.derivedDisplayValues.rolesByRoleId]);

  const recentStateMessages = useMemo(() => {
    return [...messages]
      .filter(message => message.messageType === MESSAGE_TYPE.STATE_EVENT)
      .sort((left, right) => (right.messageId ?? 0) - (left.messageId ?? 0))
      .slice(0, 8);
  }, [messages]);

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="80%"
      onClose={onClose}
      visible={visible}
    >
      <ThemedText style={styles.title}>状态</ThemedText>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <ThemedText type="caption" themeColor="textSecondary">当前回合</ThemedText>
                <ThemedText type="subtitle">{runtime.turn}</ThemedText>
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

            {Object.keys(runtime.derivedDisplayValues.room).length > 0
              ? (
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
                )
              : null}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">角色状态</ThemedText>
            {roleRows.length === 0
              ? (
                  <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText themeColor="textSecondary">当前房间还没有可展示的角色状态。</ThemedText>
                  </View>
                )
              : roleRows.map(({ activeStates, keys, role }) => (
                  <View
                    key={role.roleId}
                    style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                  >
                    <ThemedText type="smallBold">{role.roleName?.trim() || `角色 #${role.roleId}`}</ThemedText>
                    <View style={styles.pillRow}>
                      {keys.map(key => (
                        <View key={`${role.roleId}-${key}`} style={[styles.pill, { backgroundColor: theme.surface }]}>
                          <ThemedText type="caption">
                            {formatStateKeyLabel(key)}
                            {" "}
                            {compareStateValueText(
                              runtime.baseDisplayValues.rolesByRoleId[role.roleId]?.[key] ?? 0,
                              runtime.derivedDisplayValues.rolesByRoleId[role.roleId]?.[key] ?? 0,
                            )}
                          </ThemedText>
                        </View>
                      ))}
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
                ))}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">最近状态事件</ThemedText>
            {recentStateMessages.length === 0
              ? (
                  <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText themeColor="textSecondary">还没有状态事件消息。</ThemedText>
                  </View>
                )
              : recentStateMessages.map((message) => {
                  const summary = runtime.messageSummariesByMessageId[message.messageId ?? -1];
                  return (
                    <View
                      key={message.messageId}
                      style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                    >
                      <View style={styles.row}>
                        <ThemedText type="smallBold">{summary?.primaryText ?? (message.content?.trim() || "状态事件")}</ThemedText>
                        {summary?.secondaryText
                          ? (
                              <ThemedText themeColor="textSecondary" type="caption">{summary.secondaryText}</ThemedText>
                            )
                          : null}
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

          {runtime.unresolvedStates.length > 0
            ? (
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
                        {" · "}
                        {formatStateScopeLabel(item.scope, { roleNameById })}
                        {" · "}
                        {item.reason}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )
            : null}
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}
