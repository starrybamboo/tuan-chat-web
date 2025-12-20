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
  useGetUserRoomsQueries,
  useGetUserRoomsQuery,
  useGetUserSpacesQuery,
  useSetPlayerMutation,
} from "api/hooks/chatQueryHooks";
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

  const isPrivateChatMode = urlSpaceId === "private";

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
  const rooms = useMemo(() => userRoomQuery.data?.data ?? [], [userRoomQuery.data?.data]);
  // 获取用户空间列表
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);
  const activeSpace = spaces.find(space => space.spaceId === activeSpaceId);

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

  // 当前激活的空间对应的房间列表
  const userRoomQueries = useGetUserRoomsQueries(spaces);
  // 空间对应的房间列表
  const spaceIdToRooms = useMemo(() => {
    const result: Record<number, Room[]> = {};
    for (const space of spaces) {
      const spaceId = space.spaceId ?? -1;
      result[spaceId] = userRoomQueries.find(query => query.data?.data?.some(room => room.spaceId === space.spaceId))?.data?.data ?? [];
    }
    return result;
  }, [spaces, userRoomQueries]);

  // 创建空间弹窗是否打开
  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useSearchParamsState<boolean>("addSpacePop", false);
  // 创建房间弹窗是否打开
  const [isRoomHandleOpen, setIsRoomHandleOpen] = useSearchParamsState<boolean>("addRoomPop", false);
  // 是否显示space详情
  const [isShowSpacePanel, setIsShowSpacePanel] = useSearchParamsState<boolean>("spaceDetailPop", false);
  const [_spaceDetailTab, _setSpaceDetailTab] = useSearchParamsState<"members" | "render" | "workflow" | "setting">("spaceDetailTab", "members");

  const openSpaceDetailPanel = useCallback((tab: "members" | "render" | "workflow" | "setting") => {
    const next = new URLSearchParams(searchParam);
    next.set("spaceDetailTab", JSON.stringify(tab));
    next.set("spaceDetailPop", JSON.stringify(true));
    navigate({ search: `?${next.toString()}` });
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [navigate, searchParam]);
  // 空间成员邀请窗口状态
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("addSpaceMemberPop", false);
  // 房间设置窗口状态
  const [activeRoomSettingId, setActiveRoomSettingId] = useState<number | null>(null);
  const [activeRoomSettingTab, setActiveRoomSettingTab] = useState<"role" | "setting" | "render">("role");
  // 房间邀请窗口状态
  const [inviteRoomId, setInviteRoomId] = useState<number | null>(null);
  const [_sideDrawerState, _setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");
  const [_isRenderWindowOpen, _setIsRenderWindowOpen] = useState(false);

  // 获取当前用户信息
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;

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
    setSpaceContextMenu({ x: e.clientX, y: e.clientY, spaceId: Number(spaceElement?.getAttribute("data-space-id")) });
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
    let result = 0;
    for (const room of spaceIdToRooms[spaceId]) {
      if (room.spaceId === spaceId && room.roomId && activeRoomId !== room.roomId) {
        result += unreadMessagesNumber[room.roomId] ?? 0;
      }
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
              spaces={spaces}
              activeSpaceId={activeSpaceId}
              getSpaceUnreadMessagesNumber={getSpaceUnreadMessagesNumber}
              privateUnreadMessagesNumber={privateTotalUnreadMessages}
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
              isSpaceOwner={!!spaceContext.isSpaceOwner}
              rooms={rooms}
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
                setActiveRoomSettingId(roomId);
                tab && setActiveRoomSettingTab(tab);
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
                    ? <RoomWindow roomId={activeRoomId ?? -1} spaceId={activeSpaceId ?? -1} targetMessageId={targetMessageId} />
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
        <PopWindow isOpen={isShowSpacePanel} onClose={() => setIsShowSpacePanel(false)}>
          <SpaceDetailPanel></SpaceDetailPanel>
        </PopWindow>
        {/* 房间设置窗口 */}
        <PopWindow
          isOpen={activeRoomSettingId !== null}
          onClose={() => setActiveRoomSettingId(null)}
        >
          {/* 严格判定，只有非 null（有效 id）才渲染窗口 */}
          {activeRoomSettingId !== null && (
            <RoomSettingWindow
              roomId={activeRoomSettingId}
              onClose={() => setActiveRoomSettingId(null)}
              defaultTab={activeRoomSettingTab}
            />
          )}
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
        onClose={closeSpaceContextMenu}
      />
    </SpaceContext>
  );
}
