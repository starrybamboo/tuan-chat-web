import type { AlertButton } from "react-native";
import type { GestureType } from "react-native-gesture-handler";

import { useQueryClient } from "@tanstack/react-query";
import { buildMessageDraftsFromUploadedMedia } from "@tuanchat/domain/message-draft";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,

  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DrawerMode } from "@/features/drawer/LeftDrawer";
import type { MemberPreviewItem } from "@/features/members/memberUtils";
import type { MobileMessageAttachment, MobileMessageAttachmentKind } from "@/features/messages/mobileMessageAttachment";
import type { MobileMessageMode } from "@/features/messages/mobileMessageComposer";
import type { ClueFolderScope } from "@tuanchat/domain/clue-folder";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { LeftDrawer } from "@/features/drawer/LeftDrawer";
import { DmChatView } from "@/features/friends/DmChatView";
import { DmContactDrawer } from "@/features/friends/DmContactDrawer";
import {
  DEFAULT_DM_BACK_TARGET,
  DEFAULT_DM_TAB,
  getDmTabForBackTarget,
  resolveDmEntryNavigationState,
} from "@/features/friends/dmNavigationState";
import { useDmInboxQuery } from "@/features/friends/useDmInboxQuery";
import {
  findCurrentMember,
  hasHostMemberType,

  mergeRoomMembersWithSpaceMembers,
} from "@/features/members/memberUtils";
import { useRoomMembersQuery } from "@/features/members/useRoomMembersQuery";
import { useSpaceMembersQuery } from "@/features/members/useSpaceMembersQuery";
import { executeMobileDicerCommand } from "@/features/messages/mobileDiceCommandExecutor";
import {
  mergePickedMessageAttachments,
  pickMobileMessageAttachments,
} from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import {
  canMobileMessageModeUseAttachments,
  MOBILE_MESSAGE_MODE,
} from "@/features/messages/mobileMessageComposer";
import { useMobileCommandRequests } from "@/features/messages/useMobileCommandRequests";
import { useDeleteRoomMessageMutation, useEditRoomMessageMutation } from "@/features/messages/useRoomMessageMutations";
import { useRoomMessagesLiveSync } from "@/features/messages/useRoomMessagesLiveSync";
import { useRoomMessagesQuery } from "@/features/messages/useRoomMessagesQuery";
import { useSendRoomMessageMutation } from "@/features/messages/useSendRoomMessageMutation";
import { UserProfileSheet } from "@/features/profile/UserProfileSheet";
import { RoleSwitchSheet } from "@/features/roles/RoleSwitchSheet";
import { useRoomRolesQuery } from "@/features/roles/useRoomRolesQuery";
import { CreateRoomSheet } from "@/features/rooms/CreateRoomSheet";
import { useUserRoomsQuery } from "@/features/rooms/use-user-rooms-query";
import { useRoomUnreadCounts } from "@/features/rooms/useRoomUnreadCounts";
import { CreateSpaceSheet } from "@/features/spaces/CreateSpaceSheet";
import { useUserActiveSpacesQuery } from "@/features/spaces/use-user-active-spaces-query";
import { useWorkspaceSession } from "@/features/workspace/workspace-session";
import { useTheme } from "@/hooks/use-theme";
import { useGestureDrawer } from "@/hooks/useGestureDrawer";
import { shouldDrawerOverlayCaptureTouches } from "@/hooks/useGestureDrawerConfig";
import { mobileApiClient } from "@/lib/api";
import * as Clipboard from "@/lib/clipboard";
import { confirmAction } from "@/lib/confirm";
import { LEFT_DRAWER_WIDTH, RIGHT_DRAWER_WIDTH } from "@/lib/layout-constants";
import { containsCommandRequestAllToken, extractFirstCommandText, isCommand, stripCommandRequestAllToken } from "@tuanchat/domain/command-request";
import { canManageMemberPermissions, SPACE_MEMBER_TYPE } from "@tuanchat/domain/member-permissions";
import { resolveSendIdentity } from "@tuanchat/domain/room-identity";
import { useCopyMessageToClueFolderMutation } from "@tuanchat/query/clue-folder";
import { getRoomMembersQueryKey, getSpaceMembersQueryKey } from "@tuanchat/query/members";
import { selectVisibleMainRoomMessages } from "@tuanchat/query/room-message";
import { getUserActiveSpacesQueryKey, getUserRoomsQueryKey, upsertUserActiveSpaceQueryData, upsertUserRoomQueryData } from "@tuanchat/query/spaces";

import type { StShowCardModel } from "../../components/common/dicer/cmdExe/stShowCard";
import type { MessageAction } from "./MessageActionMenu";

import { buildRoomRolesById } from "./chat-avatar-utils";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSearchPage } from "./ChatSearchPage";
import { ExpressionPickerSheet } from "./ExpressionPickerSheet";
import { buildExpressionDraftAsset } from "./expressionSticker";
import { MapSheet } from "./MapSheet";
import { MessageActionMenu } from "./MessageActionMenu";
import { getErrorMessage } from "./mobileChatUtils";
import {
  getMobileNavigableRooms,
  getMobileVisibleClueRooms,
  resolveAutoSelectedSpaceId,
  shouldClearStaleRouteRoom,
} from "./mobileRouteSelection";
import { MobileStShowCardSheet } from "./MobileStShowCardSheet";
import { RightDrawerPanel } from "./RightDrawerPanel";

function readSingleSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim() || null;
  }
  return null;
}

function parsePositiveIntegerSearchParam(value: string | string[] | undefined): number | null {
  const rawValue = readSingleSearchParam(value);
  if (!rawValue) {
    return null;
  }
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

type ProfileSheetState = {
  avatarFileId?: number | null;
  userId: number | null;
  username: string | null;
};

/* PLACEHOLDER_STYLES */
const styles = StyleSheet.create({
  shell: { flex: 1 },
  safeArea: { flex: 1 },
  kav: { flex: 1 },
  panelContainer: { flex: 1, overflow: "hidden" },
  center: { flex: 1 },
  leftDrawer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: LEFT_DRAWER_WIDTH,
  },
  rightDrawer: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: RIGHT_DRAWER_WIDTH,
  },
  overlay: {
    backgroundColor: "#000",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  clueScopeOverlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  clueScopeSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  clueScopeHandle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: Spacing.lg,
    width: 36,
  },
  clueScopeAction: {
    borderRadius: Radius.md,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
});

