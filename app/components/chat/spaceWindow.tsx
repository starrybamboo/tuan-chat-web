import RightSidePanel from "@/components/chat/rightSidePanel";
import React from "react";

export default function SpaceWindow({ spaceId }: { spaceId: number }) {
  if (!spaceId || spaceId <= 0) {
    return <></>;
  }
  return (
    <div className="flex flex-row p-6 gap-4 w-full min-w-0">
      {/* 聊天区域主体 */}
      <div className="flex-1 w-full flex flex-col card-body shadow-sm">
      </div>
      {/* 成员与角色展示框 */}
      <RightSidePanel></RightSidePanel>
    </div>
  );
}
