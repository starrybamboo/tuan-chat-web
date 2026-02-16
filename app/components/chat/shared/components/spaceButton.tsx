import type { Space } from "../../../../../api";
import React from "react";
import PortalTooltip from "@/components/common/portalTooltip";

export default function SpaceButton({ space, unreadMessageNumber, onclick, isActive }: {
  space: Space;
  unreadMessageNumber: number | undefined;
  onclick: () => void;
  isActive: boolean;
}) {
  const displayName = space.name || "未命名空间";
  const fallbackAvatar = "/favicon.ico";
  const displayAvatar = (space.avatar || "").trim() || fallbackAvatar;
  const isDev = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

  return (
    <div
      className="group relative z-20 hover:z-50 w-10 my-1 rounded"
      key={space.spaceId}
    >
      <div
        className={`absolute -left-[6px] z-10 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-info transition-transform duration-300 ${
          isActive ? "scale-y-100" : "scale-y-0"
        }`}
      >
      </div>
      <PortalTooltip label={displayName} placement="right">
        <button
          className="w-10 btn btn-square relative"
          type="button"
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
                draggable={false}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallbackApplied)
                    return;
                  if (isDev) {
                    console.warn("[SpaceButton] avatar load failed, fallback applied", {
                      spaceId: space.spaceId,
                      spaceName: displayName,
                      avatar: displayAvatar,
                    });
                  }
                  img.dataset.fallbackApplied = "1";
                  img.src = fallbackAvatar;
                }}
              />
            </div>
          </div>
        </button>
      </PortalTooltip>
    </div>
  );
}
