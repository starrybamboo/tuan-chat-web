import SpaceRightSidePanel from "@/components/chat/spaceRightSidePanel";
import { SideDrawer } from "@/components/common/sideDrawer";
import React from "react";

export default function SpaceWindow({ spaceId }: { spaceId: number }) {
  if (!spaceId || spaceId <= 0) {
    return <></>;
  }
  return (
    <>
      <div className="w-full flex gap-4">
        <div className="flex flex-col flex-1 h-full">
          <div className="card bg-base-100 shadow-sm flex-1">
            <div className="card-body w-full h-full"></div>
          </div>
        </div>
        {/* 成员与角色展示框 */}
        <SideDrawer sideDrawerId="room-side-drawer" isAtRight>
          <SpaceRightSidePanel></SpaceRightSidePanel>
        </SideDrawer>
      </div>
    </>
  );
}
