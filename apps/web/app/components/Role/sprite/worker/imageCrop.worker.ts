/**
 * 图像裁剪 Web Worker
 * 使用 OffscreenCanvas 在后台线程处理图像裁剪,避免阻塞主线程
 */

import type { PixelCrop } from "react-image-crop";

const TO_RADIANS = Math.PI / 180;

type CropMessage = {
  type: "crop";
  imageBitmap: ImageBitmap; // 使用 ImageBitmap，支持零拷贝转移
  crop: PixelCrop;
  scale: number;
  rotate: number;
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

type SourceCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveSourceCrop(
  crop: PixelCrop,
  imageNaturalWidth: number,
  imageNaturalHeight: number,
  imageDisplayWidth: number,
  imageDisplayHeight: number,
): SourceCrop {
  const naturalWidth = Math.max(1, Math.round(imageNaturalWidth));
  const naturalHeight = Math.max(1, Math.round(imageNaturalHeight));
  const displayWidth = imageDisplayWidth || naturalWidth;
  const displayHeight = imageDisplayHeight || naturalHeight;
  const scaleX = naturalWidth / displayWidth;
  const scaleY = naturalHeight / displayHeight;

  const x = clamp(Math.round(crop.x * scaleX), 0, naturalWidth - 1);
  const y = clamp(Math.round(crop.y * scaleY), 0, naturalHeight - 1);
  const width = clamp(Math.round(crop.width * scaleX), 1, naturalWidth - x);
  const height = clamp(Math.round(crop.height * scaleY), 1, naturalHeight - y);

  return { x, y, width, height };
}

/**
 * 在 OffscreenCanvas 上执行裁剪预览
 */
async function canvasPreviewOffscreen(
  imageBitmap: ImageBitmap, // 直接接收 ImageBitmap，无需再次转换
  crop: PixelCrop,
  scale: number,
  rotate: number,
  imageNaturalWidth: number,
  imageNaturalHeight: number,
  imageDisplayWidth: number,
  imageDisplayHeight: number,
): Promise<Blob> {
  const sourceCrop = resolveSourceCrop(
    crop,
    imageNaturalWidth,
    imageNaturalHeight,
    imageDisplayWidth,
    imageDisplayHeight,
  );
  const canvas = new OffscreenCanvas(sourceCrop.width, sourceCrop.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No 2d context");
  }

  ctx.imageSmoothingQuality = "high";

  const rotateRads = rotate * TO_RADIANS;
  const centerX = imageNaturalWidth / 2;
  const centerY = imageNaturalHeight / 2;

  ctx.save();

  // 变换步骤
  ctx.translate(-sourceCrop.x, -sourceCrop.y);
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

  // 转换为 Blob - 使用 PNG 格式
  const blob = await canvas.convertToBlob({
    type: "image/png",
  });

  return blob;
}

// Worker 消息处理
globalThis.addEventListener("message", async (e: MessageEvent<CropMessage>) => {
  const { type, imageBitmap, crop, scale, rotate, imageNaturalWidth, imageNaturalHeight, imageDisplayWidth, imageDisplayHeight } = e.data;

  if (type !== "crop") {
    return;
  }

  try {
    const blob = await canvasPreviewOffscreen(
      imageBitmap,
      crop,
      scale,
      rotate,
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
    console.error("[Worker] 裁剪失败:", error);

    const response: CropResponse = {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    globalThis.postMessage(response);
  }
});

// Worker 全局错误处理
globalThis.addEventListener("error", (e) => {
  console.error("[Worker] 全局错误:", e.error);
});

globalThis.addEventListener("unhandledrejection", (e) => {
  console.error("[Worker] 未处理的 Promise 拒绝:", e.reason);
});
