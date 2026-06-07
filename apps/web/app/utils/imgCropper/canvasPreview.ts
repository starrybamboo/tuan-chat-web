import type { PixelCrop } from "react-image-crop";

const TO_RADIANS = Math.PI / 180;

// 预览模式下的最大尺寸限制，避免大图卡顿
const MAX_PREVIEW_SIZE = 800;

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
  },
) {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // 计算原始裁剪尺寸
  let outputWidth = Math.floor(crop.width * scaleX);
  let outputHeight = Math.floor(crop.height * scaleY);

  // 预览模式下限制分辨率以提升性能
  const { previewMode = true, maxPreviewSize = MAX_PREVIEW_SIZE } = options || {};
  let downscaleRatio = 1;

  if (previewMode) {
    const maxDimension = Math.max(outputWidth, outputHeight);
    if (maxDimension > maxPreviewSize) {
      downscaleRatio = maxPreviewSize / maxDimension;
      outputWidth = Math.floor(outputWidth * downscaleRatio);
      outputHeight = Math.floor(outputHeight * downscaleRatio);
    }
  }

  // devicePixelRatio slightly increases sharpness on retina devices
  // 预览模式下使用较低的 pixelRatio 以提升性能
  const pixelRatio = previewMode ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio;

  canvas.width = Math.floor(outputWidth * pixelRatio);
  canvas.height = Math.floor(outputHeight * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  // 预览模式使用较低质量以提升速度
  ctx.imageSmoothingQuality = previewMode ? "medium" : "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const cropWidth = crop.width * scaleX;
  const cropHeight = crop.height * scaleY;

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
