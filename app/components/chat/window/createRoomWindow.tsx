import checkBack from "@/components/common/autoContrastText";
import { MemberSelect } from "@/components/common/memberSelect";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useCreateRoomMutation, useGetSpaceMembersQuery } from "api/hooks/chatQueryHooks";
import { useGetUserInfoQuery } from "api/hooks/UserHooks";
import React, { useEffect, useState } from "react";

interface CreateRoomWindowProps {
  spaceId: number;
  spaceAvatar?: string;
  onSuccess?: (roomId?: number) => void;
}

export default function CreateRoomWindow({ spaceId, spaceAvatar, onSuccess }: CreateRoomWindowProps) {
  const globalContext = useGlobalContext();
  const getUserInfo = useGetUserInfoQuery(Number(globalContext.userId));
  const userInfo = getUserInfo.data?.data;

  // 创建房间
  const createRoomMutation = useCreateRoomMutation(spaceId);

  // 创建房间的头像
  const [roomAvatar, setRoomAvatar] = useState<string>(spaceAvatar || "");
  // 创建房间的名称
  const [roomName, setRoomName] = useState<string>(`${String(userInfo?.username)}的房间`);

  // 房间头像文字颜色
  const [roomAvatarTextColor, setRoomAvatarTextColor] = useState("text-black");

  // 获取空间玩家列表
  const getSpaceMembers = useGetSpaceMembersQuery(spaceId);
  const members = getSpaceMembers.data?.data ?? [];
  const players = members.filter(member => member.memberType === 2);

  // 处理邀请用户uid
  const [inputUserId, setInputUserId] = useState<number>(-1);
  // 已选择邀请的用户
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());

  // 监听头像变化，自动调整文字颜色
  useEffect(() => {
    if (roomAvatar) {
      checkBack(roomAvatar).then(() => {
        const computedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--text-color")
          .trim();
        setRoomAvatarTextColor(computedColor === "white" ? "text-white" : "text-black");
      });
    }
  }, [roomAvatar]);

  // 当用户信息加载后，更新默认值
  useEffect(() => {
    if (userInfo) {
      setRoomName(`${String(userInfo.username)}的房间`);
    }
  }, [userInfo]);

  // 当传入的 spaceAvatar 变化时更新房间头像
  useEffect(() => {
    if (spaceAvatar) {
      setRoomAvatar(spaceAvatar);
    }
  }, [spaceAvatar]);

  // 创建房间
  async function createRoom(spaceId: number, userIds: number[]) {
    createRoomMutation.mutate({
      spaceId,
      avatar: roomAvatar,
      roomName,
      userIdList: userIds,
    }, {
      onSettled: (data) => {
        const newRoomId = data?.data?.roomId;
        setSelectedUserIds(new Set());
        onSuccess?.(newRoomId);
      },
    });
  }

  return (
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
              alt="room avatar"
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

      <div className="bottom-0 w-full bg-base-300 pt-4">
        <button
          type="button"
          className="btn btn-primary w-full shadow-lg"
          onClick={() => {
            const userIds = [
              ...selectedUserIds,
              ...(inputUserId > 0 ? [inputUserId] : []),
            ];
            createRoom(spaceId, userIds);
          }}
        >
          创建房间
        </button>
      </div>
    </div>
  );
}
