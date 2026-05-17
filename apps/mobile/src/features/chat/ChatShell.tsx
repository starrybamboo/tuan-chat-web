import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";
import type { AlertButton } from "react-native";
import type { MessageAction } from "./MessageActionMenu";
import type { MessageSubmitPhase } from "./mobileChatUtils";
import type { DrawerMode } from "@/features/drawer/LeftDrawer";

import type { MemberPreviewItem } from "@/features/members/memberUtils";
import type { MobileMessageAttachment, MobileMessageAttachmentKind } from "@/features/messages/mobileMessageAttachment";
import type { MobileMessageMode } from "@/features/messages/mobileMessageComposer";
import { useQueryClient } from "@tanstack/react-query";
import { canManageMemberPermissions, SPACE_MEMBER_TYPE } from "@tuanchat/domain/member-permissions";
import { buildMessageDraftsFromUploadedMedia } from "@tuanchat/domain/message-draft";
import { resolveSendIdentity } from "@tuanchat/domain/room-identity";
import { getAllRoomMessagesQueryKey, markRoomMessageDeletedData, selectVisibleMainRoomMessages } from "@tuanchat/query/chat";
import { getRoomMembersQueryKey, getSpaceMembersQueryKey } from "@tuanchat/query/members";
import { getUserActiveSpacesQueryKey, getUserRoomsQueryKey, upsertUserActiveSpaceQueryData, upsertUserRoomQueryData } from "@tuanchat/query/spaces";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,

  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction } from "react-native-reanimated";

import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { LeftDrawer } from "@/features/drawer/LeftDrawer";
import { DmChatView } from "@/features/friends/DmChatView";
import { useDmInboxQuery } from "@/features/friends/useDmInboxQuery";
import {
  findCurrentMember,
  hasHostMemberType,

  mergeRoomMembersWithSpaceMembers,
} from "@/features/members/memberUtils";
import { RightDrawerMembers } from "@/features/members/RightDrawerMembers";
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
import { readCachedRoomMessages, writeCachedRoomMessages } from "@/features/messages/mobileRoomMessageCache";
import { markCachedRoomMessageDeleted } from "@/features/messages/mobileRoomMessageCacheUtils";
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

import { mobileApiClient } from "@/lib/api";
import * as Clipboard from "@/lib/clipboard";
import { confirmAction } from "@/lib/confirm";
import { LEFT_DRAWER_WIDTH, RIGHT_DRAWER_WIDTH } from "@/lib/layout-constants";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSearchBar } from "./ChatSearchBar";
import { ExpressionPickerSheet } from "./ExpressionPickerSheet";
import { buildExpressionDraftAsset } from "./expressionSticker";
import { InitiativeSheet } from "./InitiativeSheet";
import { MapSheet } from "./MapSheet";
import { MessageActionMenu } from "./MessageActionMenu";
import { getErrorMessage } from "./mobileChatUtils";
import { StateSheet } from "./StateSheet";
import { useMessageSearch } from "./useMessageSearch";

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

interface ProfileSheetState {
  avatarFileId?: number | null;
  userId: number | null;
  username: string | null;
}

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
});

