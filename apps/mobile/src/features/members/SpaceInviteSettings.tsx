import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Info, LinkSimple, UserPlus, Users } from "phosphor-react-native";
import type { ReactNode } from "react";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { setStringAsync } from "@/lib/clipboard";

import type { SpaceInviteMode } from "./spaceInviteLink";

import {
  buildSpaceInviteLink,
  clampSpaceInviteDurationDays,
  DEFAULT_SPACE_INVITE_DURATION_DAYS,
  getSpaceInviteCodeQueryKey,
  getSpaceInviteCodeType,
} from "./spaceInviteLink";

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  modeList: { gap: Spacing.sm },
  modeCard: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modeIndicator: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  modeIndicatorSelected: { borderWidth: 5 },
  section: {
    borderCurve: "continuous",
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  sectionTitle: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  linkRow: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  linkInput: {
    borderCurve: "continuous",
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    fontSize: 12,
    minHeight: 42,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  copyButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 74,
    paddingHorizontal: Spacing.lg,
  },
  durationRow: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  durationInput: {
    borderCurve: "continuous",
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    fontSize: 15,
    minHeight: 42,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  secondaryButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.lg,
  },
  feedback: { fontSize: 12 },
});

type InviteModeCardProps = {
  icon: ReactNode;
  label: string;
  mode: SpaceInviteMode;
  onSelect: (mode: SpaceInviteMode) => void;
  selected: boolean;
};

