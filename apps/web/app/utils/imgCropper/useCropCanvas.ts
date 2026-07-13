import type { RefObject } from "react";
import type { PixelCrop } from "react-image-crop";

import { useEffect, useRef } from "react";

import { canvasPreview } from "./canvasPreview";

type UseCropCanvasOptions = {
  /** 图片元素引用 */
  imgRef: RefObject<HTMLImageElement | null>;
  /** 预览 Canvas 引用 */
  previewCanvasRef: RefObject<HTMLCanvasElement | null>;
  /** 完成的裁剪区域（像素） */
  completedCrop: PixelCrop | undefined;
  /** 防抖延迟，默认 100ms */
  debounceMs?: number;
  /** 首张图片是否立即绘制 */
  immediateFirstRender?: boolean;
  /** 预览最大边长 */
  maxPreviewSize?: number;
  /** 是否启用头像 URL 更新（用于实时预览） */
  enableAvatarUrlUpdate?: boolean;
  /** Canvas 绘制完成回调，无需等待图片编码 */
  onCanvasUpdate?: () => void;
  /** 头像 URL 更新回调 */
  onAvatarUrlUpdate?: (dataUrl: string) => void;
};

/**
 * 裁剪 Canvas 防抖更新 Hook
 * 负责取消过期绘制，只提交最后一次裁剪预览。
 */
export function useCropCanvas({
  imgRef,
  previewCanvasRef,
  completedCrop,
  debounceMs = 100,
  immediateFirstRender = false,
  maxPreviewSize,
  enableAvatarUrlUpdate = false,
  onCanvasUpdate,
  onAvatarUrlUpdate,
}: UseCropCanvasOptions): void {
  const lastRenderedImageSrcRef = useRef("");
  const renderSequenceRef = useRef(0);
  const imageSrc = imgRef.current?.currentSrc || imgRef.current?.src || "";

  useEffect(() => {
    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    if (!completedCrop?.width || !completedCrop.height || !image || !canvas) {
      return;
    }

    const renderSequence = ++renderSequenceRef.current;
    const waitTime = immediateFirstRender && imageSrc !== lastRenderedImageSrcRef.current
      ? 0
      : debounceMs;
    const timer = window.setTimeout(() => {
      void (async () => {
        await canvasPreview(
          image,
          canvas,
          completedCrop,
          1,
          0,
          { previewMode: true, maxPreviewSize },
        );
        if (renderSequence !== renderSequenceRef.current) {
          return;
        }
        lastRenderedImageSrcRef.current = image.currentSrc || image.src;
        onCanvasUpdate?.();

        if (enableAvatarUrlUpdate && onAvatarUrlUpdate) {
          canvas.toBlob(
            (blob) => {
              if (blob && renderSequence === renderSequenceRef.current) {
                const url = URL.createObjectURL(blob);
                onAvatarUrlUpdate(url);
              }
            },
            "image/png",
          );
        }
      })();
    }, waitTime);

    return () => {
      window.clearTimeout(timer);
      renderSequenceRef.current += 1;
    };
  }, [
    completedCrop,
    debounceMs,
    enableAvatarUrlUpdate,
    imageSrc,
    immediateFirstRender,
    imgRef,
    maxPreviewSize,
    onAvatarUrlUpdate,
    onCanvasUpdate,
    previewCanvasRef,
  ]);
}
