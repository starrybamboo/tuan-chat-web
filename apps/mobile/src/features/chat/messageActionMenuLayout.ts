export type MessageActionMenuAnchor = {
  bottom: number;
  top: number;
  x: number;
};

export type MessageActionMenuPlacement = "above" | "below";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function resolveMessageActionMenuLayout(params: {
  anchor: MessageActionMenuAnchor;
  horizontalMargin: number;
  insetBottom: number;
  insetTop: number;
  menuHeight: number;
  menuWidth: number;
  pointerHalfWidth: number;
  pointerInset: number;
  verticalGap: number;
  viewportHeight: number;
  viewportWidth: number;
}): { left: number; placement: MessageActionMenuPlacement; pointerLeft: number; top: number } {
  const minimumTop = params.insetTop + params.horizontalMargin;
  const maximumBottom = params.viewportHeight - params.insetBottom - params.horizontalMargin;
  const maximumLeft = Math.max(params.horizontalMargin, params.viewportWidth - params.horizontalMargin - params.menuWidth);
  const left = clamp(params.anchor.x - params.menuWidth / 2, params.horizontalMargin, maximumLeft);
  const spaceAbove = params.anchor.top - params.verticalGap - minimumTop;
  const spaceBelow = maximumBottom - params.anchor.bottom - params.verticalGap;
  const placement: MessageActionMenuPlacement = spaceAbove >= params.menuHeight || spaceAbove >= spaceBelow
    ? "above"
    : "below";
  const preferredTop = placement === "above"
    ? params.anchor.top - params.verticalGap - params.menuHeight
    : params.anchor.bottom + params.verticalGap;
  const maximumTop = Math.max(minimumTop, maximumBottom - params.menuHeight);
  const top = clamp(preferredTop, minimumTop, maximumTop);
  const pointerCenter = clamp(
    params.anchor.x - left,
    params.pointerInset + params.pointerHalfWidth,
    params.menuWidth - params.pointerInset - params.pointerHalfWidth,
  );

  return {
    left,
    placement,
    pointerLeft: pointerCenter - params.pointerHalfWidth,
    top,
  };
}
