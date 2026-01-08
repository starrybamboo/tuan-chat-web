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
    <div className="flex-1 lg:m-2 p-2">
      <div
        className={isOwner && !isEditingReadMe ? "group cursor-pointer" : undefined}
        title={isOwner && !isEditingReadMe ? "点击进入编辑个人简介" : undefined}
        onClick={() => {
          if (isOwner && !isEditingReadMe) {
            setIsEditingReadMe(true);
          }
        }}
      >
        <div className={`transition-all ${isEditingReadMe ? "ring-2 ring-primary bg-base-100" : ""}`}>
          <BlocksuiteDescriptionEditor
            workspaceId={`user:${userId}`}
            docId={`user:${userId}:readme`}
            readOnly={!isOwner || !isEditingReadMe}
            // 使用 embedded + 自动高度：让外层页面滚动，而不是让编辑器容器内部滚动。
            className="min-h-[120px]"
          />
        </div>
      </div>
    </div>
  );
};
