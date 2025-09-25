import type { SpaceContextType } from "@/components/chat/spaceContext";
import type { Room } from "../../../api";
import ChatPageContextMenu from "@/components/chat/chatPageContextMenu";
import RoomWindow from "@/components/chat/roomWindow";
import SpaceDetailPanel from "@/components/chat/sideDrawer/spaceDetailPanel";
import RoomButton from "@/components/chat/smallComponents/roomButton";
import SpaceButton from "@/components/chat/smallComponents/spaceButton";
import { SpaceContext } from "@/components/chat/spaceContext";
import CreateRoomWindow from "@/components/chat/window/createRoomWindow";
import CreateSpaceWindow from "@/components/chat/window/createSpaceWindow";
import RoomSettingWindow from "@/components/chat/window/roomSettingWindow";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import LeftChatList from "@/components/privateChat/Left​​ChatList​​";
import RightChatView from "@/components/privateChat/RightChatView";
import { AddIcon, Setting } from "@/icons";
import {
  useGetSpaceMembersQuery,
  useGetUserRoomsQueries,
  useGetUserRoomsQuery,
  useGetUserSpacesQuery,
} from "api/hooks/chatQueryHooks";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

/**
 * chat板块的主组件
 */
export default function ChatPage() {
  const { spaceId: urlSpaceId, roomId: urlRoomId } = useParams();
  const activeRoomId = Number(urlRoomId) || null;
  const activeSpaceId = Number(urlSpaceId) || null;

  const navigate = useNavigate();
  const [searchParam, _] = useSearchParams();

  const isPrivateChatMode = urlSpaceId === "private";

  const screenSize = useScreenSize();

  const [isOpenLeftDrawer, setIsOpenLeftDrawer] = useState(
    !(urlSpaceId && urlRoomId) || (!urlRoomId && isPrivateChatMode) || (screenSize === "sm" && !isPrivateChatMode),
  );

  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const spaceMembersQuery = useGetSpaceMembersQuery(activeSpaceId ?? -1);
  // 当前激活的space对应的rooms。
  const rooms = useMemo(() => userRoomQuery.data?.data ?? [], [userRoomQuery.data?.data]);
  // 获取用户空间列表
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);
  const activeSpace = spaces.find(space => space.spaceId === activeSpaceId);

  const setActiveSpaceId = (spaceId: number | null) => {
    setStoredChatIds({ spaceId, roomId: null });
    const newSearchParams = new URLSearchParams(searchParam);
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    navigate(`/chat/${spaceId ?? "private"}/${""}?${newSearchParams}`);
  };
  const setActiveRoomId = (roomId: number | null) => {
    setStoredChatIds({ spaceId: activeSpaceId, roomId });
    const newSearchParams = new URLSearchParams(searchParam);
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    navigate(`/chat/${activeSpaceId ?? "private"}/${roomId}?${searchParam}`);
  };

  useEffect(() => {
    if (!isPrivateChatMode)
      return;
    // 恢复上次的激活空间和房间,否则恢复第一个房间
    const targetRoomId = storedIds.roomId ?? rooms[0]?.roomId;
    if (targetRoomId) {
      setActiveRoomId(targetRoomId);
    }
    const targetSpaceId = storedIds.spaceId;
    if (targetSpaceId) {
      setActiveSpaceId(targetSpaceId);
    }
  }, []);

  useEffect(() => {
    // 在空间模式下，切换空间后默认选中第一个房间
    (!isPrivateChatMode && rooms && !urlRoomId) && setActiveRoomId(rooms[0]?.roomId ?? null);
  }, [rooms]);

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
  // 房间设置窗口状态
  const [activeRoomSettingId, setActiveRoomSettingId] = useState<number | null>(null);
  const [_sideDrawerState, setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");
  const [_isRenderWindowOpen, setIsRenderWindowOpen] = useState(false);

  // 获取当前用户信息
  const globalContext = useGlobalContext();

  // 右键菜单
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomId: number } | null>(null);

  // 关闭右键菜单
  function closeContextMenu() {
    setContextMenu(null);
  }
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    // 向上查找包含data-message-id属性的父元素
    const messageElement = target.closest("[data-room-id]");
    setContextMenu({ x: e.clientX, y: e.clientY, roomId: Number(messageElement?.getAttribute("data-room-id")) });
  }
  // 处理点击外部关闭菜单的逻辑
  useEffect(() => {
    if (contextMenu) {
      window.addEventListener("click", closeContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeContextMenu);
    };
  }, [contextMenu]); // 依赖于contextMenu状态

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
      isSpaceOwner: spaceMembersQuery.data?.data?.some(member => member.userId === globalContext.userId && member.memberType === 1),
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

  return (
    <SpaceContext value={spaceContext}>
      <div className="flex flex-row bg-base-100 flex-1 h-full relative">
        {/* 只有小屏才允许收起侧边栏 */}
        <OpenAbleDrawer isOpen={screenSize === "sm" ? isOpenLeftDrawer : true} className="h-full z-10 w-full bg-base-100">
          <div className="h-full flex flex-row w-full md:w-max">
            {/* 空间列表 */}
            <div className="flex flex-col py-2 bg-base-300/40 h-full overflow-y-auto">
              {/* 私信入口 */}
              <div className="rounded w-10 relative mx-2">
                <div
                  className={`absolute -left-[6px] z-10 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-info transition-transform duration-300 ${isPrivateChatMode ? "scale-y-100" : "scale-y-0"
                  }`}
                />
                <button
                  className="tooltip tooltip-bottom w-10 btn btn-square"
                  data-tip="私信"
                  type="button"
                  onClick={() => {
                    setActiveSpaceId(null);
                    setActiveRoomId(null);
                    navigate("/chat/private");
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </button>
              </div>

              {/* 分隔线 */}
              <div className="w-8 h-px bg-base-300 mx-3"></div>

              <div className="overflow-y-auto overflow-x-hidden flex flex-col py-2 px-2">
                {/* 全部空间列表 */}
                {spaces.map(space => (
                  <SpaceButton
                    space={space}
                    unreadMessageNumber={getSpaceUnreadMessagesNumber(space.spaceId ?? -1)}
                    onclick={() => {
                      if (activeSpaceId !== space.spaceId) {
                        setActiveSpaceId(space.spaceId ?? -1);
                      }
                    }}
                    isActive={activeSpaceId === space.spaceId}
                    key={space.spaceId}
                  >
                  </SpaceButton>
                ))}
              </div>
              <button
                className="tooltip tooltip-top btn btn-square btn-dash btn-info w-10 mx-2"
                type="button"
                data-tip="创建"
                onClick={() => {
                  setIsSpaceHandleOpen(true);
                }}
              >
                <div className="avatar mask mask-squircle flex content-center">
                  <AddIcon></AddIcon>
                </div>
              </button>
            </div>
            <div className="w-px bg-base-300"></div>
            {/* 房间列表 */}
            <div
              className="flex flex-col gap-2 py-2 w-full md:w-[200px] h-full flex-1 bg-base-200/40 min-h-0"
              onContextMenu={handleContextMenu}
            >
              {isPrivateChatMode
                ? (
                    <LeftChatList
                      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                    />
                  )
                : (
                    <>
                      {
                        activeSpaceId && (
                          <div className="self-center font-bold flex gap-2">
                            <span className="text-lg">{activeSpace?.name}</span>
                            <Setting className="size-7 hover:bg-base-300 rounded cursor-pointer hover:text-info" onClick={() => { setIsShowSpacePanel(!isShowSpacePanel); }} />
                          </div>
                        )
                      }

                      <div className="h-px bg-base-300"></div>
                      <div className="flex flex-col gap-2 py-2 px-1 overflow-auto w-full">
                        {rooms.filter(room => room.spaceId === activeSpaceId).map(room => (
                          <div className="flex items-center gap-1 group w-full" key={room.roomId} data-room-id={room.roomId}>
                            <RoomButton
                              room={room}
                              unreadMessageNumber={unreadMessagesNumber[room.roomId ?? -1]}
                              onclick={() => {
                                setActiveRoomId(room.roomId ?? -1);
                                setIsOpenLeftDrawer(false);
                              }}
                              isActive={activeRoomId === room.roomId}
                            >
                            </RoomButton>
                            {/* 设置按钮 - 在所有房间都显示（当前房间和悬浮房间） */}
                            <div
                              className="tooltip tooltip-left opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              data-tip="房间设置"
                            >
                              <Setting
                                className="size-6 cursor-pointer hover:text-info hover:bg-base-300 rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveRoomSettingId(room.roomId ?? -1);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {activeSpaceId !== null && spaceContext.isSpaceOwner && (
                        <button
                          className="btn btn-dash btn-info flex mx-2"
                          type="button"
                          onClick={() => {
                            if (activeSpaceId) {
                              setIsRoomHandleOpen(true);
                            }
                          }}
                        >
                          创建房间
                        </button>
                      )}
                    </>
                  )}
            </div>
          </div>
        </OpenAbleDrawer>
        {/* 聊天记录窗口，输入窗口，侧边栏 */}
        {isPrivateChatMode
          ? (
              <RightChatView
                setIsOpenLeftDrawer={setIsOpenLeftDrawer}
              />
            )
          : (
              <>
                {
                  activeSpaceId
                    ? <RoomWindow roomId={activeRoomId ?? -1} spaceId={activeSpaceId ?? -1} />
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
          {activeRoomSettingId && (
            <RoomSettingWindow
              roomId={activeRoomSettingId}
              onClose={() => setActiveRoomSettingId(null)}
              onShowMembers={() => {
                setSideDrawerState("user");
                setActiveRoomSettingId(null);
              }}
              onRenderDialog={() => {
                setIsRenderWindowOpen(true);
                setActiveRoomSettingId(null);
              }}
            />
          )}
        </PopWindow>
      </div>
      <ChatPageContextMenu
        contextMenu={contextMenu}
        unreadMessagesNumber={unreadMessagesNumber}
        onClose={closeContextMenu}
      />
    </SpaceContext>
  );
}
