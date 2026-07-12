import React from "react";

import { maskClassName, selectionClassName } from "@/components/common/DesignLanguage";
import { MediaImage } from "@/components/common/mediaImage";
import { CountBadge, StatusIndicator } from "@/components/common/StatusPrimitives";
import { imageLowUrl, imageLowUrlFromUrl } from "@/utils/media/mediaUrl";

import type { Room } from "../../../../../api";

import { chatSidebarFocusClassName } from "./chatSidebarActiveTone";
import { resolveEntityImageUrl } from "./entityImageUrl";

const currentNavigationItemClassName = selectionClassName({ level: "strong" });

export default function RoomButton({
  room,
  unreadMessageNumber,
  onclick,
  isActive,
  children,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  room: Room;
  unreadMessageNumber: number | undefined;
  onclick: () => void;
  isActive: boolean;
  children?: React.ReactNode;
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  onDragEnd?: React.DragEventHandler<HTMLDivElement>;
}) {
  const displayName = room.name;
  const fallbackAvatar = "/favicon.ico";
  const displayAvatar = imageLowUrlFromUrl(resolveEntityImageUrl(imageLowUrl(room.avatarFileId), fallbackAvatar));
  const unreadCount = unreadMessageNumber ?? 0;

  return (
    <div
      key={room.roomId}
      className="group relative w-full min-w-0"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className={`
          relative flex w-full min-w-0 items-center justify-start gap-2 overflow-visible rounded-lg p-1
          pr-10 text-left text-sm font-bold select-none transition-colors ${chatSidebarFocusClassName}
          ${isActive ? currentNavigationItemClassName : "hover:bg-base-300"}
        `}
        aria-current={isActive ? "page" : undefined}
        aria-label={`${isActive ? "当前房间" : "切换到房间"} ${displayName}${unreadCount > 0 ? `，${unreadCount > 99 ? "99 条以上" : unreadCount} 条未读` : ""}`}
        title={displayName}
        onClick={onclick}
      >
        <StatusIndicator
          indicator={!isActive && unreadCount > 0
            ? <CountBadge tone="error">{unreadCount > 99 ? "99+" : unreadCount}</CountBadge>
            : null}
        >
          <div className={maskClassName({ className: "size-8" })}>
            <MediaImage
              src={displayAvatar}
              alt={displayName}
              draggable={false}
              fallbackSrc={fallbackAvatar}
            />
          </div>
        </StatusIndicator>
        <span className="flex-1 min-w-0 truncate text-left">{displayName}</span>
      </button>

      {children
        ? (
            <div
              className="
                absolute right-1 top-1/2 -translate-y-1/2 flex items-center
              "
            >
              {children}
            </div>
          )
        : null}
    </div>
  );
}
