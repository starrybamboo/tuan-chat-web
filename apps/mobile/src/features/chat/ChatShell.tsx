import type { ClueFolderScope } from "@tuanchat/domain/clue-folder";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { AlertButton } from "react-native";

import { useQueryClient } from "@tanstack/react-query";
import { containsCommandRequestAllToken, extractFirstCommandText, isCommand, stripCommandRequestAllToken } from "@tuanchat/domain/command-request";
import { canManageMemberPermissions, canManageRoomRoles, SPACE_MEMBER_TYPE } from "@tuanchat/domain/member-permissions";
import { buildMessageDraftsFromUploadedMedia } from "@tuanchat/domain/message-draft";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { resolveSendIdentity } from "@tuanchat/domain/room-identity";
import {
  buildEndCombatStateEventExtra,
  buildStartCombatStateEventExtra,
  END_COMBAT_CONTENT,
  START_COMBAT_CONTENT,
} from "@tuanchat/domain/state-command";
import { toApiMessageExtraWithStateEvent } from "@tuanchat/domain/state-event";
import { useCopyMessageToClueFolderMutation } from "@tuanchat/query/clue-folder";
import { getRoomMembersQueryKey, getSpaceMembersQueryKey } from "@tuanchat/query/members";
import { selectVisibleMainRoomMessages } from "@tuanchat/query/room-message";
import { getUserActiveSpacesQueryKey, getUserRoomsQueryKey, upsertUserActiveSpaceQueryData, upsertUserRoomQueryData } from "@tuanchat/query/spaces";
import { router, useLocalSearchParams } from "expo-router";
import { LightbulbIcon, MapPinLineIcon, SwordIcon } from "phosphor-react-native";
import {
  startTransition,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { DrawerMode } from "@/features/drawer/LeftDrawer";
import type { MemberPreviewItem } from "@/features/members/memberUtils";
import type { MobileMessageAttachment, MobileMessageAttachmentKind } from "@/features/messages/mobileMessageAttachment";
import type { MobileMessageMode } from "@/features/messages/mobileMessageComposer";

import { BottomSheetModal } from "@/components/BottomSheetModal";
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
import { buildEditedRoomMessage } from "@/features/messages/roomMessageEditPayload";
import { useMobileCommandRequests } from "@/features/messages/useMobileCommandRequests";
import { useDeleteRoomMessageMutation, useEditRoomMessageMutation } from "@/features/messages/useRoomMessageMutations";
import { useRoomMessagesLiveSync } from "@/features/messages/useRoomMessagesLiveSync";
import { useRoomMessagesQuery } from "@/features/messages/useRoomMessagesQuery";
import { useSendRoomMessageMutation } from "@/features/messages/useSendRoomMessageMutation";
import { UserProfileSheet } from "@/features/profile/UserProfileSheet";
import { RoleSwitchSheet } from "@/features/roles/RoleSwitchSheet";
import { useMyRolesQuery } from "@/features/roles/useMyRolesQuery";
import { useAddRoomRoleMutation, useRoomRolesQuery } from "@/features/roles/useRoomRolesQuery";
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
import { DRAWER_EDGE_SWIPE_ZONE_WIDTH, RIGHT_DRAWER_WIDTH } from "@/lib/layout-constants";

import type { StShowCardModel } from "../../components/common/dicer/cmdExe/stShowCard";
import type { ChatComposerShortcutAction } from "./ChatComposer";
import type { MessageAction } from "./MessageActionMenu";
import type { RightDrawerTabKey } from "./RightDrawerPanel";

import { buildRoomRolesById } from "./chat-avatar-utils";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSearchPage } from "./ChatSearchPage";
import { resolveChatShellBackNavigationAction } from "./chatShellBackNavigation";
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
import { useRoomStateRuntime } from "./useRoomStateRuntime";

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
  rightDrawerGestureEdge: {
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: DRAWER_EDGE_SWIPE_ZONE_WIDTH,
  },
  clueScopeSheet: {
    gap: Spacing.sm,
  },
  clueScopeAction: {
    borderRadius: Radius.md,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
});

const RIGHT_DRAWER_SHORTCUTS = [
  { Icon: LightbulbIcon, label: "线索", tab: "clues" },
  { Icon: SwordIcon, label: "战斗", tab: "combat" },
  { Icon: MapPinLineIcon, label: "地图", tab: "map" },
] satisfies ReadonlyArray<{
  Icon: ChatComposerShortcutAction["Icon"];
  label: string;
  tab: RightDrawerTabKey;
}>;

const DRAWER_EDGE_GESTURE_COMPOSER_GUARD_HEIGHT = 156;

