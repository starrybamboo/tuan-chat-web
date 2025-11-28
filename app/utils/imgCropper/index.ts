/**
 * 图片裁剪工具模块
 * 整合了所有与图片裁剪相关的工具函数和 Hooks
 */

// Canvas 预览
export { canvasPreview } from "./canvasPreview";

// 裁剪工具函数
export {
  canvasToBlob,
  canvasToDataUrl,
  createCenteredAspectCrop,
  createCenteredSquareCrop,
  createFullImageCrop,
  cropImageToBlob,
  getCroppedImageFile,
  getCroppedImageFileFromImage,
  getCroppedImageUrl,
  percentToPixelCrop,
} from "./cropUtils";

// 图片预览
export { imgPreview } from "./imgPreview";

// 裁剪预览 Hook
export { useCropPreview } from "./useCropPreview";
export type { CropMode } from "./useCropPreview";

// 防抖 Hook
export { useDebounceEffect } from "./useDebounceEffect";
