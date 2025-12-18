import { RoomContext } from "@/components/chat/core/roomContext";
import MemberLists from "@/components/chat/shared/components/memberLists";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import { getScreenSize } from "@/utils/getScreenSize";
import React, { use } from "react";
import toast from "react-hot-toast";
import { useAddRoomMemberMutation } from "../../../../../api/hooks/chatQueryHooks";

export default function RoomUserList() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const members = roomContext.roomMembers;
  // 全局登录用户对应的member
  const curMember = roomContext.curMember;
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("memberSettingPop", false);

  const addMemberMutation = useAddRoomMemberMutation();

  async function handleAddMember(userId: number) {
    addMemberMutation.mutate({
      roomId,
      userIdList: [userId],
    }, {
      onSettled: () => {
        setIsMemberHandleOpen(false);
        toast("添加成员成功");
      },
    });
  }
  return (
    <div className="space-y-2 p-2 overflow-auto items-center flex flex-col">
      {/* 群成员列表 */}
      <div className="flex flex-row justify-center items-center gap-2 min-w-60">
        <p className="text-center">
          群成员-
          {members.length}
        </p>
        {curMember?.memberType === 1 && (
          <button
            className="btn btn-dash btn-info"
            type="button"
            onClick={() => setIsMemberHandleOpen(true)}
          >
            添加成员
          </button>
        )}
      </div>
      <MemberLists members={members} className={getScreenSize() === "sm" ? "w-full" : "w-60"} isSpace={false}></MemberLists>
      <PopWindow isOpen={isMemberHandleOpen} onClose={() => setIsMemberHandleOpen(false)}>
        <AddMemberWindow handleAddMember={handleAddMember} showSpace={true}></AddMemberWindow>
      </PopWindow>
    </div>
  );
}
