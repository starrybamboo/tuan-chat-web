import type { RoomMember, SpaceMember } from "../../../../api";
import { MemberTypeTag } from "@/components/chat/smallComponents/memberTypeTag";
import UserAvatarComponent from "@/components/common/userAvatar";
import React from "react";

export default function MemberLists({ members, className }: { members: (RoomMember | SpaceMember)[]; className?: string }) {
  return (
    <>
      {members.sort((a, b) => a.memberType! - b.memberType!).map(member => (
        <div className={`flex items-center bg-base-200 justify-between p-3 ${className}`} key={member.userId}>
          <div
            className="flex flex-row gap-3 rounded-lg items-center "
          >
            {/* 成员列表 */}
            <UserAvatarComponent userId={member.userId ?? 0} width={10} isRounded={true} withName={true}>
            </UserAvatarComponent>
          </div>
          <MemberTypeTag memberType={member.memberType}></MemberTypeTag>
        </div>
      ))}
    </>
  );
};
