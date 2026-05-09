import React from "react";

import UserReadMeMessageEditor from "./UserReadMeMessageEditor";

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
    <div className="flex-1 min-h-0 p-2 lg:m-2">
      <div className="h-full min-h-0 transition-all">
        <UserReadMeMessageEditor
          userId={userId}
          isOwner={isOwner}
          docId={docId}
        />
      </div>
    </div>
  );
};
