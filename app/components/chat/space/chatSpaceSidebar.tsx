import type { Space } from "../../../../api";

import SpaceButton from "@/components/chat/shared/components/spaceButton";
import { AddIcon } from "@/icons";
import React from "react";

export interface ChatSpaceSidebarProps {
  isPrivateChatMode: boolean;
  spaces: Space[];
  activeSpaceId: number | null;
  getSpaceUnreadMessagesNumber: (spaceId: number) => number;
  privateUnreadMessagesNumber: number;
  onOpenPrivate: () => void;
  onSelectSpace: (spaceId: number) => void;
  onCreateSpace: () => void;
  onSpaceContextMenu: (e: React.MouseEvent) => void;
}

export default function ChatSpaceSidebar({
  isPrivateChatMode,
  spaces,
  activeSpaceId,
  getSpaceUnreadMessagesNumber,
  privateUnreadMessagesNumber,
  onOpenPrivate,
  onSelectSpace,
  onCreateSpace,
  onSpaceContextMenu,
}: ChatSpaceSidebarProps) {
  return (
    <div className="flex flex-col py-2 bg-base-300/40 h-full overflow-y-auto">
      {/* 私信入口 */}
      <div className="rounded w-10 relative mx-2">
        <div
          className={`absolute -left-[6px] z-10 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-info transition-transform duration-300 ${isPrivateChatMode ? "scale-y-100" : "scale-y-0"
          }`}
        />
        <button
          className="tooltip tooltip-bottom w-10 btn btn-square"
          data-tip="私信"
          type="button"
          aria-label="私信"
          onClick={onOpenPrivate}
        >
          <div className="indicator">
            {(privateUnreadMessagesNumber > 0)
              ? (
                  <span className="indicator-item badge badge-xs bg-error">
                    {privateUnreadMessagesNumber > 99 ? "99+" : privateUnreadMessagesNumber}
                  </span>
                )
              : null}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
        </button>
      </div>

      {/* 分隔线 */}
      <div className="w-8 h-px bg-base-300 mx-3"></div>

      <div className="hidden-scrollbar overflow-x-hidden flex flex-col py-2 px-2" onContextMenu={onSpaceContextMenu}>
        {/* 全部空间列表 */}
        {spaces.map(space => (
          <div key={space.spaceId} data-space-id={space.spaceId}>
            <SpaceButton
              space={space}
              unreadMessageNumber={getSpaceUnreadMessagesNumber(space.spaceId ?? -1)}
              onclick={() => {
                if (activeSpaceId !== space.spaceId) {
                  onSelectSpace(space.spaceId ?? -1);
                }
              }}
              isActive={activeSpaceId === space.spaceId}
            >
            </SpaceButton>
          </div>
        ))}
      </div>
      <button
        className="tooltip tooltip-top btn btn-square btn-dash btn-info w-10 mx-2"
        type="button"
        data-tip="创建"
        aria-label="创建空间"
        onClick={onCreateSpace}
      >
        <div className="avatar mask mask-squircle flex content-center">
          <AddIcon></AddIcon>
        </div>
      </button>
    </div>
  );
}
