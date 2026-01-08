import type { SpaceContextType } from "@/components/chat/core/spaceContext";
import type { Room } from "../../../api";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import ChatRoomListPanel from "@/components/chat/room/chatRoomListPanel";
import ChatPageContextMenu from "@/components/chat/room/contextMenu/chatPageContextMenu";
import RoomWindow from "@/components/chat/room/roomWindow";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";
import SpaceContextMenu from "@/components/chat/space/contextMenu/spaceContextMenu";
import SpaceDetailPanel from "@/components/chat/space/drawers/spaceDetailPanel";
import SpaceInvitePanel from "@/components/chat/space/spaceInvitePanel";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import CreateRoomWindow from "@/components/chat/window/createRoomWindow";
import CreateSpaceWindow from "@/components/chat/window/createSpaceWindow";
import RoomSettingWindow from "@/components/chat/window/roomSettingWindow";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import FriendsPage from "@/components/privateChat/FriendsPage";
import { usePrivateMessageList } from "@/components/privateChat/hooks/usePrivateMessageList";
import { useUnreadCount } from "@/components/privateChat/hooks/useUnreadCount";
import RightChatView from "@/components/privateChat/RightChatView";
import {
  useAddRoomMemberMutation,
  useAddSpaceMemberMutation,
  useGetSpaceMembersQuery,
  useGetUserRoomsQuery,
  useGetUserSpacesQuery,
  useSetPlayerMutation,
} from "api/hooks/chatQueryHooks";
import { useGetFriendRequestPageQuery } from "api/hooks/friendQueryHooks";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

/**
 * chat板块的主组件
 */
