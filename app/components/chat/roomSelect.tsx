import DialogueWindow from "@/components/chat/dialogueWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import {
  useCreateRoomMutation,
  useCreateSubroomMutation,
  useGetUserInfoQuery,
  useGetUserRoomsQuery,
  useGetUserSpacesQuery,
} from "api/queryHooks";
import React, { useEffect, useState } from "react";
import { PopWindow } from "../common/popWindow";
import { UserDetail } from "../common/userDetail";

export default function RoomSelect() {
  // 当前展开子群的父群
  const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null);
  // 当前选中的子群ID
  const [activeSubRoomId, setActiveSubRoomId] = useState<number | null>(null);
  // 获取用户群组列表
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? [];
  // 当前激活的space对应的room列表
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const rooms = userRoomQuery.data?.data ?? [];

  // 创建群组
  const createRoomMutation = useCreateRoomMutation();
  // 当前要创建子群的父群ID
  const [currentParentRoomId, setCurrentParentRoomId] = useState<number | null>(null);
  // 创建子群
  const createSubRoomMutation = useCreateSubroomMutation(currentParentRoomId || -1);
  // 创建群组弹窗是否打开
  const [isRoomHandleOpen, setIsRoomHandleOpen] = useState(false);
  // 创建子群弹窗是否打开
  const [isSubRoomHandleOpen, setIsSubRoomHandleOpen] = useState(false);
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

  // 创建群组
  async function createRoom(userId: number) {
    createRoomMutation.mutate({
      userIdList: [userId],
    }, {
      onSettled: () => {
        setIsRoomHandleOpen(false);
      },
    });
  }
  // 创建子群
  async function createSubRoom(parentRoomId: number, userId: number) {
    setCurrentParentRoomId(parentRoomId);
    createSubRoomMutation.mutate({
      parentRoomId,
      userIdList: [userId],
    }, {
      onSuccess: (data) => {
        const newSubRoomId = data.data?.roomId;
        if (newSubRoomId) {
          setActiveSubRoomId(newSubRoomId);
        }
        setIsSubRoomHandleOpen(false);
      },
      onSettled: () => {
        setIsSubRoomHandleOpen(false);
      },
    });
  }

  return (
    <div className="flex flex-row bg-base-100">
      {/* 一级群组列表 */}
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
          data-tip="添加群组"
          onClick={() => setIsRoomHandleOpen(true)}
        >
          <div className="avatar mask mask-squircle flex content-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </button>
      </div>
      {/* 二级群组列表 */}
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
                    onClick={() => setActiveSubRoomId(room.roomId ?? -1)}
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
                setIsSubRoomHandleOpen(true);
                setCurrentParentRoomId(activeSpaceId);
              }
            }}
          >
            创建子群聊
          </button>
        )}
      </div>
      {/* 对话窗口 */}
      {
        activeSubRoomId
        && <DialogueWindow roomId={activeSubRoomId} />
      }
      {/* 创建群组弹出窗口 */}
      <PopWindow isOpen={isRoomHandleOpen} onClose={() => setIsRoomHandleOpen(false)}>
        <div className="w-full p-4">
          <p className="text-lg font-bold text-center w-full mb-4">输入要加入的用户的ID</p>
          <input type="text" placeholder="输入要加入的成员的ID" className="input input-bordered w-full mb-8" onInput={e => setInputUserId(Number(e.currentTarget.value))} />
          {
            (inputUserId > 0 && inputUserInfo)
            && (
              <div className="items-center flex flex-col gap-y-4">
                <UserDetail userId={inputUserId}></UserDetail>
                <button className="btn btn-info" type="button" onClick={() => createRoom(Number(inputUserId))}>
                  确认
                </button>
              </div>
            )
          }
        </div>
      </PopWindow>
      {/* 创建子群弹出窗口(后面如果与上面功能没太多区别就合并) */}
      <PopWindow isOpen={isSubRoomHandleOpen} onClose={() => setIsSubRoomHandleOpen(false)}>
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
                    if (currentParentRoomId) {
                      createSubRoom(currentParentRoomId, Number(inputUserId));
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
