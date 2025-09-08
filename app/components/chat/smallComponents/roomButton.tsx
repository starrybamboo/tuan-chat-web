import type { Room } from "../../../../api";
import React from "react";

export default function RoomButton({ room, unreadMessageNumber, onclick, isActive }: {
  room: Room;
  unreadMessageNumber: number | undefined;
  onclick: () => void;
  isActive: boolean;
}) {
  return (
    <button
      key={room.roomId}
      className={`font-bold text-sm rounded-lg p-1 flex justify-start items-center flex-1 gap-2
                               min-w-0 ${isActive ? "bg-info-content/30" : "hover:bg-base-300"}`}
      type="button"
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
        <div className="avatar mask mask-squircle w-8">
          <img
            src={room.avatar}
            alt={room.name}
          />
        </div>
      </div>
      <span className="truncate text-left">{room.name}</span>
    </button>
  );
}
