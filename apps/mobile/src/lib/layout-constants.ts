export { COMPOSER_MAX_HEIGHT, COMPOSER_MIN_HEIGHT } from "./composer-layout-constants";
export { DRAWER_EDGE_SWIPE_ZONE_WIDTH } from "./drawer-constants";

const RIGHT_DRAWER_MAX_WIDTH = 300;
const RIGHT_DRAWER_WIDTH_RATIO = 0.8;

export function resolveRightDrawerWidth(windowWidth: number) {
  if (!Number.isFinite(windowWidth) || windowWidth <= 0) {
    return RIGHT_DRAWER_MAX_WIDTH;
  }
  return Math.min(windowWidth * RIGHT_DRAWER_WIDTH_RATIO, RIGHT_DRAWER_MAX_WIDTH);
}

export const SPACE_RAIL_WIDTH = 56;

export const MESSAGE_LONG_PRESS_DURATION = 500;
