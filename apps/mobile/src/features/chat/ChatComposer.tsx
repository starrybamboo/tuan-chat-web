import type { CommandInfo } from "@tuanchat/domain/command-request";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { IconProps } from "phosphor-react-native";
import type { ComponentType } from "react";

import { ImageSquare, PaperPlaneTilt, Smiley, X, XCircle } from "phosphor-react-native";
import { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import type { MobileMessageAttachment, MobileMessageAttachmentKind } from "@/features/messages/mobileMessageAttachment";
import type { MobileMessageMode } from "@/features/messages/mobileMessageComposer";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import {
  MOBILE_MESSAGE_ATTACHMENT_KIND,
} from "@/features/messages/mobileMessageAttachment";
import {
  MOBILE_MESSAGE_MODE,
} from "@/features/messages/mobileMessageComposer";
import { useTheme } from "@/hooks/use-theme";
import { COMPOSER_MAX_HEIGHT, COMPOSER_MIN_HEIGHT } from "@/lib/layout-constants";
import { avatarThumbUrl } from "@/lib/media-url";

import { formatUnreadBadgeCount } from "./clueUnread";
import { getMessagePreview } from "./mobileChatUtils";
import { MobileCommandPanel } from "./MobileCommandPanel";

const MENTION_LIST_MAX_HEIGHT = 180;

const styles = StyleSheet.create({
  composerWrapper: {
    position: "relative",
  },
  mentionList: {
    borderRadius: Radius.md,
    left: Spacing.md,
    maxHeight: MENTION_LIST_MAX_HEIGHT,
    position: "absolute",
    right: Spacing.md,
    bottom: "100%",
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  mentionItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  mentionAvatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  mentionAvatarText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  container: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  replyBar: {
    alignItems: "center",
    borderLeftWidth: 3,
    borderRadius: Radius.sm,
    flexDirection: "row",
    gap: Spacing.md,
    marginHorizontal: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  replyText: { flex: 1 },
  attachmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginHorizontal: Spacing.sm,
  },
  attachmentChip: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  roleIdInput: {
    borderRadius: Radius.full,
    fontSize: 13,
    minWidth: 104,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  toolbarRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  toolButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 40,
    justifyContent: "center",
    position: "relative",
    width: 40,
  },
  toolButtonBadge: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 4,
    position: "absolute",
    right: 1,
    top: 1,
  },
  toolButtonBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 20,
    maxHeight: COMPOSER_MAX_HEIGHT,
    minHeight: COMPOSER_MIN_HEIGHT,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingTop: 10,
  },
  sendButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  roleButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  roleButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];
const mentionRoleKeyExtractor = (item: UserRole) => String(item.roleId);

function getMentionRoleColor(roleId: number) {
  return AVATAR_COLORS[roleId % AVATAR_COLORS.length];
}

/**
 * Extract the text after the last "@" in the draft to use as a mention filter query.
 * Returns null if there's no active mention trigger.
 */
function getMentionQuery(text: string): string | null {
  const lastAtIndex = text.lastIndexOf("@");
  if (lastAtIndex === -1)
    return null;
  // Only trigger if "@" is at the start or preceded by a space/newline
  if (lastAtIndex > 0 && !/\s/.test(text[lastAtIndex - 1]))
    return null;
  const query = text.slice(lastAtIndex + 1);
  // Don't show mention list if there's a space after the query (user finished typing)
  if (query.includes(" "))
    return null;
  return query;
}

type ChatComposerProps = {
  anchorMessage: Message | null;
  availableRoles?: UserRole[];
  canUseAttachments: boolean;
  canUseExpressionPicker?: boolean;
  currentRole: UserRole | null;
  currentAvatarFileId?: number;
  draftMessage: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  messageAttachments: MobileMessageAttachment[];
  messageMode: MobileMessageMode;
  onChangeDraftMessage: (v: string) => void;
  onClearAnchor: () => void;
  onClearAttachments: () => void;
  onOpenExpressionPicker?: () => void;
  onOpenRoleSwitch: () => void;
  onPickAttachment: (kind: MobileMessageAttachmentKind) => void;
  onRemoveAttachment: (id: string) => void;
  onSend: () => void;
  roomName?: string | null;
  ruleId?: number | null;
  safeAreaBottomInset?: number;
  shortcutActions?: readonly ChatComposerShortcutAction[];
};

export type ChatComposerShortcutAction = {
  Icon: ComponentType<IconProps>;
  accessibilityLabel: string;
  badgeCount?: number;
  onPress: () => void;
};

function ChatComposerInner({
  anchorMessage,
  availableRoles,
  canUseAttachments,
  canUseExpressionPicker = false,
  currentRole,
  currentAvatarFileId,
  draftMessage,
  errorMessage,
  isSubmitting,
  messageAttachments,
  messageMode,
  onChangeDraftMessage,
  onClearAnchor,
  onClearAttachments,
  onOpenExpressionPicker,
  onOpenRoleSwitch,
  onPickAttachment,
  onRemoveAttachment,
  onSend,
  roomName,
  ruleId,
  safeAreaBottomInset = 0,
  shortcutActions,
}: ChatComposerProps) {
  const theme = useTheme();
  const [inputHeight, setInputHeight] = useState(COMPOSER_MIN_HEIGHT);

  const canSend = draftMessage.trim().length > 0 || messageAttachments.length > 0;
  const inputPlaceholder = messageMode === MOBILE_MESSAGE_MODE.TEXT
    ? `给 #${roomName ?? "频道"}...`
    : "输入先攻指令，例如 .ri";

  // @mention logic
  const mentionQuery = getMentionQuery(draftMessage);
  const showMentionList = mentionQuery !== null && (availableRoles?.length ?? 0) > 0;

  const filteredMentionRoles = useMemo(() => {
    if (mentionQuery === null || !availableRoles)
      return [];
    if (mentionQuery === "")
      return availableRoles;
    const q = mentionQuery.toLowerCase();
    return availableRoles.filter(
      r => (r.roleName ?? "").toLowerCase().includes(q),
    );
  }, [mentionQuery, availableRoles]);

  const handleSelectMention = useCallback((role: UserRole) => {
    const lastAtIndex = draftMessage.lastIndexOf("@");
    const before = draftMessage.slice(0, lastAtIndex);
    const roleName = role.roleName ?? `角色#${role.roleId}`;
    onChangeDraftMessage(`${before}@${roleName} `);
  }, [draftMessage, onChangeDraftMessage]);

  const handleSelectCommand = useCallback((cmd: CommandInfo) => {
    setInputHeight(COMPOSER_MIN_HEIGHT);
    onChangeDraftMessage(`.${cmd.name} `);
  }, [onChangeDraftMessage]);

  const handleChangeMessageText = useCallback((nextText: string) => {
    if (nextText.length < draftMessage.length) {
      setInputHeight(COMPOSER_MIN_HEIGHT);
    }
    onChangeDraftMessage(nextText);
  }, [draftMessage.length, onChangeDraftMessage]);

  const resolvedInputHeight = draftMessage.length === 0 ? COMPOSER_MIN_HEIGHT : inputHeight;
  const renderMentionRole = useCallback(({ item }: { item: UserRole }) => (
    <Pressable
      onPress={() => handleSelectMention(item)}
      style={({ pressed }) => [styles.mentionItem, pressed && { backgroundColor: theme.backgroundElement }]}
    >
      {item.avatarFileId
        ? (
            <CachedImage uri={avatarThumbUrl(item.avatarFileId)} style={styles.mentionAvatar} />
          )
        : (
            <View style={[styles.mentionAvatar, { backgroundColor: getMentionRoleColor(item.roleId) }]}>
              <ThemedText style={styles.mentionAvatarText}>
                {(item.roleName ?? "").slice(0, 1) || "R"}
              </ThemedText>
            </View>
          )}
      <ThemedText type="small">{item.roleName ?? `角色 #${item.roleId}`}</ThemedText>
    </Pressable>
  ), [handleSelectMention, theme.backgroundElement]);

  const handleContentSizeChange = useCallback((event: { nativeEvent: { contentSize: { height: number } } }) => {
    const nextHeight = Math.min(Math.max(event.nativeEvent.contentSize.height, COMPOSER_MIN_HEIGHT), COMPOSER_MAX_HEIGHT);
    setInputHeight(prev => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const handlePickImageAttachment = useCallback(() => {
    onPickAttachment(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE);
  }, [onPickAttachment]);

  return (
    <View style={styles.composerWrapper}>
      {showMentionList && filteredMentionRoles.length > 0
        ? (
            <FlatList
              data={filteredMentionRoles}
              keyExtractor={mentionRoleKeyExtractor}
              keyboardShouldPersistTaps="handled"
              style={[styles.mentionList, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
              renderItem={renderMentionRole}
            />
          )
        : null}

      {!showMentionList && messageMode === MOBILE_MESSAGE_MODE.TEXT
        ? (
            <MobileCommandPanel
              draftMessage={draftMessage}
              onSelectCommand={handleSelectCommand}
              ruleId={ruleId ?? null}
            />
          )
        : null}

      <View style={[styles.container, { paddingBottom: Spacing.md + safeAreaBottomInset }]}>
        {anchorMessage
          ? (
              <View style={[styles.replyBar, { backgroundColor: theme.accentMuted, borderLeftColor: theme.accent }]}>
                <ThemedText type="small" style={styles.replyText} numberOfLines={1}>
                  回复
                  {" "}
                  {getMessagePreview(anchorMessage)}
                </ThemedText>
                <Pressable onPress={onClearAnchor}>
                  <X size={14} color={theme.textSecondary} />
                </Pressable>
              </View>
            )
          : null}

        {messageAttachments.length > 0
          ? (
              <View style={styles.attachmentRow}>
                {messageAttachments.map(a => (
                  <View key={a.id} style={[styles.attachmentChip, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="caption" numberOfLines={1}>{a.fileName}</ThemedText>
                    <Pressable onPress={() => onRemoveAttachment(a.id)}>
                      <XCircle size={14} color={theme.textSecondary} weight="fill" />
                    </Pressable>
                  </View>
                ))}
                <Pressable onPress={onClearAttachments} style={[styles.attachmentChip, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="caption" style={{ color: theme.danger }}>清空</ThemedText>
                </Pressable>
              </View>
            )
          : null}

        <View style={styles.inputRow}>
          <TextInput
            editable={!isSubmitting}
            multiline
            onChangeText={handleChangeMessageText}
            onContentSizeChange={handleContentSizeChange}
            placeholder={inputPlaceholder}
            placeholderTextColor={theme.textSecondary}
            scrollEnabled={resolvedInputHeight >= COMPOSER_MAX_HEIGHT}
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
                height: resolvedInputHeight,
                textAlignVertical: "top",
              },
            ]}
            value={draftMessage}
          />

          <View>
            <Pressable
              disabled={isSubmitting || !canSend}
              onPress={onSend}
              style={styles.sendButton}
            >
              <PaperPlaneTilt color={canSend ? theme.accent : theme.textSecondary} size={24} weight="fill" />
            </Pressable>
          </View>
        </View>

        <View style={styles.toolbarRow}>
          {canUseAttachments
            ? (
                <Pressable
                  disabled={isSubmitting}
                  onPress={handlePickImageAttachment}
                  style={styles.toolButton}
                >
                  <ImageSquare size={20} color={theme.textSecondary} />
                </Pressable>
              )
            : null}

          {canUseExpressionPicker && onOpenExpressionPicker
            ? (
                <Pressable disabled={isSubmitting} onPress={onOpenExpressionPicker} style={styles.toolButton}>
                  <Smiley size={20} color={theme.textSecondary} />
                </Pressable>
              )
            : null}

          {shortcutActions?.map((action) => {
            const badgeCount = action.badgeCount ?? 0;
            return (
              <Pressable
                key={action.accessibilityLabel}
                accessibilityLabel={action.accessibilityLabel}
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={action.onPress}
                style={styles.toolButton}
              >
                <action.Icon color={theme.textSecondary} size={20} />
                {badgeCount > 0
                  ? (
                      <View style={[styles.toolButtonBadge, { backgroundColor: theme.danger }]}>
                        <ThemedText style={styles.toolButtonBadgeText}>
                          {formatUnreadBadgeCount(badgeCount)}
                        </ThemedText>
                      </View>
                    )
                  : null}
              </Pressable>
            );
          })}

          <View style={{ flex: 1 }} />

          <Pressable onPress={onOpenRoleSwitch} style={styles.toolButton}>
            {(() => {
              const displayAvatarFileId = currentAvatarFileId ?? currentRole?.avatarFileId;
              return displayAvatarFileId
                ? (
                    <CachedImage uri={avatarThumbUrl(displayAvatarFileId)} style={styles.roleButton} />
                  )
                : (
                    <View style={[styles.roleButton, { backgroundColor: currentRole ? "#8b5cf6" : "#6366f1" }]}>
                      <ThemedText style={styles.roleButtonText}>
                        {currentRole ? (currentRole.roleName ?? "").slice(0, 1) || "R" : "旁"}
                      </ThemedText>
                    </View>
                  );
            })()}
          </Pressable>
        </View>

        {errorMessage
          ? (
              <ThemedText style={{ color: theme.danger, fontSize: 12, marginHorizontal: Spacing.sm }}>{errorMessage}</ThemedText>
            )
          : null}
      </View>
    </View>
  );
}

export const ChatComposer = memo(ChatComposerInner);
