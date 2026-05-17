import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { DIRECT_MESSAGE_READ_LINE_TYPE, buildDirectMessageSendRequestsFromUploadedMedia, getDirectMessagePreviewText, isDirectReadLineMessage, mergeDirectMessages } from "@tuanchat/domain/direct-message";
import { getFileMessageExtra, getImageMessageExtra, getSoundMessageExtra, getVideoMessageExtra } from "@tuanchat/domain/message-extra";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { DmMessageActionMenu, type DmMessageAction } from "@/features/friends/DmMessageActionMenu";
import { mergePickedMessageAttachments, pickMobileMessageAttachments, type MobileMessageAttachment, type MobileMessageAttachmentKind, MOBILE_MESSAGE_ATTACHMENT_KIND } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { MobileMessageMediaPreview } from "@/features/messages/MobileMessageMediaPreview";
import { useRecallDirectMessageMutation, useUpdateDirectReadPositionMutation } from "@tuanchat/query/direct-message";
import { mobileApiClient } from "@/lib/api";
import * as Clipboard from "@/lib/clipboard";
import { useTheme } from "@/hooks/use-theme";

import { useSendDmMutation } from "./useSendDmMutation";
import { getErrorMessage } from "../chat/mobileChatUtils";

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerMeta: { flex: 1, gap: 2 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  row: { marginBottom: Spacing.md },
  bubble: {
    borderRadius: Radius.lg,
    maxWidth: "84%",
    minWidth: 84,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bubbleMedia: {
    borderRadius: Radius.lg,
    height: 180,
    overflow: "hidden",
    width: 180,
  },
  bubbleMediaImage: {
    height: "100%",
    width: "100%",
  },
  time: {
    fontSize: 11,
    marginTop: 4,
  },
  replyBar: {
    alignItems: "center",
    borderLeftWidth: 3,
    borderRadius: Radius.sm,
    flexDirection: "row",
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  replyText: { flex: 1 },
  attachmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  attachmentChip: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  toolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  toolChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  inputRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  input: {
    borderRadius: 20,
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  sendBtn: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },
});

interface DmChatViewProps {
  contactId: number;
  contactName: string;
  currentUserId: number | null;
  messages: MessageDirectResponse[];
  onBack: () => void;
  onOpenProfile?: () => void;
}

function formatMessageTimeLabel(createTime?: string | null) {
  if (!createTime) {
    return "";
  }
  const parsed = new Date(createTime);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

type DirectMessageRenderContent =
  | { kind: "media"; text: string }
  | { kind: "text"; text: string };

function getDirectMessageContent(message: MessageDirectResponse): DirectMessageRenderContent {
  if (message.status === 1) {
    return { kind: "text" as const, text: "消息已撤回" };
  }

  if (message.messageType === 2) {
    const image = getImageMessageExtra(message.extra);
    return image?.fileId
      ? { kind: "media" as const, text: message.content?.trim() || getDirectMessagePreviewText(message) }
      : { kind: "text" as const, text: getDirectMessagePreviewText(message) };
  }

  if (message.messageType === 14) {
    const video = getVideoMessageExtra(message.extra);
    return { kind: "media" as const, text: video?.fileName?.trim() || "视频消息" };
  }

  if (message.messageType === 3) {
    const file = getFileMessageExtra(message.extra);
    return { kind: "media" as const, text: file?.fileName?.trim() || "文件消息" };
  }

  if (message.messageType === 7) {
    const sound = getSoundMessageExtra(message.extra);
    return { kind: "media" as const, text: sound?.fileName?.trim() || "语音消息" };
  }

  return { kind: "text" as const, text: message.content?.trim() || getDirectMessagePreviewText(message) };
}

export function DmChatView({ contactId, contactName, currentUserId, messages, onBack, onOpenProfile }: DmChatViewProps) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList<MessageDirectResponse>>(null);
  const readSyncRef = useRef(0);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<MobileMessageAttachment[]>([]);
  const [replyMessage, setReplyMessage] = useState<MessageDirectResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [actionMenuMessage, setActionMenuMessage] = useState<MessageDirectResponse | null>(null);

  const sendMutation = useSendDmMutation(currentUserId);
  const recallMutation = useRecallDirectMessageMutation(mobileApiClient, currentUserId);
  const updateReadPositionMutation = useUpdateDirectReadPositionMutation(mobileApiClient);

  const mergedMessages = useMemo(() => {
    return mergeDirectMessages(messages);
  }, [messages]);

  const sortedMessages = useMemo(() => {
    return mergedMessages.filter((message) => !isDirectReadLineMessage(message));
  }, [mergedMessages]);

  const latestIncomingSync = useMemo(() => {
    return sortedMessages.reduce((max, message) => {
      if (message.senderId === contactId && message.status !== 1) {
        return Math.max(max, message.syncId ?? 0);
      }
      return max;
    }, 0);
  }, [contactId, sortedMessages]);

  const currentReadSync = useMemo(() => {
    return mergedMessages.reduce((max, message) => {
      if (message.senderId === currentUserId && message.messageType === DIRECT_MESSAGE_READ_LINE_TYPE) {
        return Math.max(max, message.syncId ?? 0);
      }
      return max;
    }, 0);
  }, [currentUserId, mergedMessages]);

  useEffect(() => {
    setDraft("");
    setAttachments([]);
    setReplyMessage(null);
    setErrorMessage(null);
    setActionMenuMessage(null);
    readSyncRef.current = 0;
  }, [contactId]);

  useEffect(() => {
    if (!contactId || latestIncomingSync <= 0) {
      return;
    }

    const effectiveReadSync = Math.max(currentReadSync, readSyncRef.current);
    if (latestIncomingSync <= effectiveReadSync) {
      return;
    }

    readSyncRef.current = latestIncomingSync;
    updateReadPositionMutation.mutate(contactId, {
      onError: () => {
        readSyncRef.current = effectiveReadSync;
      },
    });
  }, [contactId, currentReadSync, latestIncomingSync, updateReadPositionMutation]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text && attachments.length === 0) {
      return;
    }

    setErrorMessage(null);
    setIsSending(true);
    try {
      const uploaded = attachments.length > 0
        ? await uploadMobileMessageAttachments(mobileApiClient, attachments)
        : null;
      const requests = buildDirectMessageSendRequestsFromUploadedMedia({
        inputText: draft,
        receiverId: contactId,
        replyMessageId: replyMessage?.messageId,
        uploadedFiles: uploaded?.uploadedFiles ?? [],
        uploadedImages: uploaded?.uploadedImages ?? [],
        uploadedSoundMessage: uploaded?.uploadedSoundMessage ?? null,
        uploadedVideos: uploaded?.uploadedVideos ?? [],
      });

      if (requests.length === 0) {
        throw new Error("消息内容不能为空。");
      }

      for (const request of requests) {
        await sendMutation.mutateAsync(request);
      }

      setDraft("");
      setAttachments([]);
      setReplyMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "发送私聊消息失败。"));
    } finally {
      setIsSending(false);
    }
  }, [attachments, contactId, draft, replyMessage?.messageId, sendMutation]);

  const handlePickAttachments = useCallback(async (kind: MobileMessageAttachmentKind) => {
    setErrorMessage(null);
    try {
      const picked = await pickMobileMessageAttachments(kind);
      if (picked.length === 0) {
        return;
      }
      setAttachments((current) => mergePickedMessageAttachments(current, picked));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "选择附件失败。"));
    }
  }, []);

  const handleMessageAction = useCallback(async (action: DmMessageAction, message: MessageDirectResponse) => {
    if (action === "reply") {
      setReplyMessage(message);
      return;
    }

    if (action === "copy") {
      if (message.content?.trim()) {
        await Clipboard.setStringAsync(message.content.trim());
      }
      return;
    }

    if (action === "recall") {
      const messageId = message.messageId;
      if (typeof messageId !== "number") {
        return;
      }

      Alert.alert("撤回消息", "确定要撤回这条消息吗？", [
        { text: "取消", style: "cancel" },
        {
          text: "撤回",
          style: "destructive",
          onPress: () => {
            void recallMutation.mutateAsync({ messageId }).catch((error) => {
              setErrorMessage(getErrorMessage(error, "撤回失败。"));
            });
          },
        },
      ]);
    }
  }, [recallMutation]);

  const canSend = (draft.trim().length > 0 || attachments.length > 0) && !isSending;

  const renderItem = useCallback(({ item }: { item: MessageDirectResponse }) => {
    const isMine = item.senderId === currentUserId;
    const content = getDirectMessageContent(item);

    return (
      <View style={[styles.row, { alignItems: isMine ? "flex-end" : "flex-start" }]}>
        <Pressable
          onLongPress={() => setActionMenuMessage(item)}
          style={[
            styles.bubble,
            {
              backgroundColor: item.status === 1
                ? theme.backgroundSelected
                : isMine ? theme.accent : theme.backgroundElement,
            },
          ]}
        >
          {content.kind === "media" ? (
            <MobileMessageMediaPreview
              compact
              content={item.content}
              extra={item.extra}
              messageType={item.messageType}
            />
          ) : (
            <ThemedText style={{ color: isMine && item.status !== 1 ? "#fff" : theme.text, fontSize: 15 }}>
              {content.text}
            </ThemedText>
          )}
        </Pressable>
        <ThemedText themeColor="textSecondary" style={[styles.time, { color: theme.textSecondary }]}>
          {formatMessageTimeLabel(item.createTime)}
        </ThemedText>
      </View>
    );
  }, [currentUserId, theme]);

  const attachmentKinds = [
    { label: "图片", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE },
    { label: "视频", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO },
    { label: "文件", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.FILE },
    { label: "音频", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={onBack}>
          <SymbolView name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }} size={20} tintColor={theme.text} />
        </Pressable>
        <Pressable style={styles.headerMeta} onPress={onOpenProfile}>
          <ThemedText type="heading" numberOfLines={1}>{contactName}</ThemedText>
          <ThemedText themeColor="textSecondary" type="caption">
            {sortedMessages.length} 条消息
          </ThemedText>
        </Pressable>
      </View>

      {replyMessage ? (
        <View style={[styles.replyBar, { backgroundColor: theme.accentMuted, borderLeftColor: theme.accent }]}>
          <ThemedText type="small" style={styles.replyText} numberOfLines={1}>
            回复 {getDirectMessagePreviewText(replyMessage)}
          </ThemedText>
          <Pressable onPress={() => setReplyMessage(null)}>
            <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} size={14} tintColor={theme.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      {attachments.length > 0 ? (
        <View style={styles.attachmentRow}>
          {attachments.map((attachment) => (
            <View key={attachment.id} style={[styles.attachmentChip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="caption" numberOfLines={1}>{attachment.fileName}</ThemedText>
              <Pressable onPress={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}>
                <SymbolView name={{ ios: "xmark.circle.fill", android: "cancel", web: "close" }} size={14} tintColor={theme.textSecondary} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => setAttachments([])} style={[styles.attachmentChip, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="caption" style={{ color: theme.danger }}>清空</ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.toolRow}>
        {attachmentKinds.map((item) => (
          <Pressable
            key={item.kind}
            disabled={isSending}
            onPress={() => void handlePickAttachments(item.kind)}
            style={[styles.toolChip, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <ThemedText type="caption" themeColor="textSecondary">{item.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={sortedMessages}
        keyExtractor={(item) => String(item.messageId ?? `${item.syncId}-${item.createTime}`)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <ThemedText themeColor="textSecondary">暂无私聊消息</ThemedText>
          </View>
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        style={styles.list}
      />

      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
        <TextInput
          multiline
          value={draft}
          onChangeText={setDraft}
          placeholder={`给 ${contactName}...`}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
        <Pressable
          disabled={!canSend}
          onPress={() => void handleSend()}
          style={[styles.sendBtn, { backgroundColor: canSend ? theme.accent : "transparent" }]}
        >
          {isSending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <SymbolView name={{ ios: "arrow.up", android: "arrow_upward", web: "arrow_upward" }} size={16} tintColor={canSend ? "#fff" : theme.textSecondary} weight="bold" />
          )}
        </Pressable>
      </View>

      {errorMessage ? (
        <ThemedText style={{ color: theme.danger, fontSize: 12, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm }}>
          {errorMessage}
        </ThemedText>
      ) : null}

      <DmMessageActionMenu
        currentUserId={currentUserId}
        message={actionMenuMessage}
        onAction={(action, message) => void handleMessageAction(action, message)}
        onClose={() => setActionMenuMessage(null)}
        visible={actionMenuMessage !== null}
      />
    </View>
  );
}
