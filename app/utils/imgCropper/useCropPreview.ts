import type { RefObject } from "react";
import type { Crop, PixelCrop } from "react-image-crop";

import { useCallback, useRef, useState } from "react";

import { canvasPreview } from "./canvasPreview";
import {
  createCenteredSquareCrop,
  createFullImageCrop,
  getCroppedImageFile,
} from "./cropUtils";
import { useCropCanvas } from "./useCropCanvas";

export type CropMode = "avatar" | "sprite";

/** 图片加载完成后的扩展回调上下文 */
export type ImageLoadContext = {
  width: number;
  height: number;
  crop: Crop;
  pixelCrop: PixelCrop;
};

type UseCropPreviewOptions = {
  /** 裁剪模式，支持静态值或动态获取函数 */
  mode: CropMode | (() => CropMode);
  /** 防抖延迟，默认 100ms */
  debounceMs?: number;
  /** 自定义初始裁剪区域（可选） */
  initialCrop?: (args: { width: number; height: number; mode: CropMode }) => { crop: Crop; pixelCrop: PixelCrop } | undefined;
  /**
   * 是否将首次预览绘制延后到下一帧（requestAnimationFrame）。
   * 用于“图片切换时需要先提交外部状态（如 transform）再绘制 canvas”的场景，避免出现中间帧闪烁。
   * 默认 false（保持原行为：图片加载后立即绘制）。
   */
  deferInitialPreviewDraw?: boolean;
  /** 预览更新回调（每次 canvas 更新时调用） */
  onPreviewUpdate?: (dataUrl: string) => void;
  /** 图片加载后的扩展逻辑（在默认处理之后调用） */
  onImageLoadExtend?: (e: React.SyntheticEvent<HTMLImageElement>, context: ImageLoadContext) => void;
  /** 外部传入的图片 ref（可选，不传则内部创建） */
  imgRef?: RefObject<HTMLImageElement | null>;
  /** 外部传入的 canvas ref（可选，不传则内部创建） */
  previewCanvasRef?: RefObject<HTMLCanvasElement | null>;
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
  /** 裁剪区域变化处理函数（用于 ReactCrop 的 onChange） */
  onCropChange: (crop: Crop, percentCrop: Crop) => void;
  /** 裁剪完成处理函数（用于 ReactCrop 的 onComplete） */
  onCropComplete: (crop: PixelCrop, percentCrop: Crop) => void;
  /** 重置所有裁剪状态 */
  reset: () => void;
  /** 获取裁剪后的图片文件 */
  getCroppedFile: (fileName?: string) => Promise<File>;
  /** 获取裁剪后的 DataURL */
  getCroppedUrl: () => Promise<string>;
};

/**
 * 裁剪预览 Hook
 * 封装了图片裁剪的完整逻辑，包括：
 * - 状态管理（crop, completedCrop, previewDataUrl）
 * - refs 管理（imgRef, previewCanvasRef）
 * - 初始化裁剪区域（基于 mode）
 * - 防抖更新预览 Canvas（基于 useCropCanvas）
 * - 裁剪区域变化处理
 * - 便捷方法（getCroppedFile, getCroppedUrl）
 */
