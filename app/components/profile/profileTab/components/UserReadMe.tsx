import React from "react";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor";
import {
  BLOCKSUITE_FULL_PANEL_EDITOR_CLASS,
} from "@/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor.shared";

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
    <div className="flex-1 min-h-0 lg:m-2 p-2">
      <div className="h-full min-h-0 transition-all">
        <BlocksuiteDescriptionEditor
          workspaceId={`user:${userId}`}
          docId={`user:${userId}:readme`}
          variant="full"
          className={BLOCKSUITE_FULL_PANEL_EDITOR_CLASS}
          readOnly={!isOwner}
        />
      </div>
    </div>
  );
};
