export type FloatingMenuPosition = {
  x: number;
  y: number;
};

export type FloatingMenuSize = {
  width: number;
  height: number;
};

export type FloatingMenuViewport = {
  width: number;
  height: number;
};

/**
 * 基于触发元素生成浮层菜单的初始锚点，供按钮触发的上下文菜单复用。
 */
export function createFloatingMenuAnchorFromElement(element: Pick<HTMLElement, "getBoundingClientRect">): FloatingMenuPosition {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.right),
    y: Math.round(rect.top),
  };
}

/**
 * 将浮层菜单限制在当前视口内，避免桌面端点击侧边栏右侧按钮时菜单溢出屏幕。
 */
export function clampFloatingMenuPosition(
  position: FloatingMenuPosition,
  menuSize: FloatingMenuSize,
  viewport: FloatingMenuViewport,
  padding = 8,
): FloatingMenuPosition {
  const maxX = Math.max(padding, viewport.width - menuSize.width - padding);
  const maxY = Math.max(padding, viewport.height - menuSize.height - padding);

  return {
    x: Math.min(Math.max(position.x, padding), maxX),
    y: Math.min(Math.max(position.y, padding), maxY),
  };
}
