import { Mounter } from "@/components/common/mounter";
import { isLgScreen } from "@/utils/getScreenSize";
// 检测屏幕尺寸
import React from "react";

/**
 * 侧边抽屉组件
 * 在大屏幕时直接显示内容，与不套这个组件的效果是一样的，在小屏幕（移动端）时变为默认关闭的sideDrawer
 * 使用SideDrawerToggle组件来触发抽屉的打开和关闭
 * @param sideDrawerId 抽屉的唯一标识ID，用于控制抽屉开关
 * @param isAtRight 抽屉是否显示在右侧，默认为false（左侧）
 * @param children 抽屉中要显示的内容
 * @constructor
 */
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

/**
 * 抽屉开关触发器组件
 * 在小屏幕下显示触发按钮，大屏幕下不显示
 * @param htmlFor 这里填入对应的sideDrawerId，当这个组件被点击的时候，对应id的sideDraw就会弹出
 * @param children 触发器显示内容
 * @param className 自定义样式类
 * @constructor
 */
export function SideDrawerToggle({
  htmlFor,
  children,
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
