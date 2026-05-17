export const DRAWER_ACTIVE_OFFSET_X = [-20, 20] as const;

const DRAWER_FAIL_OFFSET_Y = [-10, 10] as const;

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
