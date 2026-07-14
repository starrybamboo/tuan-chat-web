import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { useQueryClient } from "@tanstack/react-query";
import { buildDirectMessageSendRequestsFromUploadedMedia, DIRECT_MESSAGE_READ_LINE_TYPE, findDirectReplyMessage, getDirectMessagePreviewText, mergeDirectMessages } from "@tuanchat/domain/direct-message";
import { getFileMessageExtra, getImageMessageExtra, getSoundMessageExtra, getVideoMessageExtra } from "@tuanchat/domain/message-extra";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { getDirectInboxQueryKey } from "@tuanchat/query/direct-message";
import { CaretLeft, PaperPlaneTilt, Warning, X, XCircle } from "phosphor-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, InteractionManager, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import type { DmMessageAction } from "@/features/friends/DmMessageActionMenu";
import type { MobileMessageAttachment, MobileMessageAttachmentKind } from "@/features/messages/mobileMessageAttachment";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { resolveBottomThresholdTransition } from "@/features/chat/messageListScrollState";
import { DmMessageActionMenu } from "@/features/friends/DmMessageActionMenu";
import { resolveInternalMessageMediaFileId } from "@/features/messages/messageMediaSource";
import { resolveComposerInputHeight } from "@/features/messages/mobileComposerLayout";
import { mergePickedMessageAttachments, MOBILE_MESSAGE_ATTACHMENT_KIND, pickMobileMessageAttachments } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { MobileMessageMediaPreview } from "@/features/messages/MobileMessageMediaPreview";
import { useTheme } from "@/hooks/use-theme";
import { SPRING_SNAPPY } from "@/lib/animations";
import { mobileApiClient } from "@/lib/api";
import * as Clipboard from "@/lib/clipboard";
import { COMPOSER_MAX_HEIGHT, COMPOSER_MIN_HEIGHT } from "@/lib/layout-constants";
import { avatarThumbUrl } from "@/lib/media-url";

import { getErrorMessage } from "../chat/mobileChatUtils";
import { getVisibleDirectMessageTimeline, selectDirectMessagePage } from "./dmChatViewModel";
import {
  isMobileFailedDirectMessage,
  isMobileOptimisticDirectMessage,
  removeMobileLocalDirectMessageData,
} from "./mobileDirectMessageOptimistic";
import { useRecallDmMutation, useSendDmMutation, useUpdateDmReadPositionMutation } from "./useSendDmMutation";

