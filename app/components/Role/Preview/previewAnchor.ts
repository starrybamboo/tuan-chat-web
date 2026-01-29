export const REFERENCE_WIDTH = 2560;
export const REFERENCE_HEIGHT = 1440;

type AnchorPosition = "left" | "center" | "right";

export function getSpriteWidthRef(canvas: HTMLCanvasElement | null): number {
  if (!canvas || !canvas.height) {
    return REFERENCE_WIDTH;
  }

  return REFERENCE_HEIGHT * (canvas.width / canvas.height);
}

export function getAnchorOffsetXRef(
  anchorPosition: AnchorPosition,
  scale: number,
  canvas: HTMLCanvasElement | null,
): number {
  const spriteWidthRef = getSpriteWidthRef(canvas);
  const scaledSpriteWidthRef = spriteWidthRef * scale;

  if (anchorPosition === "center") {
    return 0;
  }

  if (anchorPosition === "right") {
    return (REFERENCE_WIDTH - scaledSpriteWidthRef) / 2;
  }

  return (scaledSpriteWidthRef - REFERENCE_WIDTH) / 2;
}
