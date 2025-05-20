import { Mounter } from "@/components/common/mounter";
// 检测屏幕尺寸
import React from "react";

function isLgScreen() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

// 在大屏的时候直接返回包裹的原组件，在小屏（移动端），挂载到很靠近根组件的一个div上
export function SideDrawer({
  sideDrawerId, // id, 之后设置sideDrawerToggle会用到
  isAtRight = false, // 抽屉是否在右边
  children, // 内容
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
          <div className="bg-base-200 max-w-[80%] h-full">
            {children}
            {/* <label htmlFor={sideDrawerId} className="btn btn-sm btn-circle absolute right-2 top-2"> */}
            {/*  ✕ */}
            {/* </label> */}
          </div>
        </div>
      </div>
    </Mounter>
  );
}

export function SideDrawerToggle({
  htmlFor, // 这里填入对应的sideDrawerId
  children, // 显示的内容
  className,
}: { htmlFor: string; children: React.ReactNode; className?: string }) {
  if (isLgScreen()) {
    return null;
  }
  return (
    <label
      htmlFor={htmlFor}
      className={className}
    >
      {children}
    </label>
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