const PAGE_SIZE = 30;
const DM_INITIAL_RENDER_COUNT = 16;
const DM_RENDER_BATCH_SIZE = 12;
const DM_WINDOW_SIZE = 9;
const DM_LIST_MAINTAIN_VISIBLE_POSITION = { minIndexForVisible: 0 };
const DM_KEYBOARD_LAYOUT_SETTLE_MS = 320;
const DM_CHAT_VIEW_DEBUG_ENABLED = false;
const DM_CHAT_VIEW_DEBUG_PREFIX = "[DmChatView]";
const COMPOSER_INPUT_PADDING_TOP = 10;
const COMPOSER_INPUT_PADDING_BOTTOM = Spacing.sm;
const EMPTY_DIRECT_MESSAGES: MessageDirectResponse[] = [];

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
  bubbleWrapperSending: {
    opacity: 0.88,
    transform: [{ translateY: 1 }, { scale: 0.995 }],
  },
  bubble: {
    borderRadius: Radius.lg,
    minWidth: 84,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bubbleReplyPreview: {
    borderLeftWidth: 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  bubbleReplyTitle: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 1,
  },
  bubbleReplyText: {
    fontSize: 12,
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
  failedStatusPill: {
    alignItems: "center",
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  failedRemoveButton: {
    marginLeft: 1,
    padding: 2,
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
  errorBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.sm,
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
  composerContainer: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  inputRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: Spacing.sm,
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
  sendBtn: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
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

type DmChatViewProps = {
  contactId: number;
  contactName: string;
  contactAvatarFileId?: number;
  currentUserId: number | null;
  messages: MessageDirectResponse[];
  onBack: () => void;
  onOpenContactDrawer: () => void;
  safeAreaBottomInset?: number;
};

function formatMessageTimeLabel(createTime?: string | null) {
  if (!createTime)
    return "";
  const parsed = new Date(createTime);
  if (Number.isNaN(parsed.getTime()))
    return "";
  return parsed.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(createTime: string): string {
  const date = new Date(createTime);
  if (Number.isNaN(date.getTime()))
    return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - target.getTime();
  const dayMs = 86400000;
  if (diff < dayMs)
    return "今天";
  if (diff < dayMs * 2)
    return "昨天";
  if (diff < dayMs * 7) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return weekdays[date.getDay()];
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b)
    return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function getDirectMessageListItemKey(message: MessageDirectResponse, index: number): string {
  if (typeof message.messageId === "number" && Number.isFinite(message.messageId)) {
    return `message:${message.messageId}`;
  }
  if (typeof message.syncId === "number" && Number.isFinite(message.syncId)) {
    return `sync:${message.syncId}`;
  }
  const fallbackParts = [
    message.senderId,
    message.receiverId,
    message.createTime,
    message.messageType,
    message.content?.slice(0, 24),
    index,
  ];
  return `fallback:${fallbackParts.map(value => value ?? "").join(":")}`;
}

function summarizeDirectMessageForDebug(message?: MessageDirectResponse | null) {
  if (!message) {
    return null;
  }

  return {
    content: message.content?.slice(0, 24) ?? null,
    createTime: message.createTime ?? null,
    messageId: message.messageId ?? null,
    messageType: message.messageType ?? null,
    receiverId: message.receiverId ?? null,
    senderId: message.senderId ?? null,
    syncId: message.syncId ?? null,
  };
}

function logDmChatViewDebug(event: string, detail: Record<string, unknown>) {
  if (!DM_CHAT_VIEW_DEBUG_ENABLED || !__DEV__) {
    return;
  }
  // eslint-disable-next-line no-console -- development-only diagnostics for direct message rendering.
  console.debug(DM_CHAT_VIEW_DEBUG_PREFIX, event, detail);
}

type DirectMessageRenderContent
  = | { kind: "media"; text: string }
    | { kind: "text"; text: string };

function getDirectMessageContent(message: MessageDirectResponse): DirectMessageRenderContent {
  if (message.status === 1) {
    return { kind: "text", text: "消息已撤回" };
  }

  if (message.messageType === 2) {
    const image = getImageMessageExtra(message.extra);
    return resolveInternalMessageMediaFileId(image)
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

type MessageSendStatus = "sending" | "failed";

function DmChatViewInner({ contactId, contactName, contactAvatarFileId, currentUserId, messages, onBack, onOpenContactDrawer, safeAreaBottomInset = 0 }: DmChatViewProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList<MessageDirectResponse>>(null);
  const readSyncRef = useRef(0);
  const [draft, setDraft] = useState("");
  const [inputHeight, setInputHeight] = useState(COMPOSER_MIN_HEIGHT);
  const [attachments, setAttachments] = useState<MobileMessageAttachment[]>([]);
  const [replyMessage, setReplyMessage] = useState<MessageDirectResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const sendInFlightRef = useRef(false);
  const scrollDebugCountRef = useRef(0);
  const previousPaginatedLengthRef = useRef<number | null>(null);
  const keyboardLayoutGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardLayoutGuardActiveRef = useRef(false);
  const wasAtBottomBeforeKeyboardRef = useRef(true);
  const [actionMenuMessage, setActionMenuMessage] = useState<MessageDirectResponse | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [failedMessageIds, setFailedMessageIds] = useState<Set<number>>(() => new Set());
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [contentReady, setContentReady] = useState(false);
  const contentMountFrameRef = useRef<number | null>(null);
  const contentMountTaskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const sendMutation = useSendDmMutation(currentUserId);
  const recallMutation = useRecallDmMutation(currentUserId);
  const updateReadPositionMutation = useUpdateDmReadPositionMutation(currentUserId);

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isSending ? 0.85 : 1, SPRING_SNAPPY) }],
    opacity: withSpring(isSending ? 0.6 : 1, SPRING_SNAPPY),
  }));

  const renderMessages = contentReady ? messages : EMPTY_DIRECT_MESSAGES;

  const mergedMessages = useMemo(() => {
    return mergeDirectMessages(renderMessages);
  }, [renderMessages]);

  const visibleTimelineMessages = useMemo(() => {
    return getVisibleDirectMessageTimeline(mergedMessages);
  }, [mergedMessages]);

  const paginatedMessages = useMemo(() => {
    return selectDirectMessagePage(visibleTimelineMessages, visibleCount);
  }, [visibleTimelineMessages, visibleCount]);

  const invertedMessages = useMemo(() => {
    return [...paginatedMessages].reverse();
  }, [paginatedMessages]);

  const hasMoreMessages = visibleCount < visibleTimelineMessages.length;

  const latestIncomingSync = useMemo(() => {
    return visibleTimelineMessages.reduce((max, message) => {
      if (message.senderId === contactId && message.status !== 1) {
        return Math.max(max, message.syncId ?? 0);
      }
      return max;
    }, 0);
  }, [contactId, visibleTimelineMessages]);

  const currentReadSync = useMemo(() => {
    return mergedMessages.reduce((max, message) => {
      if (message.senderId === currentUserId && message.messageType === DIRECT_MESSAGE_READ_LINE_TYPE) {
        return Math.max(max, message.syncId ?? 0);
      }
      return max;
    }, 0);
  }, [currentUserId, mergedMessages]);

  useEffect(() => {
    logDmChatViewDebug("enter-contact", {
      contactId,
    });
    if (contentMountFrameRef.current != null) {
      cancelAnimationFrame(contentMountFrameRef.current);
      contentMountFrameRef.current = null;
    }
    if (contentMountTaskRef.current) {
      contentMountTaskRef.current.cancel();
      contentMountTaskRef.current = null;
    }
    sendInFlightRef.current = false;
    isAtBottomRef.current = true;
    readSyncRef.current = 0;
    scrollDebugCountRef.current = 0;
    previousPaginatedLengthRef.current = null;

    const resetTimer = setTimeout(() => {
      setContentReady(false);
      setDraft("");
      setInputHeight(COMPOSER_MIN_HEIGHT);
      setAttachments([]);
      setReplyMessage(null);
      setErrorMessage(null);
      setActionMenuMessage(null);
      setActionMenuVisible(false);
      setFailedMessageIds(new Set());
      setIsAtBottom(true);
      setVisibleCount(PAGE_SIZE);
      contentMountFrameRef.current = requestAnimationFrame(() => {
        contentMountFrameRef.current = null;
        contentMountTaskRef.current = InteractionManager.runAfterInteractions(() => {
          contentMountTaskRef.current = null;
          setContentReady(true);
        });
      });
    }, 0);
    return () => {
      clearTimeout(resetTimer);
      if (contentMountFrameRef.current != null) {
        cancelAnimationFrame(contentMountFrameRef.current);
        contentMountFrameRef.current = null;
      }
      if (contentMountTaskRef.current) {
        contentMountTaskRef.current.cancel();
        contentMountTaskRef.current = null;
      }
    };
  }, [contactId]);

  useEffect(() => {
    if (draft.length !== 0)
      return undefined;

    const resetTimer = setTimeout(() => {
      setInputHeight(COMPOSER_MIN_HEIGHT);
    }, 0);
    return () => clearTimeout(resetTimer);
  }, [draft]);

  useEffect(() => {
    if (!DM_CHAT_VIEW_DEBUG_ENABLED) {
      return;
    }
    logDmChatViewDebug("timeline-snapshot", {
      contactId,
      firstChronologicalVisible: summarizeDirectMessageForDebug(paginatedMessages[0]),
      hasMoreMessages,
      firstInvertedVisible: summarizeDirectMessageForDebug(invertedMessages[0]),
      lastChronologicalVisible: summarizeDirectMessageForDebug(paginatedMessages.at(-1)),
      mergedCount: mergedMessages.length,
      paginatedCount: paginatedMessages.length,
      visibleCount,
      visibleTimelineCount: visibleTimelineMessages.length,
    });
  }, [
    contactId,
    hasMoreMessages,
    invertedMessages,
    mergedMessages.length,
    paginatedMessages,
    visibleCount,
    visibleTimelineMessages.length,
  ]);

  useEffect(() => {
    if (!contactId || latestIncomingSync <= 0)
      return;
    const effectiveReadSync = Math.max(currentReadSync, readSyncRef.current);
    if (latestIncomingSync <= effectiveReadSync)
      return;
    readSyncRef.current = latestIncomingSync;
    updateReadPositionMutation.mutate(contactId, {
      onError: () => { readSyncRef.current = effectiveReadSync; },
    });
  }, [contactId, currentReadSync, latestIncomingSync, updateReadPositionMutation]);

  useEffect(() => {
    const previousLength = previousPaginatedLengthRef.current;
    previousPaginatedLengthRef.current = paginatedMessages.length;
    if (previousLength == null || !isAtBottomRef.current || paginatedMessages.length === 0) {
      return;
    }
    if (paginatedMessages.length > previousLength && flatListRef.current) {
      const timer = setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
      return () => clearTimeout(timer);
    }
  }, [paginatedMessages.length]);

  const commitBottomState = useCallback((nextIsAtBottom: boolean) => {
    if (isAtBottomRef.current === nextIsAtBottom) {
      return;
    }

    isAtBottomRef.current = nextIsAtBottom;
    setIsAtBottom(nextIsAtBottom);
  }, []);

  const startKeyboardLayoutGuard = useCallback(() => {
    if (!keyboardLayoutGuardActiveRef.current) {
      wasAtBottomBeforeKeyboardRef.current = isAtBottomRef.current;
    }
    keyboardLayoutGuardActiveRef.current = true;
    if (keyboardLayoutGuardTimerRef.current) {
      clearTimeout(keyboardLayoutGuardTimerRef.current);
      keyboardLayoutGuardTimerRef.current = null;
    }
  }, []);

  const settleKeyboardLayoutGuard = useCallback((anchorBottom: boolean) => {
    if (keyboardLayoutGuardTimerRef.current) {
      clearTimeout(keyboardLayoutGuardTimerRef.current);
    }
    keyboardLayoutGuardTimerRef.current = setTimeout(() => {
      keyboardLayoutGuardActiveRef.current = false;
      keyboardLayoutGuardTimerRef.current = null;

      if (anchorBottom && wasAtBottomBeforeKeyboardRef.current) {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        commitBottomState(true);
      }
    }, DM_KEYBOARD_LAYOUT_SETTLE_MS);
  }, [commitBottomState]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      startKeyboardLayoutGuard();
      settleKeyboardLayoutGuard(false);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      startKeyboardLayoutGuard();
      settleKeyboardLayoutGuard(true);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (keyboardLayoutGuardTimerRef.current) {
        clearTimeout(keyboardLayoutGuardTimerRef.current);
        keyboardLayoutGuardTimerRef.current = null;
      }
      keyboardLayoutGuardActiveRef.current = false;
    };
  }, [settleKeyboardLayoutGuard, startKeyboardLayoutGuard]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (keyboardLayoutGuardActiveRef.current) {
      return;
    }

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentOffset.y;
    const transition = resolveBottomThresholdTransition(isAtBottomRef.current, distanceFromBottom);
    if (transition.changed) {
      commitBottomState(transition.isAtBottom);
    }
    if (DM_CHAT_VIEW_DEBUG_ENABLED && __DEV__ && scrollDebugCountRef.current < 6) {
      scrollDebugCountRef.current += 1;
      logDmChatViewDebug("scroll", {
        contentHeight: contentSize.height,
        contentWidth: contentSize.width,
        distanceFromBottom,
        layoutHeight: layoutMeasurement.height,
        offsetY: contentOffset.y,
      });
    }
  }, [commitBottomState]);

  const handleLoadMore = useCallback(() => {
    if (hasMoreMessages) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, [hasMoreMessages]);

  const handleChangeDraft = useCallback((nextDraft: string) => {
    if (nextDraft.length < draft.length) {
      setInputHeight(COMPOSER_MIN_HEIGHT);
    }
    setDraft(nextDraft);
  }, [draft.length]);

  const handleSend = useCallback(async () => {
    if (sendInFlightRef.current) {
      return;
    }

    const previousDraft = draft;
    const previousAttachments = attachments;
    const previousReplyMessage = replyMessage;
    const text = draft.trim();
    if (!text && attachments.length === 0)
      return;

    sendInFlightRef.current = true;
    setErrorMessage(null);
    setIsSending(true);
    setDraft("");
    setInputHeight(COMPOSER_MIN_HEIGHT);
    setAttachments([]);
    setReplyMessage(null);
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    try {
      const uploaded = previousAttachments.length > 0
        ? await uploadMobileMessageAttachments(mobileApiClient, previousAttachments, { allowPartialSuccess: true })
        : null;
      const requests = buildDirectMessageSendRequestsFromUploadedMedia({
        inputText: previousDraft,
        receiverId: contactId,
        replyMessageId: previousReplyMessage?.messageId,
        uploadedFiles: uploaded?.uploadedFiles ?? [],
        uploadedImages: uploaded?.uploadedImages ?? [],
        uploadedSoundMessage: uploaded?.uploadedSoundMessage ?? null,
        uploadedVideos: uploaded?.uploadedVideos ?? [],
      });
      const successfulMediaRequestCount = requests.filter(request =>
        request.messageType === MESSAGE_TYPE.IMG
        || request.messageType === MESSAGE_TYPE.SOUND
        || request.messageType === MESSAGE_TYPE.VIDEO,
      ).length;

      if (successfulMediaRequestCount === 0 && uploaded && uploaded.failedAttachments.length > 0) {
        const firstFailure = uploaded.failedAttachments[0]?.error;
        throw firstFailure ?? new Error("附件上传失败。");
      }

      if (requests.length === 0) {
        throw new Error("消息内容不能为空。");
      }

      for (const request of requests) {
        await sendMutation.mutateAsync(request);
      }

      if (uploaded && uploaded.failedAttachments.length > 0) {
        const failedAttachments = uploaded.failedAttachments.map(failure => failure.attachment);
        setAttachments(failedAttachments);
        setErrorMessage(`部分附件发送失败：成功 ${successfulMediaRequestCount} 个，失败 ${failedAttachments.length} 个，已保留失败项供重试。`);
      }
    }
    catch (error) {
      setDraft(previousDraft);
      setAttachments(previousAttachments);
      setReplyMessage(previousReplyMessage);
      setErrorMessage(getErrorMessage(error, "发送私聊消息失败。"));
    }
    finally {
      sendInFlightRef.current = false;
      setIsSending(false);
    }
  }, [attachments, contactId, draft, replyMessage, sendMutation]);

  const handleComposerContentSizeChange = useCallback((event: { nativeEvent: { contentSize: { height: number } } }) => {
    const nextHeight = resolveComposerInputHeight(event.nativeEvent.contentSize.height);
    setInputHeight(prev => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const _handlePickAttachments = useCallback(async (kind: MobileMessageAttachmentKind) => {
    setErrorMessage(null);
    try {
      const picked = await pickMobileMessageAttachments(kind);
      if (picked.length === 0)
        return;
      setAttachments(current => mergePickedMessageAttachments(current, picked));
    }
    catch (error) {
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
      if (typeof messageId !== "number")
        return;

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

  const handleRemoveFailedMessage = useCallback((message: MessageDirectResponse) => {
    queryClient.setQueryData<MessageDirectResponse[]>(
      getDirectInboxQueryKey(currentUserId),
      current => removeMobileLocalDirectMessageData(current, message.messageId),
    );
  }, [currentUserId, queryClient]);

  const handleRetryFailedMessage = useCallback(async (message: MessageDirectResponse) => {
    if (!isMobileFailedDirectMessage(message) || sendInFlightRef.current) {
      return;
    }

    handleRemoveFailedMessage(message);
    sendInFlightRef.current = true;
    setErrorMessage(null);
    setIsSending(true);
    try {
      await sendMutation.mutateAsync({
        content: message.content ?? "",
        extra: message.extra ?? {},
        messageType: message.messageType ?? 1,
        receiverId: contactId,
        ...(typeof message.replyMessageId === "number" && message.replyMessageId > 0
          ? { replyMessageId: message.replyMessageId }
          : {}),
      });
    }
    catch (error) {
      setErrorMessage(getErrorMessage(error, "重试发送私聊消息失败。"));
    }
    finally {
      sendInFlightRef.current = false;
      setIsSending(false);
    }
  }, [contactId, handleRemoveFailedMessage, sendMutation]);

  const getMessageStatus = useCallback((message: MessageDirectResponse): MessageSendStatus | null => {
    if (message.senderId !== currentUserId)
      return null;
    if (message.status === 1)
      return null;
    if (isMobileFailedDirectMessage(message))
      return "failed";
    const msgId = message.messageId;
    if (typeof msgId === "number" && failedMessageIds.has(msgId))
      return "failed";
    if (isMobileOptimisticDirectMessage(message))
      return "sending";
    return null;
  }, [currentUserId, failedMessageIds]);

  const hasSendContent = draft.trim().length > 0 || attachments.length > 0;
  const canSend = hasSendContent && !isSending;
  const contactAvatarUrl = avatarThumbUrl(contactAvatarFileId);

  const renderItem = useCallback(({ item, index }: { item: MessageDirectResponse; index: number }) => {
    const isMine = item.senderId === currentUserId;
    const content = getDirectMessageContent(item);
    const status = getMessageStatus(item);
    const replyTarget = findDirectReplyMessage(visibleTimelineMessages, item.replyMessageId);
    const showReplyPreview = item.status !== 1 && typeof item.replyMessageId === "number" && item.replyMessageId > 0;

    const showDateSeparator = index === invertedMessages.length - 1 || !isSameDay(item.createTime, invertedMessages[index + 1]?.createTime);

    return (
      <View>
        {showDateSeparator && item.createTime
          ? (
              <View style={styles.dateSeparator}>
                <ThemedText themeColor="textSecondary" type="caption">
                  {formatDateSeparator(item.createTime)}
                </ThemedText>
              </View>
            )
          : null}
        <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
          {!isMine
            ? (
                <Pressable
                  accessibilityLabel="查看联系人资料"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onOpenContactDrawer}
                >
                  {contactAvatarUrl
                    ? (
                        <CachedImage uri={contactAvatarUrl} style={styles.messageAvatar} />
                      )
                    : (
                        <View style={[styles.messageAvatarFallback, { backgroundColor: theme.accent }]}>
                          <ThemedText style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                            {(contactName ?? "").slice(0, 1) || "U"}
                          </ThemedText>
                        </View>
                      )}
                </Pressable>
              )
            : null}
          <View style={[styles.bubbleWrapper, status === "sending" && styles.bubbleWrapperSending]}>
            <Pressable
              onLongPress={item.status !== 1
                ? () => {
                    setActionMenuMessage(item);
                    setActionMenuVisible(true);
                  }
                : undefined}
              style={[
                styles.bubble,
                {
                  backgroundColor: item.status === 1
                    ? theme.backgroundSelected
                    : isMine ? theme.accent : theme.backgroundElement,
                },
              ]}
            >
              {showReplyPreview
                ? (
                    <View
                      style={[
                        styles.bubbleReplyPreview,
                        {
                          backgroundColor: isMine ? "rgba(255,255,255,0.16)" : theme.surface,
                          borderLeftColor: isMine ? "rgba(255,255,255,0.7)" : theme.accent,
                        },
                      ]}
                    >
                      <ThemedText
                        numberOfLines={1}
                        style={[
                          styles.bubbleReplyTitle,
                          { color: isMine ? "rgba(255,255,255,0.82)" : theme.textSecondary },
                        ]}
                      >
                        回复
                        {replyTarget?.senderUsername ? ` ${replyTarget.senderUsername}` : ""}
                      </ThemedText>
                      <ThemedText
                        numberOfLines={1}
                        style={[
                          styles.bubbleReplyText,
                          { color: isMine ? "rgba(255,255,255,0.82)" : theme.textSecondary },
                        ]}
                      >
                        {replyTarget ? getDirectMessagePreviewText(replyTarget) : "[原消息不可见]"}
                      </ThemedText>
                    </View>
                  )
                : null}
              {content.kind === "media"
                ? (
                    <MobileMessageMediaPreview
                      compact
                      content={item.content}
                      deferPlayableMedia
                      extra={item.extra}
                      messageType={item.messageType}
                    />
                  )
                : (
                    <ThemedText style={{ color: isMine && item.status !== 1 ? "#fff" : theme.text, fontSize: 15 }}>
                      {content.text}
                    </ThemedText>
                  )}
            </Pressable>
            <View style={[styles.messageFooter, { justifyContent: isMine ? "flex-end" : "flex-start" }]}>
              <ThemedText themeColor="textSecondary" style={styles.time}>
                {formatMessageTimeLabel(item.createTime)}
              </ThemedText>
              {isMine && status === "failed"
                ? (
                    <>
                      <Pressable
                        accessibilityLabel="重试发送私聊消息"
                        accessibilityRole="button"
                        hitSlop={6}
                        onPress={() => void handleRetryFailedMessage(item)}
                        style={[styles.failedStatusPill, { backgroundColor: theme.dangerMuted ?? "rgba(220, 38, 38, 0.12)" }]}
                      >
                        <Warning size={11} color={theme.danger} weight="fill" />
                        <ThemedText style={{ color: theme.danger, fontSize: 11, fontWeight: "600" }}>发送失败</ThemedText>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="删除失败私聊消息"
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => handleRemoveFailedMessage(item)}
                        style={styles.failedRemoveButton}
                      >
                        <XCircle size={13} color={theme.textSecondary} weight="fill" />
                      </Pressable>
                    </>
                  )
                : null}
            </View>
          </View>
        </View>
      </View>
    );
  }, [currentUserId, theme, contactAvatarUrl, contactName, getMessageStatus, handleRemoveFailedMessage, handleRetryFailedMessage, invertedMessages, onOpenContactDrawer, visibleTimelineMessages]);

  const handleScrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  }, []);

  const handleContentSizeChange = useCallback((contentWidth: number, contentHeight: number) => {
    logDmChatViewDebug("content-size", {
      contentHeight,
      contentWidth,
      paginatedCount: paginatedMessages.length,
    });
  }, [paginatedMessages.length]);

  const listFooter = useMemo(() => hasMoreMessages
    ? (
        <Pressable onPress={handleLoadMore} style={{ alignItems: "center", paddingVertical: Spacing.md }}>
          <ThemedText themeColor="accent" type="caption">加载更多消息</ThemedText>
        </Pressable>
      )
    : null, [handleLoadMore, hasMoreMessages]);

  const listEmpty = useMemo(() => (
    <View style={styles.emptyState}>
      <ThemedText themeColor="textSecondary">暂无私聊消息</ThemedText>
    </View>
  ), []);

  const handleCloseActionMenu = useCallback(() => {
    setActionMenuVisible(false);
  }, []);

  const handleActionMenuAction = useCallback((action: DmMessageAction, message: MessageDirectResponse) => {
    void handleMessageAction(action, message);
  }, [handleMessageAction]);

  const _attachmentKinds = [
    { label: "图片", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE },
    { label: "视频", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO },
    { label: "文件", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.FILE },
    { label: "音频", kind: MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={onBack} accessibilityLabel="返回" accessibilityRole="button">
          <CaretLeft size={20} color={theme.text} weight="bold" />
        </Pressable>
        <Pressable
          accessibilityLabel="查看联系人资料"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenContactDrawer}
        >
          {contactAvatarUrl
            ? (
                <CachedImage uri={contactAvatarUrl} style={styles.headerAvatar} />
              )
            : (
                <View style={[styles.headerAvatarFallback, { backgroundColor: theme.accent }]}>
                  <ThemedText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                    {(contactName ?? "").slice(0, 1) || "U"}
                  </ThemedText>
                </View>
              )}
        </Pressable>
        <View style={styles.headerMeta}>
          <ThemedText type="heading" numberOfLines={1}>{contactName}</ThemedText>
        </View>
      </View>

      {contentReady
        ? (
            <>
              <FlatList
                ref={flatListRef}
                data={invertedMessages}
                inverted
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                keyExtractor={getDirectMessageListItemKey}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                initialNumToRender={DM_INITIAL_RENDER_COUNT}
                ListFooterComponent={listFooter}
                ListEmptyComponent={listEmpty}
                maintainVisibleContentPosition={DM_LIST_MAINTAIN_VISIBLE_POSITION}
                maxToRenderPerBatch={DM_RENDER_BATCH_SIZE}
                onScroll={handleScroll}
                onContentSizeChange={DM_CHAT_VIEW_DEBUG_ENABLED ? handleContentSizeChange : undefined}
                // 倒置 DM 消息流需要稳定底部锚点，避免裁剪回收导致阅读位置跳动。
                removeClippedSubviews={false}
                scrollEventThrottle={100}
                style={styles.list}
                windowSize={DM_WINDOW_SIZE}
              />

              {!isAtBottom && paginatedMessages.length > 0
                ? (
                    <Pressable
                      accessibilityLabel="跳到最新消息"
                      accessibilityRole="button"
                      onPress={handleScrollToBottom}
                      style={[styles.newMessagesPill, { backgroundColor: theme.accent }]}
                    >
                      <ThemedText style={{ color: "#fff", fontSize: 12 }}>新消息</ThemedText>
                    </Pressable>
                  )
                : null}

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                enabled={Platform.OS === "ios"}
                style={[
                  styles.composerContainer,
                  {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    paddingBottom: Spacing.md + safeAreaBottomInset,
                  },
                ]}
              >
                {replyMessage
                  ? (
                      <View style={[styles.replyBar, { backgroundColor: theme.accentMuted, borderLeftColor: theme.accent }]}>
                        <ThemedText type="small" style={styles.replyText} numberOfLines={1}>
                          回复
                          {" "}
                          {getDirectMessagePreviewText(replyMessage)}
                        </ThemedText>
                        <Pressable
                          accessibilityLabel="取消回复"
                          accessibilityRole="button"
                          hitSlop={8}
                          onPress={() => setReplyMessage(null)}
                        >
                          <X size={14} color={theme.textSecondary} />
                        </Pressable>
                      </View>
                    )
                  : null}

                {attachments.length > 0
                  ? (
                      <View style={styles.attachmentRow}>
                        {attachments.map(attachment => (
                          <View key={attachment.id} style={[styles.attachmentChip, { backgroundColor: theme.backgroundElement }]}>
                            <ThemedText type="caption" numberOfLines={1}>{attachment.fileName}</ThemedText>
                            <Pressable
                              accessibilityLabel={`移除附件 ${attachment.fileName}`}
                              accessibilityRole="button"
                              hitSlop={8}
                              onPress={() => setAttachments(current => current.filter(item => item.id !== attachment.id))}
                            >
                              <XCircle size={14} color={theme.textSecondary} weight="fill" />
                            </Pressable>
                          </View>
                        ))}
                        <Pressable
                          accessibilityLabel="清空附件"
                          accessibilityRole="button"
                          hitSlop={8}
                          onPress={() => setAttachments([])}
                          style={[styles.attachmentChip, { backgroundColor: theme.backgroundElement }]}
                        >
                          <ThemedText type="caption" style={{ color: theme.danger }}>清空</ThemedText>
                        </Pressable>
                      </View>
                    )
                  : null}

                {errorMessage
                  ? (
                      <View style={styles.errorBar}>
                        <Warning size={14} color={theme.danger} />
                        <ThemedText style={{ color: theme.danger, fontSize: 12, flex: 1 }}>
                          {errorMessage}
                        </ThemedText>
                        <Pressable
                          accessibilityLabel="关闭错误提示"
                          accessibilityRole="button"
                          hitSlop={8}
                          onPress={() => setErrorMessage(null)}
                        >
                          <X size={12} color={theme.danger} />
                        </Pressable>
                      </View>
                    )
                  : null}

                <View style={styles.inputRow}>
                  <TextInput
                    editable={!isSending}
                    multiline
                    value={draft}
                    onChangeText={handleChangeDraft}
                    onContentSizeChange={handleComposerContentSizeChange}
                    onBlur={() => {
                      startKeyboardLayoutGuard();
                      settleKeyboardLayoutGuard(true);
                    }}
                    onFocus={() => {
                      startKeyboardLayoutGuard();
                      settleKeyboardLayoutGuard(false);
                    }}
                    placeholder={`给 ${contactName}...`}
                    placeholderTextColor={theme.textSecondary}
                    scrollEnabled={inputHeight >= COMPOSER_MAX_HEIGHT}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        color: theme.text,
                        height: inputHeight,
                        textAlignVertical: "top",
                      },
                    ]}
                    accessibilityLabel="输入消息"
                  />
                  <Animated.View style={sendButtonStyle}>
                    <Pressable
                      disabled={!canSend}
                      onPress={() => void handleSend()}
                      style={styles.sendBtn}
                      accessibilityLabel="发送消息"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canSend }}
                    >
                      <PaperPlaneTilt size={24} color={hasSendContent ? theme.accent : theme.textSecondary} weight="fill" />
                    </Pressable>
                  </Animated.View>
                </View>
              </KeyboardAvoidingView>
            </>
          )
        : <View style={styles.list} />}

      {actionMenuVisible
        ? (
            <DmMessageActionMenu
              currentUserId={currentUserId}
              message={actionMenuMessage}
              onAction={handleActionMenuAction}
              onClose={handleCloseActionMenu}
              visible
            />
          )
        : null}
    </View>
  );
}

export const DmChatView = memo(DmChatViewInner);
