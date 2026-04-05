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
      <div className="h-[65vh] min-h-[28rem] transition-all md:h-[72vh] md:min-h-[34rem]">
        <BlocksuiteDescriptionEditor
          workspaceId={`user:${userId}`}
          docId={`user:${userId}:readme`}
          variant="full"
          className="h-full min-h-0 rounded-md"
          readOnly={!isOwner}
        />
      </div>
    </div>
  );
};
