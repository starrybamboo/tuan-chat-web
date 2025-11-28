import type { RefObject } from "react";
import type { Crop, PixelCrop } from "react-image-crop";

import { useCallback, useRef, useState } from "react";

import { canvasPreview } from "./canvasPreview";
import {
  createCenteredSquareCrop,
  createFullImageCrop,
  percentToPixelCrop,
} from "./cropUtils";
import { useDebounceEffect } from "./useDebounceEffect";

export type CropMode = "avatar" | "sprite";

type UseCropPreviewOptions = {
  /** 裁剪模式：'avatar' 为 1:1，'sprite' 为全图 */
  mode: CropMode;
  /** 防抖延迟，默认 100ms */
  debounceMs?: number;
  /** 预览更新回调 */
  onPreviewUpdate?: (dataUrl: string) => void;
};

type UseCropPreviewReturn = {
  /** 图片元素引用 */
  imgRef: RefObject<HTMLImageElement | null>;
  /** 预览 Canvas 引用 */
  previewCanvasRef: RefObject<HTMLCanvasElement | null>;
  /** 当前裁剪区域（百分比） */
  crop: Crop | undefined;
  /** 设置裁剪区域 */
  setCrop: (crop: Crop | undefined) => void;
  /** 完成的裁剪区域（像素） */
  completedCrop: PixelCrop | undefined;
  /** 设置完成的裁剪区域 */
  setCompletedCrop: (crop: PixelCrop | undefined) => void;
  /** 预览图片的 DataURL */
  previewDataUrl: string;
  /** 图片加载完成处理函数 */
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  /** 裁剪区域变化处理函数 */
  onCropChange: (crop: Crop, percentCrop: Crop) => void;
  /** 裁剪完成处理函数 */
  onCropComplete: (crop: PixelCrop, percentCrop: Crop) => void;
  /** 重置所有状态 */
  reset: () => void;
};

/**
 * 裁剪预览 Hook
 * 封装了图片裁剪的核心逻辑，包括：
 * - 初始化裁剪区域
 * - 防抖更新预览 Canvas
 * - 裁剪区域变化处理
 */
export function useCropPreview(options: UseCropPreviewOptions): UseCropPreviewReturn {
  const { mode, debounceMs = 100, onPreviewUpdate } = options;

  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [previewDataUrl, setPreviewDataUrl] = useState("");

  // 图片加载完成，初始化裁剪区域
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;

    const { crop: newCrop, pixelCrop } = mode === "avatar"
      ? createCenteredSquareCrop(width, height)
      : createFullImageCrop(width, height);

    setCrop(newCrop);
    setCompletedCrop(pixelCrop);

    // 立即绘制初始预览
    if (imgRef.current && previewCanvasRef.current) {
      canvasPreview(imgRef.current, previewCanvasRef.current, pixelCrop, 1, 0);
      const dataUrl = previewCanvasRef.current.toDataURL();
      setPreviewDataUrl(dataUrl);
      onPreviewUpdate?.(dataUrl);
    }
  }, [mode, onPreviewUpdate]);

  // 裁剪区域变化（拖拽过程中）
  const onCropChange = useCallback((_: Crop, percentCrop: Crop) => {
    setCrop(percentCrop);
  }, []);

  // 裁剪完成（拖拽结束）
  const onCropComplete = useCallback((_: PixelCrop, percentCrop: Crop) => {
    if (imgRef.current) {
      const pixelCrop = percentToPixelCrop(
        percentCrop,
        imgRef.current.naturalWidth,
        imgRef.current.naturalHeight,
      );
      setCompletedCrop(pixelCrop);
    }
  }, []);

  // 重置所有状态
  const reset = useCallback(() => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setPreviewDataUrl("");
    if (previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    }
  }, []);

  // 防抖更新预览
  useDebounceEffect(
    async () => {
      if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
        await canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop, 1, 0);
        const dataUrl = previewCanvasRef.current.toDataURL();
        setPreviewDataUrl(dataUrl);
        onPreviewUpdate?.(dataUrl);
      }
    },
    debounceMs,
    [completedCrop, onPreviewUpdate],
  );

  return {
    imgRef,
    previewCanvasRef,
    crop,
    setCrop,
    completedCrop,
    setCompletedCrop,
    previewDataUrl,
    onImageLoad,
    onCropChange,
    onCropComplete,
    reset,
  };
}
