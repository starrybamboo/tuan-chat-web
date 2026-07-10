import { Dimensions } from "react-native";

export { COMPOSER_MAX_HEIGHT, COMPOSER_MIN_HEIGHT } from "./composer-layout-constants";
export { DRAWER_EDGE_SWIPE_ZONE_WIDTH } from "./drawer-constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const LEFT_DRAWER_WIDTH = SCREEN_WIDTH;
export const RIGHT_DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 300);

export const SPACE_RAIL_WIDTH = 56;

export const MESSAGE_LONG_PRESS_DURATION = 500;
