import type { RefObject } from "react";
import type { PixelCrop } from "react-image-crop";

import { canvasPreview } from "./canvasPreview";
import { useDebounceEffect } from "./useDebounceEffect";

type UseCropCanvasOptions = {
  /** 图片元素引用 */
  imgRef: RefObject<HTMLImageElement | null>;
  /** 预览 Canvas 引用 */
  previewCanvasRef: RefObject<HTMLCanvasElement | null>;
  /** 完成的裁剪区域（像素） */
  completedCrop: PixelCrop | undefined;
  /** 防抖延迟，默认 100ms */
  debounceMs?: number;
  /** 是否启用头像 URL 更新（用于实时预览） */
  enableAvatarUrlUpdate?: boolean;
  /** 头像 URL 更新回调 */
  onAvatarUrlUpdate?: (dataUrl: string) => void;
  /** 额外依赖项 */
  extraDeps?: unknown[];
};

/**
 * 裁剪 Canvas 防抖更新 Hook
 * 封装了 useDebounceEffect + canvasPreview + 可选的头像 URL 更新逻辑
 */
export function useCropCanvas({
  imgRef,
  previewCanvasRef,
  completedCrop,
  debounceMs = 100,
  enableAvatarUrlUpdate = false,
  onAvatarUrlUpdate,
  extraDeps = [],
}: UseCropCanvasOptions): void {
  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width
        && completedCrop?.height
        && imgRef.current
        && previewCanvasRef.current
      ) {
        await canvasPreview(
          imgRef.current,
          previewCanvasRef.current,
          completedCrop,
          1,
          0,
        );

        // 如果启用头像 URL 更新，延迟获取 dataUrl
        if (enableAvatarUrlUpdate && onAvatarUrlUpdate) {
          // 使用 requestAnimationFrame 确保 canvas 已经完成绘制
          requestAnimationFrame(() => {
            if (previewCanvasRef.current) {
              onAvatarUrlUpdate(previewCanvasRef.current.toDataURL());
            }
          });
        }
      }
    },
    debounceMs,
    [completedCrop, enableAvatarUrlUpdate, ...extraDeps],
  );
}
