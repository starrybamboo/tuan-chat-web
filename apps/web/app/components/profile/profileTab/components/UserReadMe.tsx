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
    <div className="flex min-h-[42rem] min-w-0 flex-1 flex-col p-4">
      <div className="flex flex-1 flex-col transition-all">
        <MessageEditor
          className="min-h-[42rem] rounded-md"
          docId={docId}
          readOnly={!isOwner}
          title={isOwner ? "主页" : "个人主页"}
        />
      </div>
    </div>
  );
};