export default function ChatShell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const currentUserId = session?.userId ?? null;
  const { selectedSpaceId, selectedRoomId, setChatTabBarHidden, setSelectedRoomId, setSelectedSpaceId } = useWorkspaceSession();
  const searchParams = useLocalSearchParams();
  const {
    panGesture,
    open,
    close,
    closeImmediately,
    centerStyle,
    rightDrawerStyle,
    overlayStyle,
    translateX,
  } = useGestureDrawer();

  const [isOverlayInteractive, setIsOverlayInteractive] = useState(false);
  const [shouldRenderRightDrawer, setShouldRenderRightDrawer] = useState(false);

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

  // 右侧抽屉关闭时直接卸载重面板，避免输入框每次改动都牵连隐藏抽屉重算。
  useAnimatedReaction(
    () => Math.abs(translateX.get()) > 4,
    (isActive, prev) => {
      if (isActive !== prev) {
        runOnJS(setShouldRenderRightDrawer)(isActive);
      }
    },
    [setShouldRenderRightDrawer],
  );

  const spacesQuery = useUserActiveSpacesQuery();
  const roomsQuery = useUserRoomsQuery(selectedSpaceId);
  const spaceMembersQuery = useSpaceMembersQuery(selectedSpaceId);
  const roomMembersQuery = useRoomMembersQuery(selectedRoomId);
  const roomMessagesQuery = useRoomMessagesQuery(selectedRoomId);
  const { refetch: refetchSpaces } = spacesQuery;
  const { refetch: refetchRooms } = roomsQuery;
  const { refetch: refetchSpaceMembers } = spaceMembersQuery;
  const { refetch: refetchRoomMembers } = roomMembersQuery;
  const { refetch: refetchRoomMessages } = roomMessagesQuery;
  useRoomMessagesLiveSync(selectedRoomId);
  const sendRoomMessageMutation = useSendRoomMessageMutation(selectedRoomId, session?.userId ?? 0);
  const copyMessageToClueFolderMutation = useCopyMessageToClueFolderMutation(mobileApiClient);
  const { editMessage } = useEditRoomMessageMutation(selectedRoomId);
  const { deleteMessage, deleteMessages } = useDeleteRoomMessageMutation(selectedRoomId);
  const roomRolesQuery = useRoomRolesQuery(selectedRoomId);
  const myRolesQuery = useMyRolesQuery(currentUserId);
  const addRoomRoleMutation = useAddRoomRoleMutation();
  const roomUnreadCounts = useRoomUnreadCounts(selectedRoomId);

  const [draftMessage, setDraftMessage] = useState("");
  const [draftRoleIdInput, setDraftRoleIdInput] = useState("");
  const [draftCustomRoleName, setDraftCustomRoleName] = useState("");
  const [messageAnchorId, setMessageAnchorId] = useState<number | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageMode, setMessageMode] = useState<MobileMessageMode>(MOBILE_MESSAGE_MODE.TEXT);
  const messageSendInFlightRef = useRef(false);
  const [messageSendInFlight, setMessageSendInFlight] = useState(false);
  const [messageAttachments, setMessageAttachments] = useState<MobileMessageAttachment[]>([]);
  const draftMessageRef = useRef(draftMessage);
  const draftRoleIdInputRef = useRef(draftRoleIdInput);
  const messageAnchorIdRef = useRef(messageAnchorId);
  const messageAttachmentsRef = useRef(messageAttachments);
  const [actionMenuMessage, setActionMenuMessage] = useState<Message | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [clueScopeMessage, setClueScopeMessage] = useState<Message | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<number>>(() => new Set());
  const [isSendingCombatRoundEvent, setIsSendingCombatRoundEvent] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | undefined>(undefined);
  const [selectedAvatarFileId, setSelectedAvatarFileId] = useState<number | undefined>(undefined);
  const [roleSwitchVisible, setRoleSwitchVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("rooms");
  const [rightDrawerTab, setRightDrawerTab] = useState<RightDrawerTabKey>("clues");
  const [currentContactId, setCurrentContactId] = useState<number | null>(null);
  const [activeDmTab, setActiveDmTab] = useState(DEFAULT_DM_TAB);
  const [dmBackTarget, setDmBackTarget] = useState(DEFAULT_DM_BACK_TARGET);
  const [expressionPickerVisible, setExpressionPickerVisible] = useState(false);
  const [mapSheetVisible, setMapSheetVisible] = useState(false);
  const [createSpaceVisible, setCreateSpaceVisible] = useState(false);
  const [createRoomVisible, setCreateRoomVisible] = useState(false);
  const [profileSheetState, setProfileSheetState] = useState<ProfileSheetState | null>(null);
  const [stShowCardModel, setStShowCardModel] = useState<StShowCardModel | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  useEffect(() => {
    draftMessageRef.current = draftMessage;
    draftRoleIdInputRef.current = draftRoleIdInput;
    messageAnchorIdRef.current = messageAnchorId;
    messageAttachmentsRef.current = messageAttachments;
  }, [draftMessage, draftRoleIdInput, messageAnchorId, messageAttachments]);

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
  const canAddRoomRole = canManageRoomRoles(currentSpaceMember?.memberType)
    && typeof selectedRoomId === "number"
    && selectedRoomId > 0
    && !isSpectator;
  const roomMessages = useMemo(() => {
    return selectVisibleMainRoomMessages(roomMessagesQuery.messages, {
      currentUserId,
      hasHostPrivileges: isSpaceOwner,
    });
  }, [currentUserId, isSpaceOwner, roomMessagesQuery.messages]);
  const roomMessageModels = useMemo(() => roomMessages.map(item => item.message), [roomMessages]);
  const [searchPageVisible, setSearchPageVisible] = useState(false);
  const dmConversations = useMemo(() => dmInboxQuery.data ?? [], [dmInboxQuery.data]);
  const currentDmConversation = useMemo(() => {
    if (!currentContactId)
      return null;
    return dmConversations.find(conv => conv.contactId === currentContactId) ?? null;
  }, [currentContactId, dmConversations]);
  const currentDmContactName = currentDmConversation?.contactName ?? (currentContactId ? `用户 #${currentContactId}` : null);

  useEffect(() => {
    setChatTabBarHidden(selectedRoomId != null || currentContactId != null || pendingTargetRoomId != null || pendingTargetContactId != null);
  }, [currentContactId, pendingTargetContactId, pendingTargetRoomId, selectedRoomId, setChatTabBarHidden]);
  const selectedAnchorMessage = useMemo(() => {
    return roomMessages.find(item => item.message.messageId === messageAnchorId)?.message ?? null;
  }, [messageAnchorId, roomMessages]);

  const roomRoles = useMemo(() => roomRolesQuery.data ?? [], [roomRolesQuery.data]);
  const myRoles = useMemo(() => myRolesQuery.data ?? [], [myRolesQuery.data]);
  const addableRoomRoles = useMemo(() => {
    const existingRoleIds = new Set(roomRoles.map(role => role.roleId));
    return myRoles.filter(role => role.state !== 1 && !existingRoleIds.has(role.roleId));
  }, [myRoles, roomRoles]);
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

  const handleAddRoomRole = useCallback(async (role: UserRole) => {
    if (!canAddRoomRole || !selectedRoomId || addRoomRoleMutation.isPending) {
      return;
    }

    try {
      await addRoomRoleMutation.mutateAsync({
        roomId: selectedRoomId,
        roleIdList: [role.roleId],
      });
      await roomRolesQuery.refetch();
      setSelectedRoleId(role.roleId);
      setSelectedAvatarId(undefined);
      setSelectedAvatarFileId(undefined);
      setRoleSwitchVisible(false);
    }
    catch (error) {
      Alert.alert("添加角色失败", getErrorMessage(error, "请稍后重试"));
    }
  }, [addRoomRoleMutation, canAddRoomRole, roomRolesQuery, selectedRoomId]);

  const handleOpenCreateRoomRole = useCallback(() => {
    if (!canAddRoomRole || !selectedRoomId) {
      return;
    }
    setRoleSwitchVisible(false);
    router.push({
      pathname: "/role-edit",
      params: { addToRoomId: String(selectedRoomId) },
    });
  }, [canAddRoomRole, selectedRoomId]);

  const currentRoomUnreadCount = selectedRoomId ? (roomUnreadCounts[selectedRoomId] ?? 0) : 0;
  const draftRoleId = useMemo(() => {
    if (selectedRoleId)
      return selectedRoleId;
    const n = Number.parseInt(draftRoleIdInput, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [draftRoleIdInput, selectedRoleId]);

  const effectiveCurrentRoleId = draftRoleId ?? selectableRoomRoles[0]?.roleId ?? 0;
  const noRole = effectiveCurrentRoleId <= 0 && !isSpaceOwner;
  const roomStateRuntime = useRoomStateRuntime({
    currentRoleId: effectiveCurrentRoleId > 0 ? effectiveCurrentRoleId : null,
    messages: roomMessageModels,
    roomRoles,
    ruleId: selectedRuleId,
  });

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
      messages: roomMessageModels,
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
  }, [currentRole, draftCustomRoleName, draftRoleId, isSpaceOwner, isSpectator, queryClient, roomMessageModels, roomRoles, selectableRoomRoles, selectedAvatarId, selectedRoomId, selectedRuleId, selectedSpace, sendRoomMessageMutation]);

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
      close();
    }
  }, [close]);

  const handleBackFromDmChat = useCallback(() => {
    setCurrentContactId(null);
    setActiveDmTab(getDmTabForBackTarget(dmBackTarget));
    setDrawerMode("dm");
  }, [dmBackTarget]);
  const isRoutePage = !selectedRoomId && !currentContactId;
  const handleOpenRightDrawerTab = useCallback((tab: RightDrawerTabKey) => {
    Keyboard.dismiss();
    setRightDrawerTab(tab);
    setShouldRenderRightDrawer(true);
    open();
  }, [open]);

  const rightDrawerShortcutActions = useMemo<readonly ChatComposerShortcutAction[]>(() => RIGHT_DRAWER_SHORTCUTS.map(item => ({
    Icon: item.Icon,
    accessibilityLabel: `打开${item.label}`,
    onPress: () => handleOpenRightDrawerTab(item.tab),
  })), [handleOpenRightDrawerTab]);

  const handleOpenDmContactDrawer = useCallback(() => {
    Keyboard.dismiss();
    setShouldRenderRightDrawer(true);
    open();
  }, [open]);

  const handleLongPressMessage = useCallback((msg: Message) => {
    closeImmediately();
    setActionMenuMessage(msg);
    setActionMenuVisible(true);
  }, [closeImmediately]);

  const handleRetryRoomMessages = useCallback(() => {
    void refetchRoomMessages();
  }, [refetchRoomMessages]);

  const handleToggleMultiSelect = useCallback((msg: Message) => {
    if (!msg.messageId) {
      return;
    }
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
  }, []);

  const handleSystemBack = useCallback(() => {
    const action = resolveChatShellBackNavigationAction({
      actionMenuVisible,
      clueScopeOpen: clueScopeMessage !== null,
      createRoomVisible,
      createSpaceVisible,
      currentContactId,
      expressionPickerVisible,
      isRoutePage,
      mapSheetVisible,
      profileSheetOpen: profileSheetState !== null,
      rightDrawerOpen: isOverlayInteractive,
      roleSwitchVisible,
      searchPageVisible,
      stShowCardOpen: stShowCardModel !== null,
    });

    switch (action) {
      case "allow-system-back":
        return false;
      case "back-from-dm":
        handleBackFromDmChat();
        return true;
      case "back-to-route-page":
        handleBackToRoutePage();
        return true;
      case "close-action-menu":
        setActionMenuVisible(false);
        return true;
      case "close-clue-scope":
        setClueScopeMessage(null);
        return true;
      case "close-create-room":
        setCreateRoomVisible(false);
        return true;
      case "close-create-space":
        setCreateSpaceVisible(false);
        return true;
      case "close-expression-picker":
        setExpressionPickerVisible(false);
        return true;
      case "close-map-sheet":
        setMapSheetVisible(false);
        return true;
      case "close-profile-sheet":
        setProfileSheetState(null);
        return true;
      case "close-right-drawer":
        close();
        return true;
      case "close-role-switch":
        setRoleSwitchVisible(false);
        return true;
      case "close-search":
        setSearchPageVisible(false);
        return true;
      case "close-st-show-card":
        setStShowCardModel(null);
        return true;
    }
  }, [
    actionMenuVisible,
    clueScopeMessage,
    close,
    createRoomVisible,
    createSpaceVisible,
    currentContactId,
    expressionPickerVisible,
    handleBackFromDmChat,
    handleBackToRoutePage,
    isOverlayInteractive,
    isRoutePage,
    mapSheetVisible,
    profileSheetState,
    roleSwitchVisible,
    searchPageVisible,
    stShowCardModel,
  ]);

  // Room/DM 是 tabs 首页内的局部状态，Android 返回键需要先回到聊天上下文，再交给系统退出。
  useEffect(() => {
    if (Platform.OS !== "android") {
      return undefined;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", handleSystemBack);
    return () => subscription.remove();
  }, [handleSystemBack]);

  const handleSelectMessageAnchor = useCallback((message: Message) => {
    setMessageAnchorId(message.messageId ?? null);
    setMessageError(null);
  }, []);

  const handleRefreshWorkspace = useCallback(async () => {
    await refetchSpaces();
    if (selectedSpaceId)
      await Promise.all([refetchRooms(), refetchSpaceMembers()]);
    if (selectedRoomId)
      await Promise.all([refetchRoomMembers(), refetchRoomMessages()]);
  }, [
    refetchRoomMembers,
    refetchRoomMessages,
    refetchRooms,
    refetchSpaceMembers,
    refetchSpaces,
    selectedRoomId,
    selectedSpaceId,
  ]);

  const handleSendMessage = useCallback(async () => {
    if (messageSendInFlightRef.current) {
      return;
    }

    const submittedDraftMessage = draftMessage;
    const submittedDraftRoleIdInput = draftRoleIdInput;
    const submittedMessageAnchorId = messageAnchorId;
    const submittedMessageAttachments = messageAttachments;
    messageSendInFlightRef.current = true;
    setMessageSendInFlight(true);
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
          originalMessage: editingMessage,
          updatedMessage: buildEditedRoomMessage(editingMessage, trimmedContent),
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
        ruleId: selectedRuleId,
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
              messages: roomMessageModels,
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
      setMessageSendInFlight(false);
    }
  }, [
    currentRole?.avatarId,
    draftCustomRoleName,
    draftMessage,
    draftRoleId,
    draftRoleIdInput,
    editingMessage,
    editMessage,
    isSpaceOwner,
    isSpectator,
    messageAnchorId,
    messageAttachments,
    messageMode,
    queryClient,
    roomMessageModels,
    roomRoles,
    selectableRoomRoles,
    selectedAvatarId,
    selectedRoomId,
    selectedRuleId,
    selectedSpace,
    sendRoomMessageMutation,
  ]);

  const handlePickAttachments = useCallback(async (kind: MobileMessageAttachmentKind) => {
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
  }, []);

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
        ruleId: selectedRuleId,
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
    selectedRuleId,
    sendRoomMessageMutation,
  ]);

  const sendCombatRoundEvent = useCallback(async (kind: "end" | "start") => {
    if (!isSpaceOwner) {
      setMessageError("只有主持人可以切换战斗轮。");
      return;
    }
    if (!selectedRoomId || selectedRoomId <= 0) {
      setMessageError("请先选择一个房间。");
      return;
    }
    if (isSendingCombatRoundEvent) {
      return;
    }

    try {
      setIsSendingCombatRoundEvent(true);
      setMessageError(null);
      const effectiveRoleId = draftRoleId ?? currentRole?.roleId ?? -1;
      const effectiveRole = effectiveRoleId > 0
        ? roomRoles.find(role => role.roleId === effectiveRoleId)
        : null;
      const sendIdentity = resolveSendIdentity({
        currentAvatarId: selectedAvatarId ?? effectiveRole?.avatarId ?? currentRole?.avatarId ?? -1,
        customRoleName: draftCustomRoleName,
        inputContent: kind === "start" ? START_COMBAT_CONTENT : END_COMBAT_CONTENT,
        isSpaceOwner,
        isSpectator,
        roleId: effectiveRoleId,
      });

      await sendRoomMessageMutation.sendRequest({
        avatarId: sendIdentity.avatarId,
        content: kind === "start" ? START_COMBAT_CONTENT : END_COMBAT_CONTENT,
        customRoleName: sendIdentity.customRoleName,
        extra: toApiMessageExtraWithStateEvent(kind === "start"
          ? buildStartCombatStateEventExtra()
          : buildEndCombatStateEventExtra()),
        messageType: MESSAGE_TYPE.STATE_EVENT,
        roleId: sendIdentity.roleId,
        roomId: selectedRoomId,
      });
    }
    catch (error) {
      setMessageError(getErrorMessage(error, kind === "start" ? "开始战斗失败。" : "结束战斗失败。"));
    }
    finally {
      setIsSendingCombatRoundEvent(false);
    }
  }, [
    currentRole?.avatarId,
    currentRole?.roleId,
    draftCustomRoleName,
    draftRoleId,
    isSendingCombatRoundEvent,
    isSpaceOwner,
    isSpectator,
    roomRoles,
    selectedAvatarId,
    selectedRoomId,
    sendRoomMessageMutation,
  ]);

  const handleStartCombat = useCallback(() => {
    void sendCombatRoundEvent("start");
  }, [sendCombatRoundEvent]);

  const handleEndCombat = useCallback(() => {
    void sendCombatRoundEvent("end");
  }, [sendCombatRoundEvent]);

  const handleAdvanceTurnPress = useCallback(() => {
    void handleAdvanceTurn();
  }, [handleAdvanceTurn]);

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
      const currentDraftMessage = draftMessageRef.current;
      const effectiveRoleId = draftRoleId ?? selectableRoomRoles[0]?.roleId ?? (isSpaceOwner ? -1 : 0);
      const effectiveRole = effectiveRoleId > 0
        ? roomRoles.find(role => role.roleId === effectiveRoleId)
        : null;
      const sendIdentity = resolveSendIdentity({
        currentAvatarId: selectedAvatarId ?? effectiveRole?.avatarId ?? currentRole?.avatarId ?? -1,
        customRoleName: draftCustomRoleName,
        inputContent: currentDraftMessage,
        isSpaceOwner,
        isSpectator,
        roleId: effectiveRoleId,
      });
      const [draft] = buildMessageDraftsFromUploadedMedia({
        inputText: sendIdentity.content ?? currentDraftMessage,
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
    draftRoleId,
    isSpaceOwner,
    isSpectator,
    roomRoles,
    selectableRoomRoles,
    selectedAnchorMessage?.messageId,
    selectedAvatarId,
    sendRoomMessageMutation,
  ]);

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
    setActionMenuVisible(false);
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

  const handleOpenSearch = useCallback(() => {
    setSearchPageVisible(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchPageVisible(false);
  }, []);

  const handleScrollToSearchMessage = useCallback((messageId: number) => {
    setMessageAnchorId(messageId);
  }, []);

  const handleOpenCreateSpace = useCallback(() => {
    setCreateSpaceVisible(true);
  }, []);

  const handleOpenCreateRoomSheet = useCallback(() => {
    setCreateRoomVisible(true);
  }, []);

  const handleLeftDrawerRefresh = useCallback(() => {
    void handleRefreshWorkspace();
  }, [handleRefreshWorkspace]);

  const handleClearAnchor = useCallback(() => {
    setMessageAnchorId(null);
  }, []);

  const handleClearAttachments = useCallback(() => {
    setMessageAttachments([]);
  }, []);

  const handleOpenExpressionPicker = useCallback(() => {
    setExpressionPickerVisible(true);
  }, []);

  const handleOpenRoleSwitch = useCallback(() => {
    setRoleSwitchVisible(true);
  }, []);

  const handlePickComposerAttachment = useCallback((kind: MobileMessageAttachmentKind) => {
    void handlePickAttachments(kind);
  }, [handlePickAttachments]);

  const handleRemoveComposerAttachment = useCallback((id: string) => {
    setMessageAttachments(cur => cur.filter(a => a.id !== id));
  }, []);

  const handleSendPress = useCallback(() => {
    void handleSendMessage();
  }, [handleSendMessage]);

  const handleCancelMultiSelect = useCallback(() => {
    setMultiSelectMode(false);
    setMultiSelectedIds(new Set());
  }, []);

  const handleCopyMultiSelectedMessages = useCallback(async () => {
    const selected = roomMessages
      .filter(item => item.message.messageId && multiSelectedIds.has(item.message.messageId))
      .map(item => item.message.content?.trim())
      .filter(Boolean)
      .join("\n");
    if (selected)
      await Clipboard.setStringAsync(selected);
    handleCancelMultiSelect();
  }, [handleCancelMultiSelect, multiSelectedIds, roomMessages]);

  const handleDeleteMultiSelectedMessages = useCallback(() => {
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
      handleCancelMultiSelect();
    })();
  }, [deleteMessages, handleCancelMultiSelect, multiSelectedIds]);

  const handleCloseActionMenu = useCallback(() => {
    setActionMenuVisible(false);
  }, []);

  const handleActionMenuAction = useCallback((action: MessageAction, msg: Message) => {
    void handleMessageAction(action, msg);
  }, [handleMessageAction]);

  const handleCloseClueScope = useCallback(() => {
    setClueScopeMessage(null);
  }, []);

  const handleAddPrivateClue = useCallback(() => {
    if (clueScopeMessage) {
      void handleCopyMessageToClueFolder(clueScopeMessage, "private");
    }
  }, [clueScopeMessage, handleCopyMessageToClueFolder]);

  const handleAddPublicClue = useCallback(() => {
    if (clueScopeMessage) {
      void handleCopyMessageToClueFolder(clueScopeMessage, "public");
    }
  }, [clueScopeMessage, handleCopyMessageToClueFolder]);

  const handleCloseRoleSwitch = useCallback(() => {
    setRoleSwitchVisible(false);
  }, []);

  const handleAddRolePress = useCallback((role: UserRole) => {
    void handleAddRoomRole(role);
  }, [handleAddRoomRole]);

  const handleSelectRoleAvatar = useCallback((avatarId: number | undefined, avatarFileId: number | undefined) => {
    setSelectedAvatarId(avatarId);
    setSelectedAvatarFileId(avatarFileId);
  }, []);

  const handleCloseExpressionPicker = useCallback(() => {
    setExpressionPickerVisible(false);
  }, []);

  const handleSelectExpressionPress = useCallback((sticker: Sticker) => {
    void handleSelectExpression(sticker);
  }, [handleSelectExpression]);

  const handleCloseMapSheet = useCallback(() => {
    setMapSheetVisible(false);
  }, []);

  const handleCloseCreateSpace = useCallback(() => {
    setCreateSpaceVisible(false);
  }, []);

  const handleCreateSpaceCreated = useCallback((space: Parameters<NonNullable<ComponentProps<typeof CreateSpaceSheet>["onCreated"]>>[0]) => {
    upsertUserActiveSpaceQueryData(queryClient, space);
    if (space.spaceId)
      startTransition(() => setSelectedSpaceId(space.spaceId!));
    void refetchSpaces();
  }, [queryClient, refetchSpaces, setSelectedSpaceId]);

  const handleCloseCreateRoom = useCallback(() => {
    setCreateRoomVisible(false);
  }, []);

  const handleCreateRoomCreated = useCallback((room: Parameters<NonNullable<ComponentProps<typeof CreateRoomSheet>["onCreated"]>>[0]) => {
    if (!selectedSpaceId) {
      return;
    }
    upsertUserRoomQueryData(queryClient, selectedSpaceId, room);
    if (room.roomId)
      startTransition(() => setSelectedRoomId(room.roomId!));
    void refetchRooms();
  }, [queryClient, refetchRooms, selectedSpaceId, setSelectedRoomId]);

  const handleCloseProfileSheet = useCallback(() => {
    setProfileSheetState(null);
  }, []);

  const handleCloseStShowCard = useCallback(() => {
    setStShowCardModel(null);
  }, []);

  const keyboardBehavior = Platform.select<"height" | "padding" | "position" | undefined>({ android: "height", ios: "padding" });

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
                    onCreateRoom={isSpaceOwner ? handleOpenCreateRoomSheet : undefined}
                    onCreateSpace={handleOpenCreateSpace}
                    onChangeDmTab={setActiveDmTab}
                    onRefresh={handleLeftDrawerRefresh}
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
                <View style={styles.panelContainer}>
                  <Animated.View style={[styles.center, centerStyle]}>
                    {!currentContactId && !searchPageVisible && (
                      <ChatHeader
                        roomName={selectedRoom?.name ?? null}
                        onBackToRoutePage={handleBackToRoutePage}
                        onSearch={handleOpenSearch}
                        unreadCount={currentRoomUnreadCount}
                      />
                    )}
                    {searchPageVisible && !currentContactId
                      ? (
                          <ChatSearchPage
                            messages={roomMessages}
                            onClose={handleCloseSearch}
                            onScrollToMessage={handleScrollToSearchMessage}
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
                              onOpenContactDrawer={handleOpenDmContactDrawer}
                              safeAreaBottomInset={insets.bottom}
                            />
                          )
                        : (
                            <>
                              <ChatMessageList
                                messages={roomMessages}
                                multiSelectMode={multiSelectMode}
                                multiSelectedIds={multiSelectedIds}
                                selectedAnchorId={messageAnchorId}
                                onLongPressMessage={handleLongPressMessage}
                                onRetry={handleRetryRoomMessages}
                                onToggleMultiSelect={handleToggleMultiSelect}
                                isPending={roomMessagesQuery.isPending}
                                isError={roomMessagesQuery.isError}
                                error={roomMessagesQuery.error}
                                roomRoles={roomRoles}
                                currentRoleId={effectiveCurrentRoleId}
                                isSpaceOwner={isSpaceOwner}
                                noRole={noRole}
                                isCommandRequestConsumed={commandRequests.isConsumed}
                                onExecuteCommandRequest={commandRequests.handleExecute}
                                stateEventSummariesByMessageId={roomStateRuntime.messageSummariesByMessageId}
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
                                        onPress={handleCopyMultiSelectedMessages}
                                        style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}
                                      >
                                        <ThemedText style={{ color: theme.accent, fontSize: 14 }}>复制</ThemedText>
                                      </Pressable>
                                      <Pressable
                                        onPress={handleDeleteMultiSelectedMessages}
                                        style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}
                                      >
                                        <ThemedText style={{ color: theme.danger, fontSize: 14 }}>删除</ThemedText>
                                      </Pressable>
                                      <Pressable
                                        onPress={handleCancelMultiSelect}
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
                                      isSubmitting={messageSendInFlight}
                                      messageAttachments={messageAttachments}
                                      messageMode={messageMode}
                                      onChangeDraftMessage={setDraftMessage}
                                      onChangeDraftRoleIdInput={setDraftRoleIdInput}
                                      onClearAnchor={handleClearAnchor}
                                      onClearAttachments={handleClearAttachments}
                                      onOpenExpressionPicker={handleOpenExpressionPicker}
                                      onOpenRoleSwitch={handleOpenRoleSwitch}
                                      onPickAttachment={handlePickComposerAttachment}
                                      onRemoveAttachment={handleRemoveComposerAttachment}
                                      onSend={handleSendPress}
                                      roomName={selectedRoom?.name}
                                      ruleId={selectedRuleId}
                                      safeAreaBottomInset={insets.bottom}
                                      shortcutActions={rightDrawerShortcutActions}
                                    />
                                  )}
                            </>
                          )}
                    <GestureDetector gesture={panGesture}>
                      <View style={[styles.rightDrawerGestureEdge, { bottom: DRAWER_EDGE_GESTURE_COMPOSER_GUARD_HEIGHT + insets.bottom }]} />
                    </GestureDetector>
                    <Animated.View
                      pointerEvents={isOverlayInteractive ? "auto" : "none"}
                      style={[styles.overlay, overlayStyle]}
                    >
                      <Pressable style={{ flex: 1 }} onPress={close} />
                    </Animated.View>
                  </Animated.View>

                  <Animated.View style={[styles.rightDrawer, rightDrawerStyle]}>
                    {shouldRenderRightDrawer && currentContactId
                      ? (
                          <DmContactDrawer
                            contactId={currentContactId}
                            contactName={currentDmContactName ?? `用户 #${currentContactId}`}
                            contactAvatarFileId={currentDmConversation?.contactAvatarFileId}
                            onDeleted={handleBackFromDmChat}
                            onClose={close}
                          />
                        )
                      : shouldRenderRightDrawer
                        ? (
                          <RightDrawerPanel
                            activeTab={rightDrawerTab}
                            clueRooms={clueRooms}
                            currentUserId={currentUserId}
                            currentRoleId={draftRoleId ?? currentRole?.roleId ?? null}
                            isKP={isSpaceOwner}
                            isStateCommandMode={messageMode === MOBILE_MESSAGE_MODE.STATE_EVENT}
                            messages={roomMessageModels}
                            onAdvanceTurn={handleAdvanceTurnPress}
                            onChangeActiveTab={setRightDrawerTab}
                            onClose={close}
                            onEnterStateCommandMode={handleEnterStateMode}
                            onEndCombat={handleEndCombat}
                            onStartCombat={handleStartCombat}
                            roomId={selectedRoomId}
                            roomRoles={roomRoles}
                            roomStateRuntime={roomStateRuntime}
                            ruleId={selectedRuleId}
                            isSendingCombatRoundEvent={isSendingCombatRoundEvent}
                            spaceId={selectedSpaceId}
                          />
                        )
                        : null}
                  </Animated.View>
                </View>
              )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      {actionMenuVisible
        ? (
            <MessageActionMenu
              canAddClue
              currentUserId={currentUserId}
              hasHostPrivileges={isSpaceOwner}
              message={actionMenuMessage}
              onAction={handleActionMenuAction}
              onClose={handleCloseActionMenu}
              visible
            />
          )
        : null}
      {clueScopeMessage
        ? (
            <BottomSheetModal
              backgroundColor={theme.surface}
              handleColor={theme.border}
              onClose={handleCloseClueScope}
              sheetStyle={styles.clueScopeSheet}
              visible
            >
              <ThemedText type="smallBold" themeColor="textSecondary">添加到线索</ThemedText>
              <Pressable
                accessibilityLabel="添加到我的线索"
                accessibilityRole="button"
                onPress={handleAddPrivateClue}
                style={({ pressed }) => [styles.clueScopeAction, pressed && { backgroundColor: theme.backgroundElement }]}
              >
                <ThemedText>我的线索</ThemedText>
              </Pressable>
              <Pressable
                accessibilityLabel="添加到公共线索"
                accessibilityRole="button"
                onPress={handleAddPublicClue}
                style={({ pressed }) => [styles.clueScopeAction, pressed && { backgroundColor: theme.backgroundElement }]}
              >
                <ThemedText>公共线索</ThemedText>
              </Pressable>
            </BottomSheetModal>
          )
        : null}
      {roleSwitchVisible
        ? (
            <RoleSwitchSheet
              addableRoles={addableRoomRoles}
              canAddRole={canAddRoomRole}
              currentAvatarId={selectedAvatarId}
              currentRoleId={selectedRoleId}
              customRoleName={draftCustomRoleName}
              canSelectNarrator={isSpaceOwner}
              isAddingRole={addRoomRoleMutation.isPending}
              onAddRole={handleAddRolePress}
              onChangeCustomRoleName={setDraftCustomRoleName}
              onClose={handleCloseRoleSwitch}
              onCreateRole={handleOpenCreateRoomRole}
              onSelectAvatar={handleSelectRoleAvatar}
              onSelectRole={setSelectedRoleId}
              roles={selectableRoomRoles}
              visible
            />
          )
        : null}
      {expressionPickerVisible
        ? (
            <ExpressionPickerSheet
              onClose={handleCloseExpressionPicker}
              onSelectExpression={handleSelectExpressionPress}
              visible
            />
          )
        : null}
      {mapSheetVisible
        ? (
            <MapSheet
              currentRoleId={selectedRoleId ?? null}
              isKP={isSpaceOwner}
              messages={roomMessageModels}
              onClose={handleCloseMapSheet}
              roomId={selectedRoomId}
              roomRoles={roomRoles}
              ruleId={selectedRuleId}
              visible
            />
          )
        : null}
      {createSpaceVisible
        ? (
            <CreateSpaceSheet
              onClose={handleCloseCreateSpace}
              onCreated={handleCreateSpaceCreated}
              visible
            />
          )
        : null}
      {selectedSpaceId && createRoomVisible
        ? (
            <CreateRoomSheet
              onClose={handleCloseCreateRoom}
              onCreated={handleCreateRoomCreated}
              spaceId={selectedSpaceId}
              visible={createRoomVisible}
            />
          )
        : null}
      {profileSheetState
        ? (
            <UserProfileSheet
              avatarFileId={profileSheetState.avatarFileId}
              onClose={handleCloseProfileSheet}
              userId={profileSheetState.userId ?? null}
              username={profileSheetState.username ?? null}
              visible
            />
          )
        : null}
      {stShowCardModel
        ? (
            <MobileStShowCardSheet
              model={stShowCardModel}
              onClose={handleCloseStShowCard}
            />
          )
        : null}
    </ThemedView>
  );
}
