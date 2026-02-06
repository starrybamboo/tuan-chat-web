import type { Crop, PixelCrop } from "react-image-crop";

import { centerCrop, makeAspectCrop } from "react-image-crop";

// ============================================================
// 裁剪区域创建函数
// ============================================================

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
 * 创建顶部对齐的1:1裁剪区域（用于头像）
 */
export function createTopCenteredSquareCrop(width: number, height: number): {
  crop: Crop;
  pixelCrop: PixelCrop;
} {
  const size = Math.min(width, height);
  const x = (width - size) / 2;
  const y = 0;

  return {
    crop: {
      unit: "%",
      x: (x / width) * 100,
      y: 0,
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

// ============================================================
// Canvas 导出函数
// ============================================================

/**
 * Canvas 转 Blob（统一处理 HTMLCanvasElement 和 OffscreenCanvas）
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
 * 从 Canvas 创建图片文件
 * 这是核心导出函数，其他导出方式都应基于此
 */
export async function getCroppedImageFile(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  fileName: string,
  type = "image/png",
): Promise<File> {
  const blob = await canvasToBlob(canvas, type);
  return new File([blob], fileName, { type, lastModified: Date.now() });
}
