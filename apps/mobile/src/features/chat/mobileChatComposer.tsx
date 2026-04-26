import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { MessageSubmitPhase } from "./mobileChatUtils";
import type {
  MobileMessageAttachment,
  MobileMessageAttachmentKind,
} from "@/features/messages/mobileMessageAttachment";
import type { MobileMessageMode } from "@/features/messages/mobileMessageComposer";

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import {
  getMobileMessageAttachmentKindLabel,
  MOBILE_MESSAGE_ATTACHMENT_KIND,
} from "@/features/messages/mobileMessageAttachment";
import {
  getMobileMessageInputPlaceholder,
  getMobileMessageModeHint,
  getMobileMessageModeLabel,
  getMobileMessageSubmitLabel,
  MOBILE_MESSAGE_MODE,
} from "@/features/messages/mobileMessageComposer";

import { useTheme } from "@/hooks/use-theme";
import {
  getMessageAttachmentMetaText,
  getMessagePreview,
  getMessageSubmitPhaseText,

} from "./mobileChatUtils";

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  statusRow: {
    gap: Spacing.one,
  },
  modeRow: {
    marginHorizontal: -Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  modeRowContent: {
    gap: Spacing.two,
  },
  modeChip: {
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  anchorCard: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 102,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    textAlignVertical: "top",
  },
  roleInput: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  attachmentActionRow: {
    marginHorizontal: -Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  attachmentActionContent: {
    gap: Spacing.two,
  },
  actionChip: {
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  attachmentList: {
    gap: Spacing.two,
  },
  attachmentItem: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  attachmentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  attachmentBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  sendButton: {
    alignItems: "center",
    borderRadius: Spacing.three,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  sendButtonText: {
    color: "#ffffff",
  },
  errorText: {
    color: "#c0392b",
  },
});

interface MobileChatComposerProps {
  anchorMessage: Message | null;
  canUseAttachments: boolean;
  draftMessage: string;
  draftRoleIdInput: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  messageAttachments: MobileMessageAttachment[];
  messageMode: MobileMessageMode;
  onChangeDraftMessage: (nextValue: string) => void;
  onChangeDraftRoleIdInput: (nextValue: string) => void;
  onChangeMessageMode: (nextValue: MobileMessageMode) => void;
  onClearAnchor: () => void;
  onClearAttachments: () => void;
  onPickAttachment: (kind: MobileMessageAttachmentKind) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSend: () => void;
  submitPhase: MessageSubmitPhase;
}

function ComposerActionChip({
  disabled,
  label,
  onPress,
  selected,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionChip,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.background,
          borderColor: selected ? theme.text : theme.backgroundSelected,
          borderWidth: 1,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

export function MobileChatComposer({
  anchorMessage,
  canUseAttachments,
  draftMessage,
  draftRoleIdInput,
  errorMessage,
  isSubmitting,
  messageAttachments,
  messageMode,
  onChangeDraftMessage,
  onChangeDraftRoleIdInput,
  onChangeMessageMode,
  onClearAnchor,
  onClearAttachments,
  onPickAttachment,
  onRemoveAttachment,
  onSend,
  submitPhase,
}: MobileChatComposerProps) {
  const theme = useTheme();
  const statusText = getMessageSubmitPhaseText(submitPhase);

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={styles.statusRow}>
        <ThemedText type="smallBold">消息发送</ThemedText>
        <ThemedText themeColor="textSecondary">{getMobileMessageModeHint(messageMode)}</ThemedText>
        {statusText ? <ThemedText themeColor="textSecondary">{statusText}</ThemedText> : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.modeRow}
        contentContainerStyle={styles.modeRowContent}
      >
        {[
          MOBILE_MESSAGE_MODE.TEXT,
          MOBILE_MESSAGE_MODE.COMMAND_REQUEST,
          MOBILE_MESSAGE_MODE.STATE_EVENT,
        ].map(mode => (
          <ComposerActionChip
            key={mode}
            disabled={isSubmitting}
            label={getMobileMessageModeLabel(mode)}
            onPress={() => onChangeMessageMode(mode)}
            selected={mode === messageMode}
          />
        ))}
      </ScrollView>

      {anchorMessage
        ? (
            <ThemedView type="backgroundSelected" style={styles.anchorCard}>
              <ThemedText type="smallBold">
                回复锚点 · 消息 #
                {anchorMessage.messageId ?? "-"}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{getMessagePreview(anchorMessage)}</ThemedText>
              <ComposerActionChip disabled={isSubmitting} label="清空锚点" onPress={onClearAnchor} />
            </ThemedView>
          )
        : null}

      <TextInput
        editable={!isSubmitting}
        multiline
        onChangeText={onChangeDraftMessage}
        placeholder={getMobileMessageInputPlaceholder(messageMode)}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            borderColor: theme.backgroundSelected,
            color: theme.text,
          },
        ]}
        value={draftMessage}
      />

      <TextInput
        editable={!isSubmitting}
        keyboardType="number-pad"
        onChangeText={onChangeDraftRoleIdInput}
        placeholder="角色 ID（可选，.st 常用）"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.roleInput,
          {
            borderColor: theme.backgroundSelected,
            color: theme.text,
          },
        ]}
        value={draftRoleIdInput}
      />

      {canUseAttachments
        ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.attachmentActionRow}
                contentContainerStyle={styles.attachmentActionContent}
              >
                <ComposerActionChip
                  disabled={isSubmitting}
                  label="文件"
                  onPress={() => onPickAttachment(MOBILE_MESSAGE_ATTACHMENT_KIND.FILE)}
                />
                <ComposerActionChip
                  disabled={isSubmitting}
                  label="图片"
                  onPress={() => onPickAttachment(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE)}
                />
                <ComposerActionChip
                  disabled={isSubmitting}
                  label="视频"
                  onPress={() => onPickAttachment(MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO)}
                />
                <ComposerActionChip
                  disabled={isSubmitting}
                  label="音频"
                  onPress={() => onPickAttachment(MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO)}
                />
                {messageAttachments.length > 0
                  ? (
                      <ComposerActionChip
                        disabled={isSubmitting}
                        label="清空附件"
                        onPress={onClearAttachments}
                      />
                    )
                  : null}
              </ScrollView>

              {messageAttachments.length > 0
                ? (
                    <View style={styles.attachmentList}>
                      {messageAttachments.map(attachment => (
                        <ThemedView
                          key={attachment.id}
                          type="backgroundSelected"
                          style={styles.attachmentItem}
                        >
                          <View style={styles.attachmentHeader}>
                            <ThemedText numberOfLines={1} type="smallBold">
                              {attachment.fileName}
                            </ThemedText>
                            <ThemedView type="background" style={styles.attachmentBadge}>
                              <ThemedText type="small">
                                {getMobileMessageAttachmentKindLabel(attachment.kind)}
                              </ThemedText>
                            </ThemedView>
                          </View>
                          <ThemedText themeColor="textSecondary">
                            {getMessageAttachmentMetaText(attachment)}
                          </ThemedText>
                          <ComposerActionChip
                            disabled={isSubmitting}
                            label="移除"
                            onPress={() => onRemoveAttachment(attachment.id)}
                          />
                        </ThemedView>
                      ))}
                    </View>
                  )
                : null}
            </>
          )
        : null}

      {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}

      <Pressable
        disabled={isSubmitting}
        onPress={onSend}
        style={[
          styles.sendButton,
          {
            backgroundColor: theme.text,
            opacity: isSubmitting ? 0.72 : 1,
          },
        ]}
      >
        {isSubmitting
          ? <ActivityIndicator color={theme.background} />
          : <ThemedText style={styles.sendButtonText}>{getMobileMessageSubmitLabel(messageMode)}</ThemedText>}
      </Pressable>
    </ThemedView>
  );
}
