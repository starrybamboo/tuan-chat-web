import React from "react";
import MessageEditor from "@/components/messageEditor/MessageEditor";

interface UserReadMeProps {
  userId: number;
  loginUserId: number;
}

export const UserReadMe: React.FC<UserReadMeProps> = ({
  userId,
  loginUserId,
}) => {
  const isOwner = userId === loginUserId;
  const docId = `user:${userId}:readme`;

  return (
    <div className="flex-1 min-h-0 p-4">
      <div className="h-full min-h-0 transition-all">
        <MessageEditor className="h-[80vh] min-h-0 max-h-full rounded-md" docId={docId} readOnly={!isOwner} title={isOwner ? "主页" : "个人主页"} />
      </div>
    </div>
  );
};
