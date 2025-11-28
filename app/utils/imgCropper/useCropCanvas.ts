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
          { previewMode: true }, // 启用预览模式以提升性能
        );

        // 如果启用头像 URL 更新，使用 toBlob 异步生成（比 toDataURL 更高效）
        if (enableAvatarUrlUpdate && onAvatarUrlUpdate) {
          const canvas = previewCanvasRef.current;
          // 使用 toBlob + createObjectURL 替代 toDataURL，性能更好
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // 注意：需要在适当时机 revoke 这个 URL，但对于预览用途可以忽略
                const url = URL.createObjectURL(blob);
                onAvatarUrlUpdate(url);
              }
            },
            "image/png",
          );
        }
      }
    },
    debounceMs,
    [completedCrop, enableAvatarUrlUpdate, ...extraDeps],
  );
}