export default function ChatShell() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const { selectedSpaceId, selectedRoomId, setSelectedRoomId, setSelectedSpaceId } = useWorkspaceSession();
  const searchParams = useLocalSearchParams();
  const messageListScrollGesture = useMemo<GestureType>(() => Gesture.Native(), []);
  const {
    panGesture,
    openLeft,
    close,
    closeImmediately,
    closeWithSwipeHint,
    centerStyle,
    leftDrawerStyle,
    rightDrawerStyle,
    overlayStyle,
    translateX,
  } = useGestureDrawer(messageListScrollGesture);

  const [isOverlayInteractive, setIsOverlayInteractive] = useState(false);

  // 只有抽屉真正偏移时才让遮罩接管点击，避免挡住中心区交互。
  useAnimatedReaction(
    () => shouldDrawerOverlayCaptureTouches(translateX.get()),
    (isVisible, prev) => {
      if (isVisible !== prev) {
        runOnJS(setIsOverlayInteractive)(isVisible);
      }
    },
    [setIsOverlayInteractive],
  );

  const spacesQuery = useUserActiveSpacesQuery();
  const roomsQuery = useUserRoomsQuery(selectedSpaceId);
  const spaceMembersQuery = useSpaceMembersQuery(selectedSpaceId);
  const roomMembersQuery = useRoomMembersQuery(selectedRoomId);
  const roomMessagesQuery = useRoomMessagesQuery(selectedRoomId);
  useRoomMessagesLiveSync(selectedRoomId);
  const sendRoomMessageMutation = useSendRoomMessageMutation(selectedRoomId, session?.userId ?? 0);
  const copyMessageToClueFolderMutation = useCopyMessageToClueFolderMutation(mobileApiClient);
  const { editMessage } = useEditRoomMessageMutation(selectedRoomId);
  const { deleteMessage, deleteMessages } = useDeleteRoomMessageMutation(selectedRoomId);
  const roomRolesQuery = useRoomRolesQuery(selectedRoomId);
  const roomUnreadCounts = useRoomUnreadCounts(selectedRoomId);

  const [draftMessage, setDraftMessage] = useState("");
  const [draftRoleIdInput, setDraftRoleIdInput] = useState("");
  const [draftCustomRoleName, setDraftCustomRoleName] = useState("");
  const [messageAnchorId, setMessageAnchorId] = useState<number | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageMode, setMessageMode] = useState<MobileMessageMode>(MOBILE_MESSAGE_MODE.TEXT);
  const messageSendInFlightRef = useRef(false);
  const [messageAttachments, setMessageAttachments] = useState<MobileMessageAttachment[]>([]);
  const draftMessageRef = useRef(draftMessage);
  const draftRoleIdInputRef = useRef(draftRoleIdInput);
  const messageAnchorIdRef = useRef(messageAnchorId);
  const messageAttachmentsRef = useRef(messageAttachments);
  const [actionMenuMessage, setActionMenuMessage] = useState<Message | null>(null);
  const [clueScopeMessage, setClueScopeMessage] = useState<Message | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<number>>(() => new Set());
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | undefined>(undefined);
  const [selectedAvatarFileId, setSelectedAvatarFileId] = useState<number | undefined>(undefined);
  const [roleSwitchVisible, setRoleSwitchVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("rooms");
  const [currentContactId, setCurrentContactId] = useState<number | null>(null);
  const [activeDmTab, setActiveDmTab] = useState(DEFAULT_DM_TAB);
  const [dmBackTarget, setDmBackTarget] = useState(DEFAULT_DM_BACK_TARGET);
  const [expressionPickerVisible, setExpressionPickerVisible] = useState(false);
  const [mapSheetVisible, setMapSheetVisible] = useState(false);
  const [createSpaceVisible, setCreateSpaceVisible] = useState(false);
  const [createRoomVisible, setCreateRoomVisible] = useState(false);
  const [profileSheetState, setProfileSheetState] = useState<ProfileSheetState | null>(null);
  const [stShowCardModel, setStShowCardModel] = useState<StShowCardModel | null>(null);

  useEffect(() => {
    draftMessageRef.current = draftMessage;
    draftRoleIdInputRef.current = draftRoleIdInput;
    messageAnchorIdRef.current = messageAnchorId;
    messageAttachmentsRef.current = messageAttachments;
  }, [draftMessage, draftRoleIdInput, messageAnchorId, messageAttachments]);

  const currentUserId = session?.userId ?? null;
  const pendingTargetContactId = useMemo(() => parsePositiveIntegerSearchParam(searchParams.contactId as string | string[] | undefined), [searchParams.contactId]);
  const pendingTargetSpaceId = useMemo(() => parsePositiveIntegerSearchParam(searchParams.spaceId as string | string[] | undefined), [searchParams.spaceId]);
  const pendingTargetRoomId = useMemo(() => parsePositiveIntegerSearchParam(searchParams.roomId as string | string[] | undefined), [searchParams.roomId]);
  const hasExplicitTarget = pendingTargetContactId != null || pendingTargetSpaceId != null || pendingTargetRoomId != null;
  const dmInboxQuery = useDmInboxQuery(currentUserId);
  const activeSpaces = useMemo(() => spacesQuery.data?.data ?? [], [spacesQuery.data?.data]);
  const allAvailableRooms = useMemo(() => roomsQuery.data?.data?.rooms ?? [], [roomsQuery.data?.data?.rooms]);
  const availableRooms = useMemo(() => {
    return getMobileNavigableRooms(allAvailableRooms, currentUserId);
  }, [allAvailableRooms, currentUserId]);
  const clueRooms = useMemo(() => {
    return getMobileVisibleClueRooms(allAvailableRooms, currentUserId);
  }, [allAvailableRooms, currentUserId]);
  const spaceMembers = useMemo(() => spaceMembersQuery.data?.data ?? [], [spaceMembersQuery.data?.data]);
  const roomMembers = useMemo(() => {
    return mergeRoomMembersWithSpaceMembers(roomMembersQuery.data?.data ?? [], spaceMembers);
  }, [roomMembersQuery.data?.data, spaceMembers]);
  const selectedSpace = useMemo(() => activeSpaces.find(s => s.spaceId === selectedSpaceId) ?? null, [activeSpaces, selectedSpaceId]);
  const selectedRoom = useMemo(() => availableRooms.find(r => r.roomId === selectedRoomId) ?? null, [availableRooms, selectedRoomId]);
  const selectedRuleId = selectedSpace?.ruleId ?? null;
  const currentSpaceMember = useMemo(() => findCurrentMember(spaceMembers, currentUserId), [currentUserId, spaceMembers]);
  const currentRoomMember = useMemo(() => findCurrentMember(roomMembers, currentUserId), [currentUserId, roomMembers]);
  const isSpaceOwner = hasHostMemberType(currentSpaceMember?.memberType);
  const isSpectator = !currentRoomMember && !isSpaceOwner;
  const roomMessages = useMemo(() => {
    return selectVisibleMainRoomMessages(roomMessagesQuery.messages, {
      currentUserId,
      hasHostPrivileges: isSpaceOwner,
    });
  }, [currentUserId, isSpaceOwner, roomMessagesQuery.messages]);
  const [searchPageVisible, setSearchPageVisible] = useState(false);
  const dmConversations = useMemo(() => dmInboxQuery.data ?? [], [dmInboxQuery.data]);
  const currentDmConversation = useMemo(() => {
    if (!currentContactId)
      return null;
    return dmConversations.find(conv => conv.contactId === currentContactId) ?? null;
  }, [currentContactId, dmConversations]);
  const currentDmContactName = currentDmConversation?.contactName ?? (currentContactId ? `用户 #${currentContactId}` : null);
  const selectedAnchorMessage = useMemo(() => {
    return roomMessages.find(item => item.message.messageId === messageAnchorId)?.message ?? null;
  }, [messageAnchorId, roomMessages]);

  const roomRoles = useMemo(() => roomRolesQuery.data ?? [], [roomRolesQuery.data]);
  const roomRolesById = useMemo(() => buildRoomRolesById(roomRoles), [roomRoles]);
  const selectableRoomRoles = useMemo(() => {
    if (isSpectator)
      return [];
    if (isSpaceOwner)
      return roomRoles.filter(role => role.state !== 1);
    return roomRoles.filter(role => role.userId === currentUserId && role.state !== 1);
  }, [currentUserId, isSpaceOwner, isSpectator, roomRoles]);
  const currentRole = useMemo(() => {
    if (!selectedRoleId)
      return null;
    return roomRoles.find(r => r.roleId === selectedRoleId) ?? null;
  }, [roomRoles, selectedRoleId]);

  const currentRoomUnreadCount = selectedRoomId ? (roomUnreadCounts[selectedRoomId] ?? 0) : 0;
  const draftRoleId = useMemo(() => {
    if (selectedRoleId)
      return selectedRoleId;
    const n = Number.parseInt(draftRoleIdInput, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [draftRoleIdInput, selectedRoleId]);

  const effectiveCurrentRoleId = draftRoleId ?? selectableRoomRoles[0]?.roleId ?? 0;
  const noRole = effectiveCurrentRoleId <= 0 && !isSpaceOwner;

  const handleExecuteCommandFromRequest = useCallback(async (command: string, replyMessageId: number) => {
    const effectiveRoleId = draftRoleId ?? selectableRoomRoles[0]?.roleId ?? (isSpaceOwner ? -1 : 0);
    const effectiveRole = effectiveRoleId > 0
      ? roomRoles.find(role => role.roleId === effectiveRoleId)
      : null;
    const sendIdentity = resolveSendIdentity({
      currentAvatarId: selectedAvatarId ?? effectiveRole?.avatarId ?? currentRole?.avatarId ?? -1,
      customRoleName: draftCustomRoleName,
      inputContent: command,
      isSpaceOwner,
      isSpectator,
      roleId: effectiveRoleId,
    });

    await executeMobileDicerCommand({
      command,
      messages: roomMessages.map(item => item.message),
      queryClient,
      onShowRoleAbilityCard: setStShowCardModel,
      replyMessageId,
      roomId: selectedRoomId ?? 0,
      roomRoles,
      ruleId: selectedRuleId,
      sendIdentity: {
        avatarId: sendIdentity.avatarId,
        customRoleName: sendIdentity.customRoleName,
        roleId: sendIdentity.roleId,
      },
      sendRoomMessageMutation,
      space: selectedSpace,
    });
  }, [currentRole, draftCustomRoleName, draftRoleId, isSpaceOwner, isSpectator, queryClient, roomMessages, roomRoles, selectableRoomRoles, selectedAvatarId, selectedRoomId, selectedRuleId, selectedSpace, sendRoomMessageMutation]);

  const commandRequests = useMobileCommandRequests({
    roomId: selectedRoomId ?? 0,
    userId: currentUserId ?? 0,
    isSpaceOwner,
    noRole,
    onExecuteCommand: handleExecuteCommandFromRequest,
  });

  // Auto-select first space (for route page to show rooms)
  useEffect(() => {
    const nextSpaceId = resolveAutoSelectedSpaceId({
      activeSpaces,
      hasExplicitTarget,
      selectedSpaceId,
    });
    if (nextSpaceId !== undefined) {
      startTransition(() => setSelectedSpaceId(nextSpaceId));
    }
  }, [activeSpaces, hasExplicitTarget, selectedSpaceId, setSelectedSpaceId]);

  // Clear stale room selection if room no longer exists in current space.
  useEffect(() => {
    if (shouldClearStaleRouteRoom({
      availableRooms,
      hasExplicitTarget,
      roomsQueryIsPending: roomsQuery.isPending,
      selectedRoomId,
      selectedSpaceId,
    })) {
      startTransition(() => setSelectedRoomId(null));
    }
  }, [availableRooms, hasExplicitTarget, roomsQuery.isPending, selectedRoomId, selectedSpaceId, setSelectedRoomId]);

  useEffect(() => {
    let consumedNotificationTarget = false;
    if (pendingTargetContactId != null) {
      const nextDmState = resolveDmEntryNavigationState(pendingTargetContactId);
      setCurrentContactId(nextDmState.currentContactId);
      setActiveDmTab(nextDmState.activeDmTab);
      setDmBackTarget(nextDmState.backTarget);
      setDrawerMode("dm");
      if (nextDmState.shouldCloseDrawer) {
        closeImmediately();
      }
      consumedNotificationTarget = true;
    }
    else if (pendingTargetSpaceId != null || pendingTargetRoomId != null) {
      setCurrentContactId(null);
      consumedNotificationTarget = true;
      if (pendingTargetSpaceId != null && pendingTargetSpaceId !== selectedSpaceId) {
        startTransition(() => setSelectedSpaceId(pendingTargetSpaceId));
      }
      if (pendingTargetRoomId != null && pendingTargetRoomId !== selectedRoomId) {
        startTransition(() => setSelectedRoomId(pendingTargetRoomId));
      }
    }

    if (consumedNotificationTarget) {
      router.replace("/(tabs)" as any);
    }
  }, [
    closeImmediately,
    pendingTargetContactId,
    pendingTargetRoomId,
    pendingTargetSpaceId,
    selectedRoomId,
    selectedSpaceId,
    setSelectedRoomId,
    setSelectedSpaceId,
  ]);

  // Reset state on room change
  useEffect(() => {
    setDraftMessage("");
    setDraftRoleIdInput("");
    setMessageAnchorId(null);
    setMessageAttachments([]);
    setMessageError(null);
    setMessageMode(MOBILE_MESSAGE_MODE.TEXT);
    setSelectedRoleId(undefined);
    setSelectedAvatarId(undefined);
    setSelectedAvatarFileId(undefined);
    setDraftCustomRoleName("");
    setMapSheetVisible(false);
    setStShowCardModel(null);
  }, [selectedRoomId]);

  useEffect(() => {
    if (messageAnchorId && !selectedAnchorMessage)
      setMessageAnchorId(null);
  }, [messageAnchorId, selectedAnchorMessage]);

  const handleSelectSpace = useCallback((spaceId: number | null) => {
    startTransition(() => setSelectedSpaceId(spaceId));
    setSelectedRoomId(null);
    setDrawerMode("rooms");
    setCurrentContactId(null);
  }, [setSelectedRoomId, setSelectedSpaceId]);

  const handleSelectRoom = useCallback((roomId: number) => {
    setCurrentContactId(null);
    setSelectedRoomId(roomId);
    close();
  }, [close, setSelectedRoomId]);

  const handleBackToRoutePage = useCallback(() => {
    setSelectedRoomId(null);
    setCurrentContactId(null);
  }, [setSelectedRoomId]);

  const handleSelectConversation = useCallback((contactId: number, source = DEFAULT_DM_BACK_TARGET) => {
    const nextDmState = resolveDmEntryNavigationState(contactId, source);
    setCurrentContactId(nextDmState.currentContactId);
    setActiveDmTab(nextDmState.activeDmTab);
    setDmBackTarget(nextDmState.backTarget);
    setDrawerMode("dm");
    if (nextDmState.shouldCloseDrawer) {
      closeWithSwipeHint();
    }
  }, [closeWithSwipeHint]);

  const handleBackFromDmChat = useCallback(() => {
    setCurrentContactId(null);
    setActiveDmTab(getDmTabForBackTarget(dmBackTarget));
    setDrawerMode("dm");
    openLeft();
  }, [dmBackTarget, openLeft]);

  const handleSelectMessageAnchor = useCallback((message: Message) => {
    setMessageAnchorId(message.messageId ?? null);
    setMessageError(null);
  }, []);

  const handleRefreshWorkspace = useCallback(async () => {
    await spacesQuery.refetch();
    if (selectedSpaceId)
      await Promise.all([roomsQuery.refetch(), spaceMembersQuery.refetch()]);
    if (selectedRoomId)
      await Promise.all([roomMembersQuery.refetch(), roomMessagesQuery.refetch()]);
  }, [roomMembersQuery, roomMessagesQuery, roomsQuery, selectedRoomId, selectedSpaceId, spaceMembersQuery, spacesQuery]);

  const handleSendMessage = async () => {
    if (messageSendInFlightRef.current) {
      return;
    }

    const submittedDraftMessage = draftMessage;
    const submittedDraftRoleIdInput = draftRoleIdInput;
    const submittedMessageAnchorId = messageAnchorId;
    const submittedMessageAttachments = messageAttachments;
    messageSendInFlightRef.current = true;
    setMessageError(null);
    draftMessageRef.current = "";
    draftRoleIdInputRef.current = "";
    messageAnchorIdRef.current = null;
    messageAttachmentsRef.current = [];
    setDraftMessage("");
    setDraftRoleIdInput("");
    setMessageAnchorId(null);
    setMessageAttachments([]);
    try {
      if (editingMessage) {
        const trimmedContent = submittedDraftMessage.trim();
        if (!trimmedContent) {
          throw new Error("编辑内容不能为空。");
        }
        await editMessage({
          ...editingMessage,
          content: trimmedContent,
          updateTime: new Date().toISOString(),
        });
        setEditingMessage(null);
        return;
      }

      const effectiveRoleId = draftRoleId ?? selectableRoomRoles[0]?.roleId ?? (isSpaceOwner ? -1 : 0);
      const effectiveRole = effectiveRoleId > 0
        ? roomRoles.find(role => role.roleId === effectiveRoleId)
        : null;
      const sendIdentity = resolveSendIdentity({
        currentAvatarId: selectedAvatarId ?? effectiveRole?.avatarId ?? currentRole?.avatarId ?? -1,
        customRoleName: draftCustomRoleName,
        inputContent: submittedDraftMessage,
        isSpaceOwner,
        isSpectator,
        roleId: effectiveRoleId,
      });
      const resolvedDraftMessage = sendIdentity.content ?? submittedDraftMessage;
      const messageContext = {
        avatarId: sendIdentity.avatarId,
        customRoleName: sendIdentity.customRoleName,
        replayMessageId: submittedMessageAnchorId ?? undefined,
        roleId: sendIdentity.roleId,
      };
      if (messageMode === MOBILE_MESSAGE_MODE.TEXT) {
        if (isSpaceOwner && containsCommandRequestAllToken(resolvedDraftMessage)) {
          const stripped = stripCommandRequestAllToken(resolvedDraftMessage);
          const commandText = extractFirstCommandText(stripped);
          if (commandText && isCommand(commandText)) {
            await sendRoomMessageMutation.sendCommandRequestMessage({ command: commandText, allowAll: true, ...messageContext });
            setDraftMessage("");
            setDraftRoleIdInput("");
            setMessageAnchorId(null);
            setMessageAttachments([]);
            return;
          }
        }
        if (submittedMessageAttachments.length > 0) {
          const uploaded = await uploadMobileMessageAttachments(mobileApiClient, submittedMessageAttachments);
          const drafts = buildMessageDraftsFromUploadedMedia({
            inputText: resolvedDraftMessage,
            uploadedFiles: uploaded.uploadedFiles,
            uploadedImages: uploaded.uploadedImages,
            uploadedSoundMessage: uploaded.uploadedSoundMessage,
            uploadedVideos: uploaded.uploadedVideos,
          });
          if (drafts.length === 0)
            throw new Error("消息内容不能为空。");
          await sendRoomMessageMutation.sendDraftMessages(drafts, messageContext);
        }
        else {
          if (isCommand(resolvedDraftMessage)) {
            await executeMobileDicerCommand({
              command: resolvedDraftMessage,
              messages: roomMessages.map(item => item.message),
              queryClient,
              onShowRoleAbilityCard: setStShowCardModel,
              replyMessageId: submittedMessageAnchorId ?? undefined,
              roomId: selectedRoomId ?? 0,
              roomRoles,
              ruleId: selectedRuleId,
              sendIdentity: {
                avatarId: sendIdentity.avatarId,
                customRoleName: sendIdentity.customRoleName,
                roleId: sendIdentity.roleId,
              },
              sendRoomMessageMutation,
              space: selectedSpace,
            });
          }
          else {
            await sendRoomMessageMutation.sendTextMessage({ content: resolvedDraftMessage, ...messageContext });
          }
        }
      }
      else if (messageMode === MOBILE_MESSAGE_MODE.COMMAND_REQUEST) {
        await sendRoomMessageMutation.sendCommandRequestMessage({ command: resolvedDraftMessage, ...messageContext });
      }
      else {
        await sendRoomMessageMutation.sendStateEventMessage({ content: resolvedDraftMessage, ...messageContext });
      }
    }
    catch (error) {
      setMessageError(getErrorMessage(error, "发送消息失败。"));
      const canRestoreSubmittedDraft = draftMessageRef.current.length === 0
        && draftRoleIdInputRef.current.length === 0
        && messageAnchorIdRef.current === null
        && messageAttachmentsRef.current.length === 0;

      if (canRestoreSubmittedDraft) {
        draftMessageRef.current = submittedDraftMessage;
        draftRoleIdInputRef.current = submittedDraftRoleIdInput;
        messageAnchorIdRef.current = submittedMessageAnchorId;
        messageAttachmentsRef.current = submittedMessageAttachments;
        setDraftMessage(submittedDraftMessage);
        setDraftRoleIdInput(submittedDraftRoleIdInput);
        setMessageAnchorId(submittedMessageAnchorId);
        setMessageAttachments(submittedMessageAttachments);
      }
    }
    finally {
      messageSendInFlightRef.current = false;
    }
  };

  const handlePickAttachments = async (kind: MobileMessageAttachmentKind) => {
    setMessageError(null);
    try {
      const picked = await pickMobileMessageAttachments(kind);
      if (picked.length === 0)
        return;
      setMessageAttachments(cur => mergePickedMessageAttachments(cur, picked));
    }
    catch (error) {
      setMessageError(getErrorMessage(error, "选择附件失败。"));
    }
  };

  const handleOpenUserProfile = useCallback((profile: ProfileSheetState) => {
    if (!profile.userId) {
      return;
    }
    setProfileSheetState(profile);
  }, []);

  const _handleOpenMap = useCallback(() => {
    setMessageError(null);
    setMapSheetVisible(true);
  }, []);

  const handleEnterStateMode = useCallback(() => {
    setMessageError(null);
    setMessageMode(MOBILE_MESSAGE_MODE.STATE_EVENT);
  }, []);

  const handleAdvanceTurn = useCallback(async () => {
    try {
      const effectiveRoleId = draftRoleId ?? selectableRoomRoles[0]?.roleId ?? (isSpaceOwner ? -1 : 0);
      const effectiveRole = effectiveRoleId > 0
        ? roomRoles.find(role => role.roleId === effectiveRoleId)
        : null;
      const sendIdentity = resolveSendIdentity({
        currentAvatarId: selectedAvatarId ?? effectiveRole?.avatarId ?? currentRole?.avatarId ?? -1,
        customRoleName: draftCustomRoleName,
        inputContent: ".next",
        isSpaceOwner,
        isSpectator,
        roleId: effectiveRoleId,
      });
      await sendRoomMessageMutation.sendStateEventMessage({
        avatarId: sendIdentity.avatarId,
        content: ".next",
        customRoleName: sendIdentity.customRoleName,
        roleId: sendIdentity.roleId,
      });
    }
    catch (error) {
      setMessageError(getErrorMessage(error, "推进回合失败。"));
    }
  }, [
    currentRole?.avatarId,
    draftCustomRoleName,
    draftRoleId,
    isSpaceOwner,
    isSpectator,
    roomRoles,
    selectableRoomRoles,
    selectedAvatarId,
    sendRoomMessageMutation,
  ]);

  const invalidateMemberCaches = useCallback(async () => {
    const tasks: Array<Promise<unknown>> = [];
    if (selectedSpaceId) {
      tasks.push(queryClient.invalidateQueries({ queryKey: getSpaceMembersQueryKey(selectedSpaceId) }));
      tasks.push(queryClient.invalidateQueries({ queryKey: getUserRoomsQueryKey(selectedSpaceId) }));
    }
    if (selectedRoomId) {
      tasks.push(queryClient.invalidateQueries({ queryKey: getRoomMembersQueryKey(selectedRoomId) }));
    }
    tasks.push(queryClient.invalidateQueries({ queryKey: getUserActiveSpacesQueryKey() }));
    await Promise.all(tasks);
  }, [queryClient, selectedRoomId, selectedSpaceId]);

  const handleUpdateMemberType = useCallback(async (member: MemberPreviewItem, memberType: number) => {
    if (!selectedSpaceId || !member.userId) {
      return;
    }
    try {
      await mobileApiClient.spaceMemberController.updateMemberType({
        spaceId: selectedSpaceId,
        uidList: [member.userId],
        memberType,
      });
      await invalidateMemberCaches();
    }
    catch (error) {
      Alert.alert("成员操作失败", getErrorMessage(error, "请稍后重试。"));
    }
  }, [invalidateMemberCaches, selectedSpaceId]);

  const handleRemoveMember = useCallback(async (member: MemberPreviewItem) => {
    if (!selectedSpaceId || !member.userId) {
      return;
    }
    try {
      await mobileApiClient.spaceMemberController.deleteMember({
        spaceId: selectedSpaceId,
        userIdList: [member.userId],
      });
      await invalidateMemberCaches();
    }
    catch (error) {
      Alert.alert("移除失败", getErrorMessage(error, "请稍后重试。"));
    }
  }, [invalidateMemberCaches, selectedSpaceId]);

  const handleTransferLeader = useCallback(async (member: MemberPreviewItem) => {
    if (!selectedSpaceId || !member.userId) {
      return;
    }
    try {
      await mobileApiClient.spaceMemberController.transferLeader({
        spaceId: selectedSpaceId,
        newLeaderId: member.userId,
      });
      await invalidateMemberCaches();
    }
    catch (error) {
      Alert.alert("转让失败", getErrorMessage(error, "请稍后重试。"));
    }
  }, [invalidateMemberCaches, selectedSpaceId]);

  const _handleLongPressMember = useCallback((member: MemberPreviewItem) => {
    const userId = member.userId ?? null;
    const username = member.username ?? (userId ? `用户 #${userId}` : "未知用户");
    const actions: AlertButton[] = [
      {
        text: "查看资料",
        onPress: () => handleOpenUserProfile({
          avatarFileId: member.avatarFileId,
          userId,
          username,
        }),
      },
    ];

    const canManage = canManageMemberPermissions(currentSpaceMember?.memberType)
      && typeof userId === "number"
      && userId !== currentUserId;
    if (canManage) {
      actions.push(
        { text: "设为玩家", onPress: () => void handleUpdateMemberType(member, SPACE_MEMBER_TYPE.PLAYER) },
        { text: "设为观战", onPress: () => void handleUpdateMemberType(member, SPACE_MEMBER_TYPE.OBSERVER) },
        { text: "设为副主持", onPress: () => void handleUpdateMemberType(member, SPACE_MEMBER_TYPE.ASSISTANT_LEADER) },
        {
          text: "转让主持",
          onPress: () => Alert.alert("转让主持", `确定把主持转让给 ${username} 吗？`, [
            { text: "取消", style: "cancel" },
            { text: "转让", style: "destructive", onPress: () => void handleTransferLeader(member) },
          ]),
        },
        {
          text: "移除成员",
          style: "destructive" as const,
          onPress: () => Alert.alert("移除成员", `确定将 ${username} 移出空间吗？`, [
            { text: "取消", style: "cancel" },
            { text: "移除", style: "destructive", onPress: () => void handleRemoveMember(member) },
          ]),
        },
      );
    }

    Alert.alert(username, "选择要执行的操作", [
      ...actions,
      { text: "取消", style: "cancel" },
    ]);
  }, [
    currentSpaceMember?.memberType,
    currentUserId,
    handleOpenUserProfile,
    handleRemoveMember,
    handleTransferLeader,
    handleUpdateMemberType,
  ]);

  const handleSelectExpression = useCallback(async (sticker: Sticker) => {
    setMessageError(null);
    try {
      if (typeof sticker.fileId !== "number" || sticker.fileId <= 0) {
        throw new Error("表情包文件无效。");
      }
      const effectiveRoleId = draftRoleId ?? selectableRoomRoles[0]?.roleId ?? (isSpaceOwner ? -1 : 0);
      const effectiveRole = effectiveRoleId > 0
        ? roomRoles.find(role => role.roleId === effectiveRoleId)
        : null;
      const sendIdentity = resolveSendIdentity({
        currentAvatarId: selectedAvatarId ?? effectiveRole?.avatarId ?? currentRole?.avatarId ?? -1,
        customRoleName: draftCustomRoleName,
        inputContent: draftMessage,
        isSpaceOwner,
        isSpectator,
        roleId: effectiveRoleId,
      });
      const [draft] = buildMessageDraftsFromUploadedMedia({
        inputText: sendIdentity.content ?? draftMessage,
        uploadedImages: [buildExpressionDraftAsset(sticker)],
      });
      if (!draft) {
        throw new Error("表情内容为空。");
      }
      await sendRoomMessageMutation.sendDraftMessage(draft, {
        avatarId: sendIdentity.avatarId,
        customRoleName: sendIdentity.customRoleName,
        replayMessageId: selectedAnchorMessage?.messageId,
        roleId: sendIdentity.roleId,
      });
      setDraftMessage("");
      setMessageAnchorId(null);
      setExpressionPickerVisible(false);
    }
    catch (error) {
      setMessageError(getErrorMessage(error, "发送表情失败。"));
    }
  }, [
    currentRole?.avatarId,
    draftCustomRoleName,
    draftMessage,
    draftRoleId,
    isSpaceOwner,
    isSpectator,
    roomRoles,
    selectableRoomRoles,
    selectedAnchorMessage?.messageId,
    selectedAvatarId,
    sendRoomMessageMutation,
  ]);

  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const handleCopyMessageToClueFolder = useCallback(async (message: Message, scope: ClueFolderScope) => {
    setClueScopeMessage(null);
    try {
      await copyMessageToClueFolderMutation.mutateAsync({
        currentUserId,
        fallbackRoleId: draftRoleId ?? selectableRoomRoles[0]?.roleId ?? null,
        hasHostPrivileges: isSpaceOwner,
        scope,
        sourceMessage: message,
        spaceId: selectedSpaceId,
        spaceMembers,
      });
    }
    catch (error) {
      setMessageError(getErrorMessage(error, "添加线索失败。"));
    }
    finally {
      closeImmediately();
    }
  }, [
    closeImmediately,
    copyMessageToClueFolderMutation,
    currentUserId,
    draftRoleId,
    isSpaceOwner,
    selectableRoomRoles,
    selectedSpaceId,
    spaceMembers,
  ]);

  const handleMessageAction = useCallback(async (action: MessageAction, message: Message) => {
    setActionMenuMessage(null);
    if (action === "reply") {
      handleSelectMessageAnchor(message);
    }
    else if (action === "addClue") {
      setClueScopeMessage(message);
    }
    else if (action === "copy") {
      const text = message.content?.trim();
      if (text)
        await Clipboard.setStringAsync(text);
    }
    else if (action === "edit") {
      const text = message.content ?? "";
      setDraftMessage(text);
      setEditingMessage(message);
    }
    else if (action === "multiSelect") {
      setMultiSelectMode(true);
      if (message.messageId) {
        setMultiSelectedIds(new Set([message.messageId]));
      }
    }
    else if (action === "delete") {
      const confirmed = await confirmAction({
        title: "删除消息",
        message: "确定要删除这条消息吗？",
        confirmText: "删除",
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
      try {
        const messageId = message.messageId;
        if (!messageId) {
          return;
        }
        await deleteMessage(messageId);
      }
      catch (error) {
        setMessageError(getErrorMessage(error, "删除消息失败。"));
      }
    }
  }, [
    deleteMessage,
    handleSelectMessageAnchor,
  ]);

  const navigation = useNavigation();
  const keyboardBehavior = Platform.select<"height" | "padding" | "position" | undefined>({ android: "padding", ios: "padding" });
  const isRoutePage = !selectedRoomId && !currentContactId;

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: isRoutePage
        ? { backgroundColor: "#0d1117", borderTopColor: "#30363d", borderTopWidth: 0.5 }
        : { display: "none" },
    });
  }, [isRoutePage, navigation]);

  return (
    <ThemedView style={styles.shell}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.kav}>
          {isRoutePage
            ? (
                <View style={styles.panelContainer}>
                  <LeftDrawer
                    activeDmTab={activeDmTab}
                    activeSpaces={activeSpaces}
                    availableRooms={availableRooms}
                    currentContactId={currentContactId}
                    currentRoomId={selectedRoomId}
                    currentSpaceId={selectedSpaceId}
                    dmConversations={dmConversations}
                    dmIsPending={dmInboxQuery.isPending}
                    drawerMode={drawerMode}
                    onCreateRoom={isSpaceOwner ? () => setCreateRoomVisible(true) : undefined}
                    onCreateSpace={() => setCreateSpaceVisible(true)}
                    onChangeDmTab={setActiveDmTab}
                    onRefresh={() => void handleRefreshWorkspace()}
                    onSelectConversation={handleSelectConversation}
                    onSelectRoom={handleSelectRoom}
                    onSelectSpace={handleSelectSpace}
                    onSwitchMode={setDrawerMode}
                    roomsError={roomsQuery.error}
                    roomsIsError={roomsQuery.isError}
                    roomsIsPending={roomsQuery.isPending}
                    spacesError={spacesQuery.error}
                    spacesIsError={spacesQuery.isError}
                    spacesIsPending={spacesQuery.isPending}
                    unreadCounts={roomUnreadCounts}
                  />
                </View>
              )
            : (
                <GestureDetector gesture={panGesture}>
                  <View style={styles.panelContainer}>
                    <Animated.View style={[styles.leftDrawer, leftDrawerStyle]}>
                      <LeftDrawer
                        activeDmTab={activeDmTab}
                        activeSpaces={activeSpaces}
                        availableRooms={availableRooms}
                        currentContactId={currentContactId}
                        currentRoomId={selectedRoomId}
                        currentSpaceId={selectedSpaceId}
                        dmConversations={dmConversations}
                        dmIsPending={dmInboxQuery.isPending}
                        drawerMode={drawerMode}
                        onCreateRoom={isSpaceOwner ? () => setCreateRoomVisible(true) : undefined}
                        onCreateSpace={() => setCreateSpaceVisible(true)}
                        onChangeDmTab={setActiveDmTab}
                        onRefresh={() => void handleRefreshWorkspace()}
                        onSelectConversation={handleSelectConversation}
                        onSelectRoom={handleSelectRoom}
                        onSelectSpace={handleSelectSpace}
                        onSwitchMode={setDrawerMode}
                        roomsError={roomsQuery.error}
                        roomsIsError={roomsQuery.isError}
                        roomsIsPending={roomsQuery.isPending}
                        spacesError={spacesQuery.error}
                        spacesIsError={spacesQuery.isError}
                        spacesIsPending={spacesQuery.isPending}
                        unreadCounts={roomUnreadCounts}
                      />
                    </Animated.View>

                    <Animated.View style={[styles.center, centerStyle]}>
                      {!currentContactId && !searchPageVisible && (
                        <ChatHeader
                          roomName={selectedRoom?.name ?? null}
                          onOpenDrawer={openLeft}
                          onBackToRoutePage={handleBackToRoutePage}
                          onSearch={() => setSearchPageVisible(true)}
                          unreadCount={currentRoomUnreadCount}
                        />
                      )}
                      {searchPageVisible && !currentContactId
                        ? (
                            <ChatSearchPage
                              messages={roomMessages}
                              onClose={() => setSearchPageVisible(false)}
                              onScrollToMessage={(messageId) => {
                                setMessageAnchorId(messageId);
                              }}
                              roomRolesById={roomRolesById}
                            />
                          )
                        : currentContactId
                          ? (
                              <DmChatView
                                contactId={currentContactId}
                                contactName={currentDmContactName ?? `用户 #${currentContactId}`}
                                contactAvatarFileId={currentDmConversation?.contactAvatarFileId}
                                currentUserId={currentUserId}
                                messages={currentDmConversation?.messages ?? []}
                                onBack={handleBackFromDmChat}
                              />
                            )
                          : (
                              <>
                                <ChatMessageList
                                  drawerPanGesture={panGesture}
                                  messages={roomMessages}
                                  multiSelectMode={multiSelectMode}
                                  multiSelectedIds={multiSelectedIds}
                                  nativeScrollGesture={messageListScrollGesture}
                                  selectedAnchorId={messageAnchorId}
                                  onLongPressMessage={(msg) => {
                                    setActionMenuMessage(msg);
                                  }}
                                  onRetry={() => {
                                    void roomMessagesQuery.refetch();
                                  }}
                                  onToggleMultiSelect={(msg) => {
                                    if (!msg.messageId)
                                      return;
                                    setMultiSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(msg.messageId!)) {
                                        next.delete(msg.messageId!);
                                      }
                                      else {
                                        next.add(msg.messageId!);
                                      }
                                      return next;
                                    });
                                  }}
                                  isPending={roomMessagesQuery.isPending}
                                  isError={roomMessagesQuery.isError}
                                  error={roomMessagesQuery.error}
                                  roomRoles={roomRoles}
                                  currentRoleId={effectiveCurrentRoleId}
                                  isSpaceOwner={isSpaceOwner}
                                  noRole={noRole}
                                  isCommandRequestConsumed={commandRequests.isConsumed}
                                  onExecuteCommandRequest={commandRequests.handleExecute}
                                />
                                {multiSelectMode
                                  ? (
                                      <View style={{ alignItems: "center", borderTopColor: theme.border, borderTopWidth: 1, flexDirection: "row", gap: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg }}>
                                        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                                          已选
                                          {" "}
                                          {multiSelectedIds.size}
                                          {" "}
                                          条
                                        </ThemedText>
                                        <View style={{ flex: 1 }} />
                                        <Pressable
                                          onPress={async () => {
                                            const selected = roomMessages
                                              .filter(item => item.message.messageId && multiSelectedIds.has(item.message.messageId))
                                              .map(item => item.message.content?.trim())
                                              .filter(Boolean)
                                              .join("\n");
                                            if (selected)
                                              await Clipboard.setStringAsync(selected);
                                            setMultiSelectMode(false);
                                            setMultiSelectedIds(new Set());
                                          }}
                                          style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}
                                        >
                                          <ThemedText style={{ color: theme.accent, fontSize: 14 }}>复制</ThemedText>
                                        </Pressable>
                                        <Pressable
                                          onPress={() => {
                                            void (async () => {
                                              const confirmed = await confirmAction({
                                                title: "删除消息",
                                                message: `确定要删除选中的 ${multiSelectedIds.size} 条消息吗？`,
                                                confirmText: "删除",
                                                destructive: true,
                                              });
                                              if (!confirmed) {
                                                return;
                                              }
                                              try {
                                                const messageIds = Array.from(multiSelectedIds);
                                                await deleteMessages(messageIds);
                                              }
                                              catch (error) {
                                                setMessageError(getErrorMessage(error, "删除消息失败。"));
                                              }
                                              setMultiSelectMode(false);
                                              setMultiSelectedIds(new Set());
                                            })();
                                          }}
                                          style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}
                                        >
                                          <ThemedText style={{ color: theme.danger, fontSize: 14 }}>删除</ThemedText>
                                        </Pressable>
                                        <Pressable
                                          onPress={() => {
                                            setMultiSelectMode(false);
                                            setMultiSelectedIds(new Set());
                                          }}
                                          style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}
                                        >
                                          <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>取消</ThemedText>
                                        </Pressable>
                                      </View>
                                    )
                                  : (
                                      <ChatComposer
                                        anchorMessage={selectedAnchorMessage}
                                        availableRoles={selectableRoomRoles}
                                        canUseAttachments={canMobileMessageModeUseAttachments(messageMode)}
                                        canUseExpressionPicker
                                        currentRole={currentRole}
                                        currentAvatarFileId={selectedAvatarFileId}
                                        draftMessage={draftMessage}
                                        draftRoleIdInput={draftRoleIdInput}
                                        errorMessage={messageError}
                                        isSubmitting={false}
                                        messageAttachments={messageAttachments}
                                        messageMode={messageMode}
                                        onChangeDraftMessage={setDraftMessage}
                                        onChangeDraftRoleIdInput={setDraftRoleIdInput}
                                        onClearAnchor={() => setMessageAnchorId(null)}
                                        onClearAttachments={() => setMessageAttachments([])}
                                        onOpenExpressionPicker={() => setExpressionPickerVisible(true)}
                                        onOpenRoleSwitch={() => setRoleSwitchVisible(true)}
                                        onPickAttachment={kind => void handlePickAttachments(kind)}
                                        onRemoveAttachment={id => setMessageAttachments(cur => cur.filter(a => a.id !== id))}
                                        onSend={() => void handleSendMessage()}
                                        roomName={selectedRoom?.name}
                                        ruleId={selectedRuleId}
                                      />
                                    )}
                              </>
                            )}
                      <Animated.View
                        style={[styles.overlay, overlayStyle, { pointerEvents: isOverlayInteractive ? "auto" : "none" }]}
                      >
                        <Pressable style={{ flex: 1 }} onPress={close} />
                      </Animated.View>
                    </Animated.View>

                    <Animated.View style={[styles.rightDrawer, rightDrawerStyle]}>
                      {currentContactId
                        ? (
                            <DmContactDrawer
                              contactId={currentContactId}
                              contactName={currentDmContactName ?? `用户 #${currentContactId}`}
                              contactAvatarFileId={currentDmConversation?.contactAvatarFileId}
                              onDeleted={handleBackFromDmChat}
                              onClose={close}
                            />
                          )
                        : (
                            <RightDrawerPanel
                              clueRooms={clueRooms}
                              currentUserId={currentUserId}
                              currentRoleId={draftRoleId ?? currentRole?.roleId ?? null}
                              isKP={isSpaceOwner}
                              isStateCommandMode={messageMode === MOBILE_MESSAGE_MODE.STATE_EVENT}
                              messages={roomMessages.map(item => item.message)}
                              onAdvanceTurn={() => void handleAdvanceTurn()}
                              onClose={close}
                              onEnterStateCommandMode={handleEnterStateMode}
                              roomId={selectedRoomId}
                              roomRoles={roomRoles}
                              ruleId={selectedRuleId}
                              spaceId={selectedSpaceId}
                            />
                          )}
                    </Animated.View>
                  </View>
                </GestureDetector>
              )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <MessageActionMenu
        canAddClue
        currentUserId={currentUserId}
        hasHostPrivileges={isSpaceOwner}
        message={actionMenuMessage}
        onAction={(action, msg) => void handleMessageAction(action, msg)}
        onClose={() => setActionMenuMessage(null)}
        visible={actionMenuMessage !== null}
      />
      <Modal
        animationType="fade"
        transparent
        visible={clueScopeMessage !== null}
        onRequestClose={() => setClueScopeMessage(null)}
      >
        <View style={styles.clueScopeOverlay}>
          <Pressable
            accessibilityLabel="关闭线索夹选择"
            accessibilityRole="button"
            onPress={() => setClueScopeMessage(null)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.clueScopeSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.clueScopeHandle, { backgroundColor: theme.border }]} />
            <ThemedText type="smallBold" themeColor="textSecondary">添加到线索</ThemedText>
            <Pressable
              accessibilityLabel="添加到我的线索"
              accessibilityRole="button"
              onPress={() => {
                if (clueScopeMessage) {
                  void handleCopyMessageToClueFolder(clueScopeMessage, "private");
                }
              }}
              style={({ pressed }) => [styles.clueScopeAction, pressed && { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText>我的线索</ThemedText>
            </Pressable>
            <Pressable
              accessibilityLabel="添加到公共线索"
              accessibilityRole="button"
              onPress={() => {
                if (clueScopeMessage) {
                  void handleCopyMessageToClueFolder(clueScopeMessage, "public");
                }
              }}
              style={({ pressed }) => [styles.clueScopeAction, pressed && { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText>公共线索</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
      <RoleSwitchSheet
        currentAvatarId={selectedAvatarId}
        currentRoleId={selectedRoleId}
        customRoleName={draftCustomRoleName}
        canSelectNarrator={isSpaceOwner}
        onChangeCustomRoleName={setDraftCustomRoleName}
        onClose={() => setRoleSwitchVisible(false)}
        onSelectAvatar={(avatarId, avatarFileId) => {
          setSelectedAvatarId(avatarId);
          setSelectedAvatarFileId(avatarFileId);
        }}
        onSelectRole={setSelectedRoleId}
        roles={selectableRoomRoles}
        visible={roleSwitchVisible}
      />
      <ExpressionPickerSheet
        onClose={() => setExpressionPickerVisible(false)}
        onSelectExpression={sticker => void handleSelectExpression(sticker)}
        visible={expressionPickerVisible}
      />
      <MapSheet
        currentRoleId={selectedRoleId ?? null}
        isKP={isSpaceOwner}
        messages={roomMessages.map(item => item.message)}
        onClose={() => setMapSheetVisible(false)}
        roomId={selectedRoomId}
        roomRoles={roomRoles}
        ruleId={selectedRuleId}
        visible={mapSheetVisible}
      />
      <CreateSpaceSheet
        onClose={() => setCreateSpaceVisible(false)}
        onCreated={(space) => {
          upsertUserActiveSpaceQueryData(queryClient, space);
          if (space.spaceId)
            startTransition(() => setSelectedSpaceId(space.spaceId!));
          void spacesQuery.refetch();
        }}
        visible={createSpaceVisible}
      />
      {selectedSpaceId
        ? (
            <CreateRoomSheet
              onClose={() => setCreateRoomVisible(false)}
              onCreated={(room) => {
                upsertUserRoomQueryData(queryClient, selectedSpaceId, room);
                if (room.roomId)
                  startTransition(() => setSelectedRoomId(room.roomId!));
                void roomsQuery.refetch();
              }}
              spaceId={selectedSpaceId}
              visible={createRoomVisible}
            />
          )
        : null}
      <UserProfileSheet
        avatarFileId={profileSheetState?.avatarFileId}
        onClose={() => setProfileSheetState(null)}
        userId={profileSheetState?.userId ?? null}
        username={profileSheetState?.username ?? null}
        visible={profileSheetState !== null}
      />
      <MobileStShowCardSheet
        model={stShowCardModel}
        onClose={() => setStShowCardModel(null)}
      />
    </ThemedView>
  );
}
