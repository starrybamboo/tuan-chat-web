import SearchBar from "@/components/chat/input/inlineSearch";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import {
  BaselineArrowBackIosNew,
  GirlIcon,
  MemberIcon,
  SharpDownload,
} from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import React from "react";

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

  return (
    <div className="flex justify-between items-center py-1 px-5 bg-base-100">
      <div className="flex gap-2">
        <BaselineArrowBackIosNew
          className="size-7"
          onClick={
            sideDrawerState === "none" ? toggleLeftDrawer : () => setSideDrawerState("none")
          }
        >
        </BaselineArrowBackIosNew>
        <span className="text-center font-semibold text-lg line-clamp-1">{roomName}</span>
      </div>
      <div className="flex gap-2 items-center">
        <div
          className="tooltip tooltip-bottom hover:text-info"
          data-tip="导出记录"
          onClick={() => setSideDrawerState(sideDrawerState === "export" ? "none" : "export")}
        >
          <SharpDownload className="size-7" />
        </div>
        <div
          className="tooltip tooltip-bottom hover:text-info"
          data-tip="房间成员"
          onClick={() => setSideDrawerState(sideDrawerState === "user" ? "none" : "user")}
        >
          <MemberIcon className="size-7" />
        </div>
        <div
          className="tooltip tooltip-bottom hover:text-info"
          data-tip="房间角色"
          onClick={() => setSideDrawerState(sideDrawerState === "role" ? "none" : "role")}
        >
          <GirlIcon className="size-7" />
        </div>
        <SearchBar className={getScreenSize() === "sm" ? "" : "w-64"} />
      </div>
    </div>
  );
}

const RoomHeaderBar = React.memo(RoomHeaderBarImpl);
export default RoomHeaderBar;
