import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Space } from "@tuanchat/openapi-client/models/Space";
import type { LoginMethod } from "@/features/auth/auth-session";
import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";
import type { MobileMessageMode } from "@/features/messages/mobileMessageComposer";
import { buildMessageDraftsFromUploadedMedia } from "@tuanchat/domain/message-draft";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { MemberPreviewList } from "@/features/members/memberPreviewList";
import {
  findCurrentMember,
  getCurrentMemberIdentityText,
  getCurrentRoomPresenceText,
  mergeRoomMembersWithSpaceMembers,
} from "@/features/members/memberUtils";
import { useRoomMembersQuery } from "@/features/members/useRoomMembersQuery";
import { useSpaceMembersQuery } from "@/features/members/useSpaceMembersQuery";
import {
  formatMobileMessageAttachmentSize,
  getMobileMessageAttachmentKindLabel,
  mergePickedMessageAttachments,
  MOBILE_MESSAGE_ATTACHMENT_KIND,
  pickMobileMessageAttachments,
} from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import {
  canMobileMessageModeUseAttachments,
  getMobileMessageInputPlaceholder,
  getMobileMessageModeHint,
  getMobileMessageModeLabel,
  getMobileMessageSubmitLabel,
  MOBILE_MESSAGE_MODE,
} from "@/features/messages/mobileMessageComposer";
import { useRoomMessagesLiveSync } from "@/features/messages/useRoomMessagesLiveSync";
import { useRoomMessagesQuery } from "@/features/messages/useRoomMessagesQuery";
import { useSendRoomMessageMutation } from "@/features/messages/useSendRoomMessageMutation";
import { useUserRoomsQuery } from "@/features/rooms/use-user-rooms-query";
import { useUserActiveSpacesQuery } from "@/features/spaces/use-user-active-spaces-query";
import { useWorkspaceSession } from "@/features/workspace/workspace-session";
import { useTheme } from "@/hooks/use-theme";
import { DEFAULT_TUANCHAT_API_BASE_URL, mobileApiClient } from "@/lib/api";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  hero: {
    gap: Spacing.three,
  },
  title: {
    textAlign: "left",
  },
  subtitle: {
    opacity: 0.75,
    lineHeight: 22,
  },
  card: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  methodToggleRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  methodChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  errorText: {
    color: "#c0392b",
  },
  primaryButton: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  inlineButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  listColumn: {
    gap: Spacing.two,
  },
  listRow: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  summaryBlock: {
    gap: Spacing.two,
  },
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  messageList: {
    gap: Spacing.two,
  },
  messageItem: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  messageMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  messageComposer: {
    gap: Spacing.two,
  },
  messageComposerHint: {
    opacity: 0.75,
  },
  messageStatusText: {
    opacity: 0.75,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: 96,
    textAlignVertical: "top",
  },
  messageActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  messageAnchorCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  attachmentList: {
    gap: Spacing.two,
  },
  attachmentItem: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  attachmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  attachmentKindBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  attachmentMetaText: {
    opacity: 0.75,
  },
});

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return fallback;
}

function getRoomTypeLabel(roomType?: number) {
  if (roomType === 2) {
    return "全员房间";
  }
  return "游戏房间";
}

function getMessageAuthorLabel(message: Message) {
  const customRoleName = message.customRoleName?.trim();
  if (customRoleName) {
    return customRoleName;
  }
  if (message.roleId && message.roleId > 0) {
    return `角色 #${message.roleId}`;
  }
  return `用户 #${message.userId}`;
}

function getMessagePreview(message: Message) {
  const content = message.content?.trim() ?? "";
  switch (message.messageType) {
    case MESSAGE_TYPE.TEXT:
      return content || "空文本消息";
    case MESSAGE_TYPE.IMG:
      return content || "[图片]";
    case MESSAGE_TYPE.FILE:
      return content || "[文件]";
    case MESSAGE_TYPE.SYSTEM:
      return content ? `[系统] ${content}` : "[系统消息]";
    case MESSAGE_TYPE.SOUND:
      return content || "[语音]";
    case MESSAGE_TYPE.COMMAND_REQUEST:
      return content ? `[指令请求] ${content}` : "[指令请求]";
    case MESSAGE_TYPE.VIDEO:
      return content || "[视频]";
    case MESSAGE_TYPE.STATE_EVENT:
      return content || "[状态事件]";
    case MESSAGE_TYPE.ROOM_JUMP:
      return content || "[群聊跳转]";
    case MESSAGE_TYPE.THREAD_ROOT:
      return content || "[子区]";
    default:
      return content || `消息类型 #${message.messageType}`;
  }
}

