import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { MessageSubmitPhase } from "./mobileChatUtils";
import type { MobileMessageAttachment, MobileMessageAttachmentKind } from "@/features/messages/mobileMessageAttachment";
import type { MobileMessageMode } from "@/features/messages/mobileMessageComposer";

import { Checkerboard, ImageSquare, PaperPlaneTilt, Pulse, Smiley, Sword, X, XCircle } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import {
  MOBILE_MESSAGE_ATTACHMENT_KIND,
} from "@/features/messages/mobileMessageAttachment";
import {
  getMobileMessageInputPlaceholder,
  MOBILE_MESSAGE_MODE,
} from "@/features/messages/mobileMessageComposer";
import { useTheme } from "@/hooks/use-theme";
import { SPRING_SNAPPY } from "@/lib/animations";
import { COMPOSER_MAX_HEIGHT, COMPOSER_MIN_HEIGHT } from "@/lib/layout-constants";
import { avatarThumbUrl } from "@/lib/media-url";

import { getMessagePreview } from "./mobileChatUtils";

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
    width: 40,
  },
  input: {
    borderRadius: 22,
    flex: 1,
    fontSize: 15,
    maxHeight: COMPOSER_MAX_HEIGHT,
    minHeight: COMPOSER_MIN_HEIGHT,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
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

interface ChatComposerProps {
  anchorMessage: Message | null;
  availableRoles?: UserRole[];
  canUseAttachments: boolean;
  canUseExpressionPicker?: boolean;
  currentRole: UserRole | null;
  currentAvatarFileId?: number;
  draftMessage: string;
  draftRoleIdInput: string;
  errorMessage: string | null;
  isInitiativeMode: boolean;
  isSubmitting: boolean;
  isStateMode: boolean;
  messageAttachments: MobileMessageAttachment[];
  messageMode: MobileMessageMode;
  onChangeDraftMessage: (v: string) => void;
  onChangeDraftRoleIdInput: (v: string) => void;
  onClearAnchor: () => void;
  onClearAttachments: () => void;
  onOpenExpressionPicker?: () => void;
  onOpenInitiative: () => void;
  onOpenMap: () => void;
  onOpenRoleSwitch: () => void;
  onOpenState: () => void;
  onPickAttachment: (kind: MobileMessageAttachmentKind) => void;
  onRemoveAttachment: (id: string) => void;
  onSend: () => void;
  roomName?: string | null;
  submitPhase: MessageSubmitPhase;
}

export function ChatComposer({
  anchorMessage,
  availableRoles,
  canUseAttachments,
  canUseExpressionPicker = false,
  currentRole,
  currentAvatarFileId,
  draftMessage,
  draftRoleIdInput,
  errorMessage,
  isInitiativeMode,
  isSubmitting,
  isStateMode,
  messageAttachments,
  messageMode,
  onChangeDraftMessage,
  onChangeDraftRoleIdInput,
  onClearAnchor,
  onClearAttachments,
  onOpenExpressionPicker,
  onOpenInitiative,
  onOpenMap,
  onOpenRoleSwitch,
  onOpenState,
  onPickAttachment,
  onRemoveAttachment,
  onSend,
  roomName,
  submitPhase,
}: ChatComposerProps) {
  const theme = useTheme();
  const [inputHeight, setInputHeight] = useState(COMPOSER_MIN_HEIGHT);

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isSubmitting ? 0.85 : 1, SPRING_SNAPPY) }],
    opacity: withSpring(isSubmitting ? 0.6 : 1, SPRING_SNAPPY),
  }));

  const canSend = draftMessage.trim().length > 0 || messageAttachments.length > 0;
  const inputPlaceholder = messageMode === MOBILE_MESSAGE_MODE.TEXT
    ? `给 #${roomName ?? "频道"}...`
    : getMobileMessageInputPlaceholder(messageMode);

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

  const handleSelectMention = (role: UserRole) => {
    const lastAtIndex = draftMessage.lastIndexOf("@");
    const before = draftMessage.slice(0, lastAtIndex);
    const roleName = role.roleName ?? `角色#${role.roleId}`;
    onChangeDraftMessage(`${before}@${roleName} `);
  };

  const handleChangeMessageText = (nextText: string) => {
    // 删除换行或大段文本时，先回到最小高度，再等待 contentSize 重新测量，
    // 避免 TextInput 保持旧高度不收缩。
    if (nextText.length < draftMessage.length) {
      setInputHeight(COMPOSER_MIN_HEIGHT);
    }
    onChangeDraftMessage(nextText);
  };

  return (
    <View style={styles.composerWrapper}>
      {showMentionList && filteredMentionRoles.length > 0
        ? (
            <FlatList
              data={filteredMentionRoles}
              keyExtractor={item => String(item.roleId)}
              keyboardShouldPersistTaps="handled"
              style={[styles.mentionList, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectMention(item)}
                  style={({ pressed }) => [styles.mentionItem, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  {item.avatarFileId
                    ? (
                        <Image source={{ uri: avatarThumbUrl(item.avatarFileId) }} style={styles.mentionAvatar} />
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
              )}
            />
          )
        : null}

      <View style={styles.container}>
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
            onContentSizeChange={(e) => {
              const h = e.nativeEvent.contentSize.height;
              setInputHeight(Math.min(Math.max(h, COMPOSER_MIN_HEIGHT), COMPOSER_MAX_HEIGHT));
            }}
            placeholder={inputPlaceholder}
            placeholderTextColor={theme.textSecondary}
            scrollEnabled={inputHeight >= COMPOSER_MAX_HEIGHT}
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                color: theme.text,
                height: inputHeight,
                textAlignVertical: inputHeight > COMPOSER_MIN_HEIGHT ? "top" : "center",
              },
            ]}
            value={draftMessage}
          />

          <Animated.View style={sendButtonStyle}>
            <Pressable
              disabled={isSubmitting || !canSend}
              onPress={onSend}
              style={styles.sendButton}
            >
              {isSubmitting
                ? <ActivityIndicator color={theme.accent} size="small" />
                : <PaperPlaneTilt color={canSend ? theme.accent : theme.textSecondary} size={24} weight="fill" />}
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.toolbarRow}>
          {canUseAttachments
            ? (
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => onPickAttachment(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE)}
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

          <Pressable
            disabled={isSubmitting}
            onPress={onOpenInitiative}
            style={styles.toolButton}
          >
            <Sword
              color={isInitiativeMode ? theme.accent : theme.textSecondary}
              size={20}
              weight="regular"
            />
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={onOpenMap}
            style={styles.toolButton}
          >
            <Checkerboard color={theme.textSecondary} size={20} weight="regular" />
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={onOpenState}
            style={styles.toolButton}
          >
            <Pulse
              color={isStateMode ? theme.accent : theme.textSecondary}
              size={20}
              weight="regular"
            />
          </Pressable>

          {messageMode === MOBILE_MESSAGE_MODE.STATE_EVENT
            ? (
                <TextInput
                  editable={!isSubmitting}
                  keyboardType="number-pad"
                  onChangeText={onChangeDraftRoleIdInput}
                  placeholder="角色 ID"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.roleIdInput,
                    {
                      backgroundColor: theme.surface,
                      color: theme.text,
                    },
                  ]}
                  value={draftRoleIdInput}
                />
              )
            : null}

          <View style={{ flex: 1 }} />

          <Pressable onPress={onOpenRoleSwitch} style={styles.toolButton}>
            {(() => {
              const displayAvatarFileId = currentAvatarFileId ?? currentRole?.avatarFileId;
              return displayAvatarFileId
                ? (
                    <Image source={{ uri: avatarThumbUrl(displayAvatarFileId) }} style={styles.roleButton} />
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

        {submitPhase === "uploading"
          ? (
              <ThemedText type="caption" themeColor="textSecondary" style={{ marginHorizontal: Spacing.sm }}>
                正在上传附件...
              </ThemedText>
            )
          : null}

        {errorMessage
          ? (
              <ThemedText style={{ color: theme.danger, fontSize: 12, marginHorizontal: Spacing.sm }}>{errorMessage}</ThemedText>
            )
          : null}
      </View>
    </View>
  );
}
