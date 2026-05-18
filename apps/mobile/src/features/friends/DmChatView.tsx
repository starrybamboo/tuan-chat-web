import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { DIRECT_MESSAGE_READ_LINE_TYPE, buildDirectMessageSendRequestsFromUploadedMedia, getDirectMessagePreviewText, isDirectReadLineMessage, mergeDirectMessages } from "@tuanchat/domain/direct-message";
import { getFileMessageExtra, getImageMessageExtra, getSoundMessageExtra, getVideoMessageExtra } from "@tuanchat/domain/message-extra";
import { ArrowUp, CaretLeft, Check, Checks, Warning, X, XCircle } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";

import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { DmMessageActionMenu, type DmMessageAction } from "@/features/friends/DmMessageActionMenu";
import { mergePickedMessageAttachments, pickMobileMessageAttachments, type MobileMessageAttachment, type MobileMessageAttachmentKind, MOBILE_MESSAGE_ATTACHMENT_KIND } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { MobileMessageMediaPreview } from "@/features/messages/MobileMessageMediaPreview";
import { useRecallDirectMessageMutation, useUpdateDirectReadPositionMutation } from "@tuanchat/query/direct-message";
import { mobileApiClient } from "@/lib/api";
import * as Clipboard from "@/lib/clipboard";
import { avatarThumbUrl } from "@/lib/media-url";
import { useTheme } from "@/hooks/use-theme";

import { useSendDmMutation } from "./useSendDmMutation";
import { getErrorMessage } from "../chat/mobileChatUtils";

const PAGE_SIZE = 30;

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
  headerAvatar: {
    borderRadius: Radius.full,
    height: 36,
    width: 36,
  },
  headerAvatarFallback: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  dateSeparator: {
    alignItems: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  row: { flexDirection: "row", marginBottom: Spacing.md },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start", gap: Spacing.sm },
  messageAvatar: {
    borderRadius: Radius.full,
    height: 28,
    width: 28,
    marginTop: 2,
  },
  messageAvatarFallback: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 28,
    justifyContent: "center",
    marginTop: 2,
    width: 28,
  },
  bubbleWrapper: { maxWidth: "78%" },
  bubble: {
    borderRadius: Radius.lg,
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
  messageFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  time: {
    fontSize: 11,
  },
  statusIcon: {
    marginLeft: 2,
  },
  replyBar: {
    alignItems: "center",
    borderLeftWidth: 3,
    borderRadius: Radius.sm,
    flexDirection: "row",
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  replyText: { flex: 1 },
  attachmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  attachmentChip: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  errorBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  toolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
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
    height: 36,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 0,
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
  newMessagesPill: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: Radius.full,
    bottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    position: "absolute",
  },
});

interface DmChatViewProps {
  contactId: number;
  contactName: string;
  contactAvatarFileId?: number;
  currentUserId: number | null;
  messages: MessageDirectResponse[];
  onBack: () => void;
  onOpenProfile?: () => void;
}

