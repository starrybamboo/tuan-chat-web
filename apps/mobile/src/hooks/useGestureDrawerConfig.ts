export const DRAWER_ACTIVE_OFFSET_X: [number, number] = [-8, 8];
export const DRAWER_FAIL_OFFSET_Y: [number, number] = [-10, 10];

export function getGestureDrawerAxisConfig() {
  return {
    activeOffsetX: DRAWER_ACTIVE_OFFSET_X,
    failOffsetY: DRAWER_FAIL_OFFSET_Y,
  };
}
