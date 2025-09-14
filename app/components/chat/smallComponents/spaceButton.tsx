import type { Space } from "../../../../api";
import React from "react";

export default function SpaceButton({ space, unreadMessageNumber, onclick, isActive }: {
  space: Space;
  unreadMessageNumber: number | undefined;
  onclick: () => void;
  isActive: boolean;
}) {
  return (
    <div className="group relative w-10">
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
          className="w-10 btn btn-square relative"
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

      {/* 自定义tooltip, 但是下面的实现有问题 */}
      {/* <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[60] */}
      {/*                opacity-0 group-hover:opacity-100 */}
      {/*                transition-all duration-200 ease-out */}
      {/*                pointer-events-none */}
      {/*                transform group-hover:translate-x-0 -translate-x-2" */}
      {/* > */}
      {/*  <div className="bg-neutral text-neutral-content px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap */}
      {/*                  backdrop-blur-sm border border-neutral-content/20" */}
      {/*  > */}
      {/*    {space.name} */}
      {/*    /!* 左侧箭头 *!/ */}
      {/*    <div className="absolute right-full top-1/2 -translate-y-1/2 */}
      {/*                    border-4 border-transparent border-r-neutral" */}
      {/*    > */}
      {/*    </div> */}
      {/*  </div> */}
      {/* </div> */}
    </div>
  );
}
