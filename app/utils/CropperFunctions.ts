/**
 * 裁剪图片并返回Blob
 * @param {HTMLImageElement} image 原始图片元素
 * @param {HTMLCanvasElement} previewCanvas 预览画布
 * @param {object} completedCrop 裁剪参数对象
 * @param {number} completedCrop.width 裁剪区域宽度（像素）
 * @param {number} completedCrop.height 裁剪区域高度（像素）
 * @param {number} [completedCrop.x] 裁剪区域左上角 x 坐标（像素）
 * @param {number} [completedCrop.y] 裁剪区域左上角 y 坐标（像素）
 * @returns {Promise<Blob>} 返回裁剪后的图片Blob
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
 * 导出裁剪后的图片为 File
 * @param {HTMLImageElement} image 原始图片元素
 * @param {HTMLCanvasElement} previewCanvas 预览画布
 * @param {object} completedCrop 裁剪参数对象
 * @param {number} completedCrop.width 裁剪区域宽度（像素）
 * @param {number} completedCrop.height 裁剪区域高度（像素）
 * @param {number} [completedCrop.x] 裁剪区域左上角 x 坐标（像素）
 * @param {number} [completedCrop.y] 裁剪区域左上角 y 坐标（像素）
 * @param {string} [fileName] 文件名，可选
 * @returns {Promise<File>} 返回裁剪后的图片文件
 */
export async function getCroppedImageFile(
  image: HTMLImageElement,
  previewCanvas: HTMLCanvasElement,
  completedCrop: { width: number; height: number; x?: number; y?: number },
  fileName?: string,
): Promise<File> {
  const blob = await cropImageToBlob(image, previewCanvas, completedCrop);
  return new File([blob], fileName || "cropped.png", {
    type: "image/png",
    lastModified: Date.now(),
  });
}

/**
 * 导出裁剪后的图片为 DataURL
 * @param {HTMLImageElement} image 原始图片元素
 * @param {HTMLCanvasElement} previewCanvas 预览画布
 * @param {object} completedCrop 裁剪参数对象
 * @param {number} completedCrop.width 裁剪区域宽度（像素）
 * @param {number} completedCrop.height 裁剪区域高度（像素）
 * @param {number} [completedCrop.x] 裁剪区域左上角 x 坐标（像素）
 * @param {number} [completedCrop.y] 裁剪区域左上角 y 坐标（像素）
 * @returns {Promise<string>} 返回裁剪后的图片 DataURL
 */
export async function getCroppedImageUrl(
  image: HTMLImageElement,
  previewCanvas: HTMLCanvasElement,
  completedCrop: { width: number; height: number; x?: number; y?: number },
): Promise<string> {
  const blob = await cropImageToBlob(image, previewCanvas, completedCrop);
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/**
 * 将canvas数据转换为Blob
 */
export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      }
      else {
        reject(new Error("Failed to convert canvas to blob"));
      }
    }, "image/png", 0.9);
  });
}
