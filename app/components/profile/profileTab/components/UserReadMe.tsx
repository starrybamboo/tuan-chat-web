import React from "react";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";

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
          readOnly={!isOwner}
          // 使用 embedded + 自动高度：让外层页面滚动，而不是让编辑器容器内部滚动。
        />
      </div>
    </div>
  );
};
