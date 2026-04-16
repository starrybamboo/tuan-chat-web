import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { LoginMethod } from "@/features/auth/auth-session";
import type {
  MobileMessageAttachment,
  MobileMessageAttachmentKind,
} from "@/features/messages/mobileMessageAttachment";
import type { MobileMessageMode } from "@/features/messages/mobileMessageComposer";
import { buildMessageDraftsFromUploadedMedia } from "@tuanchat/domain/message-draft";
import { SymbolView } from "expo-symbols";
import {
  type ComponentProps,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import {
  findCurrentMember,
  mergeRoomMembersWithSpaceMembers,
} from "@/features/members/memberUtils";
import { useRoomMembersQuery } from "@/features/members/useRoomMembersQuery";
import { useSpaceMembersQuery } from "@/features/members/useSpaceMembersQuery";
import {
  mergePickedMessageAttachments,
  pickMobileMessageAttachments,
} from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import {
  canMobileMessageModeUseAttachments,
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

import { MobileChatComposer } from "./mobileChatComposer";
import { MobileChatDrawer } from "./mobileChatDrawer";
import {
  MobileChatMembersSheet,
  MobileChatSearchSheet,
  MobileChatToolSheet,
} from "./mobileChatOverlays";
import {
  buildMessageSearchText,
  formatMessageTime,
  getErrorMessage,
  getMessageAuthorLabel,
  getMessagePreview,
  getRoomTypeLabel,
  getSpaceStatusLabel,
  parsePositiveIntegerInput,
  type MessageSubmitPhase,
} from "./mobileChatUtils";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loginScrollContent: {
    flexGrow: 1,
    gap: Spacing.three,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  loginHero: {
    gap: Spacing.two,
  },
  loginCard: {
    borderRadius: Spacing.four,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  loginMethodRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  loginMethodChip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  input: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: Spacing.three,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  errorText: {
    color: "#c0392b",
  },
  chatShell: {
    flex: 1,
  },
  chatSurface: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.one,
  },
  headerInner: {
    alignItems: "center",
    borderRadius: Spacing.three,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 40,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: Spacing.three,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 32,
  },
  roomBadgeRow: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  roomBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  body: {
    flex: 1,
    gap: Spacing.two,
  },
  bodyContent: {
    flex: 1,
  },
  banner: {
    borderRadius: Spacing.three,
    marginHorizontal: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  messageScroll: {
    flex: 1,
  },
  messageContent: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  stateBlock: {
    alignItems: "center",
    gap: Spacing.two,
    justifyContent: "center",
    paddingVertical: Spacing.six,
  },
  stateCard: {
    borderRadius: Spacing.four,
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  messageCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  messageMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  messageFooterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  inlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  loadMoreButton: {
    alignItems: "center",
    borderRadius: Spacing.three,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});

function HeaderButton({
  disabled,
  iconName,
  label,
  onPress,
}: {
  disabled?: boolean;
  iconName: ComponentProps<typeof SymbolView>["name"];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.headerButton,
        {
          opacity: disabled ? 0.45 : 1,
        },
      ]}
      accessibilityLabel={label}
    >
      <SymbolView
        name={iconName}
        size={18}
        tintColor={theme.text}
        weight="semibold"
      />
    </Pressable>
  );
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
    <View style={styles.loginMethodRow}>
      {(["username", "userId"] as const).map(method => {
        const selected = currentMethod === method;
        return (
          <Pressable
            key={method}
            onPress={() => onChange(method)}
            style={[
              styles.loginMethodChip,
              {
                backgroundColor: selected ? theme.backgroundSelected : theme.background,
                borderColor: selected ? theme.text : theme.backgroundSelected,
              },
            ]}
          >
            <ThemedText type="smallBold">{method === "username" ? "用户名" : "用户 ID"}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function LoginView({
  errorMessage,
  identifier,
  isSigningIn,
  loginMethod,
  onChangeIdentifier,
  onChangeLoginMethod,
  onChangePassword,
  onSubmit,
  password,
}: {
  errorMessage: string | null;
  identifier: string;
  isSigningIn: boolean;
  loginMethod: LoginMethod;
  onChangeIdentifier: (nextValue: string) => void;
  onChangeLoginMethod: (nextValue: LoginMethod) => void;
  onChangePassword: (nextValue: string) => void;
  onSubmit: () => void;
  password: string;
}) {
  const theme = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.loginScrollContent}>
      <View style={styles.loginHero}>
        <ThemedText type="subtitle">聊天入口</ThemedText>
        <ThemedText themeColor="textSecondary">
          默认直接进入桌面端窄宽度的暗色聊天壳层，先登录再看实际空间与频道结构。
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={styles.loginCard}>
        <ThemedText type="smallBold">登录</ThemedText>
        <LoginMethodToggle currentMethod={loginMethod} onChange={onChangeLoginMethod} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeIdentifier}
          placeholder={loginMethod === "username" ? "请输入用户名" : "请输入用户 ID"}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              borderColor: theme.backgroundSelected,
              color: theme.text,
            },
          ]}
          value={identifier}
        />
        <TextInput
          onChangeText={onChangePassword}
          placeholder="请输入密码"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          style={[
            styles.input,
            {
              borderColor: theme.backgroundSelected,
              color: theme.text,
            },
          ]}
          value={password}
        />
        <ThemedText themeColor="textSecondary">
          API Base：
          {DEFAULT_TUANCHAT_API_BASE_URL}
        </ThemedText>
        {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}
        <Pressable
          disabled={isSigningIn}
          onPress={onSubmit}
          style={[
            styles.primaryButton,
            {
              backgroundColor: theme.text,
              opacity: isSigningIn ? 0.72 : 1,
            },
          ]}
        >
          {isSigningIn
            ? <ActivityIndicator color={theme.background} />
            : <ThemedText style={styles.primaryButtonText}>登录并进入聊天</ThemedText>}
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

function StateCard({
  actionLabel,
  description,
  onPress,
  title,
}: {
  actionLabel?: string;
  description: string;
  onPress?: () => void;
  title: string;
}) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.stateCard}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>
      {actionLabel && onPress
        ? (
            <Pressable
              onPress={onPress}
              style={[
                styles.inlineButton,
                {
                  alignSelf: "flex-start",
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText type="smallBold">{actionLabel}</ThemedText>
            </Pressable>
          )
        : null}
    </ThemedView>
  );
}

function RoomMessageCard({
  currentUserId,
  isSelectedAnchor,
  message,
  onSelectAnchor,
}: {
  currentUserId: number | null;
  isSelectedAnchor: boolean;
  message: Message;
  onSelectAnchor: (message: Message) => void;
}) {
  const theme = useTheme();
  const isMine = typeof currentUserId === "number" && currentUserId === message.userId;

  return (
    <ThemedView
      type={isSelectedAnchor ? "backgroundSelected" : isMine ? "backgroundElement" : "background"}
      style={[
        styles.messageCard,
        {
          borderColor: isSelectedAnchor ? theme.text : theme.backgroundSelected,
          borderWidth: isSelectedAnchor ? 1 : 0,
        },
      ]}
    >
      <View style={styles.messageMetaRow}>
        <ThemedText type="smallBold">
          {getMessageAuthorLabel(message)}
          {isMine ? "（你）" : ""}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {formatMessageTime(message.createTime)}
        </ThemedText>
      </View>
      <ThemedText>{getMessagePreview(message)}</ThemedText>
      <View style={styles.messageFooterRow}>
        <ThemedText themeColor="textSecondary" type="small">
          消息 #
          {message.messageId ?? "-"}
        </ThemedText>
        <Pressable
          onPress={() => onSelectAnchor(message)}
          style={[
            styles.inlineButton,
            {
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          <ThemedText type="smallBold">
            {isSelectedAnchor ? "已设锚点" : "回复"}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

export default function MobileChatScreen() {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const previousRoomIdRef = useRef<number | null>(null);
  const previousLastMessageIdRef = useRef<number | null>(null);

  const { isAuthenticated, isBootstrapping, isSigningIn, session, signIn, signOut } = useAuthSession();
  const { selectedSpaceId, selectedRoomId, setSelectedRoomId, setSelectedSpaceId } = useWorkspaceSession();
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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftRoleIdInput, setDraftRoleIdInput] = useState("");
  const [messageAnchorId, setMessageAnchorId] = useState<number | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageMode, setMessageMode] = useState<MobileMessageMode>(MOBILE_MESSAGE_MODE.TEXT);
  const [messageSubmitPhase, setMessageSubmitPhase] = useState<MessageSubmitPhase>("idle");
  const [messageAttachments, setMessageAttachments] = useState<MobileMessageAttachment[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(true);
  const [toolSheetVisible, setToolSheetVisible] = useState(false);
  const [membersSheetVisible, setMembersSheetVisible] = useState(false);
  const [searchSheetVisible, setSearchSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentUserId = session?.userId ?? null;
  const activeSpaces = useMemo(() => spacesQuery.data?.data ?? [], [spacesQuery.data?.data]);
  const availableRooms = useMemo(() => roomsQuery.data?.data?.rooms ?? [], [roomsQuery.data?.data?.rooms]);
  const spaceMembers = useMemo(() => spaceMembersQuery.data?.data ?? [], [spaceMembersQuery.data?.data]);
  const roomMembers = useMemo(() => {
    return mergeRoomMembersWithSpaceMembers(roomMembersQuery.data?.data ?? [], spaceMembers);
  }, [roomMembersQuery.data?.data, spaceMembers]);
  const roomMessages = useMemo(() => roomMessagesQuery.messages, [roomMessagesQuery.messages]);
  const selectedSpace = useMemo(() => {
    return activeSpaces.find(space => space.spaceId === selectedSpaceId) ?? null;
  }, [activeSpaces, selectedSpaceId]);
  const selectedRoom = useMemo(() => {
    return availableRooms.find(room => room.roomId === selectedRoomId) ?? null;
  }, [availableRooms, selectedRoomId]);
  const currentSpaceMember = useMemo(() => {
    return findCurrentMember(spaceMembers, currentUserId);
  }, [currentUserId, spaceMembers]);
  const currentRoomMember = useMemo(() => {
    return findCurrentMember(roomMembers, currentUserId);
  }, [currentUserId, roomMembers]);
  const selectedAnchorMessage = useMemo(() => {
    return roomMessages.find(item => item.message.messageId === messageAnchorId)?.message ?? null;
  }, [messageAnchorId, roomMessages]);
  const canUseMessageAttachments = useMemo(() => {
    return canMobileMessageModeUseAttachments(messageMode);
  }, [messageMode]);
  const isSubmittingMessage = useMemo(() => {
    return messageSubmitPhase !== "idle" || sendRoomMessageMutation.isPending;
  }, [messageSubmitPhase, sendRoomMessageMutation.isPending]);
  const draftRoleId = useMemo(() => parsePositiveIntegerInput(draftRoleIdInput), [draftRoleIdInput]);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchResults = useMemo(() => {
    const keyword = deferredSearchQuery.trim().toLocaleLowerCase("zh-CN");
    if (!keyword) {
      return [];
    }

    return roomMessages
      .map(item => item.message)
      .filter(message => buildMessageSearchText(message).includes(keyword))
      .slice(-50)
      .reverse();
  }, [deferredSearchQuery, roomMessages]);
  const lastMessageId = roomMessages[roomMessages.length - 1]?.message.messageId ?? null;
  const isRefreshingWorkspace = spacesQuery.isFetching
    || roomsQuery.isFetching
    || roomMessagesQuery.isFetching
    || spaceMembersQuery.isFetching
    || roomMembersQuery.isFetching;

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const availableSpaceIds = activeSpaces
      .map(space => space.spaceId)
      .filter((spaceId): spaceId is number => typeof spaceId === "number" && spaceId > 0);

    if (availableSpaceIds.length === 0) {
      if (selectedSpaceId !== null) {
        startTransition(() => {
          setSelectedSpaceId(null);
        });
      }
      return;
    }

    if (!selectedSpaceId || !availableSpaceIds.includes(selectedSpaceId)) {
      startTransition(() => {
        setSelectedSpaceId(availableSpaceIds[0]);
      });
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
        startTransition(() => {
          setSelectedRoomId(null);
        });
      }
      return;
    }

    if (!selectedRoomId || !availableRoomIds.includes(selectedRoomId)) {
      startTransition(() => {
        setSelectedRoomId(availableRoomIds[0]);
      });
    }
  }, [availableRooms, isAuthenticated, selectedRoomId, selectedSpaceId, setSelectedRoomId]);

  useEffect(() => {
    setDraftMessage("");
    setDraftRoleIdInput("");
    setMessageAnchorId(null);
    setMessageAttachments([]);
    setMessageError(null);
    setMessageMode(MOBILE_MESSAGE_MODE.TEXT);
    setMessageSubmitPhase("idle");
    setSearchQuery("");
    setSearchSheetVisible(false);
    setMembersSheetVisible(false);
    setToolSheetVisible(false);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setDrawerVisible(true);
      return;
    }
    setDrawerVisible(true);
  }, [isAuthenticated]);

  useEffect(() => {
    if (messageAnchorId && !selectedAnchorMessage) {
      setMessageAnchorId(null);
    }
  }, [messageAnchorId, selectedAnchorMessage]);

  useEffect(() => {
    const roomChanged = previousRoomIdRef.current !== selectedRoomId;
    const newestChanged = previousLastMessageIdRef.current !== lastMessageId;

    previousRoomIdRef.current = selectedRoomId;
    previousLastMessageIdRef.current = lastMessageId;

    if (!selectedRoomId || lastMessageId === null) {
      return;
    }

    if (!roomChanged && !newestChanged) {
      return;
    }

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: !roomChanged,
      });
    }, 16);

    return () => {
      clearTimeout(timer);
    };
  }, [lastMessageId, selectedRoomId]);

  const handleLogin = async () => {
    setLoginError(null);

    try {
      await signIn({
        identifier,
        method: loginMethod,
        password,
      });
      setPassword("");
    }
    catch (error) {
      setLoginError(getErrorMessage(error, "登录失败。"));
    }
  };

  const handleRefreshWorkspace = async () => {
    await spacesQuery.refetch();

    if (selectedSpaceId) {
      await Promise.all([
        roomsQuery.refetch(),
        spaceMembersQuery.refetch(),
      ]);
    }

    if (selectedRoomId) {
      await Promise.all([
        roomMembersQuery.refetch(),
        roomMessagesQuery.refetch(),
      ]);
    }
  };

  const handleSelectSpace = (spaceId: number | null) => {
    startTransition(() => {
      setSelectedSpaceId(spaceId);
    });
  };

  const handleSelectRoom = (roomId: number | null) => {
    startTransition(() => {
      setSelectedRoomId(roomId);
    });
    setDrawerVisible(false);
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

  const handlePickMessageAttachments = async (kind: MobileMessageAttachmentKind) => {
    setMessageError(null);

    try {
      const pickedAttachments = await pickMobileMessageAttachments(kind);
      if (pickedAttachments.length === 0) {
        return;
      }

      setMessageAttachments(currentAttachments => {
        return mergePickedMessageAttachments(currentAttachments, pickedAttachments);
      });
    }
    catch (error) {
      setMessageError(getErrorMessage(error, "选择附件失败。"));
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
      else {
        setMessageSubmitPhase("sending");
        await sendRoomMessageMutation.sendStateEventMessage({
          content: draftMessage,
          ...messageContext,
        });
      }

      setDraftMessage("");
      setDraftRoleIdInput("");
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

  const handleOpenSearch = () => {
    setToolSheetVisible(false);
    setSearchSheetVisible(true);
  };

  const handleOpenMembers = () => {
    setToolSheetVisible(false);
    setMembersSheetVisible(true);
  };

  const handleSignOut = async () => {
    setToolSheetVisible(false);
    setMembersSheetVisible(false);
    setSearchSheetVisible(false);
    await signOut();
  };

  const handleMobileBack = () => {
    if (membersSheetVisible) {
      setMembersSheetVisible(false);
      return;
    }
    if (searchSheetVisible) {
      setSearchSheetVisible(false);
      return;
    }
    if (toolSheetVisible) {
      setToolSheetVisible(false);
      return;
    }
    setDrawerVisible(true);
  };

  if (isBootstrapping) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateBlock}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">正在恢复本地登录态…</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <LoginView
            errorMessage={loginError}
            identifier={identifier}
            isSigningIn={isSigningIn}
            loginMethod={loginMethod}
            onChangeIdentifier={setIdentifier}
            onChangeLoginMethod={setLoginMethod}
            onChangePassword={setPassword}
            onSubmit={() => void handleLogin()}
            password={password}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          style={styles.chatShell}
        >
          <ThemedView type="backgroundSelected" style={styles.chatSurface}>
            <View
              style={[
                styles.header,
                {
                  borderBottomColor: theme.backgroundSelected,
                },
              ]}
            >
              <View
                style={[
                  styles.headerInner,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
              >
                <HeaderButton
                  iconName={{ ios: "chevron.left", android: "arrow_back", web: "chevron_left" }}
                  label="返回聊天"
                  onPress={handleMobileBack}
                />
                <View style={styles.headerTitleWrap}>
                  <ThemedText numberOfLines={1} type="smallBold">
                    {selectedRoom ? `「 ${selectedRoom.name ?? "未命名房间"} 」` : "未选择房间"}
                  </ThemedText>
                </View>
                <HeaderButton
                  disabled={!selectedRoom}
                  iconName={{ ios: "ellipsis", android: "more_vert", web: "more_vert" }}
                  label="工具菜单"
                  onPress={() => setToolSheetVisible(true)}
                />
              </View>
            </View>

            {selectedRoom
              ? (
                  <View style={styles.roomBadgeRow}>
                    <ThemedView type="backgroundElement" style={styles.roomBadge}>
                      <ThemedText type="small">{getRoomTypeLabel(selectedRoom.roomType)}</ThemedText>
                    </ThemedView>
                    <ThemedView type="backgroundElement" style={styles.roomBadge}>
                      <ThemedText type="small">
                        {selectedSpace ? getSpaceStatusLabel(selectedSpace.status) : "未连接"}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView type="backgroundElement" style={styles.roomBadge}>
                      <ThemedText type="small">
                        成员
                        {roomMembers.length}
                      </ThemedText>
                    </ThemedView>
                  </View>
                )
              : null}

            <View style={styles.body}>
              {roomMessagesQuery.isShowingCachedMessages
                ? (
                    <ThemedView type="backgroundElement" style={styles.banner}>
                      <ThemedText themeColor="textSecondary" type="small">
                        当前展示的是本地缓存消息，网络同步完成后会自动刷新。
                      </ThemedText>
                    </ThemedView>
                  )
                : null}

              <View style={styles.bodyContent}>
                {!selectedSpace
                  ? (
                      <StateCard
                        actionLabel="打开菜单"
                        description="当前账号没有可用空间，或空间列表尚未完成同步。"
                        onPress={() => setDrawerVisible(true)}
                        title="还没有空间"
                      />
                    )
                  : !selectedRoom
                    ? (
                        <StateCard
                          actionLabel="打开菜单"
                          description="当前空间下没有可进入房间，先从左侧抽屉切换空间或刷新。"
                          onPress={() => setDrawerVisible(true)}
                          title="还没有房间"
                        />
                      )
                    : (
                        <>
                          <ScrollView
                            ref={scrollRef}
                            style={styles.messageScroll}
                            contentContainerStyle={styles.messageContent}
                          >
                            {roomMessagesQuery.hasNextPage
                              ? (
                                  <Pressable
                                    disabled={roomMessagesQuery.isFetchingNextPage}
                                    onPress={() => void roomMessagesQuery.fetchNextPage()}
                                    style={[
                                      styles.loadMoreButton,
                                      {
                                        borderColor: theme.backgroundSelected,
                                        opacity: roomMessagesQuery.isFetchingNextPage ? 0.65 : 1,
                                      },
                                    ]}
                                  >
                                    <ThemedText>
                                      {roomMessagesQuery.isFetchingNextPage ? "正在加载更早消息…" : "加载更早消息"}
                                    </ThemedText>
                                  </Pressable>
                                )
                              : null}

                            {roomMessagesQuery.isPending && roomMessages.length === 0
                              ? (
                                  <View style={styles.stateBlock}>
                                    <ActivityIndicator />
                                    <ThemedText themeColor="textSecondary">正在加载消息…</ThemedText>
                                  </View>
                                )
                              : null}

                            {roomMessagesQuery.isError && roomMessages.length === 0
                              ? (
                                  <ThemedText style={styles.errorText}>
                                    {getErrorMessage(roomMessagesQuery.error, "加载消息失败，请稍后重试。")}
                                  </ThemedText>
                                )
                              : null}

                            {roomMessagesQuery.isError && roomMessages.length > 0
                              ? (
                                  <ThemedText style={styles.errorText}>
                                    {getErrorMessage(roomMessagesQuery.error, "消息列表刷新失败，当前先展示已加载内容。")}
                                  </ThemedText>
                                )
                              : null}

                            {!roomMessagesQuery.isPending && roomMessages.length === 0
                              ? (
                                  <View style={styles.stateBlock}>
                                    <ThemedText themeColor="textSecondary">当前房间还没有消息。</ThemedText>
                                  </View>
                                )
                              : null}

                            {roomMessages.map(item => (
                              <RoomMessageCard
                                key={String(item.message.messageId)}
                                currentUserId={currentUserId}
                                isSelectedAnchor={selectedAnchorMessage?.messageId === item.message.messageId}
                                message={item.message}
                                onSelectAnchor={handleSelectMessageAnchor}
                              />
                            ))}
                          </ScrollView>

                          <MobileChatComposer
                            anchorMessage={selectedAnchorMessage}
                            canUseAttachments={canUseMessageAttachments}
                            draftMessage={draftMessage}
                            draftRoleIdInput={draftRoleIdInput}
                            errorMessage={messageError}
                            isSubmitting={isSubmittingMessage}
                            messageAttachments={messageAttachments}
                            messageMode={messageMode}
                            onChangeDraftMessage={setDraftMessage}
                            onChangeDraftRoleIdInput={setDraftRoleIdInput}
                            onChangeMessageMode={handleChangeMessageMode}
                            onClearAnchor={() => setMessageAnchorId(null)}
                            onClearAttachments={() => setMessageAttachments([])}
                            onPickAttachment={kind => void handlePickMessageAttachments(kind)}
                            onRemoveAttachment={(attachmentId) => {
                              setMessageAttachments(currentAttachments => {
                                return currentAttachments.filter(attachment => attachment.id !== attachmentId);
                              });
                            }}
                            onSend={() => void handleSendRoomMessage()}
                            submitPhase={messageSubmitPhase}
                          />
                        </>
                      )}
              </View>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <MobileChatDrawer
        currentRoomId={selectedRoomId}
        currentRoomMember={currentRoomMember}
        currentSpaceId={selectedSpaceId}
        currentSpaceMember={currentSpaceMember}
        currentUserId={currentUserId}
        currentUsername={session?.username}
        memberCount={roomMembers.length}
        onOpenMembers={handleOpenMembers}
        onOpenSearch={handleOpenSearch}
        onOpenTools={() => setToolSheetVisible(true)}
        onRefreshWorkspace={() => void handleRefreshWorkspace()}
        onRequestClose={() => setDrawerVisible(false)}
        onSelectRoom={handleSelectRoom}
        onSelectSpace={handleSelectSpace}
        rooms={availableRooms}
        roomsError={roomsQuery.error}
        roomsIsError={roomsQuery.isError}
        roomsIsPending={roomsQuery.isPending}
        spaces={activeSpaces}
        spacesError={spacesQuery.error}
        spacesIsError={spacesQuery.isError}
        spacesIsPending={spacesQuery.isPending}
        visible={drawerVisible}
      />

      <MobileChatToolSheet
        isRefreshing={isRefreshingWorkspace}
        onClose={() => setToolSheetVisible(false)}
        onOpenMembers={handleOpenMembers}
        onOpenSearch={handleOpenSearch}
        onRefresh={() => void handleRefreshWorkspace()}
        onSignOut={() => void handleSignOut()}
        roomName={selectedRoom?.name ?? "未选择房间"}
        spaceName={selectedSpace?.name ?? "未选择空间"}
        visible={toolSheetVisible}
      />

      <MobileChatSearchSheet
        currentRoomName={selectedRoom?.name ?? "未选择房间"}
        onChangeQuery={setSearchQuery}
        onClose={() => setSearchSheetVisible(false)}
        onSelectMessage={(message) => {
          handleSelectMessageAnchor(message);
          setSearchSheetVisible(false);
        }}
        query={searchQuery}
        results={searchResults}
        visible={searchSheetVisible}
      />

      <MobileChatMembersSheet
        currentRoomMember={currentRoomMember}
        currentSpaceMember={currentSpaceMember}
        currentUserId={currentUserId}
        error={roomMembersQuery.error}
        isError={roomMembersQuery.isError}
        isPending={roomMembersQuery.isPending}
        members={roomMembers}
        onClose={() => setMembersSheetVisible(false)}
        roomName={selectedRoom?.name ?? "未选择房间"}
        visible={membersSheetVisible}
      />
    </ThemedView>
  );
}
