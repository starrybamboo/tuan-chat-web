/**
 * 图片裁剪工具模块
 * 整合了所有与图片裁剪相关的工具函数和 Hooks
 */

// Canvas 预览
export { canvasPreview } from "./canvasPreview";

// 裁剪工具函数
export {
  canvasToBlob,
  createCenteredAspectCrop,
  createCenteredSquareCrop,
  createFullImageCrop,
  getCroppedImageFile,
} from "./cropUtils";

// 裁剪 Canvas 防抖更新 Hook
export { useCropCanvas } from "./useCropCanvas";

// 裁剪预览 Hook（完整状态管理）
export { useCropPreview } from "./useCropPreview";
export type { CropMode, ImageLoadContext } from "./useCropPreview";

// 防抖 Hook
export { useDebounceEffect } from "./useDebounceEffect";
