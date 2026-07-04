export type AvatarCropTranslation = {
  x: number;
  y: number;
};

export type AvatarCropTranslationInput = {
  cropSize: number;
  displayHeight: number;
  displayWidth: number;
  scale: number;
  translateX: number;
  translateY: number;
};

/** 裁剪手势在 UI 线程执行，必须保持为 worklet 可调用的纯计算。 */
export function clampAvatarCropTranslation({
  cropSize,
  displayHeight,
  displayWidth,
  scale,
  translateX,
  translateY,
}: AvatarCropTranslationInput): AvatarCropTranslation {
  "worklet";
  const scaledWidth = displayWidth * scale;
  const scaledHeight = displayHeight * scale;
  const maxX = Math.max(0, (scaledWidth - cropSize) / 2);
  const maxY = Math.max(0, (scaledHeight - cropSize) / 2);

  return {
    x: maxX === 0 ? 0 : Math.min(maxX, Math.max(-maxX, translateX)),
    y: maxY === 0 ? 0 : Math.min(maxY, Math.max(-maxY, translateY)),
  };
}
