import { ExportIcon } from "@phosphor-icons/react";
import React from "react";
import SearchBar from "@/components/chat/input/inlineSearch";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import {
  BaselineArrowBackIosNew,
  MemberIcon,
  RoleListIcon,
} from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";

export interface RoomHeaderBarProps {
  roomName?: string;
  toggleLeftDrawer: () => void;
}

function RoomHeaderBarImpl({
  roomName,
  toggleLeftDrawer,
}: RoomHeaderBarProps) {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);

  const closeThreadPane = () => {
    setComposerTarget("main");
    setThreadRootMessageId(undefined);
  };

  return (
    <div className="border-gray-300 dark:border-gray-700 border-t border-b flex justify-between items-center overflow-visible relative z-50">
      <div
        className="flex justify-between items-center w-full px-2 h-10
        bg-white/40 dark:bg-slate-950/25 backdrop-blur-xl
        border border-white/40 dark:border-white/10"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="sm:hidden">
            <button
              type="button"
              aria-label="打开左侧边栏"
              className="btn btn-ghost btn-square btn-sm"
              onClick={toggleLeftDrawer}
            >
              <BaselineArrowBackIosNew className="size-6" />
            </button>
          </div>
          <span className="text-center font-semibold line-clamp-1 truncate max-w-[50vw] sm:max-w-none min-w-0 text-sm sm:text-base">
            <span className="hidden sm:inline">「 </span>
            {roomName}
            <span className="hidden sm:inline"> 」</span>
          </span>
        </div>
        <div className="flex gap-2 items-center overflow-visible">
          <div
            className="tooltip tooltip-bottom hover:text-info relative z-50"
            data-tip="导出记录"
            data-side-drawer-toggle="true"
            onClick={() => {
              closeThreadPane();
              setSideDrawerState(sideDrawerState === "export" ? "none" : "export");
            }}
          >
            <ExportIcon className="size-6" />
          </div>
          <div
            className="tooltip tooltip-bottom hover:text-info relative z-50"
            data-tip="房间成员"
            data-side-drawer-toggle="true"
            onClick={() => {
              closeThreadPane();
              setSideDrawerState(sideDrawerState === "user" ? "none" : "user");
            }}
          >
            <MemberIcon className="size-6" />
          </div>
          <div
            className="tooltip tooltip-bottom hover:text-info relative z-50"
            data-tip="房间角色"
            data-side-drawer-toggle="true"
            onClick={() => {
              closeThreadPane();
              setSideDrawerState(sideDrawerState === "role" ? "none" : "role");
            }}
          >
            <RoleListIcon className="size-6" />
          </div>
          <SearchBar className={getScreenSize() === "sm" ? "" : "w-64"} />
        </div>
      </div>
    </div>
  );
}

const RoomHeaderBar = React.memo(RoomHeaderBarImpl);
export default RoomHeaderBar;