function InviteModeCard({ icon, label, mode, onSelect, selected }: InviteModeCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => onSelect(mode)}
      style={({ pressed }) => [
        styles.modeCard,
        {
          backgroundColor: selected ? theme.accentMuted : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View style={[styles.modeIndicator, selected ? styles.modeIndicatorSelected : null, { borderColor: selected ? theme.accent : theme.textSecondary }]} />
      {icon}
      <ThemedText type="smallBold" style={{ color: selected ? theme.accent : theme.text }}>{label}</ThemedText>
    </Pressable>
  );
}

type SpaceInviteSettingsProps = {
  canInvitePlayers: boolean;
  inviteMode: SpaceInviteMode;
  onChangeInviteMode: (mode: SpaceInviteMode) => void;
  spaceId: number;
  visible: boolean;
};

/** 空间邀请的角色、邀请链接与有效期设置。 */
export function SpaceInviteSettings({
  canInvitePlayers,
  inviteMode,
  onChangeInviteMode,
  spaceId,
  visible,
}: SpaceInviteSettingsProps) {
  const theme = useTheme();
  const [duration, setDuration] = useState(DEFAULT_SPACE_INVITE_DURATION_DAYS);
  const [durationInput, setDurationInput] = useState(String(DEFAULT_SPACE_INVITE_DURATION_DAYS));
  const [editingDuration, setEditingDuration] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<"copied" | "failed" | null>(null);
  const inviteCodeType = getSpaceInviteCodeType(inviteMode);
  const inviteCodeQuery = useQuery({
    enabled: visible && spaceId > 0,
    queryFn: async () => {
      const response = await mobileApiClient.spaceMemberController.inviteCode(spaceId, inviteCodeType, duration);
      if (!response.success) {
        throw new Error(response.errMsg || "生成邀请链接失败。");
      }
      return response.data?.trim() ?? "";
    },
    queryKey: getSpaceInviteCodeQueryKey(spaceId, inviteCodeType, duration),
  });
  const inviteLink = buildSpaceInviteLink(inviteCodeQuery.data);

  const handleSelectMode = (mode: SpaceInviteMode) => {
    setCopyFeedback(null);
    onChangeInviteMode(mode);
  };
  const handleCopy = async () => {
    if (!inviteLink) {
      return;
    }
    const copied = await setStringAsync(inviteLink);
    setCopyFeedback(copied ? "copied" : "failed");
  };
  const handleApplyDuration = () => {
    const nextDuration = clampSpaceInviteDurationDays(Number(durationInput), duration);
    setDuration(nextDuration);
    setDurationInput(String(nextDuration));
    setEditingDuration(false);
    setCopyFeedback(null);
  };

  return (
    <View style={styles.container}>
      {canInvitePlayers
        ? (
            <View accessibilityRole="radiogroup" style={styles.modeList}>
              <InviteModeCard
                icon={<UserPlus color={inviteMode === "player" ? theme.accent : theme.textSecondary} size={17} />}
                label="邀请玩家"
                mode="player"
                onSelect={handleSelectMode}
                selected={inviteMode === "player"}
              />
              <InviteModeCard
                icon={<Users color={inviteMode === "spectator" ? theme.accent : theme.textSecondary} size={17} />}
                label="邀请观战"
                mode="spectator"
                onSelect={handleSelectMode}
                selected={inviteMode === "spectator"}
              />
            </View>
          )
        : null}

      <View style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.sectionTitle}>
          <LinkSimple color={theme.accent} size={18} />
          <ThemedText type="smallBold">邀请链接</ThemedText>
        </View>
        <View style={styles.linkRow}>
          <TextInput
            accessibilityLabel="邀请链接"
            editable={false}
            placeholder="邀请链接生成中…"
            placeholderTextColor={theme.textSecondary}
            selectTextOnFocus
            style={[styles.linkInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            value={inviteLink}
          />
          <Pressable
            accessibilityLabel={copyFeedback === "copied" ? "邀请链接已复制" : "复制邀请链接"}
            accessibilityRole="button"
            accessibilityState={{ disabled: !inviteLink }}
            disabled={!inviteLink}
            onPress={() => void handleCopy()}
            style={({ pressed }) => [
              styles.copyButton,
              {
                backgroundColor: copyFeedback === "copied" ? theme.successMuted : theme.accentMuted,
                opacity: !inviteLink ? 0.5 : pressed ? 0.72 : 1,
              },
            ]}
          >
            {inviteCodeQuery.isFetching
              ? <ActivityIndicator color={theme.accent} size="small" />
              : copyFeedback === "copied"
                ? <Check color={theme.success} size={16} weight="bold" />
                : <Copy color={theme.accent} size={16} />}
            <ThemedText type="smallBold" style={{ color: copyFeedback === "copied" ? theme.success : theme.accent }}>
              {copyFeedback === "copied" ? "已复制" : "复制"}
            </ThemedText>
          </Pressable>
        </View>
        {inviteCodeQuery.isError
          ? <ThemedText accessibilityRole="alert" style={[styles.feedback, { color: theme.danger }]}>{inviteCodeQuery.error.message}</ThemedText>
          : null}
        {copyFeedback === "failed"
          ? <ThemedText accessibilityRole="alert" style={[styles.feedback, { color: theme.danger }]}>复制邀请链接失败。</ThemedText>
          : null}
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.sectionTitle}>
          <Info color={theme.accent} size={18} />
          <ThemedText type="smallBold">有效期</ThemedText>
        </View>
        {editingDuration
          ? (
              <View style={styles.durationRow}>
                <TextInput
                  accessibilityLabel="邀请链接有效期（天）"
                  keyboardType="number-pad"
                  maxLength={3}
                  onChangeText={setDurationInput}
                  onSubmitEditing={handleApplyDuration}
                  placeholder="天数"
                  placeholderTextColor={theme.textSecondary}
                  selectTextOnFocus
                  style={[styles.durationInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                  value={durationInput}
                />
                <Pressable
                  accessibilityLabel="完成有效期编辑"
                  accessibilityRole="button"
                  onPress={handleApplyDuration}
                  style={[styles.copyButton, { backgroundColor: theme.accent }]}
                >
                  <ThemedText type="smallBold" style={{ color: "#fff" }}>完成</ThemedText>
                </Pressable>
              </View>
            )
          : (
              <Pressable
                accessibilityLabel={`编辑邀请链接有效期，当前 ${duration} 天`}
                accessibilityRole="button"
                onPress={() => setEditingDuration(true)}
                style={[styles.secondaryButton, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">{`${duration} 天 · 编辑有效期`}</ThemedText>
              </Pressable>
            )}
      </View>
    </View>
  );
}
