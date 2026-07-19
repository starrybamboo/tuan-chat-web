import type { CommandInfo } from "@tuanchat/domain/command-request";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { IconProps } from "phosphor-react-native";
import type { ComponentType } from "react";

import { FlashList } from "@shopify/flash-list";
import { CaretDown, ImageSquare, PaperPlaneTilt, PencilSimple, Smiley, X, XCircle } from "phosphor-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import * as DropdownMenu from "zeego/dropdown-menu";

import type { MobilePokeComposerTarget } from "@/features/chat/mobilePokeTemplateStorage";
import type { MobileChatStatusType } from "@/features/messages/mobileChatStatus";
import type { MobileMessageAttachment, MobileMessageAttachmentKind } from "@/features/messages/mobileMessageAttachment";
import type { MobileMessageMode } from "@/features/messages/mobileMessageComposer";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { resolveComposerInputHeight } from "@/features/messages/mobileComposerLayout";
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
const COMPOSER_INPUT_PADDING_TOP = 10;
const COMPOSER_INPUT_PADDING_BOTTOM = Spacing.sm;

const CHAT_STATUS_OPTIONS: Array<{
  description: string;
  label: string;
  value: MobileChatStatusType;
}> = [
  { description: "清除正在输入", label: "空闲", value: "idle" },
  { description: "标记正在输入", label: "输入中", value: "input" },
  { description: "等待他人行动", label: "等待扮演", value: "wait" },
  { description: "临时离开", label: "暂离", value: "leave" },
];

export type MobileVisibleChatStatus = {
  description: string;
  label: string;
  status: Exclude<MobileChatStatusType, "idle">;
  userId: number;
};

