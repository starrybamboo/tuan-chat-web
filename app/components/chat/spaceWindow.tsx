import SpaceRightSidePanel from "@/components/chat/spaceRightSidePanel";
import SpaceSettingWindow from "@/components/chat/window/spaceSettingWindow";
import { PopWindow } from "@/components/common/popWindow";
import React, { useState } from "react";

export default function SpaceWindow({ spaceId }: { spaceId: number }) {
  const [isOpenSpaceSettingWindow, setIsOpenSpaceSettingWindow] = useState(false);
  if (!spaceId || spaceId <= 0) {
    return <></>;
  }
  return (
    <>
      <div className="flex flex-row p-6 gap-4 w-full min-w-0">
        <div className="flex-1 w-full flex flex-col card-body shadow-sm relative">
          <button
            type="button"
            className="btn btn-ghost absolute top-0 right-0 z-50"
            onClick={() => {
              setIsOpenSpaceSettingWindow(true);
            }}
          >
            设置
          </button>
        </div>
        {/* 成员与角色展示框 */}
        <SpaceRightSidePanel></SpaceRightSidePanel>
      </div>
      <PopWindow isOpen={isOpenSpaceSettingWindow} onClose={() => setIsOpenSpaceSettingWindow(false)}>
        <SpaceSettingWindow onClose={() => setIsOpenSpaceSettingWindow(false)}></SpaceSettingWindow>
      </PopWindow>
    </>
  );
}
