import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const LEFT_DRAWER_WIDTH = SCREEN_WIDTH;
export const RIGHT_DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 300);
export const DRAWER_EDGE_SWIPE_ZONE_WIDTH = 24;

export const SPACE_RAIL_WIDTH = 56;

export const MESSAGE_LONG_PRESS_DURATION = 500;
export const COMPOSER_MAX_HEIGHT = 120;
export const COMPOSER_MIN_HEIGHT = 40;
