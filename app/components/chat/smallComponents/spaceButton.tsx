import type { Space } from "../../../../api";
import React from "react";

export default function SpaceButton({ space, unreadMessageNumber, onclick, isActive }: {
  space: Space;
  unreadMessageNumber: number | undefined;
  onclick: () => void;
  isActive: boolean;
}) {
  return (
    <div
      className={`rounded ${isActive ? "bg-info-content/40 " : ""} w-10 relative`}
      key={space.spaceId}
    >
      <div
        className={`absolute -left-[6px] z-10 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-info transition-transform duration-300 ${
          isActive ? "scale-y-100" : "scale-y-0"
        }`}
      >
      </div>
      <button
        className="tooltip tooltip-right w-10 btn btn-square"
        data-tip={space.name}
        type="button"
        onClick={onclick}
      >
        <div className="indicator">
          {(unreadMessageNumber && unreadMessageNumber > 0)
            ? (
                <span
                  className="indicator-item badge badge-xs bg-error"
                >
                  {unreadMessageNumber}
                </span>
              )
            : null}
          <div className="avatar mask mask-squircle">
            <img
              src={space.avatar}
              alt={space.name}
            />
          </div>
        </div>
      </button>
    </div>
  );
}
