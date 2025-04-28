import RoomWindow from "@/components/chat/roomWindow";
import SpaceWindow from "@/components/chat/spaceWindow";
import { PopWindow } from "@/components/common/popWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import {
  useCreateRoomMutation,
  useCreateSpaceMutation,
  useGetUserRoomsQuery,
  useGetUserSpacesQuery,
} from "api/hooks/chatQueryHooks";
import {
  useGetUserInfoQuery,
} from "api/queryHooks";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

export default function RoomSelect() {
  const { spaceId: urlSpaceId, roomId: urlRoomId } = useParams();
  const navigate = useNavigate();

  // 当前选中的空间ID
  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(urlSpaceId ? Number(urlSpaceId) : null);
  // 当前选中的房间ID
  const [activeRoomId, setActiveRoomId] = useState<number | null>(urlRoomId ? Number(urlRoomId) : null);
  // 同步路由状态
  useEffect(() => {
    if (activeSpaceId || activeRoomId) {
      const path = `/chat/${activeSpaceId || ""}/${activeRoomId || ""}`;
      navigate(path.replace(/\/+$/, ""), { replace: true });
    }
  }, [activeSpaceId, activeRoomId, navigate]);

  // 获取用户空间列表
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? [];
  // 当前激活的空间对应的房间列表
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const rooms = userRoomQuery.data?.data ?? [];

  // 创建空间
  const createSpaceMutation = useCreateSpaceMutation();
  // 创建房间
  const createRoomMutation = useCreateRoomMutation(activeSpaceId || -1);
  // 创建空间弹窗是否打开
  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useState(false);
  // 创建房间弹窗是否打开
  const [isRoomHandleOpen, setIsRoomHandleOpen] = useState(false);
  // 处理邀请用户uid
  const [inputUserId, setInputUserId] = useState<number>(-1);
  const inputUserInfo = useGetUserInfoQuery(inputUserId).data?.data;
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

  // websocket封装, 用于发送接受消息
  const websocketUtils = useGlobalContext().websocketUtils;
  useEffect(() => {
    if (!websocketUtils.isConnected) {
      websocketUtils.connect();
    }
  }, []);

  // 创建空间
  async function createSpace(userId: number) {
    createSpaceMutation.mutate({
      userIdList: [userId],
      avatar: spaceAvatar,
      spaceName,
    }, {
      onSettled: () => {
        setIsSpaceHandleOpen(false);
      },
    });
  }

  // 创建房间
  async function createRoom(spaceId: number, userId: number) {
    createRoomMutation.mutate({
      spaceId,
      avatar: roomAvatar,
      roomName,
      userIdList: [userId],
    }, {
      onSuccess: (data) => {
        const newRoomId = data.data?.roomId;
        if (newRoomId) {
          setActiveRoomId(newRoomId);
        }
        setIsRoomHandleOpen(false);
      },
      onSettled: () => {
        setIsRoomHandleOpen(false);
      },
    });
  }

  return (
    <div className="flex flex-row bg-base-100 flex-1">
      {/* 空间列表 */}
      <div className="menu flex flex-col gap-2 p-3 bg-base-300">
        {spaces.map(space => (
          <button
            key={space.spaceId}
            className="tooltip tooltip-right w-10"
            data-tip={space.name}
            type="button"
            onClick={() => {
              setActiveSpaceId(space.spaceId ?? -1);
              setActiveRoomId(null);
            }}
          >
            <div className="avatar mask mask-squircle">
              <img
                src={space.avatar}
                alt={space.name}
              />
            </div>
          </button>
        ))}
        <button
          className="tooltip tooltip-right btn btn-square btn-dash btn-info w-10"
          type="button"
          data-tip="创建空间"
          onClick={() => {
            setIsSpaceHandleOpen(true);
            // 重置表单状态
            setspaceAvatar(String(userInfo?.avatar));
            setSpaceName(`${String(userInfo?.username)}的空间`);
            setInputUserId(-1);
          }}
        >
          <div className="avatar mask mask-squircle flex content-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </button>
      </div>
      {/* 房间列表 */}
      <div className="flex flex-col gap-2 p-2 w-[200px] bg-base-100">
        {rooms.map(room => (
          <div key={room.roomId}>
            {activeSpaceId === room.spaceId && (
              <button
                key={room.roomId}
                className="btn btn-ghost flex justify-start w-full gap-2"
                type="button"
                onClick={() => setActiveRoomId(room.roomId ?? -1)}
              >
                <div className="avatar mask mask-squircle w-8">
                  <img
                    src={room.avatar}
                    alt={room.name}
                  />
                </div>
                <span className="truncate flex-1 text-left">{room.name}</span>
              </button>
            )}
          </div>
        ))}
        {activeSpaceId !== null && (
          <button
            className="btn btn-dash btn-info flex w-full"
            type="button"
            onClick={() => {
              if (activeSpaceId) {
                setIsRoomHandleOpen(true);
                setRoomAvatar(String(spaces.find(space => (space.spaceId === activeSpaceId))?.avatar));
                setRoomName(`${String(userInfo?.username)}的房间`);
                setInputUserId(-1);
              }
            }}
          >
            创建房间
          </button>
        )}
      </div>
      {/* 对话窗口 */}
      {
        activeRoomId
          ? <RoomWindow roomId={activeRoomId} spaceId={activeSpaceId ?? -1} />
          : <SpaceWindow spaceId={activeSpaceId ?? -1} />
      }
      {/* 创建空间弹出窗口 */}
      <PopWindow isOpen={isSpaceHandleOpen} onClose={() => setIsSpaceHandleOpen(false)}>
        <div className="w-full p-4 min-w-[40vw] max-h-[80vh] overflow-y-auto">
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
                  <span className="font-bold text-black px-2 py-1 rounded leading-normal tracking-normal">
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

          {/* 邀请成员部分 */}
          <div className="mb-4">
            <label className="label mb-2">
              <span className="label-text">邀请成员(输入用户ID)</span>
            </label>
            <input
              type="text"
              placeholder="请输入要加入的成员ID"
              className="input input-bordered w-full mb-4"
              onInput={e => setInputUserId(Number(e.currentTarget.value))}
            />
          </div>

          {/* 用户信息预览和确认按钮 */}
          {inputUserId > 0 && inputUserInfo && (
            <div className="items-center flex flex-col gap-y-4 pb-4">
              <UserDetail userId={inputUserId} />
              <div className="sticky bottom-0 w-full bg-base-100 pt-4 pb-4 border-t border-base-200">
                <button
                  className="btn btn-primary w-full shadow-lg"
                  type="button"
                  onClick={() => createSpace(Number(inputUserId))}
                >
                  创建空间
                </button>
              </div>
            </div>
          )}
        </div>
      </PopWindow>
      {/* 创建子群弹出窗口(后面如果与上面功能没太多区别就合并) */}
      <PopWindow isOpen={isRoomHandleOpen} onClose={() => setIsRoomHandleOpen(false)}>
        <div className="w-full p-4 min-w-[40vw] max-h-[80vh] overflow-y-auto">
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
                  <span className="font-bold text-black px-2 py-1 rounded leading-normal tracking-normal">
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

          {/* 邀请成员部分 */}
          <div className="mb-4">
            <label className="label mb-2">
              <span className="label-text">邀请成员(输入用户ID)</span>
            </label>
            <input
              type="text"
              placeholder="请输入要加入的成员ID"
              className="input input-bordered w-full mb-4"
              onInput={e => setInputUserId(Number(e.currentTarget.value))}
            />
          </div>

          {/* 用户信息预览和确认按钮 */}
          {inputUserId > 0 && inputUserInfo && (
            <div className="items-center flex flex-col gap-y-4 pb-4">
              <UserDetail userId={inputUserId} />
              <div className="sticky bottom-0 w-full bg-base-100 pt-4 pb-4 border-t border-base-200">
                <button
                  className="btn btn-primary w-full shadow-lg"
                  type="button"
                  onClick={() => createRoom(Number(activeSpaceId), Number(inputUserId))}
                >
                  创建房间
                </button>
              </div>
            </div>
          )}
        </div>
      </PopWindow>
    </div>
  );
}