function formatMessageTime(value?: string) {
  if (!value) {
    return "刚刚";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

type MessageSubmitPhase = "idle" | "uploading" | "sending";

function getMessageSubmitPhaseText(phase: MessageSubmitPhase) {
  switch (phase) {
    case "uploading":
      return "正在上传附件…";
    case "sending":
      return "正在发送消息…";
    default:
      return null;
  }
}

function getAttachmentFileExtension(fileName: string) {
  const matchedExtension = fileName.trim().match(/\.([a-z0-9]+)$/i);
  return matchedExtension?.[1]?.toUpperCase() ?? null;
}

function getMessageAttachmentMetaText(attachment: MobileMessageAttachment) {
  const metaParts = [
    formatMobileMessageAttachmentSize(attachment.size),
  ];

  if (
    attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE
    && attachment.width
    && attachment.height
  ) {
    metaParts.push(`${attachment.width}×${attachment.height}`);
  }

  const extension = getAttachmentFileExtension(attachment.fileName);
  if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.FILE && extension) {
    metaParts.push(extension);
  }

  return metaParts.join(" · ");
}

function parsePositiveIntegerInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function LoginMethodToggle({
  currentMethod,
  onChange,
}: {
  currentMethod: LoginMethod;
  onChange: (method: LoginMethod) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.methodToggleRow}>
      {(["username", "userId"] as const).map((method) => {
        const selected = currentMethod === method;
        return (
          <Pressable
            key={method}
            onPress={() => onChange(method)}
            style={[
              styles.methodChip,
              {
                borderColor: selected ? theme.text : theme.backgroundSelected,
                backgroundColor: selected ? theme.backgroundSelected : theme.background,
              },
            ]}
          >
            <ThemedText type="smallBold">{method === "username" ? "用户名" : "用户 ID"}</ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

function MessageModeToggle({
  currentMode,
  disabled,
  onChange,
}: {
  currentMode: MobileMessageMode;
  disabled?: boolean;
  onChange: (mode: MobileMessageMode) => void;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.methodToggleRow}>
      {[
        MOBILE_MESSAGE_MODE.TEXT,
        MOBILE_MESSAGE_MODE.COMMAND_REQUEST,
        MOBILE_MESSAGE_MODE.STATE_EVENT,
      ].map((mode) => {
        const selected = currentMode === mode;
        return (
          <Pressable
            key={mode}
            disabled={disabled}
            onPress={() => onChange(mode)}
            style={[
              styles.methodChip,
              {
                borderColor: selected ? theme.text : theme.backgroundSelected,
                backgroundColor: selected ? theme.backgroundSelected : theme.background,
                opacity: disabled ? 0.6 : 1,
              },
            ]}
          >
            <ThemedText type="smallBold">{getMobileMessageModeLabel(mode)}</ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onPress,
  disabled,
}: {
  title: string;
  actionLabel?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {actionLabel && onPress
        ? (
            <Pressable
              disabled={disabled}
              onPress={onPress}
              style={[
                styles.inlineButton,
                {
                  borderColor: theme.backgroundSelected,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <ThemedText type="small">{actionLabel}</ThemedText>
            </Pressable>
          )
        : null}
    </View>
  );
}

function ListCardRow({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.listRow,
        {
          borderColor: selected ? theme.text : theme.backgroundSelected,
          backgroundColor: selected ? theme.backgroundSelected : theme.background,
        },
      ]}
    >
      <ThemedText type="smallBold">{title}</ThemedText>
      {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
    </Pressable>
  );
}

function renderListState({
  isPending,
  isError,
  error,
  emptyText,
}: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  emptyText: string;
}) {
  if (isPending) {
    return (
      <ThemedView style={styles.centerState}>
        <ActivityIndicator />
        <ThemedText themeColor="textSecondary">正在加载…</ThemedText>
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedText style={styles.errorText}>
        {getErrorMessage(error, "加载失败，请稍后重试。")}
      </ThemedText>
    );
  }

  return <ThemedText themeColor="textSecondary">{emptyText}</ThemedText>;
}

function SpaceSummary({ space }: { space: Space }) {
  return (
    <ThemedView style={styles.summaryBlock}>
      <ThemedText type="smallBold">{space.name ?? "未命名空间"}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {space.description?.trim() || "这个空间还没有填写描述。"}
      </ThemedText>
      <View style={styles.badgeRow}>
        <ThemedView type="backgroundSelected" style={styles.badge}>
          <ThemedText type="small">
            Space #
            {space.spaceId ?? "-"}
          </ThemedText>
        </ThemedView>
        <ThemedView type="backgroundSelected" style={styles.badge}>
          <ThemedText type="small">
            {space.status === 2 ? "已归档" : "活跃中"}
          </ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

function RoomSummary({ room }: { room: Room }) {
  return (
    <ThemedView style={styles.summaryBlock}>
      <ThemedText type="smallBold">{room.name ?? "未命名房间"}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {room.description?.trim() || "这个房间还没有填写描述。"}
      </ThemedText>
      <View style={styles.badgeRow}>
        <ThemedView type="backgroundSelected" style={styles.badge}>
          <ThemedText type="small">
            {getRoomTypeLabel(room.roomType)}
          </ThemedText>
        </ThemedView>
        <ThemedView type="backgroundSelected" style={styles.badge}>
          <ThemedText type="small">
            {room.muteStatus === 1 ? "已禁言" : "可发言"}
          </ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { session, isAuthenticated, isBootstrapping, isSigningIn, signIn } = useAuthSession();
  const { selectedSpaceId, selectedRoomId, setSelectedSpaceId, setSelectedRoomId } = useWorkspaceSession();
  const spacesQuery = useUserActiveSpacesQuery();
  const roomsQuery = useUserRoomsQuery(selectedSpaceId);
  const spaceMembersQuery = useSpaceMembersQuery(selectedSpaceId);
  const roomMembersQuery = useRoomMembersQuery(selectedRoomId);
  const roomMessagesQuery = useRoomMessagesQuery(selectedRoomId);
  useRoomMessagesLiveSync(selectedRoomId);
  const sendRoomMessageMutation = useSendRoomMessageMutation(selectedRoomId);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("username");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftRoleIdInput, setDraftRoleIdInput] = useState("");
  const [messageAnchorId, setMessageAnchorId] = useState<number | null>(null);
  const [messageAttachments, setMessageAttachments] = useState<MobileMessageAttachment[]>([]);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageMode, setMessageMode] = useState<MobileMessageMode>(MOBILE_MESSAGE_MODE.TEXT);
  const [messageSubmitPhase, setMessageSubmitPhase] = useState<MessageSubmitPhase>("idle");

  const currentUserId = session?.userId ?? null;
  const activeSpaces = useMemo(() => spacesQuery.data?.data ?? [], [spacesQuery.data?.data]);
  const availableRooms = useMemo(() => roomsQuery.data?.data?.rooms ?? [], [roomsQuery.data?.data?.rooms]);
  const spaceMembers = useMemo(() => spaceMembersQuery.data?.data ?? [], [spaceMembersQuery.data?.data]);
  const roomMembers = useMemo(() => {
    return mergeRoomMembersWithSpaceMembers(roomMembersQuery.data?.data ?? [], spaceMembers);
  }, [roomMembersQuery.data?.data, spaceMembers]);
  const roomMessages = useMemo(() => roomMessagesQuery.messages, [roomMessagesQuery.messages]);
  const draftRoleId = useMemo(() => parsePositiveIntegerInput(draftRoleIdInput), [draftRoleIdInput]);
  const canUseMessageAttachments = useMemo(() => {
    return canMobileMessageModeUseAttachments(messageMode);
  }, [messageMode]);
  const isSubmittingMessage = useMemo(() => {
    return messageSubmitPhase !== "idle" || sendRoomMessageMutation.isPending;
  }, [messageSubmitPhase, sendRoomMessageMutation.isPending]);

  const selectedSpace = useMemo(
    () => activeSpaces.find(space => space.spaceId === selectedSpaceId) ?? null,
    [activeSpaces, selectedSpaceId],
  );
  const selectedRoom = useMemo(
    () => availableRooms.find(room => room.roomId === selectedRoomId) ?? null,
    [availableRooms, selectedRoomId],
  );
  const currentSpaceMember = useMemo(() => {
    return findCurrentMember(spaceMembers, currentUserId);
  }, [currentUserId, spaceMembers]);
  const currentRoomMember = useMemo(() => {
    return findCurrentMember(roomMembers, currentUserId);
  }, [currentUserId, roomMembers]);
  const selectedAnchorMessage = useMemo(() => {
    return roomMessages.find(item => item.message.messageId === messageAnchorId)?.message ?? null;
  }, [messageAnchorId, roomMessages]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const availableSpaceIds = activeSpaces
      .map(space => space.spaceId)
      .filter((spaceId): spaceId is number => typeof spaceId === "number" && spaceId > 0);

    if (availableSpaceIds.length === 0) {
      if (selectedSpaceId !== null) {
        setSelectedSpaceId(null);
      }
      return;
    }

    if (!selectedSpaceId || !availableSpaceIds.includes(selectedSpaceId)) {
      setSelectedSpaceId(availableSpaceIds[0]);
    }
  }, [activeSpaces, isAuthenticated, selectedSpaceId, setSelectedSpaceId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedSpaceId) {
      return;
    }

    const availableRoomIds = availableRooms
      .map(room => room.roomId)
      .filter((roomId): roomId is number => typeof roomId === "number" && roomId > 0);

    if (availableRoomIds.length === 0) {
      if (selectedRoomId !== null) {
        setSelectedRoomId(null);
      }
      return;
    }

    if (!selectedRoomId || !availableRoomIds.includes(selectedRoomId)) {
      setSelectedRoomId(availableRoomIds[0]);
    }
  }, [availableRooms, isAuthenticated, selectedRoomId, selectedSpaceId, setSelectedRoomId]);

  useEffect(() => {
    setDraftMessage("");
    setMessageAnchorId(null);
    setMessageAttachments([]);
    setMessageError(null);
    setMessageMode(MOBILE_MESSAGE_MODE.TEXT);
    setMessageSubmitPhase("idle");
  }, [selectedRoomId]);

  useEffect(() => {
    if (messageAnchorId && !selectedAnchorMessage) {
      setMessageAnchorId(null);
    }
  }, [messageAnchorId, selectedAnchorMessage]);

  const handleLogin = async () => {
    setErrorMessage(null);
    try {
      await signIn({
        identifier,
        password,
        method: loginMethod,
      });
      setPassword("");
    }
    catch (error) {
      setErrorMessage(getErrorMessage(error, "登录失败。"));
    }
  };

  const handleRefreshWorkspace = async () => {
    await spacesQuery.refetch();
    if (selectedSpaceId) {
      await roomsQuery.refetch();
    }
    if (selectedRoomId) {
      await roomMessagesQuery.refetch();
    }
  };

  const handleSendRoomMessage = async () => {
    setMessageError(null);
    setMessageSubmitPhase("idle");
    try {
      const messageContext = {
        replayMessageId: selectedAnchorMessage?.messageId,
        roleId: draftRoleId,
      };

      if (messageMode === MOBILE_MESSAGE_MODE.TEXT) {
        if (messageAttachments.length > 0) {
          setMessageSubmitPhase("uploading");
          const uploadedAttachments = await uploadMobileMessageAttachments(mobileApiClient, messageAttachments);
          setMessageSubmitPhase("sending");
          const drafts = buildMessageDraftsFromUploadedMedia({
            inputText: draftMessage,
            uploadedFiles: uploadedAttachments.uploadedFiles,
            uploadedImages: uploadedAttachments.uploadedImages,
            uploadedSoundMessage: uploadedAttachments.uploadedSoundMessage,
            uploadedVideos: uploadedAttachments.uploadedVideos,
          });

          if (drafts.length === 0) {
            throw new Error("消息内容不能为空。");
          }

          await sendRoomMessageMutation.sendDraftMessages(drafts, messageContext);
        }
        else {
          setMessageSubmitPhase("sending");
          await sendRoomMessageMutation.sendTextMessage({
            content: draftMessage,
            ...messageContext,
          });
        }
      }
      else if (messageMode === MOBILE_MESSAGE_MODE.COMMAND_REQUEST) {
        setMessageSubmitPhase("sending");
        await sendRoomMessageMutation.sendCommandRequestMessage({
          command: draftMessage,
          ...messageContext,
        });
      }
      else if (messageMode === MOBILE_MESSAGE_MODE.STATE_EVENT) {
        setMessageSubmitPhase("sending");
        await sendRoomMessageMutation.sendStateEventMessage({
          content: draftMessage,
          ...messageContext,
        });
      }

      setDraftMessage("");
      setMessageAnchorId(null);
      setMessageAttachments([]);
    }
    catch (error) {
      setMessageError(getErrorMessage(error, "发送消息失败。"));
    }
    finally {
      setMessageSubmitPhase("idle");
    }
  };

  const handleSelectMessageAnchor = (message: Message) => {
    setMessageAnchorId(message.messageId ?? null);
    setMessageError(null);
  };

  const handleChangeMessageMode = (mode: MobileMessageMode) => {
    if (isSubmittingMessage) {
      return;
    }

    setMessageMode(mode);
    setMessageError(null);

    if (!canMobileMessageModeUseAttachments(mode)) {
      setMessageAttachments([]);
    }
  };

  const handlePickMessageAttachments = async (kind: typeof MOBILE_MESSAGE_ATTACHMENT_KIND[keyof typeof MOBILE_MESSAGE_ATTACHMENT_KIND]) => {
    setMessageError(null);

    try {
      const pickedAttachments = await pickMobileMessageAttachments(kind);
      if (pickedAttachments.length === 0) {
        return;
      }

      setMessageAttachments((currentAttachments) => {
        return mergePickedMessageAttachments(currentAttachments, pickedAttachments);
      });
    }
    catch (error) {
      setMessageError(getErrorMessage(error, `选择${getMobileMessageAttachmentKindLabel(kind)}失败。`));
    }
  };

  const handleRemoveMessageAttachment = (attachmentId: string) => {
    setMessageAttachments((currentAttachments) => {
      return currentAttachments.filter(attachment => attachment.id !== attachmentId);
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.hero}>
            <ThemedText type="title" style={styles.title}>
              工作台
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {isAuthenticated
                ? "先从空间和房间入口切起，再逐步把消息流和资料页迁进移动端。"
                : "先完成登录，再进入你当前参与的空间与房间。"}
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <SectionHeader title="开发环境" />
            <ThemedText>
              默认 API Base：
              {DEFAULT_TUANCHAT_API_BASE_URL}
            </ThemedText>
            <ThemedText>
              当前状态：
              {isAuthenticated ? "已登录，可读取真实空间/房间数据" : "未登录"}
            </ThemedText>
          </ThemedView>

          {isBootstrapping
            ? (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ActivityIndicator />
                  <ThemedText>正在恢复本地登录态…</ThemedText>
                </ThemedView>
              )
            : null}

          {!isBootstrapping && !isAuthenticated
            ? (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <SectionHeader title="登录" />
                  <LoginMethodToggle currentMethod={loginMethod} onChange={setLoginMethod} />

                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder={loginMethod === "username" ? "请输入用户名" : "请输入用户 ID"}
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                  />

                  <TextInput
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholder="请输入密码"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                  />

                  {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}

                  <Pressable
                    onPress={() => void handleLogin()}
                    disabled={isSigningIn}
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: theme.text,
                        opacity: isSigningIn ? 0.7 : 1,
                      },
                    ]}
                  >
                    {isSigningIn
                      ? <ActivityIndicator color={theme.background} />
                      : <ThemedText style={styles.primaryButtonText}>登录并进入工作台</ThemedText>}
                  </Pressable>
                </ThemedView>
              )
            : null}

          {!isBootstrapping && isAuthenticated
            ? (
                <>
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <SectionHeader
                      title="当前入口"
                      actionLabel="刷新"
                      onPress={() => void handleRefreshWorkspace()}
                      disabled={spacesQuery.isFetching || roomsQuery.isFetching}
                    />
                    <ThemedText>
                      欢迎回来，
                      {session?.username ?? `用户 ${session?.userId ?? "-"}`}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary">
                      已加入空间
                      {activeSpaces.length}
                      个，当前空间下房间
                      {availableRooms.length}
                      个。
                    </ThemedText>
                  </ThemedView>

                  <ThemedView type="backgroundElement" style={styles.card}>
                    <SectionHeader title="空间列表" />
                    {activeSpaces.length > 0
                      ? (
                          <View style={styles.listColumn}>
                            {activeSpaces.map(space => (
                              <ListCardRow
                                key={String(space.spaceId ?? space.name ?? "space")}
                                title={space.name ?? "未命名空间"}
                                subtitle={space.description?.trim() || "未填写空间描述"}
                                selected={space.spaceId === selectedSpaceId}
                                onPress={() => setSelectedSpaceId(space.spaceId ?? null)}
                              />
                            ))}
                          </View>
                        )
                      : renderListState({
                          isPending: spacesQuery.isPending,
                          isError: spacesQuery.isError,
                          error: spacesQuery.error,
                          emptyText: "当前账号还没有未归档空间。",
                        })}
                  </ThemedView>

                  {selectedSpace
                    ? (
                        <ThemedView type="backgroundElement" style={styles.card}>
                          <SectionHeader title="当前空间" />
                          <SpaceSummary space={selectedSpace} />
                        </ThemedView>
                      )
                    : null}

                  {selectedSpace
                    ? (
                        <ThemedView type="backgroundElement" style={styles.card}>
                          <SectionHeader
                            title="空间成员"
                            actionLabel="刷新成员"
                            onPress={() => void spaceMembersQuery.refetch()}
                            disabled={spaceMembersQuery.isFetching}
                          />
                          <ThemedText themeColor="textSecondary">
                            {getCurrentMemberIdentityText(currentSpaceMember)}
                          </ThemedText>
                          <ThemedText themeColor="textSecondary">
                            {spaceMembersQuery.isPending
                              ? "正在同步空间成员列表。"
                              : `当前已识别空间成员 ${spaceMembers.length} 名。`}
                          </ThemedText>
                          <MemberPreviewList
                            currentUserId={currentUserId}
                            emptyText="当前空间还没有可显示的成员。"
                            error={spaceMembersQuery.error}
                            isError={spaceMembersQuery.isError}
                            isPending={spaceMembersQuery.isPending}
                            members={spaceMembers}
                          />
                        </ThemedView>
                      )
                    : null}

                  <ThemedView type="backgroundElement" style={styles.card}>
                    <SectionHeader
                      title="房间列表"
                      actionLabel={selectedSpaceId ? "刷新房间" : undefined}
                      onPress={selectedSpaceId ? () => void roomsQuery.refetch() : undefined}
                      disabled={!selectedSpaceId || roomsQuery.isFetching}
                    />
                    {!selectedSpaceId
                      ? <ThemedText themeColor="textSecondary">先选择一个空间，再加载对应房间。</ThemedText>
                      : availableRooms.length > 0
                        ? (
                            <View style={styles.listColumn}>
                              {availableRooms.map(room => (
                                <ListCardRow
                                  key={String(room.roomId ?? room.name ?? "room")}
                                  title={room.name ?? "未命名房间"}
                                  subtitle={getRoomTypeLabel(room.roomType)}
                                  selected={room.roomId === selectedRoomId}
                                  onPress={() => setSelectedRoomId(room.roomId ?? null)}
                                />
                              ))}
                            </View>
                          )
                        : renderListState({
                            isPending: roomsQuery.isPending,
                            isError: roomsQuery.isError,
                            error: roomsQuery.error,
                            emptyText: "当前空间下暂时没有你加入的房间。",
                          })}
                  </ThemedView>

                  {selectedRoom
                    ? (
                        <ThemedView type="backgroundElement" style={styles.card}>
                          <SectionHeader title="当前房间" />
                          <RoomSummary room={selectedRoom} />
                          <ThemedText themeColor="textSecondary">
                            当前已接入真实消息接口、本地缓存和 websocket 自动刷新；移动端仍暂不上 Thread。
                          </ThemedText>
                        </ThemedView>
                      )
                    : null}

                  {selectedRoom
                    ? (
                        <ThemedView type="backgroundElement" style={styles.card}>
                          <SectionHeader
                            title="房间成员"
                            actionLabel="刷新成员"
                            onPress={() => void roomMembersQuery.refetch()}
                            disabled={roomMembersQuery.isFetching}
                          />
                          <ThemedText themeColor="textSecondary">
                            {getCurrentRoomPresenceText(currentRoomMember, currentSpaceMember)}
                          </ThemedText>
                          <ThemedText themeColor="textSecondary">
                            {roomMembersQuery.isPending
                              ? "正在同步房间成员列表。"
                              : `当前已识别房间成员 ${roomMembers.length} 名。`}
                          </ThemedText>
                          <MemberPreviewList
                            currentUserId={currentUserId}
                            emptyText="当前房间还没有可显示的成员。"
                            error={roomMembersQuery.error}
                            isError={roomMembersQuery.isError}
                            isPending={roomMembersQuery.isPending}
                            members={roomMembers}
                          />
                        </ThemedView>
                      )
                    : null}

                  {selectedRoom
                    ? (
                        <ThemedView type="backgroundElement" style={styles.card}>
                          <SectionHeader
                            title="房间消息"
                            actionLabel="刷新消息"
                            onPress={() => void roomMessagesQuery.refetch()}
                            disabled={roomMessagesQuery.isFetching}
                          />
                          {roomMessagesQuery.isShowingCachedMessages
                            ? (
                                <ThemedText themeColor="textSecondary" style={styles.messageStatusText}>
                                  当前先显示本地缓存，网络同步完成后会自动刷新。
                                </ThemedText>
                              )
                            : null}

                          {roomMessages.length > 0
                            ? (
                                <View style={styles.messageList}>
                                  {roomMessages.map(item => (
                                    <ThemedView
                                      key={String(item.message.messageId)}
                                      type="backgroundSelected"
                                      style={styles.messageItem}
                                    >
                                      <View style={styles.messageMetaRow}>
                                        <ThemedText type="smallBold">
                                          {getMessageAuthorLabel(item.message)}
                                        </ThemedText>
                                        <ThemedText type="small" themeColor="textSecondary">
                                          {formatMessageTime(item.message.createTime)}
                                        </ThemedText>
                                      </View>
                                      <ThemedText>
                                        {getMessagePreview(item.message)}
                                      </ThemedText>
                                      <View style={styles.messageActionRow}>
                                        <Pressable
                                          onPress={() => handleSelectMessageAnchor(item.message)}
                                          style={[
                                            styles.inlineButton,
                                            {
                                              borderColor: theme.background,
                                            },
                                          ]}
                                        >
                                          <ThemedText type="small">
                                            {selectedAnchorMessage?.messageId === item.message.messageId ? "已设为锚点" : "设为回复锚点"}
                                          </ThemedText>
                                        </Pressable>
                                      </View>
                                    </ThemedView>
                                  ))}
                                </View>
                              )
                            : renderListState({
                                isPending: roomMessagesQuery.isPending,
                                isError: roomMessagesQuery.isError,
                                error: roomMessagesQuery.error,
                                emptyText: "当前房间还没有可显示的消息。",
                              })}

                          {roomMessagesQuery.hasNextPage
                            ? (
                                <Pressable
                                  onPress={() => void roomMessagesQuery.fetchNextPage()}
                                  disabled={roomMessagesQuery.isFetchingNextPage}
                                  style={[
                                    styles.secondaryButton,
                                    {
                                      borderColor: theme.backgroundSelected,
                                      opacity: roomMessagesQuery.isFetchingNextPage ? 0.6 : 1,
                                    },
                                  ]}
                                >
                                  <ThemedText>
                                    {roomMessagesQuery.isFetchingNextPage ? "正在加载更早消息…" : "加载更早消息"}
                                  </ThemedText>
                                </Pressable>
                              )
                            : roomMessages.length > 0
                              ? <ThemedText themeColor="textSecondary">历史消息已经加载到头。</ThemedText>
                              : null}

                          <ThemedView style={styles.messageComposer}>
                            <ThemedText type="smallBold">消息发送</ThemedText>
                            <MessageModeToggle
                              currentMode={messageMode}
                              disabled={isSubmittingMessage}
                              onChange={handleChangeMessageMode}
                            />
                            <ThemedText themeColor="textSecondary" style={styles.messageComposerHint}>
                              {getMobileMessageModeHint(messageMode)}
                            </ThemedText>
                            {getMessageSubmitPhaseText(messageSubmitPhase)
                              ? (
                                  <ThemedText themeColor="textSecondary" style={styles.messageStatusText}>
                                    {getMessageSubmitPhaseText(messageSubmitPhase)}
                                  </ThemedText>
                                )
                              : null}
                            {canUseMessageAttachments
                              ? (
                                  <>
                                    <View style={styles.messageActionRow}>
                                      <Pressable
                                        onPress={() => void handlePickMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.FILE)}
                                        disabled={isSubmittingMessage}
                                        style={[
                                          styles.inlineButton,
                                          {
                                            borderColor: theme.backgroundSelected,
                                            opacity: isSubmittingMessage ? 0.6 : 1,
                                          },
                                        ]}
                                      >
                                        <ThemedText type="small">选文件</ThemedText>
                                      </Pressable>
                                      <Pressable
                                        onPress={() => void handlePickMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE)}
                                        disabled={isSubmittingMessage}
                                        style={[
                                          styles.inlineButton,
                                          {
                                            borderColor: theme.backgroundSelected,
                                            opacity: isSubmittingMessage ? 0.6 : 1,
                                          },
                                        ]}
                                      >
                                        <ThemedText type="small">选图片</ThemedText>
                                      </Pressable>
                                      <Pressable
                                        onPress={() => void handlePickMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO)}
                                        disabled={isSubmittingMessage}
                                        style={[
                                          styles.inlineButton,
                                          {
                                            borderColor: theme.backgroundSelected,
                                            opacity: isSubmittingMessage ? 0.6 : 1,
                                          },
                                        ]}
                                      >
                                        <ThemedText type="small">选视频</ThemedText>
                                      </Pressable>
                                      <Pressable
                                        onPress={() => void handlePickMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO)}
                                        disabled={isSubmittingMessage}
                                        style={[
                                          styles.inlineButton,
                                          {
                                            borderColor: theme.backgroundSelected,
                                            opacity: isSubmittingMessage ? 0.6 : 1,
                                          },
                                        ]}
                                      >
                                        <ThemedText type="small">选音频</ThemedText>
                                      </Pressable>
                                      {messageAttachments.length > 0
                                        ? (
                                            <Pressable
                                              onPress={() => setMessageAttachments([])}
                                              disabled={isSubmittingMessage}
                                              style={[
                                                styles.inlineButton,
                                                {
                                                  borderColor: theme.backgroundSelected,
                                                  opacity: isSubmittingMessage ? 0.6 : 1,
                                                },
                                              ]}
                                            >
                                              <ThemedText type="small">清空附件</ThemedText>
                                            </Pressable>
                                          )
                                        : null}
                                    </View>
                                    {messageAttachments.length > 0
                                      ? (
                                          <View style={styles.attachmentList}>
                                            {messageAttachments.map(attachment => (
                                              <ThemedView
                                                key={attachment.id}
                                                type="backgroundSelected"
                                                style={styles.attachmentItem}
                                              >
                                                <View style={styles.attachmentHeaderRow}>
                                                  <ThemedText type="smallBold">
                                                    {attachment.fileName}
                                                  </ThemedText>
                                                  <ThemedView type="background" style={styles.attachmentKindBadge}>
                                                    <ThemedText type="small">
                                                      {getMobileMessageAttachmentKindLabel(attachment.kind)}
                                                    </ThemedText>
                                                  </ThemedView>
                                                </View>
                                                <ThemedText
                                                  themeColor="textSecondary"
                                                  style={styles.attachmentMetaText}
                                                >
                                                  {getMessageAttachmentMetaText(attachment)}
                                                </ThemedText>
                                                <Pressable
                                                  onPress={() => handleRemoveMessageAttachment(attachment.id)}
                                                  disabled={isSubmittingMessage}
                                                  style={[
                                                    styles.inlineButton,
                                                    {
                                                      alignSelf: "flex-start",
                                                      borderColor: theme.background,
                                                      opacity: isSubmittingMessage ? 0.6 : 1,
                                                    },
                                                  ]}
                                                >
                                                  <ThemedText type="small">移除附件</ThemedText>
                                                </Pressable>
                                              </ThemedView>
                                            ))}
                                          </View>
                                        )
                                      : null}
                                  </>
                                )
                              : null}
                            {selectedAnchorMessage
                              ? (
                                  <ThemedView type="backgroundSelected" style={styles.messageAnchorCard}>
                                    <ThemedText type="smallBold">
                                      当前锚点：消息 #
                                      {selectedAnchorMessage.messageId ?? "-"}
                                    </ThemedText>
                                    <ThemedText themeColor="textSecondary">
                                      {getMessagePreview(selectedAnchorMessage)}
                                    </ThemedText>
                                    <Pressable
                                      onPress={() => setMessageAnchorId(null)}
                                      style={[
                                        styles.inlineButton,
                                        {
                                          alignSelf: "flex-start",
                                          borderColor: theme.background,
                                        },
                                      ]}
                                    >
                                      <ThemedText type="small">清空锚点</ThemedText>
                                    </Pressable>
                                  </ThemedView>
                                )
                              : null}
                            <TextInput
                              editable={!isSubmittingMessage}
                              multiline
                              value={draftMessage}
                              onChangeText={setDraftMessage}
                              placeholder={getMobileMessageInputPlaceholder(messageMode)}
                              placeholderTextColor={theme.textSecondary}
                              style={[
                                styles.messageInput,
                                {
                                  borderColor: theme.backgroundSelected,
                                  color: theme.text,
                                },
                              ]}
                            />
                            <TextInput
                              editable={!isSubmittingMessage}
                              keyboardType="number-pad"
                              value={draftRoleIdInput}
                              onChangeText={setDraftRoleIdInput}
                              placeholder="角色 ID（可选，.st 通常需要）"
                              placeholderTextColor={theme.textSecondary}
                              style={[
                                styles.input,
                                {
                                  borderColor: theme.backgroundSelected,
                                  color: theme.text,
                                },
                              ]}
                            />
                            {messageError ? <ThemedText style={styles.errorText}>{messageError}</ThemedText> : null}
                            {messageError && (draftMessage.trim().length > 0 || messageAttachments.length > 0)
                              ? (
                                  <ThemedText themeColor="textSecondary" style={styles.messageStatusText}>
                                    发送失败后会保留当前草稿和附件，修正后可直接再次发送。
                                  </ThemedText>
                                )
                              : null}
                            <Pressable
                              onPress={() => void handleSendRoomMessage()}
                              disabled={isSubmittingMessage}
                              style={[
                                styles.primaryButton,
                                {
                                  backgroundColor: theme.text,
                                  opacity: isSubmittingMessage
                                    ? 0.7
                                    : 1,
                                },
                              ]}
                            >
                              {isSubmittingMessage
                                ? <ActivityIndicator color={theme.background} />
                                : <ThemedText style={styles.primaryButtonText}>{getMobileMessageSubmitLabel(messageMode)}</ThemedText>}
                            </Pressable>
                          </ThemedView>
                        </ThemedView>
                      )
                    : null}
                </>
              )
            : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