export default function ChatPage() {
  const { spaceId: urlSpaceId, roomId: urlRoomId, messageId: urlMessageId } = useParams();
  const activeRoomId = Number(urlRoomId) || null;
  const activeSpaceId = Number(urlSpaceId) || null;
  const targetMessageId = Number(urlMessageId) || null;
  const [searchParam, _] = useSearchParams();
  const navigate = useNavigate();

  const isRoomSettingRoute = urlMessageId === "setting";

  const isPrivateChatMode = urlSpaceId === "private";
  const spaceDetailRouteTab: SpaceDetailTab | null = (!isPrivateChatMode && !urlMessageId && (urlRoomId === "members" || urlRoomId === "workflow" || urlRoomId === "setting"))
    ? urlRoomId
    : null;
  const isSpaceDetailRoute = spaceDetailRouteTab != null;

  const screenSize = useScreenSize();

  const [isOpenLeftDrawer, setIsOpenLeftDrawer] = useState(
    !(urlSpaceId && urlRoomId) || (!urlRoomId && isPrivateChatMode) || (screenSize === "sm" && !isPrivateChatMode),
  );

  const chatLeftPanelWidth = useDrawerPreferenceStore(state => state.chatLeftPanelWidth);
  const setChatLeftPanelWidth = useDrawerPreferenceStore(state => state.setChatLeftPanelWidth);

  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const spaceMembersQuery = useGetSpaceMembersQuery(activeSpaceId ?? -1);
  // 当前激活的space对应的rooms。
  const rooms = useMemo(() => userRoomQuery.data?.data?.rooms ?? [], [userRoomQuery.data?.data?.rooms]);
  // 获取用户空间列表
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);

  // 获取当前用户信息（需要在后续 effect / memo 中使用）
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;

  // space 自定义排序（纯本地）
  // 用一个固定 key 保存所有用户的排序，避免 useLocalStorage 不支持动态 key 的问题。
  const [spaceOrderByUser, setSpaceOrderByUser] = useLocalStorage<Record<string, number[]>>("spaceOrderByUser", {});
  // room 自定义排序（纯本地）
  // key: userId -> spaceId -> roomIds
  const [roomOrderByUserAndSpace, setRoomOrderByUserAndSpace] = useLocalStorage<Record<string, Record<string, number[]>>>(
    "roomOrderByUserAndSpace",
    {},
  );
  // 用于减少 /room/list 重复请求：缓存 space -> roomIds（按 user 分组）
  const [spaceRoomIdsByUser, setSpaceRoomIdsByUser] = useLocalStorage<Record<string, Record<string, number[]>>>(
    "spaceRoomIdsByUser",
    {},
  );
  const activeSpace = spaces.find(space => space.spaceId === activeSpaceId);
  const activeSpaceIsArchived = activeSpace?.status === 2;

  const setActiveSpaceId = useCallback((spaceId: number | null) => {
    setStoredChatIds({ spaceId, roomId: null });
    const newSearchParams = new URLSearchParams(searchParam);
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    navigate(`/chat/${spaceId ?? "private"}/${""}?${newSearchParams.toString()}`);
  }, [isOpenLeftDrawer, navigate, searchParam, setStoredChatIds, screenSize]);
  const setActiveRoomId = useCallback((roomId: number | null) => {
    setStoredChatIds({ spaceId: activeSpaceId, roomId });
    const newSearchParams = new URLSearchParams(searchParam);
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    navigate(`/chat/${activeSpaceId ?? "private"}/${roomId}?${newSearchParams.toString()}`);
  }, [activeSpaceId, isOpenLeftDrawer, navigate, screenSize, searchParam, setStoredChatIds]);

  // 主区域视图：不再用 URL 管理（避免 URL 变得过长/冲突）
  type RoomSettingTab = "role" | "setting";
  type SpaceDetailTab = "members" | "workflow" | "setting";
  const [mainView, setMainView] = useState<"chat" | "spaceDetail" | "roomSetting">("chat");
  const [spaceDetailTab, setSpaceDetailTab] = useState<SpaceDetailTab>("members");
  const [roomSettingState, setRoomSettingState] = useState<{ roomId: number; tab: RoomSettingTab } | null>(null);

  const openRoomSettingPage = useCallback((roomId: number | null, tab?: RoomSettingTab) => {
    if (roomId == null)
      return;

    if (activeSpaceId == null)
      return;

    const nextTab: RoomSettingTab = tab ?? "setting";
    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    navigate(`/chat/${activeSpaceId}/${roomId}/setting${qs ? `?${qs}` : ""}`);

    setRoomSettingState({ roomId, tab: nextTab });
    setMainView("roomSetting");
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [activeSpaceId, navigate, searchParam]);

  const closeRoomSettingPage = useCallback(() => {
    setRoomSettingState(null);
    setMainView("chat");

    if (activeSpaceId == null || activeRoomId == null)
      return;

    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    navigate(`/chat/${activeSpaceId}/${activeRoomId}${qs ? `?${qs}` : ""}`);
  }, [activeRoomId, activeSpaceId, navigate, searchParam]);

  const urlDrivenRoomSettingRef = useRef(false);
  useEffect(() => {
    if (isPrivateChatMode)
      return;

    if (isRoomSettingRoute) {
      urlDrivenRoomSettingRef.current = true;
      if (activeSpaceId == null || activeRoomId == null)
        return;

      const urlTab = searchParam.get("tab");
      const nextTab: RoomSettingTab = urlTab === "role" || urlTab === "setting" ? urlTab : "setting";
      setRoomSettingState({ roomId: activeRoomId, tab: nextTab });
      setMainView("roomSetting");
      return;
    }

    if (urlDrivenRoomSettingRef.current) {
      urlDrivenRoomSettingRef.current = false;
      setRoomSettingState(null);
      setMainView("chat");
    }
  }, [activeRoomId, activeSpaceId, isPrivateChatMode, isRoomSettingRoute, searchParam]);

  const urlDrivenSpaceDetailRef = useRef(false);
  useEffect(() => {
    if (isPrivateChatMode)
      return;

    if (isSpaceDetailRoute) {
      urlDrivenSpaceDetailRef.current = true;
      setRoomSettingState(null);

      setSpaceDetailTab(spaceDetailRouteTab ?? "setting");
      setMainView("spaceDetail");
      return;
    }

    if (urlDrivenSpaceDetailRef.current) {
      urlDrivenSpaceDetailRef.current = false;
      // 从 spaceDetail 路由跳到 room setting 路由时，避免覆盖 roomSetting 的 mainView。
      if (isRoomSettingRoute)
        return;
      setMainView("chat");
    }
  }, [isPrivateChatMode, isRoomSettingRoute, isSpaceDetailRoute, spaceDetailRouteTab]);

  const hasInitPrivateChatRef = useRef(false);
  useEffect(() => {
    if (hasInitPrivateChatRef.current)
      return;
    if (!isPrivateChatMode)
      return;
    hasInitPrivateChatRef.current = true;

    // 恢复上次的激活空间和房间,否则恢复第一个房间
    const targetRoomId = storedIds.roomId ?? rooms[0]?.roomId;
    if (targetRoomId) {
      setActiveRoomId(targetRoomId);
    }
    const targetSpaceId = storedIds.spaceId;
    if (targetSpaceId) {
      setActiveSpaceId(targetSpaceId);
    }
  }, [isPrivateChatMode, rooms, setActiveRoomId, setActiveSpaceId, storedIds.roomId, storedIds.spaceId]);

  useLayoutEffect(() => {
    // 在空间模式下，切换空间后默认选中第一个房间
    (!isPrivateChatMode && rooms && !urlRoomId) && setActiveRoomId(rooms[0]?.roomId ?? null);
  }, [isPrivateChatMode, rooms, setActiveRoomId, urlRoomId]);

  // 当前 space 的 rooms 拉取后，更新本地 space->roomIds 映射，避免为了 space 未读数等需求进行批量请求。
  useEffect(() => {
    if (isPrivateChatMode)
      return;
    if (activeSpaceId == null)
      return;
    const roomIds = (rooms ?? [])
      .map(r => r.roomId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
    const userKey = String(userId);
    const spaceKey = String(activeSpaceId);
    setSpaceRoomIdsByUser((prev) => {
      const prevUserMap = prev[userKey] ?? {};
      const prevRoomIds = prevUserMap[spaceKey] ?? [];
      if (prevRoomIds.length === roomIds.length && prevRoomIds.every((v, i) => v === roomIds[i])) {
        return prev;
      }
      return {
        ...prev,
        [userKey]: {
          ...prevUserMap,
          [spaceKey]: roomIds,
        },
      };
    });
  }, [activeSpaceId, isPrivateChatMode, rooms, setSpaceRoomIdsByUser, userId]);

  // 创建空间弹窗是否打开
  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useSearchParamsState<boolean>("addSpacePop", false);
  // 创建房间弹窗是否打开
  const [isRoomHandleOpen, setIsRoomHandleOpen] = useSearchParamsState<boolean>("addRoomPop", false);

  const openSpaceDetailPanel = useCallback((tab: SpaceDetailTab) => {
    if (activeSpaceId == null || isPrivateChatMode)
      return;

    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    navigate(`/chat/${activeSpaceId}/${tab}${qs ? `?${qs}` : ""}`);

    setSpaceDetailTab(tab);
    setRoomSettingState(null);
    setMainView("spaceDetail");
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [activeSpaceId, isPrivateChatMode, navigate, searchParam]);

  const closeSpaceDetailPanel = useCallback(() => {
    setMainView("chat");

    if (activeSpaceId == null || isPrivateChatMode)
      return;

    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();

    const fallbackRoomId = storedIds.spaceId === activeSpaceId ? storedIds.roomId : null;
    const nextRoomId = (typeof fallbackRoomId === "number" && Number.isFinite(fallbackRoomId)) ? fallbackRoomId : "";
    navigate(`/chat/${activeSpaceId}/${nextRoomId}${qs ? `?${qs}` : ""}`);
  }, [activeSpaceId, isPrivateChatMode, navigate, searchParam, storedIds.roomId, storedIds.spaceId]);
  // 空间成员邀请窗口状态
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("addSpaceMemberPop", false);
  // 房间邀请窗口状态
  const [inviteRoomId, setInviteRoomId] = useState<number | null>(null);
  const [_sideDrawerState, _setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");

  const spaceOrder = useMemo(() => {
    return spaceOrderByUser[String(userId)] ?? [];
  }, [spaceOrderByUser, userId]);

  const orderedSpaces = useMemo(() => {
    if (!Array.isArray(spaces) || spaces.length <= 1) {
      return spaces;
    }

    const orderIndex = new Map<number, number>();
    for (let i = 0; i < spaceOrder.length; i++) {
      orderIndex.set(spaceOrder[i]!, i);
    }

    return [...spaces]
      .map((space, originalIndex) => {
        const sid = space.spaceId ?? -1;
        const order = orderIndex.get(sid);
        return { space, originalIndex, order };
      })
      .sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo)
          return ao - bo;
        return a.originalIndex - b.originalIndex;
      })
      .map(x => x.space);
  }, [spaces, spaceOrder]);

  const orderedSpaceIds = useMemo(() => {
    return orderedSpaces
      .map(s => s.spaceId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [orderedSpaces]);

  const setUserSpaceOrder = useCallback((nextOrder: number[]) => {
    setSpaceOrderByUser(prev => ({
      ...prev,
      [String(userId)]: nextOrder,
    }));
  }, [setSpaceOrderByUser, userId]);

  const roomOrder = useMemo(() => {
    if (activeSpaceId == null || isPrivateChatMode)
      return [];
    return roomOrderByUserAndSpace[String(userId)]?.[String(activeSpaceId)] ?? [];
  }, [activeSpaceId, isPrivateChatMode, roomOrderByUserAndSpace, userId]);

  const orderedRooms = useMemo(() => {
    if (!Array.isArray(rooms) || rooms.length <= 1) {
      return rooms;
    }

    const orderIndex = new Map<number, number>();
    for (let i = 0; i < roomOrder.length; i++) {
      orderIndex.set(roomOrder[i]!, i);
    }

    return [...rooms]
      .map((room, originalIndex) => {
        const rid = room.roomId ?? -1;
        const order = orderIndex.get(rid);
        return { room, originalIndex, order };
      })
      .sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo)
          return ao - bo;
        return a.originalIndex - b.originalIndex;
      })
      .map(x => x.room);
  }, [rooms, roomOrder]);

  const orderedRoomIds = useMemo(() => {
    return orderedRooms
      .map(r => r.roomId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [orderedRooms]);

  const setUserRoomOrder = useCallback((nextOrder: number[]) => {
    if (activeSpaceId == null || isPrivateChatMode)
      return;
    const userKey = String(userId);
    const spaceKey = String(activeSpaceId);
    setRoomOrderByUserAndSpace(prev => ({
      ...prev,
      [userKey]: {
        ...(prev[userKey] ?? {}),
        [spaceKey]: nextOrder,
      },
    }));
  }, [activeSpaceId, isPrivateChatMode, setRoomOrderByUserAndSpace, userId]);

  // 私聊未读消息：复用私聊列表现有计算逻辑（用于左侧“私信入口”角标）
  const privateMessageList = usePrivateMessageList({ globalContext, userId });
  const { unreadMessageNumbers: privateUnreadMessageNumbers } = useUnreadCount({
    realTimeContacts: privateMessageList.realTimeContacts,
    sortedRealTimeMessages: privateMessageList.sortedRealTimeMessages,
    userId,
    urlRoomId: isPrivateChatMode ? urlRoomId : undefined,
  });
  const privateTotalUnreadMessages = useMemo(() => {
    return privateMessageList.realTimeContacts.reduce((sum, contactId) => {
      // 当前正在看的私聊不再显示未读（与 ChatItem 逻辑一致）
      if (isPrivateChatMode && activeRoomId === contactId) {
        return sum;
      }
      return sum + (privateUnreadMessageNumbers[contactId] ?? 0);
    }, 0);
  }, [activeRoomId, isPrivateChatMode, privateMessageList.realTimeContacts, privateUnreadMessageNumbers]);

  // 待处理好友申请数：合并到私信入口角标
  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 });
  const pendingFriendRequestCount = useMemo(() => {
    const list = friendRequestPageQuery.data?.data?.list ?? [];
    if (!Array.isArray(list))
      return 0;
    return list.filter((r: any) => r?.type === "received" && r?.status === 1).length;
  }, [friendRequestPageQuery.data?.data?.list]);

  const privateEntryBadgeCount = useMemo(() => {
    return privateTotalUnreadMessages + pendingFriendRequestCount;
  }, [pendingFriendRequestCount, privateTotalUnreadMessages]);

  // 右键菜单
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomId: number } | null>(null);
  // 空间右键菜单
  const [spaceContextMenu, setSpaceContextMenu] = useState<{ x: number; y: number; spaceId: number } | null>(null);

  // 关闭右键菜单
  function closeContextMenu() {
    setContextMenu(null);
  }

  // 关闭空间右键菜单
  function closeSpaceContextMenu() {
    setSpaceContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    // 向上查找包含data-room-id属性的父元素
    const messageElement = target.closest("[data-room-id]");
    setContextMenu({ x: e.clientX, y: e.clientY, roomId: Number(messageElement?.getAttribute("data-room-id")) });
  }

  function handleSpaceContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    // 向上查找包含data-space-id属性的父元素
    const spaceElement = target.closest("[data-space-id]");
    const rawSpaceId = spaceElement?.getAttribute("data-space-id");
    if (!rawSpaceId)
      return;
    setSpaceContextMenu({ x: e.clientX, y: e.clientY, spaceId: Number(rawSpaceId) });
  }

  // 处理点击外部关闭房间右键菜单的逻辑
  useEffect(() => {
    if (contextMenu) {
      window.addEventListener("click", closeContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeContextMenu);
    };
  }, [contextMenu]); // 依赖于contextMenu状态

  // 处理点击外部关闭空间右键菜单的逻辑
  useEffect(() => {
    if (spaceContextMenu) {
      window.addEventListener("click", closeSpaceContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeSpaceContextMenu);
    };
  }, [spaceContextMenu]);

  // websocket封装, 用于发送接受消息
  const websocketUtils = useGlobalContext().websocketUtils;
  // 消息提醒相关
  const unreadMessagesNumber = websocketUtils.unreadMessagesNumber;
  const totalUnreadMessages = useMemo(() => {
    return Object.values(unreadMessagesNumber).reduce((sum, count) => sum + count, 0);
  }, [unreadMessagesNumber]);
  // 在标签页中显示未读消息
  useEffect(() => {
    const originalTitle = document.title.replace(/^\d+条新消息-/, ""); // 清除已有前缀
    if (totalUnreadMessages > 0) {
      document.title = `${totalUnreadMessages}条新消息-${originalTitle}`;
    }
    else {
      document.title = originalTitle;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [totalUnreadMessages]);

  // spaceContext
  const spaceContext: SpaceContextType = useMemo((): SpaceContextType => {
    return {
      spaceId: activeSpaceId ?? -1,
      isSpaceOwner: !!spaceMembersQuery.data?.data?.some(member => member.userId === globalContext.userId && member.memberType === 1),
      setActiveSpaceId,
      setActiveRoomId,
      toggleLeftDrawer: () => { setIsOpenLeftDrawer(!isOpenLeftDrawer); },
      ruleId: spaces.find(space => space.spaceId === activeSpaceId)?.ruleId,
      spaceMembers: spaceMembersQuery.data?.data ?? [],
    };
  }, [activeSpaceId, globalContext.userId, isOpenLeftDrawer, setActiveRoomId, setActiveSpaceId, spaceMembersQuery.data?.data, spaces]);

  const getSpaceUnreadMessagesNumber = (spaceId: number) => {
    const roomIds = spaceRoomIdsByUser[String(userId)]?.[String(spaceId)] ?? [];
    let result = 0;
    for (const roomId of roomIds) {
      if (activeRoomId !== roomId)
        result += unreadMessagesNumber[roomId] ?? 0;
    }
    return result;
  };

  // 添加房间成员的mutation
  const addRoomMemberMutation = useAddRoomMemberMutation();
  // 添加空间成员的mutation
  const addSpaceMemberMutation = useAddSpaceMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();

  // 处理邀请玩家
  const handleInvitePlayer = (roomId: number) => {
    setInviteRoomId(roomId);
  };

  // 处理添加房间成员
  const handleAddRoomMember = (userId: number) => {
    if (inviteRoomId) {
      addRoomMemberMutation.mutate({
        roomId: inviteRoomId,
        userIdList: [userId],
      }, {
        onSuccess: () => {
          setInviteRoomId(null);
        },
      });
    }
  };

  // 处理添加空间成员
  const handleAddSpaceMember = (userId: number) => {
    if (activeSpaceId) {
      addSpaceMemberMutation.mutate({
        spaceId: activeSpaceId,
        userIdList: [userId],
      }, {
        onSuccess: () => {
          setIsMemberHandleOpen(false);
        },
      });
    }
  };

  const handleAddSpacePlayer = (userId: number) => {
    if (!activeSpaceId)
      return;

    const isAlreadyMember = (spaceMembersQuery.data?.data ?? []).some(m => m.userId === userId);

    const grantPlayer = () => {
      setPlayerMutation.mutate({
        spaceId: activeSpaceId,
        uidList: [userId],
      }, {
        onSettled: () => {
          setIsMemberHandleOpen(false);
        },
      });
    };

    if (isAlreadyMember) {
      grantPlayer();
      return;
    }

    addSpaceMemberMutation.mutate({
      spaceId: activeSpaceId,
      userIdList: [userId],
    }, {
      onSuccess: () => {
        grantPlayer();
      },
      onError: () => {
        grantPlayer();
      },
    });
  };

  return (
    <SpaceContext value={spaceContext}>
      <div className="flex flex-row bg-base-100 flex-1 h-full relative">
        {/* 只有小屏才允许收起侧边栏 */}
        <OpenAbleDrawer
          isOpen={screenSize === "sm" ? isOpenLeftDrawer : true}
          className="h-full z-10 w-full bg-base-100"
          initialWidth={chatLeftPanelWidth}
          minWidth={200}
          maxWidth={700}
          onWidthChange={setChatLeftPanelWidth}
          handlePosition="right"
        >
          <div className="h-full flex flex-row w-full min-w-0">
            {/* 空间列表 */}
            <ChatSpaceSidebar
              isPrivateChatMode={isPrivateChatMode}
              spaces={orderedSpaces}
              spaceOrderIds={orderedSpaceIds}
              onReorderSpaceIds={setUserSpaceOrder}
              activeSpaceId={activeSpaceId}
              getSpaceUnreadMessagesNumber={getSpaceUnreadMessagesNumber}
              privateUnreadMessagesNumber={privateEntryBadgeCount}
              onOpenPrivate={() => {
                setActiveSpaceId(null);
                setActiveRoomId(null);
                navigate("/chat/private");
              }}
              onSelectSpace={(spaceId) => {
                setActiveSpaceId(spaceId);
              }}
              onCreateSpace={() => {
                setIsSpaceHandleOpen(true);
              }}
              onSpaceContextMenu={handleSpaceContextMenu}
            />
            <div className="w-px bg-base-300"></div>
            {/* 房间列表 */}
            <ChatRoomListPanel
              isPrivateChatMode={isPrivateChatMode}
              activeSpaceId={activeSpaceId}
              activeSpaceName={activeSpace?.name}
              activeSpaceIsArchived={activeSpaceIsArchived}
              isSpaceOwner={!!spaceContext.isSpaceOwner}
              rooms={orderedRooms}
              roomOrderIds={orderedRoomIds}
              onReorderRoomIds={setUserRoomOrder}
              activeRoomId={activeRoomId}
              unreadMessagesNumber={unreadMessagesNumber}
              onContextMenu={handleContextMenu}
              onInviteMember={() => setIsMemberHandleOpen(true)}
              onOpenSpaceDetailPanel={openSpaceDetailPanel}
              onSelectRoom={(roomId) => {
                setActiveRoomId(roomId);
              }}
              onCloseLeftDrawer={() => setIsOpenLeftDrawer(false)}
              onOpenRoomSetting={(roomId, tab) => {
                openRoomSettingPage(roomId, tab);
              }}
              setIsOpenLeftDrawer={setIsOpenLeftDrawer}
              onCreateRoom={() => {
                if (activeSpaceId) {
                  setIsRoomHandleOpen(true);
                }
              }}
            />
          </div>
        </OpenAbleDrawer>
        {/* 聊天记录窗口，输入窗口，侧边栏 */}
        {isPrivateChatMode
          ? (
              activeRoomId
                ? (
                    <RightChatView
                      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                    />
                  )
                : (
                    <FriendsPage
                      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                    />
                  )
            )
          : (
              <>
                {
                  activeSpaceId
                    ? (
                        mainView === "spaceDetail"
                          ? (
                              <div className="flex w-full h-full justify-center min-h-0 min-w-0">
                                <div className="w-full h-full overflow-auto flex justify-center p-2">
                                  <SpaceDetailPanel activeTab={spaceDetailTab} onClose={closeSpaceDetailPanel} />
                                </div>
                              </div>
                            )
                          : (mainView === "roomSetting" && roomSettingState)
                              ? (
                                  <div className="flex w-full h-full justify-center min-h-0 min-w-0">
                                    <div className="w-full h-full overflow-auto flex justify-center p-2">
                                      <RoomSettingWindow
                                        roomId={roomSettingState.roomId}
                                        onClose={closeRoomSettingPage}
                                        defaultTab={roomSettingState.tab}
                                      />
                                    </div>
                                  </div>
                                )
                              : (
                                  <RoomWindow
                                    roomId={activeRoomId ?? -1}
                                    spaceId={activeSpaceId ?? -1}
                                    targetMessageId={targetMessageId}
                                  />
                                )
                      )
                    : (
                        <div className="flex items-center justify-center w-full h-full font-bold">
                          <span className="text-center lg:hidden">请从右侧选择房间</span>
                        </div>
                      )
                }
              </>
            )}

        {/* 创建空间弹出窗口 */}
        <PopWindow isOpen={isSpaceHandleOpen} onClose={() => setIsSpaceHandleOpen(false)}>
          <CreateSpaceWindow
            onSuccess={() => setIsSpaceHandleOpen(false)}
          />
        </PopWindow>
        {/* 创建房间弹出窗口 */}
        <PopWindow isOpen={isRoomHandleOpen} onClose={() => setIsRoomHandleOpen(false)}>
          <CreateRoomWindow
            spaceId={activeSpaceId || -1}
            spaceAvatar={spaces.find(space => (space.spaceId === activeSpaceId))?.avatar}
            onSuccess={(roomId) => {
              if (roomId) {
                setActiveRoomId(roomId);
              }
              setIsRoomHandleOpen(false);
            }}
          />
        </PopWindow>
        {/* 房间邀请玩家窗口 */}
        <PopWindow
          isOpen={inviteRoomId !== null}
          onClose={() => setInviteRoomId(null)}
        >
          <AddMemberWindow
            handleAddMember={handleAddRoomMember}
            showSpace={true}
          />
        </PopWindow>
        {/* 空间成员邀请窗口 */}
        <PopWindow
          isOpen={isMemberHandleOpen}
          onClose={() => {
            setIsMemberHandleOpen(false);
          }}
        >
          <SpaceInvitePanel
            onAddSpectator={handleAddSpaceMember}
            onAddPlayer={handleAddSpacePlayer}
          />
        </PopWindow>
      </div>

      <ChatPageContextMenu
        contextMenu={contextMenu}
        unreadMessagesNumber={unreadMessagesNumber}
        activeRoomId={activeRoomId}
        onClose={closeContextMenu}
        onInvitePlayer={handleInvitePlayer}
      />

      <SpaceContextMenu
        contextMenu={spaceContextMenu}
        isSpaceOwner={
          spaceContextMenu
            ? spaces.find(space => space.spaceId === spaceContextMenu.spaceId)?.userId === globalContext.userId
            : false
        }
        isArchived={
          spaceContextMenu
            ? spaces.find(space => space.spaceId === spaceContextMenu.spaceId)?.status === 2
            : false
        }
        onClose={closeSpaceContextMenu}
      />
    </SpaceContext>
  );
}
