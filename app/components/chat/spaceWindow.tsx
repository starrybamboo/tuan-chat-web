import type { SpaceContextType } from "@/components/chat/spaceContext";
import { SpaceContext } from "@/components/chat/spaceContext";
import SpaceRightSidePanel from "@/components/chat/spaceRightSidePanel";
import React, { useMemo } from "react";

export default function SpaceWindow({ spaceId }: { spaceId: number }) {
  const spaceContext: SpaceContextType = useMemo((): SpaceContextType => {
    return {
      spaceId,
    };
  }, [spaceId]);
  if (!spaceId || spaceId <= 0) {
    return <></>;
  }
  return (
    <SpaceContext value={spaceContext}>
      <div className="flex flex-row p-6 gap-4 w-full min-w-0">
        {/* 聊天区域主体 */}
        <div className="flex-1 w-full flex flex-col card-body shadow-sm">
        </div>
        {/* 成员与角色展示框 */}
        <SpaceRightSidePanel></SpaceRightSidePanel>
      </div>
    </SpaceContext>

  );
}
