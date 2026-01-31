export const REFERENCE_WIDTH = 2560;
export const REFERENCE_HEIGHT = 1440;

function getSpriteWidthRef(canvas: HTMLCanvasElement | null): number {
  if (!canvas || !canvas.height) {
    return REFERENCE_WIDTH;
  }

  return REFERENCE_HEIGHT * (canvas.width / canvas.height);
}

export function getAnchorOffsetXRef(): number {
  return 0;
}

