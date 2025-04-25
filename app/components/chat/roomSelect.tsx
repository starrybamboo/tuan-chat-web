import DialogueWindow from "@/components/chat/dialogueWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import {
  useCreateRoomMutation,
  useCreateSpaceMutation,
  useGetUserInfoQuery,
  useGetUserRoomsQuery,
  useGetUserSpacesQuery,
} from "api/queryHooks";
import React, { useEffect, useState } from "react";
import { PopWindow } from "../common/popWindow";
import { UserDetail } from "../common/userDetail";

export default function RoomSelect() {
  // 当前展开房间的空间
  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null);
  // 当前选中的房间ID
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  // 获取用户空间列表
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? [];
  // 当前激活的空间对应的房间列表
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const rooms = userRoomQuery.data?.data ?? [];

  // 创建空间
  const createSpaceMutation = useCreateSpaceMutation();
  // 当前要创建房间的空间ID
  const [currentSpaceId, setCurrentSpaceId] = useState<number | null>(null);
  // 创建房间
  const createRoomMutation = useCreateRoomMutation(currentSpaceId || -1);
  // 创建空间弹窗是否打开
  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useState(false);
  // 创建房间弹窗是否打开
  const [isRoomHandleOpen, setIsRoomHandleOpen] = useState(false);
  // 处理邀请用户uid
  const [inputUserId, setInputUserId] = useState<number>(-1);
  const inputUserInfo = useGetUserInfoQuery(inputUserId).data?.data;

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
    }, {
      onSettled: () => {
        setIsSpaceHandleOpen(false);
      },
    });
  }

  // 创建房间
  async function createRoom(spaceId: number, userId: number) {
    setCurrentSpaceId(spaceId);
    createRoomMutation.mutate({
      spaceId,
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
    <div className="flex flex-row bg-base-100">
      {/* 空间列表 */}
      <div className="menu flex flex-col gap-2 p-3 bg-base-300">
        {spaces.map(space => (
          <button
            key={space.spaceId}
            className="tooltip tooltip-right w-10"
            data-tip={space.name}
            type="button"
            onClick={() => setActiveSpaceId(space.spaceId ?? -1)}
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
          onClick={() => setIsSpaceHandleOpen(true)}
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
          <React.Fragment key={room.roomId}>
            {activeSpaceId === room.roomId && (
              rooms
                .map(room => (
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
                ))
            )}
          </React.Fragment>
        ))}
        {activeSpaceId !== null && (
          <button
            className="btn btn-dash btn-info flex w-full"
            type="button"
            onClick={() => {
              if (activeSpaceId) {
                setIsRoomHandleOpen(true);
                setCurrentSpaceId(activeSpaceId);
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
        && <DialogueWindow roomId={activeRoomId} />
      }
      {/* 创建空间弹出窗口 */}
      <PopWindow isOpen={isSpaceHandleOpen} onClose={() => setIsSpaceHandleOpen(false)}>
        <div className="w-full p-4">
          <p className="text-lg font-bold text-center w-full mb-4">输入要加入的用户的ID</p>
          <input type="text" placeholder="输入要加入的成员的ID" className="input input-bordered w-full mb-8" onInput={e => setInputUserId(Number(e.currentTarget.value))} />
          {
            (inputUserId > 0 && inputUserInfo)
            && (
              <div className="items-center flex flex-col gap-y-4">
                <UserDetail userId={inputUserId}></UserDetail>
                <button className="btn btn-info" type="button" onClick={() => createSpace(Number(inputUserId))}>
                  确认
                </button>
              </div>
            )
          }
        </div>
      </PopWindow>
      {/* 创建子群弹出窗口(后面如果与上面功能没太多区别就合并) */}
      <PopWindow isOpen={isRoomHandleOpen} onClose={() => setIsRoomHandleOpen(false)}>
        <div className="w-full p-4">
          <p className="text-lg font-bold text-center w-full mb-4">输入要加入的用户的ID</p>
          <input type="text" placeholder="输入要加入的成员的ID" className="input input-bordered w-full mb-8" onInput={e => setInputUserId(Number(e.currentTarget.value))} />
          {
            (inputUserId > 0 && inputUserInfo)
            && (
              <div className="items-center flex flex-col gap-y-4">
                <UserDetail userId={inputUserId}></UserDetail>
                <button
                  className="btn btn-info"
                  type="button"
                  onClick={() => {
                    if (currentSpaceId) {
                      createRoom(currentSpaceId, Number(inputUserId));
                    }
                  }}
                >
                  确认
                </button>
              </div>
            )
          }
        </div>
      </PopWindow>
    </div>
  );
}
