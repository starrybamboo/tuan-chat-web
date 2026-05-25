export const DRAWER_ACTIVE_OFFSET_X: [number, number] = [-4, 4];
export const DRAWER_FAIL_OFFSET_Y: [number, number] = [-40, 40];
export const DRAWER_SWIPE_HINT_OFFSET = 24;
export const DRAWER_SWIPE_HINT_DELAY_MS = 32;
export const DRAWER_OVERLAY_CAPTURE_OFFSET = 48;

export type GestureDrawerSwipeOptions = {
  allowLeftDrawerSwipe?: boolean;
};

export type GestureDrawerSwipeBounds = GestureDrawerSwipeOptions & {
  leftDrawerWidth: number;
  rightDrawerWidth: number;
};

export function getGestureDrawerAxisConfig() {
  return {
    activeOffsetX: DRAWER_ACTIVE_OFFSET_X,
    failOffsetY: DRAWER_FAIL_OFFSET_Y,
  };
}

export function getGestureDrawerClampRange(options: GestureDrawerSwipeBounds) {
  "worklet";
  return {
    max: options.allowLeftDrawerSwipe === false ? 0 : options.leftDrawerWidth,
    min: -options.rightDrawerWidth,
  };
}

export function getGestureDrawerSnapPoints(position: number, options: GestureDrawerSwipeBounds): readonly number[] {
  "worklet";
  if (options.allowLeftDrawerSwipe !== false && position > options.leftDrawerWidth * 0.5)
    return [0, options.leftDrawerWidth];
  if (position < -options.rightDrawerWidth * 0.5)
    return [-options.rightDrawerWidth, 0];
  return options.allowLeftDrawerSwipe === false
    ? [-options.rightDrawerWidth, 0]
    : [-options.rightDrawerWidth, 0, options.leftDrawerWidth];
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
