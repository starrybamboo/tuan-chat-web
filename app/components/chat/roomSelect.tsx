import type { SpaceContextType } from "@/components/chat/spaceContext";
import type { Room } from "../../../api";
import RoomWindow from "@/components/chat/roomWindow";
import SpaceRightSidePanel from "@/components/chat/sideDrawer/spaceRightSidePanel";
import { SpaceContext } from "@/components/chat/spaceContext";
import checkBack from "@/components/common/autoContrastText";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { PopWindow } from "@/components/common/popWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useGlobalContext } from "@/components/globalContextProvider";
import { DotsHorizontalOutline } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import {
  useCreateRoomMutation,
  useCreateSpaceMutation,
  useGetSpaceMembersQuery,
  useGetUserRoomsQueries,
  useGetUserRoomsQuery,
  useGetUserSpacesQuery,
} from "api/hooks/chatQueryHooks";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import { useGetUserFollowingsQuery } from "api/hooks/userFollowQueryHooks";
import {
  useGetUserInfoQuery,
} from "api/queryHooks";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { MemberSelect } from "../common/memberSelect";

/**
 * chat板块的主组件
 */
export default function RoomSelect() {
  const { spaceId: urlSpaceId, roomId: urlRoomId } = useParams();
  const navigate = useNavigate();
  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  // 当前选中的空间ID
  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(urlSpaceId ? Number(urlSpaceId) : (storedIds.spaceId ?? null));
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const spaceMembersQuery = useGetSpaceMembersQuery(activeSpaceId ?? -1);
  // 当前激活的space对应的rooms。
  const rooms = userRoomQuery.data?.data ?? [];
  // 获取用户空间列表
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);
  const activeSpace = spaces.find(space => space.spaceId === activeSpaceId);
  // 当前选中的房间ID，初始化的时候，按照路由参数，localStorage里的数据，rooms的第一个，null的优先级来初始化
  const [activeRoomId, setActiveRoomId] = useState<number | null>(urlRoomId
    ? Number(urlRoomId)
    : (storedIds.roomId ?? rooms[0]?.roomId ?? null));
  useEffect(() => {
    setActiveRoomId(rooms[0]?.roomId ?? null);
  }, [activeSpaceId]);

  const [isOpenLeftDrawer, setIsOpenLeftDrawer] = useSearchParamsState<boolean>("leftDrawer", !(urlSpaceId && urlRoomId), false);

  // 同步路由状态 并存到localStorage里面
  useEffect(() => {
    setStoredChatIds({ spaceId: activeSpaceId, roomId: activeRoomId });
    if (activeSpaceId || activeRoomId) {
      const path = `/chat/${activeSpaceId || ""}/${activeRoomId || ""}`;
      navigate(path.replace(/\/+$/, ""), { replace: true });
    }
  }, [activeSpaceId, activeRoomId, navigate, setStoredChatIds]);

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

  // 创建空间
  const createSpaceMutation = useCreateSpaceMutation();
  // 创建房间
  const createRoomMutation = useCreateRoomMutation(activeSpaceId || -1);
  // 创建空间弹窗是否打开
  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useSearchParamsState<boolean>("addSpacePop", false);
  // 创建房间弹窗是否打开
  const [isRoomHandleOpen, setIsRoomHandleOpen] = useSearchParamsState<boolean>("addRoomPop", false);
  // 是否显示space详情
  const [isShowSpacePanel, setIsShowSpacePanel] = useState(false);

  // 处理邀请用户uid
  const [inputUserId, setInputUserId] = useState<number>(-1);
  // 获取当前用户信息
  const globalContext = useGlobalContext();
  const getUserInfo = useGetUserInfoQuery(Number(globalContext.userId));
  const userInfo = getUserInfo.data?.data;
  // 创建空间的头像
  const [spaceAvatar, setspaceAvatar] = useState<string>(String(userInfo?.avatar));
  // 创建空间的名称
  const [spaceName, setSpaceName] = useState<string>(`${String(userInfo?.username)}的空间`);
  // 创建房间的头像
  const [roomAvatar, setRoomAvatar] = useState<string>(String(spaces.find(space => (space.spaceId === activeSpaceId))?.avatar));
  // 创建房间的名称
  const [roomName, setRoomName] = useState<string>(`${String(userInfo?.username)}的房间`);

  // 获取空间玩家列表
  const getSpaceMembers = useGetSpaceMembersQuery(Number(activeSpaceId));
  const members = getSpaceMembers.data?.data ?? [];
  const players = members.filter(member => member.memberType === 2);
  // 已选择邀请的用户
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());

  // 当前选择的空间规则Id
  const [selectedRuleId, setSelectedRuleId] = useState<number>(1);
  // 获取规则
  const getRulesQuery = useGetRulePageInfiniteQuery({}, 100);
  const rules = getRulesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];

  // 空间头像文字颜色
  const [spaceAvatarTextColor, setSpaceAvatarTextColor] = useState("text-black");

  // 房间头像文字颜色
  const [roomAvatarTextColor, setRoomAvatarTextColor] = useState("text-black");

  // 获取用户好友
  const followingQuery = useGetUserFollowingsQuery(globalContext.userId ?? -1, { pageNo: 1, pageSize: 100 });
  const friends = followingQuery.data?.data?.list?.filter(user => user.status === 2) ?? [];

  // 监听头像变化，自动调整文字颜色
  useEffect(() => {
    const avatarColorMap = [
      { avatar: spaceAvatar, setColor: setSpaceAvatarTextColor },
      { avatar: roomAvatar, setColor: setRoomAvatarTextColor },
    ];

    // 批量处理所有头像
    avatarColorMap.forEach(({ avatar, setColor }) => {
      if (avatar) {
        checkBack(avatar).then(() => {
          const computedColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--text-color")
            .trim();
          setColor(computedColor === "white" ? "text-white" : "text-black");
        });
      }
    });
  }, [spaceAvatar, roomAvatar]);

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
    };
  }, [activeSpaceId, globalContext.userId, isOpenLeftDrawer, setIsOpenLeftDrawer, spaceMembersQuery.data?.data, spaces]);

  const getSpaceUnreadMessagesNumber = (spaceId: number) => {
    let result = 0;
    for (const room of spaceIdToRooms[spaceId]) {
      if (room.spaceId === spaceId && room.roomId && activeRoomId !== room.roomId) {
        result += unreadMessagesNumber[room.roomId] ?? 0;
      }
    }
    return result;
  };

  // 创建空间
  async function createSpace(userIds: number[]) {
    createSpaceMutation.mutate({
      userIdList: userIds,
      avatar: spaceAvatar,
      spaceName,
      ruleId: selectedRuleId,
    }, {
      onSuccess: () => {
        setIsSpaceHandleOpen(false);
        setSelectedUserIds(new Set());
      },
    });
  }

  // 创建房间
  async function createRoom(spaceId: number, userIds: number[]) {
    createRoomMutation.mutate({
      spaceId,
      avatar: roomAvatar,
      roomName,
      userIdList: userIds,
    }, {
      onSettled: (data) => {
        if (data && data.data) {
          const newRoomId = data.data.roomId;
          if (newRoomId)
            setActiveRoomId(newRoomId);
        }
        setIsRoomHandleOpen(false);
        setSelectedUserIds(new Set());
      },
    });
  }

  return (
    <SpaceContext value={spaceContext}>
      <div className="flex flex-row bg-base-100 flex-1 h-full">
        {/* 只有小屏才允许收起侧边栏 */}
        <OpenAbleDrawer isOpen={getScreenSize() === "sm" ? isOpenLeftDrawer : true} className="h-full z-10 w-full bg-base-100">
          <div className="h-full flex flex-row w-full md:w-max">
            {/* 空间列表 */}
            <div className="flex flex-col p-2 bg-base-300/40 h-full flex-wrap">
              {spaces.map(space => (
                <div
                  className={`rounded ${activeSpaceId === space.spaceId ? "bg-info-content/40 " : ""} w-10 mb-2`}
                  key={space.spaceId}
                >
                  <button
                    className="tooltip tooltip-right w-10 btn btn-square"
                    data-tip={space.name}
                    type="button"
                    onClick={() => {
                      setActiveSpaceId(space.spaceId ?? -1);
                      setActiveRoomId(null);
                    }}
                  >
                    <div className="indicator">
                      {(() => {
                        const unreadCount = getSpaceUnreadMessagesNumber(space.spaceId ?? -1);
                        return unreadCount > 0 && (
                          <span className="indicator-item badge badge-xs bg-error">
                            {unreadCount}
                          </span>
                        );
                      })()}
                      <div className="avatar mask mask-squircle">
                        <img
                          src={space.avatar}
                          alt={space.name}
                        />
                      </div>
                    </div>
                  </button>
                </div>
              ))}
              <button
                className="tooltip tooltip-right btn btn-square btn-dash btn-info w-10 photo"
                type="button"
                data-tip="创建空间"
                onClick={() => {
                  setIsSpaceHandleOpen(true);
                  // 重置表单状态
                  setspaceAvatar(String(userInfo?.avatar));
                  setSpaceName(`${String(userInfo?.username)}的空间`);
                  setInputUserId(-1);
                  setSelectedRuleId(1);
                }}
              >
                <div className="avatar mask mask-squircle flex content-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              </button>
            </div>
            <div className="w-px bg-base-300"></div>
            {/* 房间列表 */}
            <div className="flex flex-col gap-2 py-2 w-full md:w-[200px] h-full flex-1 bg-base-200/40 min-h-0">
              <div className="self-center font-bold flex gap-2">
                <span className="text-lg">{activeSpace?.name}</span>
                <DotsHorizontalOutline className="size-7 hover:bg-base-300 rounded" onClick={() => { setIsShowSpacePanel(!isShowSpacePanel); }} />
              </div>
              <div className="h-px bg-base-300"></div>
              <div className="flex flex-col gap-2 p-2 overflow-auto">
                {rooms.map(room => (
                  <div key={room.roomId}>
                    {activeSpaceId === room.spaceId && (
                      <button
                        key={room.roomId}
                        className={`btn btn-ghost flex justify-start w-full gap-2 ${activeRoomId === room.roomId ? "bg-info-content/30" : ""}`}
                        type="button"
                        onClick={() => {
                          setActiveRoomId(room.roomId ?? -1);
                          setIsOpenLeftDrawer(false);
                        }}
                      >
                        <div className="indicator">
                          {(activeRoomId !== room.roomId && unreadMessagesNumber[room.roomId ?? -1] > 0)
                            && (
                              <span
                                className="indicator-item badge badge-xs bg-error"
                              >
                                {unreadMessagesNumber[room.roomId ?? -1]}
                              </span>
                            )}

                          <div className="avatar mask mask-squircle w-8">
                            <img
                              src={room.avatar}
                              alt={room.name}
                            />
                          </div>
                        </div>
                        <span className="truncate flex-1 text-left">{room.name}</span>
                      </button>
                    )}
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
                      setRoomAvatar(String(spaces.find(space => (space.spaceId === activeSpaceId))?.avatar));
                      setRoomName(`${String(userInfo?.username)}的房间`);
                      setInputUserId(-1);
                      setSelectedUserIds(new Set());
                    }
                  }}
                >
                  创建房间
                </button>
              )}
              {
                // 在小屏时不知道为什么底下会被吃掉一节，这是一个hack
                getScreenSize() === "sm" && (
                  <div className="w-full h-20"></div>
                )
              }
            </div>
          </div>
        </OpenAbleDrawer>
        {/* 聊天记录窗口，输入窗口，侧边栏 */}
        {
          activeSpaceId
            ? <RoomWindow roomId={activeRoomId ?? -1} spaceId={activeSpaceId ?? -1} />
            : (
                <div className="flex items-center justify-center w-full h-full font-bold">
                  <span className="text-center lg:hidden">请从右侧选择房间</span>
                </div>
              )
        }

        {/* 创建空间弹出窗口 */}
        <PopWindow isOpen={isSpaceHandleOpen} onClose={() => setIsSpaceHandleOpen(false)}>
          <div className="w-full pl-4 pr-4 min-w-[20vw] max-h-[60vh] overflow-y-scroll">
            <p className="text-lg font-bold text-center w-full mb-4">创建空间</p>

            {/* 头像上传 */}
            <div className="flex justify-center mb-6">
              <ImgUploaderWithCopper
                setCopperedDownloadUrl={(url) => {
                  setspaceAvatar(url);
                }}
                fileName={`new-space-avatar-${Date.now()}`}
              >
                <div className="relative group overflow-hidden rounded-lg">
                  <img
                    src={spaceAvatar}
                    className="w-24 h-24 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm"
                  >
                    <span className={`${spaceAvatarTextColor} font-bold px-2 py-1 rounded`}>
                      上传头像
                    </span>
                  </div>
                </div>
              </ImgUploaderWithCopper>
            </div>

            {/* 空间名称 */}
            <div className="mb-4">
              <label className="label mb-2">
                <span className="label-text">空间名称</span>
              </label>
              <input
                type="text"
                placeholder={spaceName}
                className="input input-bordered w-full"
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setSpaceName(inputValue === "" ? `${String(userInfo?.username)}的空间` : inputValue);
                }}
              />
            </div>

            {/* 规则选择 */}
            <div className="mb-4">
              <label className="label mb-2">
                <span className="label-text">空间规则</span>
              </label>
              <div className="dropdown w-full">
                <label tabIndex={0} className="btn btn-outline w-full justify-start">
                  {rules.find(rule => rule.ruleId === selectedRuleId)?.ruleName ?? "未找到规则"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </label>
                <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full">
                  {rules.map(rule => (
                    <li key={rule.ruleId}>
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          setSelectedRuleId(Number(rule.ruleId));
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        }}
                      >
                        {rule.ruleName}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <MemberSelect
              members={friends}
              selectedUserIds={selectedUserIds}
              onSelectionChange={setSelectedUserIds}
              searchInput={inputUserId}
              onSearchInputChange={setInputUserId}
              emptyMessage="您还没有好友哦"
              searchPlaceholder="请输入要加入的好友ID"
            />
          </div>
          <div className="bottom-0 w-full bg-base-300 pt-4">
            <button
              type="button"
              className="btn btn-primary w-full shadow-lg"
              onClick={() => {
                const userIds = [
                  ...selectedUserIds,
                  ...(inputUserId > 0 ? [inputUserId] : []),
                ];
                createSpace(userIds);
              }}
            >
              创建空间
            </button>
          </div>
        </PopWindow>
        {/* 创建房间弹出窗口 */}
        <PopWindow isOpen={isRoomHandleOpen} onClose={() => setIsRoomHandleOpen(false)}>
          <div className="w-full pl-4 pr-4 min-w-[20vw] max-h-[60vh] overflow-y-scroll">
            <p className="text-lg font-bold text-center w-full mb-4">创建房间</p>

            {/* 头像上传 */}
            <div className="flex justify-center mb-6">
              <ImgUploaderWithCopper
                setCopperedDownloadUrl={(url) => {
                  setRoomAvatar(url);
                }}
                fileName={`new-room-avatar-${Date.now()}`}
              >
                <div className="relative group overflow-hidden rounded-lg">
                  <img
                    src={roomAvatar}
                    className="w-24 h-24 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm"
                  >
                    <span className={`${roomAvatarTextColor} font-bold px-2 py-1 rounded`}>
                      上传头像
                    </span>
                  </div>
                </div>
              </ImgUploaderWithCopper>
            </div>

            {/* 房间名称 */}
            <div className="mb-4">
              <label className="label mb-2">
                <span className="label-text">房间名称</span>
              </label>
              <input
                type="text"
                placeholder={roomName}
                className="input input-bordered w-full"
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setRoomName(inputValue === "" ? `${String(userInfo?.username)}的房间` : inputValue);
                }}
              />
            </div>

            <MemberSelect
              members={players}
              selectedUserIds={selectedUserIds}
              onSelectionChange={setSelectedUserIds}
              searchInput={inputUserId}
              onSearchInputChange={setInputUserId}
              emptyMessage="当前空间内没有玩家哦"
              searchPlaceholder="请输入要加入的玩家ID"
            />
          </div>
          <div className="bottom-0 w-full bg-base-300 pt-4">
            <button
              type="button"
              className="btn btn-primary w-full shadow-lg"
              onClick={() => {
                const userIds = [
                  ...selectedUserIds,
                  ...(inputUserId > 0 ? [inputUserId] : []),
                ];
                createRoom(Number(activeSpaceId), userIds);
              }}
            >
              创建房间
            </button>
          </div>
        </PopWindow>
        <PopWindow isOpen={isShowSpacePanel} onClose={() => setIsShowSpacePanel(false)}>
          <SpaceRightSidePanel></SpaceRightSidePanel>
        </PopWindow>
      </div>
    </SpaceContext>
  );
}
