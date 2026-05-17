export const DRAWER_ACTIVE_OFFSET_X: [number, number] = [-20, 20];

const DRAWER_FAIL_OFFSET_Y: [number, number] = [-10, 10];

/**
 * Horizontal drawer drag must yield to clear vertical scrolling so the chat
 * list can keep its native scroll gesture.
 */
export function getGestureDrawerAxisConfig() {
  return {
    activeOffsetX: DRAWER_ACTIVE_OFFSET_X,
    failOffsetY: DRAWER_FAIL_OFFSET_Y,
  };
}
