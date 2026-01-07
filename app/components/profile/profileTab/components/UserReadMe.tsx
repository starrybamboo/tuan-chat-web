import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import React, { useState } from "react";

interface UserReadMeProps {
  userId: number;
  loginUserId: number;
}

export const UserReadMe: React.FC<UserReadMeProps> = ({
  userId,
  loginUserId,
}) => {
  const [isEditingReadMe, setIsEditingReadMe] = useState(false);

  const isOwner = userId === loginUserId;

  return (
    <div className="flex-1 lg:m-2">
      <div className="p-4 shadow-md rounded-xl relative">
        <div className="p-2">
          <div
            className={isOwner && !isEditingReadMe ? "group cursor-pointer" : undefined}
            title={isOwner && !isEditingReadMe ? "点击进入编辑个人简介" : undefined}
            onClick={() => {
              if (isOwner && !isEditingReadMe) {
                setIsEditingReadMe(true);
              }
            }}
          >
            <div className={`min-h-[120px] transition-all ${isEditingReadMe ? "ring-2 ring-primary bg-base-100" : ""}`}>
              <div className={!isOwner || !isEditingReadMe ? "pointer-events-none" : undefined}>
                <BlocksuiteDescriptionEditor
                  workspaceId={`user:${userId}`}
                  docId={`user:${userId}:readme`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
