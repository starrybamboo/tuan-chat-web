export const DRAWER_ACTIVE_OFFSET_X: [number, number] = [-4, 4];
export const DRAWER_FAIL_OFFSET_Y: [number, number] = [-40, 40];
export const DRAWER_OVERLAY_CAPTURE_OFFSET = 48;

export function getGestureDrawerAxisConfig() {
  return {
    activeOffsetX: DRAWER_ACTIVE_OFFSET_X,
    failOffsetY: DRAWER_FAIL_OFFSET_Y,
  };
}

export function getRightDrawerClampRange(rightDrawerWidth: number) {
  "worklet";
  return {
    max: 0,
    min: -rightDrawerWidth,
  };
}

export function getRightDrawerSnapPoints(rightDrawerWidth: number): readonly number[] {
  "worklet";
  return [-rightDrawerWidth, 0];
}

export function shouldDrawerOverlayCaptureTouches(position: number): boolean {
  "worklet";
  return Math.abs(position) > DRAWER_OVERLAY_CAPTURE_OFFSET;
}
