import type { PixelCrop } from "react-image-crop";

const TO_RADIANS = Math.PI / 180;

// 预览模式下的最大尺寸限制，避免大图卡顿
const MAX_PREVIEW_SIZE = 800;

type SourceCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getOutputPixelRatio(previewMode: boolean): number {
  if (!previewMode) {
    return 1;
  }

  const devicePixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio;
  return Math.min(Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1, 1.5);
}

function resolveSourceCrop(
  image: HTMLImageElement,
  crop: PixelCrop,
  displaySize?: { width: number; height: number },
): SourceCrop {
  const naturalWidth = Math.max(1, Math.round(image.naturalWidth));
  const naturalHeight = Math.max(1, Math.round(image.naturalHeight));
  const displayWidth = displaySize?.width || image.width || naturalWidth;
  const displayHeight = displaySize?.height || image.height || naturalHeight;
  const scaleX = naturalWidth / displayWidth;
  const scaleY = naturalHeight / displayHeight;

  const x = clamp(Math.round(crop.x * scaleX), 0, naturalWidth - 1);
  const y = clamp(Math.round(crop.y * scaleY), 0, naturalHeight - 1);
  const width = clamp(Math.round(crop.width * scaleX), 1, naturalWidth - x);
  const height = clamp(Math.round(crop.height * scaleY), 1, naturalHeight - y);

  return { x, y, width, height };
}

/**
 * 将图片裁剪区域绘制到 Canvas 上
 * @param image 原始图片元素
 * @param canvas 目标画布（支持 HTMLCanvasElement 和 OffscreenCanvas）
 * @param crop 裁剪区域（像素）
 * @param scale 缩放比例
 * @param rotate 旋转角度（度）
 * @param options 可选配置
 * @param options.previewMode 是否为预览模式（会限制分辨率以提升性能）
 * @param options.maxPreviewSize 预览模式下的最大尺寸，默认 800
 */
export async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement | OffscreenCanvas,
  crop: PixelCrop,
  scale = 1,
  rotate = 0,
  options?: {
    /** 是否为预览模式（会限制分辨率以提升性能） */
    previewMode?: boolean;
    /** 预览模式下的最大尺寸，默认 800 */
    maxPreviewSize?: number;
    /** 裁剪框对应的图片显示尺寸。用于脱离 DOM 的图片导出。 */
    displaySize?: { width: number; height: number };
  },
) {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const sourceCrop = resolveSourceCrop(image, crop, options?.displaySize);
  let outputWidth = sourceCrop.width;
  let outputHeight = sourceCrop.height;

  // 预览模式下限制分辨率以提升性能
  const { previewMode = true, maxPreviewSize = MAX_PREVIEW_SIZE } = options || {};
  let downscaleRatio = 1;

  if (previewMode) {
    const maxDimension = Math.max(outputWidth, outputHeight);
    if (maxDimension > maxPreviewSize) {
      downscaleRatio = maxPreviewSize / maxDimension;
      outputWidth = Math.max(1, Math.round(outputWidth * downscaleRatio));
      outputHeight = Math.max(1, Math.round(outputHeight * downscaleRatio));
    }
  }

  // 只有预览使用 DPR 提高清晰度；最终导出必须保持真实裁剪像素，避免 1px 漂移。
  const pixelRatio = getOutputPixelRatio(previewMode);

  canvas.width = Math.max(1, Math.round(outputWidth * pixelRatio));
  canvas.height = Math.max(1, Math.round(outputHeight * pixelRatio));

  ctx.scale(pixelRatio, pixelRatio);
  // 预览模式使用较低质量以提升速度
  ctx.imageSmoothingQuality = previewMode ? "medium" : "high";

  const cropX = sourceCrop.x;
  const cropY = sourceCrop.y;
  const cropWidth = sourceCrop.width;
  const cropHeight = sourceCrop.height;

  const rotateRads = rotate * TO_RADIANS;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();

  // 如果有缩放（预览模式），需要调整绘制
  if (downscaleRatio < 1) {
    // 直接绘制裁剪区域到缩小后的 canvas
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );
  }
  else {
    // 原始逻辑：支持旋转和缩放
    // 5) Move the crop origin to the canvas origin (0,0)
    ctx.translate(-cropX, -cropY);
    // 4) Move the origin to the center of the original position
    ctx.translate(centerX, centerY);
    // 3) Rotate around the origin
    ctx.rotate(rotateRads);
    // 2) Scale the image
    ctx.scale(scale, scale);
    // 1) Move the center of the image to the origin (0,0)
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
    );
  }

  ctx.restore();
}
