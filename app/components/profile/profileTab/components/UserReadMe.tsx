import React from "react";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor";

interface UserReadMeProps {
  userId: number;
  loginUserId: number;
}

export const UserReadMe: React.FC<UserReadMeProps> = ({
  userId,
  loginUserId,
}) => {
  const isOwner = userId === loginUserId;

  return (
    <div className="flex-1 lg:m-2 p-2">
      <div className="transition-all">
        <BlocksuiteDescriptionEditor
          workspaceId={`user:${userId}`}
          docId={`user:${userId}:readme`}
          variant="full"
          readOnly={!isOwner}
        />
      </div>
    </div>
  );
};
