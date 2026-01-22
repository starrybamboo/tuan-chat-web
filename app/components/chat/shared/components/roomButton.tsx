import type { Room } from "../../../../../api";
import React from "react";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";

export default function RoomButton({
  room,
  unreadMessageNumber,
  onclick,
  isActive,
  children,
}: {
  room: Room;
  unreadMessageNumber: number | undefined;
  onclick: () => void;
  isActive: boolean;
  children?: React.ReactNode;
}) {
  const headerOverride = useEntityHeaderOverrideStore(state => state.headers[`room:${room.roomId}`]);
  const displayName = headerOverride?.title || room.name;
  const fallbackAvatar = "/favicon.ico";
  const displayAvatar = headerOverride?.imageUrl || room.avatar || fallbackAvatar;

  return (
    <div
      key={room.roomId}
      className={`group relative font-bold text-sm rounded-lg p-1 pr-10 flex justify-start items-center gap-2 w-full
                               min-w-0 ${isActive ? "bg-info-content/10" : "hover:bg-base-300"}`}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={onclick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onclick();
        }
      }}
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
          <img
            src={displayAvatar}
            alt={displayName}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied)
                return;
              img.dataset.fallbackApplied = "1";
              img.src = fallbackAvatar;
            }}
          />
        </div>
      </div>
      <span className="flex-1 min-w-0 truncate text-left">{displayName}</span>

      {children
        ? (
            <div
              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {children}
            </div>
          )
        : null}
    </div>
  );
}
