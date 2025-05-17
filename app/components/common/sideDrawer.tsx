import { Mounter } from "@/components/common/mounter";
// 检测屏幕尺寸
import React from "react";

function isLgScreen() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

export function SideDrawer({
  sideDrawerId,
  isAtRight = false,
  children,
}: {
  sideDrawerId: string;
  isAtRight?: boolean;
  children: React.ReactNode;
}) {
  if (isLgScreen()) {
    return children;
  }

  return (
    <Mounter targetId="side-drawer">
      <div className={`drawer ${isAtRight ? "drawer-end" : ""}`}>
        <input id={sideDrawerId} type="checkbox" className="drawer-toggle" />
        <div className="drawer-side">
          <label htmlFor={sideDrawerId} className="drawer-overlay"></label>
          <div className="bg-base-200 w-80 h-full">
            {children}
            <label htmlFor={sideDrawerId} className="btn btn-sm btn-circle absolute right-2 top-2">
              ✕
            </label>
          </div>
        </div>
      </div>
    </Mounter>
  );
}

export function sideDrawerToggle(sideDrawerId: string) {
  const checkbox = document.getElementById(sideDrawerId) as HTMLInputElement;
  if (checkbox) {
    checkbox.checked = !checkbox.checked;
  }
}

export function sideDrawerOpener({
  sideDrawerId,
  children,
}: {
  sideDrawerId: string;
  children: React.ReactNode;
}) {
  if (isLgScreen()) {
    return null;
  }
  return (
    <label htmlFor={sideDrawerId} className="btn btn-primary drawer-button">
      {children}
    </label>
  );
}
