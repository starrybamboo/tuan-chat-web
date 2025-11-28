import type { Crop, PixelCrop } from "react-image-crop";

import { centerCrop, makeAspectCrop } from "react-image-crop";

/**
 * 创建居中的1:1裁剪区域（用于头像）
 */
export function createCenteredSquareCrop(width: number, height: number): {
  crop: Crop;
  pixelCrop: PixelCrop;
} {
  const size = Math.min(width, height);
  const x = (width - size) / 2;
  const y = (height - size) / 2;

  return {
    crop: {
      unit: "%",
      x: (x / width) * 100,
      y: (y / height) * 100,
      width: (size / width) * 100,
      height: (size / height) * 100,
    },
    pixelCrop: { unit: "px", x, y, width: size, height: size },
  };
}

/**
 * 创建全图裁剪区域（用于立绘）
 */
export function createFullImageCrop(width: number, height: number): {
  crop: Crop;
  pixelCrop: PixelCrop;
} {
  return {
    crop: { unit: "%", x: 0, y: 0, width: 100, height: 100 },
    pixelCrop: { unit: "px", x: 0, y: 0, width, height },
  };
}

/**
 * 创建居中裁剪区域（带宽高比）
 */
export function createCenteredAspectCrop(
  width: number,
  height: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 100 }, aspect, width, height),
    width,
    height,
  );
}

/**
 * 将百分比裁剪转换为像素裁剪
 */
export function percentToPixelCrop(
  percentCrop: Crop,
  naturalWidth: number,
  naturalHeight: number,
): PixelCrop {
  return {
    unit: "px",
    x: (percentCrop.x / 100) * naturalWidth,
    y: (percentCrop.y / 100) * naturalHeight,
    width: (percentCrop.width / 100) * naturalWidth,
    height: (percentCrop.height / 100) * naturalHeight,
  };
}

/**
 * Canvas 转 Blob
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type = "image/png",
  quality?: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error("Canvas to blob failed")),
      type,
      quality,
    );
  });
}

/**
 * Canvas 转 DataURL
 */
export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  type = "image/png",
): string {
  return canvas.toDataURL(type);
}

/**
 * 从 Canvas 创建裁剪后的图片文件
 */
export async function getCroppedImageFile(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  fileName: string,
  type = "image/png",
): Promise<File> {
  const blob = await canvasToBlob(canvas, type);
  return new File([blob], fileName, { type, lastModified: Date.now() });
}

/**
 * 裁剪图片并返回 Blob（从图片和 Canvas）
 */
export async function cropImageToBlob(
  image: HTMLImageElement,
  previewCanvas: HTMLCanvasElement,
  completedCrop: { width: number; height: number; x?: number; y?: number },
): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const offscreen = new OffscreenCanvas(
    completedCrop.width * scaleX,
    completedCrop.height * scaleY,
  );
  const ctx = offscreen.getContext("2d");
  if (!ctx) {
    throw new Error("No 2d context");
  }
  ctx.drawImage(
    previewCanvas,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height,
    0,
    0,
    offscreen.width,
    offscreen.height,
  );
  return await offscreen.convertToBlob({ type: "image/png" });
}

/**
 * 从图片和裁剪参数获取裁剪后的 DataURL
 */
export async function getCroppedImageUrl(
  image: HTMLImageElement,
  previewCanvas: HTMLCanvasElement,
  completedCrop: { width: number; height: number; x?: number; y?: number },
): Promise<string> {
  const blob = await cropImageToBlob(image, previewCanvas, completedCrop);
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/**
 * 从图片和裁剪参数获取裁剪后的 File
 */
export async function getCroppedImageFileFromImage(
  image: HTMLImageElement,
  previewCanvas: HTMLCanvasElement,
  completedCrop: { width: number; height: number; x?: number; y?: number },
  fileName = "cropped.png",
): Promise<File> {
  const blob = await cropImageToBlob(image, previewCanvas, completedCrop);
  return new File([blob], fileName, {
    type: "image/png",
    lastModified: Date.now(),
  });
}