export function useCropPreview(options: UseCropPreviewOptions): UseCropPreviewReturn {
  const {
    mode,
    debounceMs = 100,
    initialCrop,
    deferInitialPreviewDraw = false,
    onPreviewUpdate,
    onImageLoadExtend,
    imgRef: externalImgRef,
    previewCanvasRef: externalCanvasRef,
  } = options;

  // 获取当前 mode（支持动态获取）
  const getMode = useCallback((): CropMode => {
    return typeof mode === "function" ? mode() : mode;
  }, [mode]);

  // refs（支持外部传入或内部创建）
  const internalImgRef = useRef<HTMLImageElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = externalImgRef ?? internalImgRef;
  const previewCanvasRef = externalCanvasRef ?? internalCanvasRef;

  // 状态
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [previewDataUrl, setPreviewDataUrl] = useState("");

  // 内部预览更新处理
  const handlePreviewUpdate = useCallback((dataUrl: string) => {
    setPreviewDataUrl(dataUrl);
    onPreviewUpdate?.(dataUrl);
  }, [onPreviewUpdate]);

  // 图片加载完成，初始化裁剪区域
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // 使用显示尺寸（受 CSS 限制后的尺寸），而不是 naturalWidth/naturalHeight
    // 这样裁剪框才能正确覆盖显示的图片区域
    const { width, height } = e.currentTarget;
    const currentMode = getMode();

    const resolvedInitialCrop = initialCrop?.({ width, height, mode: currentMode });
    const { crop: newCrop, pixelCrop } = resolvedInitialCrop ?? (currentMode === "avatar"
      ? createCenteredSquareCrop(width, height)
      : createFullImageCrop(width, height));

    setCrop(newCrop);
    setCompletedCrop(pixelCrop);

    const drawInitialPreview = () => {
      // 立即绘制初始预览
      if (imgRef.current && previewCanvasRef.current) {
        canvasPreview(imgRef.current, previewCanvasRef.current, pixelCrop, 1, 0, { previewMode: true });
        // 使用 toBlob 异步生成预览 URL（比 toDataURL 更高效）
        previewCanvasRef.current.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              handlePreviewUpdate(url);
            }
          },
          "image/png",
        );
      }
    };

    // 调用扩展逻辑
    onImageLoadExtend?.(e, {
      width,
      height,
      crop: newCrop,
      pixelCrop,
    });

    if (deferInitialPreviewDraw) {
      requestAnimationFrame(drawInitialPreview);
    }
    else {
      drawInitialPreview();
    }
  }, [getMode, initialCrop, imgRef, previewCanvasRef, handlePreviewUpdate, onImageLoadExtend, deferInitialPreviewDraw]);

  // 裁剪区域变化（拖拽过程中）
  const onCropChange = useCallback((_: Crop, percentCrop: Crop) => {
    setCrop(percentCrop);
  }, []);

  // 裁剪完成（拖拽结束）
  // ReactCrop 的 onComplete 第一个参数已经是 PixelCrop，直接使用即可
  const onCropComplete = useCallback((pixelCrop: PixelCrop, _percentCrop: Crop) => {
    setCompletedCrop(pixelCrop);
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
  }, [previewCanvasRef]);

  // 获取裁剪后的文件 - 重新以全分辨率绘制后导出
  const getCroppedFile = useCallback(async (fileName = "cropped.png"): Promise<File> => {
    const img = imgRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas || !completedCrop) {
      throw new Error("Crop canvas does not exist");
    }
    // 以全分辨率重新绘制（previewMode: false）
    await canvasPreview(img, canvas, completedCrop, 1, 0, { previewMode: false });
    return await getCroppedImageFile(canvas, fileName);
  }, [imgRef, previewCanvasRef, completedCrop]);

  // 获取裁剪后的 URL - 重新以全分辨率绘制后导出
  const getCroppedUrl = useCallback(async (): Promise<string> => {
    const img = imgRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas || !completedCrop) {
      throw new Error("Crop canvas does not exist");
    }
    // 以全分辨率重新绘制（previewMode: false）
    await canvasPreview(img, canvas, completedCrop, 1, 0, { previewMode: false });
    return canvas.toDataURL("image/png");
  }, [imgRef, previewCanvasRef, completedCrop]);

  // 使用 useCropCanvas 进行防抖更新
  useCropCanvas({
    imgRef,
    previewCanvasRef,
    completedCrop,
    debounceMs,
    enableAvatarUrlUpdate: true,
    onAvatarUrlUpdate: handlePreviewUpdate,
  });

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
    getCroppedFile,
    getCroppedUrl,
  };
}
