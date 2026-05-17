import type { DrawerMode } from "./LeftDrawer";

/**
 * 私聊模式下也必须保留空间轨道，避免用户失去空间切换入口。
 */
export function getLeftDrawerLayoutState(drawerMode: DrawerMode) {
  return {
    showRoomsSidebar: drawerMode === "rooms",
    showSpaceRail: true,
  };
}
