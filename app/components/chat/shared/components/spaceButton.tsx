import type { Space } from "../../../../../api";
import React from "react";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";

export default function SpaceButton({ space, unreadMessageNumber, onclick, isActive }: {
  space: Space;
  unreadMessageNumber: number | undefined;
  onclick: () => void;
  isActive: boolean;
}) {
  const headerOverride = useEntityHeaderOverrideStore(state => state.headers[`space:${space.spaceId}`]);
  const displayName = headerOverride?.title || space.name;
  const displayAvatar = headerOverride?.imageUrl || space.avatar;

  return (
    <div
      className="group relative z-20 w-10 my-1 rounded"
      key={space.spaceId}
    >
      <div
        className={`absolute -left-[6px] z-10 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-info transition-transform duration-300 ${
          isActive ? "scale-y-100" : "scale-y-0"
        }`}
      >
      </div>
      <button
        className="tooltip tooltip-bottom w-10 btn btn-square relative"
        type="button"
        data-tip={displayName}
        aria-label={displayName}
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
          <div className="avatar mask mask-squircle size-10">
            <img
              src={displayAvatar}
              alt={displayName}
            />
          </div>
        </div>
      </button>
    </div>
  );
}
