import React from "react";
import { AddIcon, ChevronDown, MapPlaceHolderIcon, MemberIcon, Setting } from "@/icons";

export type SpaceDetailTab = "members" | "workflow" | "setting";

export interface SpaceHeaderBarProps {
  spaceName?: string;
  isArchived?: boolean;
  isSpaceOwner: boolean;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab) => void;
  onInviteMember: () => void;
}

export default function SpaceHeaderBar({ spaceName, isArchived, isSpaceOwner, onOpenSpaceDetailPanel, onInviteMember }: SpaceHeaderBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1 gap-2 min-w-0">
      <div className="dropdown dropdown-bottom flex-1 min-w-0">
        <button
          type="button"
          tabIndex={0}
          className="btn btn-ghost btn-sm px-2 min-w-0 gap-2 justify-start rounded-lg w-full"
          aria-label="空间选项"
        >
          <span className="text-lg font-bold truncate leading-none min-w-0 flex-1">{spaceName}</span>
          {isArchived && (
            <span className="badge badge-sm">已归档</span>
          )}
          <ChevronDown className="size-4 opacity-60 flex-shrink-0" />
        </button>
        <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box shadow-xl border border-base-300 z-40 w-56 p-2">
          <li>
            <button
              type="button"
              className="gap-3"
              onClick={() => {
                onOpenSpaceDetailPanel("members");
              }}
            >
              <MemberIcon className="size-4 opacity-70" />
              <span className="flex-1 text-left">群成员</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="gap-3"
              onClick={() => {
                onOpenSpaceDetailPanel("workflow");
              }}
            >
              <MapPlaceHolderIcon className="size-4 opacity-70" />
              <span className="flex-1 text-left">流程图</span>
            </button>
          </li>
          {isSpaceOwner && (
            <li>
              <button
                type="button"
                className="gap-3"
                onClick={() => {
                  onOpenSpaceDetailPanel("setting");
                }}
              >
                <Setting className="size-4 opacity-70" />
                <span className="flex-1 text-left">空间资料</span>
              </button>
            </li>
          )}
        </ul>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <div className="tooltip tooltip-bottom" data-tip="邀请成员">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square hover:text-info"
            onClick={onInviteMember}
            aria-label="邀请成员"
          >
            <AddIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