function formatMessageTimeLabel(createTime?: string | null) {
  if (!createTime) return "";
  const parsed = new Date(createTime);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(createTime: string): string {
  const date = new Date(createTime);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - target.getTime();
  const dayMs = 86400000;
  if (diff < dayMs) return "今天";
  if (diff < dayMs * 2) return "昨天";
  if (diff < dayMs * 7) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return weekdays[date.getDay()];
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

type DirectMessageRenderContent =
  | { kind: "media"; text: string }
  | { kind: "text"; text: string };

function getDirectMessageContent(message: MessageDirectResponse): DirectMessageRenderContent {
  if (message.status === 1) {
    return { kind: "text", text: "消息已撤回" };
  }

  if (message.messageType === 2) {
    const image = getImageMessageExtra(message.extra);
    return image?.fileId
      ? { kind: "media", text: message.content?.trim() || getDirectMessagePreviewText(message) }
      : { kind: "text", text: getDirectMessagePreviewText(message) };
  }

  if (message.messageType === 14) {
    const video = getVideoMessageExtra(message.extra);
    return { kind: "media", text: video?.fileName?.trim() || "视频消息" };
  }

  if (message.messageType === 3) {
    const file = getFileMessageExtra(message.extra);
    return { kind: "media", text: file?.fileName?.trim() || "文件消息" };
  }

  if (message.messageType === 7) {
    const sound = getSoundMessageExtra(message.extra);
    return { kind: "media", text: sound?.fileName?.trim() || "语音消息" };
  }

  return { kind: "text", text: message.content?.trim() || getDirectMessagePreviewText(message) };
}

type MessageSendStatus = "sending" | "sent" | "delivered" | "failed";

export function DmChatView({ contactId, contactName, contactAvatarFileId, currentUserId, messages, onBack, onOpenProfile }: DmChatViewProps) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList<MessageDirectResponse>>(null);
  const readSyncRef = useRef(0);
  const needsInitialScrollRef = useRef(true);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<MobileMessageAttachment[]>([]);
  const [replyMessage, setReplyMessage] = useState<MessageDirectResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [actionMenuMessage, setActionMenuMessage] = useState<MessageDirectResponse | null>(null);
  const [pendingMessageIds, setPendingMessageIds] = useState<Set<number>>(new Set());
  const [failedMessageIds, setFailedMessageIds] = useState<Set<number>>(new Set());
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sendMutation = useSendDmMutation(currentUserId);
  const recallMutation = useRecallDirectMessageMutation(mobileApiClient, currentUserId);
  const updateReadPositionMutation = useUpdateDirectReadPositionMutation(mobileApiClient);

  const mergedMessages = useMemo(() => {
    return mergeDirectMessages(messages);
  }, [messages]);

  const sortedMessages = useMemo(() => {
    return mergedMessages.filter((message) => !isDirectReadLineMessage(message));
  }, [mergedMessages]);

  const paginatedMessages = useMemo(() => {
    const total = sortedMessages.length;
    const start = Math.max(0, total - visibleCount);
    return sortedMessages.slice(start);
  }, [sortedMessages, visibleCount]);

  const hasMoreMessages = visibleCount < sortedMessages.length;

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
    setPendingMessageIds(new Set());
    setFailedMessageIds(new Set());
    setIsAtBottom(true);
    setVisibleCount(PAGE_SIZE);
    readSyncRef.current = 0;
    needsInitialScrollRef.current = true;
  }, [contactId]);

  useEffect(() => {
    if (!contactId || latestIncomingSync <= 0) return;
    const effectiveReadSync = Math.max(currentReadSync, readSyncRef.current);
    if (latestIncomingSync <= effectiveReadSync) return;
    readSyncRef.current = latestIncomingSync;
    updateReadPositionMutation.mutate(contactId, {
      onError: () => { readSyncRef.current = effectiveReadSync; },
    });
  }, [contactId, currentReadSync, latestIncomingSync, updateReadPositionMutation]);

  useEffect(() => {
    if (isAtBottom && flatListRef.current && paginatedMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [paginatedMessages.length, isAtBottom]);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setIsAtBottom(distanceFromBottom < 50);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMoreMessages) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  }, [hasMoreMessages]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text && attachments.length === 0) return;

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
      setIsAtBottom(true);
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
      if (picked.length === 0) return;
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
      if (typeof messageId !== "number") return;

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

  const getMessageStatus = useCallback((message: MessageDirectResponse): MessageSendStatus | null => {
    if (message.senderId !== currentUserId) return null;
    if (message.status === 1) return null;
    const msgId = message.messageId;
    if (typeof msgId === "number" && failedMessageIds.has(msgId)) return "failed";
    if (typeof msgId === "number" && pendingMessageIds.has(msgId)) return "sending";
    return "sent";
  }, [currentUserId, failedMessageIds, pendingMessageIds]);

  const canSend = (draft.trim().length > 0 || attachments.length > 0) && !isSending;
  const contactAvatarUrl = avatarThumbUrl(contactAvatarFileId);

  const renderItem = useCallback(({ item, index }: { item: MessageDirectResponse; index: number }) => {
    const isMine = item.senderId === currentUserId;
    const content = getDirectMessageContent(item);
    const status = getMessageStatus(item);

    const showDateSeparator = index === 0 || !isSameDay(item.createTime, paginatedMessages[index - 1]?.createTime);

    return (
      <View>
        {showDateSeparator && item.createTime ? (
          <View style={styles.dateSeparator}>
            <ThemedText themeColor="textSecondary" type="caption">
              {formatDateSeparator(item.createTime)}
            </ThemedText>
          </View>
        ) : null}
        <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
          {!isMine ? (
            contactAvatarUrl ? (
              <Image source={{ uri: contactAvatarUrl }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatarFallback, { backgroundColor: theme.accent }]}>
                <ThemedText style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                  {(contactName ?? "").slice(0, 1) || "U"}
                </ThemedText>
              </View>
            )
          ) : null}
          <View style={styles.bubbleWrapper}>
            <Pressable
              onLongPress={item.status !== 1 ? () => setActionMenuMessage(item) : undefined}
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
            <View style={[styles.messageFooter, { justifyContent: isMine ? "flex-end" : "flex-start" }]}>
              <ThemedText themeColor="textSecondary" style={styles.time}>
                {formatMessageTimeLabel(item.createTime)}
              </ThemedText>
              {isMine && status ? (
                <View style={styles.statusIcon}>
                  {status === "sending" ? (
                    <ActivityIndicator size={10} color={theme.textSecondary} />
                  ) : status === "failed" ? (
                    <Warning size={12} color={theme.danger} weight="fill" />
                  ) : status === "delivered" ? (
                    <Checks size={12} color={theme.accent} />
                  ) : (
                    <Check size={12} color={theme.textSecondary} />
                  )}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }, [currentUserId, theme, contactAvatarUrl, contactName, getMessageStatus, paginatedMessages]);

  const attachmentKinds = [
    { label: "图片", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE },
    { label: "视频", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO },
    { label: "文件", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.FILE },
    { label: "音频", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={onBack} accessibilityLabel="返回" accessibilityRole="button">
          <CaretLeft size={20} color={theme.text} weight="bold" />
        </Pressable>
        {contactAvatarUrl ? (
          <Image source={{ uri: contactAvatarUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatarFallback, { backgroundColor: theme.accent }]}>
            <ThemedText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
              {(contactName ?? "").slice(0, 1) || "U"}
            </ThemedText>
          </View>
        )}
        <Pressable style={styles.headerMeta} onPress={onOpenProfile} accessibilityLabel={`查看 ${contactName} 的资料`}>
          <ThemedText type="heading" numberOfLines={1}>{contactName}</ThemedText>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={paginatedMessages}
        keyExtractor={(item) => String(item.messageId ?? `${item.syncId}-${item.createTime}`)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={hasMoreMessages ? (
          <Pressable onPress={handleLoadMore} style={{ alignItems: "center", paddingVertical: Spacing.md }}>
            <ThemedText themeColor="accent" type="caption">加载更多消息</ThemedText>
          </Pressable>
        ) : null}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <ThemedText themeColor="textSecondary">暂无私聊消息</ThemedText>
          </View>
        )}
        onScroll={handleScroll}
        onContentSizeChange={() => {
          if (needsInitialScrollRef.current && paginatedMessages.length > 0) {
            needsInitialScrollRef.current = false;
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        scrollEventThrottle={100}
        style={styles.list}
      />

      {!isAtBottom && paginatedMessages.length > 0 ? (
        <Pressable
          onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
          style={[styles.newMessagesPill, { backgroundColor: theme.accent }]}
        >
          <ThemedText style={{ color: "#fff", fontSize: 12 }}>新消息</ThemedText>
        </Pressable>
      ) : null}

      {replyMessage ? (
        <View style={[styles.replyBar, { backgroundColor: theme.accentMuted, borderLeftColor: theme.accent }]}>
          <ThemedText type="small" style={styles.replyText} numberOfLines={1}>
            回复 {getDirectMessagePreviewText(replyMessage)}
          </ThemedText>
          <Pressable onPress={() => setReplyMessage(null)} accessibilityLabel="取消回复">
            <X size={14} color={theme.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      {attachments.length > 0 ? (
        <View style={styles.attachmentRow}>
          {attachments.map((attachment) => (
            <View key={attachment.id} style={[styles.attachmentChip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="caption" numberOfLines={1}>{attachment.fileName}</ThemedText>
              <Pressable onPress={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}>
                <XCircle size={14} color={theme.textSecondary} weight="fill" />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => setAttachments([])} style={[styles.attachmentChip, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="caption" style={{ color: theme.danger }}>清空</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBar}>
          <Warning size={14} color={theme.danger} />
          <ThemedText style={{ color: theme.danger, fontSize: 12, flex: 1 }}>
            {errorMessage}
          </ThemedText>
          <Pressable onPress={() => setErrorMessage(null)}>
            <X size={12} color={theme.danger} />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.inputRow, { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: theme.surface }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`给 ${contactName}...`}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          accessibilityLabel="输入消息"
          returnKeyType="send"
          onSubmitEditing={() => { if (canSend) void handleSend(); }}
        />
        <Pressable
          disabled={!canSend}
          onPress={() => void handleSend()}
          style={[styles.sendBtn, { backgroundColor: canSend ? theme.accent : "transparent" }]}
          accessibilityLabel="发送消息"
          accessibilityRole="button"
        >
          {isSending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ArrowUp size={16} color={canSend ? "#fff" : theme.textSecondary} weight="bold" />
          )}
        </Pressable>
      </View>

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