function resolveChatStatusTone(status: MobileChatStatusType, theme: ReturnType<typeof useTheme>) {
  switch (status) {
    case "input":
      return { color: theme.accent };
    case "wait":
      return { color: theme.warning };
    case "leave":
      return { color: theme.danger };
    case "idle":
    default:
      return { color: theme.textSecondary };
  }
}

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
  editBar: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.md,
    marginHorizontal: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  editIcon: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  editText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  editTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  editPreview: {
    fontSize: 12,
    lineHeight: 15,
  },
  attachmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginHorizontal: Spacing.sm,
  },
  chatStatusBar: { marginHorizontal: Spacing.sm },
  chatStatusContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  chatStatusInlineText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  chatStatusSeparator: {
    fontSize: 12,
    lineHeight: 16,
    marginHorizontal: Spacing.xs,
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
    alignItems: "flex-end",
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
    paddingBottom: COMPOSER_INPUT_PADDING_BOTTOM,
    paddingTop: COMPOSER_INPUT_PADDING_TOP,
  },
  sendButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  statusTriggerButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    height: 32,
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    width: 78,
  },
  statusTriggerLabel: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 14,
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
  commandPanelMaxHeight?: number;
  currentRole: UserRole | null;
  currentRoleId?: number;
  currentAvatarFileId?: number;
  draftMessage: string;
  editingMessage?: Message | null;
  errorMessage: string | null;
  isSubmitting: boolean;
  messageAttachments: MobileMessageAttachment[];
  messageMode: MobileMessageMode;
  pokeTarget?: MobilePokeComposerTarget | null;
  myChatStatus?: MobileChatStatusType;
  otherChatStatuses?: readonly MobileVisibleChatStatus[];
  onChangeDraftMessage: (v: string) => void;
  onChangeChatStatus?: (status: MobileChatStatusType) => void;
  onClearAnchor: () => void;
  onCancelEdit?: () => void;
  onClearAttachments: () => void;
  onOpenExpressionPicker?: () => void;
  onOpenRoleSwitch: () => void;
  onPickAttachment: (kind: MobileMessageAttachmentKind) => void;
  onCancelPoke?: () => void;
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
  commandPanelMaxHeight,
  currentRole,
  currentRoleId,
  currentAvatarFileId,
  draftMessage,
  editingMessage,
  errorMessage,
  isSubmitting,
  messageAttachments,
  messageMode,
  pokeTarget,
  myChatStatus = "idle",
  otherChatStatuses = [],
  onChangeDraftMessage,
  onChangeChatStatus,
  onClearAnchor,
  onCancelEdit,
  onClearAttachments,
  onOpenExpressionPicker,
  onOpenRoleSwitch,
  onPickAttachment,
  onCancelPoke,
  onRemoveAttachment,
  onSend,
  roomName,
  ruleId,
  safeAreaBottomInset = 0,
  shortcutActions,
}: ChatComposerProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState(COMPOSER_MIN_HEIGHT);
  const [composerHeight, setComposerHeight] = useState(0);

  const canSend = draftMessage.trim().length > 0 || messageAttachments.length > 0;
  const currentStatusOption = CHAT_STATUS_OPTIONS.find(option => option.value === myChatStatus) ?? CHAT_STATUS_OPTIONS[0];
  const currentStatusTone = resolveChatStatusTone(myChatStatus, theme);
  const visibleOtherChatStatuses = useMemo(() => otherChatStatuses, [otherChatStatuses]);
  const inputPlaceholder = pokeTarget
    ? "输入戳一戳正文"
    : messageMode === MOBILE_MESSAGE_MODE.TEXT
    ? `给 #${roomName ?? "频道"}...`
    : "输入先攻指令，例如 .ri";

  useEffect(() => {
    if (!pokeTarget) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [pokeTarget]);

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
  const resolvedCommandPanelMaxHeight = useMemo(() => {
    if (typeof commandPanelMaxHeight !== "number" || !Number.isFinite(commandPanelMaxHeight)) {
      return undefined;
    }
    return Math.max(0, commandPanelMaxHeight - composerHeight);
  }, [commandPanelMaxHeight, composerHeight]);

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
    const nextHeight = resolveComposerInputHeight(event.nativeEvent.contentSize.height);
    setInputHeight(nextHeight);
  }, []);

  const handleComposerLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setComposerHeight(nextHeight);
  }, []);

  const handlePickImageAttachment = useCallback(() => {
    onPickAttachment(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE);
  }, [onPickAttachment]);

  const handleSelectChatStatus = useCallback((status: MobileChatStatusType) => {
    onChangeChatStatus?.(status);
  }, [onChangeChatStatus]);

  return (
    <View style={[styles.composerWrapper, { backgroundColor: theme.background }]}>
      {showMentionList && filteredMentionRoles.length > 0
        ? (
            <FlashList
              data={filteredMentionRoles}
              keyExtractor={mentionRoleKeyExtractor}
              keyboardShouldPersistTaps="handled"
              style={[styles.mentionList, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
              renderItem={renderMentionRole}
            />
          )
        : null}

      {!pokeTarget && !showMentionList && messageMode === MOBILE_MESSAGE_MODE.TEXT
        ? (
            <MobileCommandPanel
              maxHeight={resolvedCommandPanelMaxHeight}
              draftMessage={draftMessage}
              onSelectCommand={handleSelectCommand}
              ruleId={ruleId ?? null}
            />
          )
        : null}

      <View onLayout={handleComposerLayout} style={[styles.container, { paddingBottom: Spacing.md + safeAreaBottomInset }]}>
        {visibleOtherChatStatuses.length > 0
          ? (
              <ScrollView
                horizontal
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                style={styles.chatStatusBar}
                contentContainerStyle={styles.chatStatusContent}
              >
                {visibleOtherChatStatuses.map((item) => {
                  const tone = resolveChatStatusTone(item.status, theme);
                  const statusLabel = item.description;
                  return (
                    <View key={`${item.userId}:${item.status}`} style={styles.chatStatusContent}>
                      <ThemedText
                        numberOfLines={1}
                        style={[styles.chatStatusInlineText, { color: tone.color }]}
                      >
                        {`${item.label} ${statusLabel}`}
                      </ThemedText>
                      <ThemedText style={[styles.chatStatusSeparator, { color: theme.textSecondary }]}>/</ThemedText>
                    </View>
                  );
                })}
              </ScrollView>
            )
          : null}

        {editingMessage
          ? (
              <View
                style={[
                  styles.editBar,
                  {
                    backgroundColor: "rgba(210, 153, 34, 0.16)",
                    borderColor: theme.warning,
                  },
                ]}
              >
                <View style={[styles.editIcon, { backgroundColor: theme.warning }]}>
                  <PencilSimple size={14} color="#fff" weight="bold" />
                </View>
                <View style={styles.editText}>
                  <ThemedText style={[styles.editTitle, { color: theme.warning }]}>
                    正在编辑消息
                  </ThemedText>
                  <ThemedText style={[styles.editPreview, { color: theme.textSecondary }]} numberOfLines={1}>
                    {getMessagePreview(editingMessage)}
                  </ThemedText>
                </View>
                {onCancelEdit
                  ? (
                      <Pressable
                        accessibilityLabel="取消编辑消息"
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={onCancelEdit}
                      >
                        <X size={16} color={theme.textSecondary} />
                      </Pressable>
                    )
                  : null}
              </View>
            )
          : null}

        {pokeTarget
          ? (
              <View style={[styles.replyBar, { backgroundColor: theme.accentMuted, borderLeftColor: theme.accent }]}>
                <ThemedText type="small" style={styles.replyText} numberOfLines={1}>
                  戳一戳
                  {" · "}
                  {pokeTarget.initiatorRoleName}
                  {" → "}
                  {pokeTarget.targetRoleName}
                </ThemedText>
                <Pressable
                  accessibilityLabel="取消戳一戳"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onCancelPoke}
                >
                  <X size={14} color={theme.textSecondary} />
                </Pressable>
              </View>
            )
          : anchorMessage
          ? (
              <View style={[styles.replyBar, { backgroundColor: theme.accentMuted, borderLeftColor: theme.accent }]}>
                <ThemedText type="small" style={styles.replyText} numberOfLines={1}>
                  回复
                  {" "}
                  {getMessagePreview(anchorMessage)}
                </ThemedText>
                <Pressable
                  accessibilityLabel="取消回复"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onClearAnchor}
                >
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
                    <Pressable
                      accessibilityLabel={`移除附件 ${a.fileName}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => onRemoveAttachment(a.id)}
                    >
                      <XCircle size={14} color={theme.textSecondary} weight="fill" />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  accessibilityLabel="清空附件"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onClearAttachments}
                  style={[styles.attachmentChip, { backgroundColor: theme.backgroundElement }]}
                >
                  <ThemedText type="caption" style={{ color: theme.danger }}>清空</ThemedText>
                </Pressable>
              </View>
            )
          : null}

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
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
            accessibilityLabel={messageMode === MOBILE_MESSAGE_MODE.TEXT ? "输入群聊消息" : "输入先攻指令"}
            value={draftMessage}
          />

          <View>
            <Pressable
              disabled={isSubmitting || !canSend}
              onPress={onSend}
              style={styles.sendButton}
              accessibilityLabel="发送消息"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting || !canSend }}
            >
              <PaperPlaneTilt color={canSend ? theme.accent : theme.textSecondary} size={24} weight="fill" />
            </Pressable>
          </View>
        </View>

        <View style={styles.toolbarRow}>
          {canUseAttachments && !pokeTarget
            ? (
                <Pressable
                  accessibilityLabel="添加图片附件"
                  accessibilityRole="button"
                  onPress={handlePickImageAttachment}
                  style={styles.toolButton}
                >
                  <ImageSquare size={20} color={theme.textSecondary} />
                </Pressable>
              )
            : null}

          {canUseExpressionPicker && onOpenExpressionPicker
            ? (
                <Pressable
                  accessibilityLabel="打开表情面板"
                  accessibilityRole="button"
                  onPress={onOpenExpressionPicker}
                  style={styles.toolButton}
                >
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

          {onChangeChatStatus
            ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <Pressable
                      accessibilityLabel="切换聊天状态"
                      accessibilityRole="button"
                      style={styles.statusTriggerButton}
                    >
                      <ThemedText
                        style={[
                          styles.statusTriggerLabel,
                          { color: currentStatusTone.color },
                        ]}
                      >
                        {currentStatusOption.label}
                      </ThemedText>
                      <CaretDown
                        color={currentStatusTone.color}
                        size={12}
                      />
                    </Pressable>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    {CHAT_STATUS_OPTIONS.map(option => (
                      <DropdownMenu.Item
                        key={option.value}
                        onSelect={() => handleSelectChatStatus(option.value)}
                        textValue={option.label}
                      >
                        <DropdownMenu.ItemTitle>{option.label}</DropdownMenu.ItemTitle>
                        <DropdownMenu.ItemSubtitle>
                          {option.value === myChatStatus ? `当前状态 · ${option.description}` : option.description}
                        </DropdownMenu.ItemSubtitle>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )
            : null}

          <Pressable
            accessibilityLabel={currentRole?.roleName?.trim()
              ? `当前角色 ${currentRole.roleName.trim()}，切换发言角色`
              : "当前为旁白，切换发言角色"}
            accessibilityRole="button"
            onPress={onOpenRoleSwitch}
            style={styles.toolButton}
          >
            {(() => {
              const displayAvatarFileId = currentAvatarFileId ?? currentRole?.avatarFileId;
              const isNarrator = typeof currentRoleId === "number" && currentRoleId < 0;
              return displayAvatarFileId
                ? (
                    <CachedImage uri={avatarThumbUrl(displayAvatarFileId)} style={styles.roleButton} />
                  )
                : (
                    <View style={[styles.roleButton, { backgroundColor: currentRole ? "#8b5cf6" : isNarrator ? "#6366f1" : "#64748b" }]}>
                      <ThemedText style={styles.roleButtonText}>
                        {currentRole ? (currentRole.roleName ?? "").slice(0, 1) || "R" : isNarrator ? "旁" : "角"}
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
