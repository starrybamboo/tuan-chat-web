import type { Room } from "../../../../../api";
import React from "react";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { MediaImage } from "@/components/common/mediaImage";
import { imageLowUrl, imageLowUrlFromUrl } from "@/utils/mediaUrl";
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
  const headerOverride = useEntityHeaderOverrideStore(state => state.headers[`room:${room.roomId}`]);
  const displayName = headerOverride?.title || room.name;
  const fallbackAvatar = "/favicon.ico";
  const displayAvatar = imageLowUrl(headerOverride?.imageFileId)
    || imageLowUrlFromUrl(resolveEntityImageUrl(headerOverride?.imageUrl || imageLowUrl(room.avatarFileId), fallbackAvatar));

  return (
    <div
      key={room.roomId}
      className={`group relative w-full min-w-0 ${isActive ? "text-base-content" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className={`flex w-full min-w-0 items-center justify-start gap-2 rounded-lg p-1 pr-10 text-left text-sm font-bold select-none transition-colors ${
          isActive ? "bg-primary/20 text-base-content ring-1 ring-primary/40 dark:bg-primary/30 dark:ring-primary/60" : "hover:bg-base-300"
        }`}
        aria-pressed={isActive}
        onClick={onclick}
      >
        <div className="indicator">
          {(!isActive && unreadMessageNumber && unreadMessageNumber > 0)
            ? (
                <span
                  className="indicator-item badge badge-xs bg-error"
                >
                  {unreadMessageNumber}
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
              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center"
            >
              {children}
            </div>
          )
        : null}
    </div>
  );
}
