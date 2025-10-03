/**
 * 图像裁剪 Web Worker
 * 使用 OffscreenCanvas 在后台线程处理图像裁剪,避免阻塞主线程
 */

import type { PixelCrop } from "react-image-crop";

console.warn("worker loaded");
const TO_RADIANS = Math.PI / 180;

type CropMessage = {
  type: "crop";
  imageBitmap: ImageBitmap; // 使用 ImageBitmap，支持零拷贝转移
  crop: PixelCrop;
  scale: number;
  rotate: number;
  pixelRatio: number;
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  imageDisplayWidth: number;
  imageDisplayHeight: number;
};

type CropResponse = {
  type: "success" | "error";
  blob?: Blob;
  error?: string;
};

/**
 * 在 OffscreenCanvas 上执行裁剪预览
 */
async function canvasPreviewOffscreen(
  imageBitmap: ImageBitmap, // 直接接收 ImageBitmap，无需再次转换
  crop: PixelCrop,
  scale: number,
  rotate: number,
  pixelRatio: number,
  imageNaturalWidth: number,
  imageNaturalHeight: number,
  imageDisplayWidth: number,
  imageDisplayHeight: number,
): Promise<Blob> {
  const scaleX = imageNaturalWidth / imageDisplayWidth;
  const scaleY = imageNaturalHeight / imageDisplayHeight;

  const canvas = new OffscreenCanvas(
    Math.floor(crop.width * scaleX * pixelRatio),
    Math.floor(crop.height * scaleY * pixelRatio),
  );

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No 2d context");
  }

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  const rotateRads = rotate * TO_RADIANS;
  const centerX = imageNaturalWidth / 2;
  const centerY = imageNaturalHeight / 2;

  ctx.save();

  // 变换步骤
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotateRads);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);

  // 直接使用传入的 ImageBitmap 绘制
  ctx.drawImage(
    imageBitmap,
    0,
    0,
    imageNaturalWidth,
    imageNaturalHeight,
    0,
    0,
    imageNaturalWidth,
    imageNaturalHeight,
  );

  ctx.restore();

  // 清理 ImageBitmap 资源（已转移所有权，用完即释放）
  imageBitmap.close();

  // 转换为 Blob
  return await canvas.convertToBlob({
    type: "image/png",
  });
}

// Worker 消息处理
globalThis.addEventListener("message", async (e: MessageEvent<CropMessage>) => {
  const { type, imageBitmap, crop, scale, rotate, pixelRatio, imageNaturalWidth, imageNaturalHeight, imageDisplayWidth, imageDisplayHeight } = e.data;

  if (type !== "crop") {
    return;
  }

  try {
    const blob = await canvasPreviewOffscreen(
      imageBitmap,
      crop,
      scale,
      rotate,
      pixelRatio,
      imageNaturalWidth,
      imageNaturalHeight,
      imageDisplayWidth,
      imageDisplayHeight,
    );

    const response: CropResponse = {
      type: "success",
      blob,
    };

    globalThis.postMessage(response);
  }
  catch (error) {
    const response: CropResponse = {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    globalThis.postMessage(response);
  }
});
