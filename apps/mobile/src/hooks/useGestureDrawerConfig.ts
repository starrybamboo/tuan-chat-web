export const DRAWER_ACTIVE_OFFSET_X: [number, number] = [-4, 4];
export const DRAWER_FAIL_OFFSET_Y: [number, number] = [-40, 40];
export const DRAWER_SWIPE_HINT_OFFSET = 24;
export const DRAWER_SWIPE_HINT_DELAY_MS = 32;
export const DRAWER_OVERLAY_CAPTURE_OFFSET = 48;

export function getGestureDrawerAxisConfig() {
  return {
    activeOffsetX: DRAWER_ACTIVE_OFFSET_X,
    failOffsetY: DRAWER_FAIL_OFFSET_Y,
  };
}

export function shouldUseSyntheticSwipeHint(position: number): boolean {
  return Math.abs(position) <= DRAWER_SWIPE_HINT_OFFSET;
}

export function resolveCloseWithSwipeHintStartPosition(position: number): number {
  return shouldUseSyntheticSwipeHint(position) ? DRAWER_SWIPE_HINT_OFFSET : position;
}

export function shouldDrawerOverlayCaptureTouches(position: number): boolean {
  "worklet";
  return Math.abs(position) > DRAWER_OVERLAY_CAPTURE_OFFSET;
}
