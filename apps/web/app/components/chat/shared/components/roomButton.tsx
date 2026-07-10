import React from "react";

import { MediaImage } from "@/components/common/mediaImage";
import { imageLowUrl, imageLowUrlFromUrl } from "@/utils/media/mediaUrl";

import type { Room } from "../../../../../api";

import { resolveEntityImageUrl } from "./entityImageUrl";

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
      className={`
        group relative w-full min-w-0
        ${isActive ? "text-base-content" : ""}
      `}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className={`
          flex w-full min-w-0 items-center justify-start gap-2 rounded-lg p-1
          pr-10 text-left text-sm font-bold select-none transition-colors
          ${
          isActive ? `
            bg-info/15 text-base-content ring-1 ring-info/40
            dark:bg-info/20 dark:ring-info/55
          ` : `hover:bg-base-300`
        }
        `}
        aria-pressed={isActive}
        aria-label={`${isActive ? "当前房间" : "切换到房间"} ${displayName}${unreadCount > 0 ? `，${unreadCount > 99 ? "99 条以上" : unreadCount} 条未读` : ""}`}
        title={displayName}
        onClick={onclick}
      >
        <div className="indicator">
          {(!isActive && unreadCount > 0)
            ? (
                <span
                  className="indicator-item badge badge-xs bg-error"
                >
                  {unreadCount}
                </span>
              )
            : null}
          <div className="mask mask-squircle size-8">
            <MediaImage
              src={displayAvatar}
              alt={displayName}
              draggable={false}
              fallbackSrc={fallbackAvatar}
            />
          </div>
        </div>
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