export default function ChatShell() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const { selectedSpaceId, selectedRoomId, setSelectedRoomId, setSelectedSpaceId } = useWorkspaceSession();
  const searchParams = useLocalSearchParams();
  const {
    panGesture,
    openLeft,
    openRight,
    close,
    centerStyle,
    leftDrawerStyle,
    rightDrawerStyle,
    overlayStyle,
    translateX,
  } = useGestureDrawer();
  const navigation = useNavigation();
  const [isOverlayInteractive, setIsOverlayInteractive] = useState(false);

  const applyTabBarVisibility = useCallback((visible: boolean) => {
    navigation.setOptions({
      tabBarStyle: visible
        ? {
            backgroundColor: "#0d1117",
            borderTopColor: "#30363d",
            borderTopWidth: 0.5,
          }
        : { display: "none" },
    });
  }, [navigation]);

  useAnimatedReaction(
    () => translateX.value >= LEFT_DRAWER_WIDTH * 0.5,
    (isShowing, prev) => {
      if (isShowing !== prev) {
        runOnJS(applyTabBarVisibility)(isShowing);
      }
    },
    [applyTabBarVisibility],
  );

  // 只有抽屉真正偏移时才让遮罩接管点击，避免挡住中心区交互。
  useAnimatedReaction(
    () => translateX.value !== 0,
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
  const sendRoomMessageMutation = useSendRoomMessageMutation(selectedRoomId);
  const roomRolesQuery = useRoomRolesQuery(selectedRoomId);
  const roomUnreadCounts = useRoomUnreadCounts(selectedRoomId);

  const [draftMessage, setDraftMessage] = useState("");
  const [draftRoleIdInput, setDraftRoleIdInput] = useState("");
  const [draftCustomRoleName, setDraftCustomRoleName] = useState("");
  const [messageAnchorId, setMessageAnchorId] = useState<number | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageMode, setMessageMode] = useState<MobileMessageMode>(MOBILE_MESSAGE_MODE.TEXT);
  const [messageSubmitPhase, setMessageSubmitPhase] = useState<MessageSubmitPhase>("idle");
  const [messageAttachments, setMessageAttachments] = useState<MobileMessageAttachment[]>([]);
  const [actionMenuMessage, setActionMenuMessage] = useState<Message | null>(null);
  const [actionMenuPressY, setActionMenuPressY] = useState(0);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<number>>(() => new Set());
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | undefined>(undefined);
  const [selectedAvatarFileId, setSelectedAvatarFileId] = useState<number | undefined>(undefined);
  const [roleSwitchVisible, setRoleSwitchVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("rooms");
  const [currentContactId, setCurrentContactId] = useState<number | null>(null);
  const [expressionPickerVisible, setExpressionPickerVisible] = useState(false);
  const [initiativeSheetVisible, setInitiativeSheetVisible] = useState(false);
  const [mapSheetVisible, setMapSheetVisible] = useState(false);
  const [stateSheetVisible, setStateSheetVisible] = useState(false);
  const [createSpaceVisible, setCreateSpaceVisible] = useState(false);
  const [createRoomVisible, setCreateRoomVisible] = useState(false);
  const [profileSheetState, setProfileSheetState] = useState<ProfileSheetState | null>(null);

  const currentUserId = session?.userId ?? null;
  const pendingTargetContactId = useMemo(() => parsePositiveIntegerSearchParam(searchParams.contactId as string | string[] | undefined), [searchParams.contactId]);
  const pendingTargetSpaceId = useMemo(() => parsePositiveIntegerSearchParam(searchParams.spaceId as string | string[] | undefined), [searchParams.spaceId]);
  const pendingTargetRoomId = useMemo(() => parsePositiveIntegerSearchParam(searchParams.roomId as string | string[] | undefined), [searchParams.roomId]);
  const hasExplicitTarget = pendingTargetContactId != null || pendingTargetSpaceId != null || pendingTargetRoomId != null;
  const dmInboxQuery = useDmInboxQuery(currentUserId);
  const activeSpaces = useMemo(() => spacesQuery.data?.data ?? [], [spacesQuery.data?.data]);
  const availableRooms = useMemo(() => roomsQuery.data?.data?.rooms ?? [], [roomsQuery.data?.data?.rooms]);
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
  const messageSearch = useMessageSearch(roomMessages);
  const dmConversations = dmInboxQuery.data ?? [];
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

  const isSubmittingMessage = messageSubmitPhase !== "idle" || sendRoomMessageMutation.isPending;
  const currentRoomUnreadCount = selectedRoomId ? (roomUnreadCounts[selectedRoomId] ?? 0) : 0;
  const draftRoleId = useMemo(() => {
    if (selectedRoleId)
      return selectedRoleId;
    const n = Number.parseInt(draftRoleIdInput, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [draftRoleIdInput, selectedRoleId]);

  // Auto-select first space/room
  useEffect(() => {
    if (hasExplicitTarget) {
      return;
    }
    const ids = activeSpaces.map(s => s.spaceId).filter((id): id is number => typeof id === "number" && id > 0);
    if (ids.length === 0) {
      if (selectedSpaceId !== null) {
        startTransition(() => setSelectedSpaceId(null));
      }
      return;
    }
    if (!selectedSpaceId || !ids.includes(selectedSpaceId))
      startTransition(() => setSelectedSpaceId(ids[0]));
  }, [activeSpaces, hasExplicitTarget, selectedSpaceId, setSelectedSpaceId]);

  useEffect(() => {
    if (hasExplicitTarget) {
      return;
    }
    if (!selectedSpaceId)
      return;
    const ids = availableRooms.map(r => r.roomId).filter((id): id is number => typeof id === "number" && id > 0);
    if (ids.length === 0) {
      if (selectedRoomId !== null) {
        startTransition(() => setSelectedRoomId(null));
      }
      return;
    }
    if (!selectedRoomId || !ids.includes(selectedRoomId))
      startTransition(() => setSelectedRoomId(ids[0]));
  }, [availableRooms, hasExplicitTarget, selectedRoomId, selectedSpaceId, setSelectedRoomId]);

  useEffect(() => {
    let consumedNotificationTarget = false;
    if (pendingTargetContactId != null) {
      setCurrentContactId(pendingTargetContactId);
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
    pendingTargetContactId,
    pendingTargetRoomId,
    pendingTargetSpaceId,
    selectedRoomId,
    selectedSpaceId,
    router,
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
    setMessageSubmitPhase("idle");
    setSelectedRoleId(undefined);
    setSelectedAvatarId(undefined);
    setSelectedAvatarFileId(undefined);
    setDraftCustomRoleName("");
    setInitiativeSheetVisible(false);
    setMapSheetVisible(false);
    setStateSheetVisible(false);
  }, [selectedRoomId]);

  useEffect(() => {
    if (messageAnchorId && !selectedAnchorMessage)
      setMessageAnchorId(null);
  }, [messageAnchorId, selectedAnchorMessage]);

  const handleSelectSpace = (spaceId: number | null) => {
    setCurrentContactId(null);
    startTransition(() => setSelectedSpaceId(spaceId));
    close();
  };

  const handleSelectRoom = (roomId: number) => {
    setCurrentContactId(null);
    startTransition(() => setSelectedRoomId(roomId));
    close();
  };

  const handleSelectMessageAnchor = (message: Message) => {
    setMessageAnchorId(message.messageId ?? null);
    setMessageError(null);
  };

  const handleRefreshWorkspace = async () => {
    await spacesQuery.refetch();
    if (selectedSpaceId)
      await Promise.all([roomsQuery.refetch(), spaceMembersQuery.refetch()]);
    if (selectedRoomId)
      await Promise.all([roomMembersQuery.refetch(), roomMessagesQuery.refetch()]);
  };

  const handleSendMessage = async () => {
    setMessageError(null);
    setMessageSubmitPhase("idle");
    try {
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
      const resolvedDraftMessage = sendIdentity.content ?? draftMessage;
      const messageContext = {
        avatarId: sendIdentity.avatarId,
        customRoleName: sendIdentity.customRoleName,
        replayMessageId: selectedAnchorMessage?.messageId,
        roleId: sendIdentity.roleId,
      };
      if (messageMode === MOBILE_MESSAGE_MODE.TEXT) {
        if (messageAttachments.length > 0) {
          setMessageSubmitPhase("uploading");
          const uploaded = await uploadMobileMessageAttachments(mobileApiClient, messageAttachments);
          setMessageSubmitPhase("sending");
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
          setMessageSubmitPhase("sending");
          await sendRoomMessageMutation.sendTextMessage({ content: resolvedDraftMessage, ...messageContext });
        }
      }
      else if (messageMode === MOBILE_MESSAGE_MODE.COMMAND_REQUEST) {
        setMessageSubmitPhase("sending");
        await sendRoomMessageMutation.sendCommandRequestMessage({ command: resolvedDraftMessage, ...messageContext });
      }
      else {
        setMessageSubmitPhase("sending");
        await sendRoomMessageMutation.sendStateEventMessage({ content: resolvedDraftMessage, ...messageContext });
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

  const handleOpenInitiative = useCallback(() => {
    setMessageError(null);
    setInitiativeSheetVisible(true);
  }, []);

  const handleOpenMap = useCallback(() => {
    setMessageError(null);
    setMapSheetVisible(true);
  }, []);

  const handleEnterStateMode = useCallback(() => {
    setMessageError(null);
    setStateSheetVisible(false);
    setMessageMode(MOBILE_MESSAGE_MODE.STATE_EVENT);
  }, []);

  const handleOpenStateSheet = useCallback(() => {
    setMessageError(null);
    setStateSheetVisible(true);
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

  const handleLongPressMember = useCallback((member: MemberPreviewItem) => {
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

  const handleMessageAction = useCallback(async (action: MessageAction, message: Message) => {
    setActionMenuMessage(null);
    if (action === "reply") {
      handleSelectMessageAnchor(message);
    }
    else if (action === "copy") {
      const text = message.content?.trim();
      if (text)
        await Clipboard.setStringAsync(text);
    }
    else if (action === "edit") {
      const text = message.content ?? "";
      setDraftMessage(text);
      handleSelectMessageAnchor(message);
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
        await mobileApiClient.chatController.deleteMessage(message.messageId!);
        if (selectedRoomId && message.messageId) {
          queryClient.setQueryData(
            getAllRoomMessagesQueryKey(selectedRoomId),
            (current) => {
              return markRoomMessageDeletedData(current as any, message.messageId!);
            },
          );
          const cachedMessages = await readCachedRoomMessages(selectedRoomId);
          const nextCachedMessages = markCachedRoomMessageDeleted(cachedMessages, message.messageId);
          await writeCachedRoomMessages(selectedRoomId, nextCachedMessages);
        }
        await roomMessagesQuery.refetch();
      }
      catch (error) {
        setMessageError(getErrorMessage(error, "删除消息失败。"));
      }
    }
  }, [queryClient, roomMessagesQuery, selectedRoomId]);

  const keyboardBehavior = Platform.select<"height" | "padding" | "position" | undefined>({ default: undefined, ios: "padding" });

  return (
    <ThemedView style={styles.shell}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.kav}>
          <GestureDetector gesture={panGesture}>
            <View style={styles.panelContainer}>
              <Animated.View style={[styles.leftDrawer, leftDrawerStyle]}>
                <LeftDrawer
                  activeSpaces={activeSpaces}
                  availableRooms={availableRooms}
                  currentContactId={currentContactId}
                  currentRoomId={selectedRoomId}
                  currentSpaceId={selectedSpaceId}
                  dmConversations={dmConversations}
                  dmIsPending={dmInboxQuery.isPending}
                  drawerMode={drawerMode}
                  onCreateRoom={() => setCreateRoomVisible(true)}
                  onCreateSpace={() => setCreateSpaceVisible(true)}
                  onRefresh={() => void handleRefreshWorkspace()}
                  onSelectConversation={(contactId) => {
                    setCurrentContactId(contactId);
                    close();
                  }}
                  onSelectRoom={handleSelectRoom}
                  onSelectSpace={handleSelectSpace}
                  onSwitchMode={setDrawerMode}
                  roomsIsPending={roomsQuery.isPending}
                  spacesIsPending={spacesQuery.isPending}
                  unreadCounts={roomUnreadCounts}
                />
              </Animated.View>

              <Animated.View style={[styles.center, centerStyle]}>
                <ChatHeader
                  roomName={currentContactId ? (currentDmContactName ?? `用户 #${currentContactId}`) : (selectedRoom?.name ?? null)}
                  spaceName={selectedSpace?.name ?? null}
                  memberCount={roomMembers.length}
                  onOpenDrawer={openLeft}
                  onOpenMembers={currentContactId ? () => undefined : openRight}
                  onSearch={currentContactId ? () => undefined : messageSearch.openSearch}
                  unreadCount={currentContactId ? 0 : currentRoomUnreadCount}
                />
                {currentContactId
                  ? (
                      <DmChatView
                        contactId={currentContactId}
                        contactName={currentDmContactName ?? `用户 #${currentContactId}`}
                        currentUserId={currentUserId}
                        messages={currentDmConversation?.messages ?? []}
                        onBack={() => setCurrentContactId(null)}
                        onOpenProfile={() => handleOpenUserProfile({
                          avatarFileId: currentDmConversation?.contactAvatarFileId,
                          userId: currentContactId,
                          username: currentDmContactName ?? `用户 #${currentContactId}`,
                        })}
                      />
                    )
                  : (
                      <>
                        {messageSearch.isSearching
                          ? (
                              <ChatSearchBar
                                query={messageSearch.query}
                                onChangeQuery={messageSearch.setQuery}
                                onClose={messageSearch.closeSearch}
                                resultCount={messageSearch.resultCount}
                              />
                            )
                          : null}
                        <ChatMessageList
                          messages={messageSearch.isSearching ? messageSearch.filteredMessages : roomMessages}
                          multiSelectMode={multiSelectMode}
                          multiSelectedIds={multiSelectedIds}
                          selectedAnchorId={messageAnchorId}
                          onLongPressMessage={(msg, pageY) => {
                            setActionMenuMessage(msg);
                            setActionMenuPressY(pageY);
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
                                        for (const msgId of multiSelectedIds) {
                                          await mobileApiClient.chatController.deleteMessage(msgId);
                                          if (selectedRoomId) {
                                            queryClient.setQueryData(
                                              getAllRoomMessagesQueryKey(selectedRoomId),
                                              current => markRoomMessageDeletedData(current as any, msgId),
                                            );
                                          }
                                        }
                                        await roomMessagesQuery.refetch();
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
                                isInitiativeMode={messageMode === MOBILE_MESSAGE_MODE.COMMAND_REQUEST}
                                isSubmitting={isSubmittingMessage}
                                isStateMode={messageMode === MOBILE_MESSAGE_MODE.STATE_EVENT}
                                messageAttachments={messageAttachments}
                                messageMode={messageMode}
                                onChangeDraftMessage={setDraftMessage}
                                onChangeDraftRoleIdInput={setDraftRoleIdInput}
                                onClearAnchor={() => setMessageAnchorId(null)}
                                onClearAttachments={() => setMessageAttachments([])}
                                onOpenExpressionPicker={() => setExpressionPickerVisible(true)}
                                onOpenInitiative={handleOpenInitiative}
                                onOpenMap={handleOpenMap}
                                onOpenRoleSwitch={() => setRoleSwitchVisible(true)}
                                onOpenState={handleOpenStateSheet}
                                onPickAttachment={kind => void handlePickAttachments(kind)}
                                onRemoveAttachment={id => setMessageAttachments(cur => cur.filter(a => a.id !== id))}
                                onSend={() => void handleSendMessage()}
                                roomName={selectedRoom?.name}
                                submitPhase={messageSubmitPhase}
                              />
                            )}
                      </>
                    )}
                <Animated.View
                  pointerEvents={isOverlayInteractive ? "auto" : "none"}
                  style={[styles.overlay, overlayStyle]}
                >
                  <Pressable style={{ flex: 1 }} onPress={close} />
                </Animated.View>
              </Animated.View>

              <Animated.View style={[styles.rightDrawer, rightDrawerStyle]}>
                <RightDrawerMembers
                  currentUserId={currentUserId}
                  currentRoomMember={currentRoomMember}
                  currentSpaceMember={currentSpaceMember}
                  members={roomMembers}
                  roles={roomRoles}
                  roomName={selectedRoom?.name ?? "未选择房间"}
                  isPending={roomMembersQuery.isPending}
                  isError={roomMembersQuery.isError}
                  error={roomMembersQuery.error}
                  onClose={close}
                  onLongPressMember={handleLongPressMember}
                />
              </Animated.View>
            </View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <MessageActionMenu
        currentUserId={currentUserId}
        message={actionMenuMessage}
        onAction={(action, msg) => void handleMessageAction(action, msg)}
        onClose={() => setActionMenuMessage(null)}
        pressY={actionMenuPressY}
        visible={actionMenuMessage !== null}
      />
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
      <InitiativeSheet
        onClose={() => setInitiativeSheetVisible(false)}
        roomId={selectedRoomId}
        roomRoles={roomRoles}
        ruleId={selectedRuleId}
        visible={initiativeSheetVisible}
      />
      <MapSheet
        onClose={() => setMapSheetVisible(false)}
        roomId={selectedRoomId}
        roomRoles={roomRoles}
        visible={mapSheetVisible}
      />
      <StateSheet
        currentRoleId={draftRoleId ?? currentRole?.roleId ?? null}
        isStateCommandMode={messageMode === MOBILE_MESSAGE_MODE.STATE_EVENT}
        messages={roomMessages.map(item => item.message)}
        onAdvanceTurn={() => void handleAdvanceTurn()}
        onClose={() => setStateSheetVisible(false)}
        onEnterStateCommandMode={handleEnterStateMode}
        roomRoles={roomRoles}
        ruleId={selectedRuleId}
        visible={stateSheetVisible}
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
    </ThemedView>
  );
}
