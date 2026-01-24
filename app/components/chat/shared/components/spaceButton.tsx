import type { Space } from "../../../../../api";
import React, { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [tooltipPoint, setTooltipPoint] = useState<{ x: number; y: number } | null>(null);
  const tooltipText = displayName?.trim();

  const updateTooltipPoint = useCallback(() => {
    const button = buttonRef.current;
    if (!button)
      return;
    const rect = button.getBoundingClientRect();
    setTooltipPoint({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    });
  }, []);

  const showTooltip = useCallback(() => {
    if (!tooltipText)
      return;
    updateTooltipPoint();
  }, [tooltipText, updateTooltipPoint]);

  const hideTooltip = useCallback(() => {
    setTooltipPoint(null);
  }, []);

  return (
    <div
      className="group relative z-20 hover:z-50 w-10 my-1 rounded"
      key={space.spaceId}
      onPointerEnter={showTooltip}
      onPointerMove={showTooltip}
      onPointerLeave={hideTooltip}
    >
      <div
        className={`absolute -left-[6px] z-10 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-info transition-transform duration-300 ${
          isActive ? "scale-y-100" : "scale-y-0"
        }`}
      >
      </div>
      <button
        ref={buttonRef}
        className="w-10 btn btn-square relative"
        type="button"
        aria-label={displayName}
        title={displayName}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
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
      {(tooltipPoint && tooltipText && typeof document !== "undefined")
        ? createPortal(
            <div
              className="fixed pointer-events-none z-[9999]"
              style={{ left: tooltipPoint.x, top: tooltipPoint.y }}
              aria-hidden="true"
            >
              <div className="relative -translate-x-1/2">
                <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-neutral shadow" />
                <div className="max-w-[240px] rounded px-2 py-1 text-xs bg-neutral text-neutral-content shadow whitespace-normal break-words">
                  {tooltipText}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
