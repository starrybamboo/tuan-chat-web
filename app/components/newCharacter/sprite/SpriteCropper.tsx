import type { Crop, PixelCrop } from "react-image-crop";
import type { Transform } from "./TransformControl";
import { canvasPreview } from "@/components/common/uploader/imgCopper/canvasPreview";
import { useDebounceEffect } from "@/components/common/uploader/imgCopper/useDebounceEffect";
import React, { useRef, useState } from "react";
import { centerCrop, makeAspectCrop, ReactCrop } from "react-image-crop";
import { RenderPreview } from "./RenderPreview";
import { TransformControl } from "./TransformControl";
import "react-image-crop/dist/ReactCrop.css";

/**
 * 创建并居中裁剪区域的辅助函数
 * @param mediaWidth - 媒体宽度
 * @param mediaHeight - 媒体高度
 * @param aspect - 宽高比
 * @returns 居中的裁剪区域配置
 */
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

/**
 * 立绘裁剪组件的属性接口
 */
interface SpriteCropperProps {
  // 要裁剪的立绘URL
  spriteUrl: string;
  // 角色名称，用于预览
  characterName: string;
  // 对话内容，用于预览
  dialogContent?: string;
  // 裁剪完成回调
  onCropComplete?: (croppedImageUrl: string) => void;
  // 关闭组件回调
  onClose?: () => void;
}

/**
 * 立绘裁剪组件
 * 用于裁剪现有立绘，支持预览和变换控制
 */
export function SpriteCropper({
  spriteUrl,
  characterName,
  dialogContent = "这是一段示例对话内容。",
  onCropComplete,
}: SpriteCropperProps) {
  // Canvas 引用
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 裁剪相关状态
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  // Transform控制状态
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  });

  // 加载状态
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 图片加载完成后的处理函数
   * 设置初始裁剪区域
   */
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    // 立绘裁剪不限制宽高比，使用2:3作为初始比例
    const aspect = 2 / 3;
    const newCrop = centerAspectCrop(width, height, aspect);
    setCrop(newCrop);

    // 在图片加载完成时设置completedCrop
    const cropWidth = (width * newCrop.width) / 100;
    const cropHeight = (height * newCrop.height) / 100;
    setCompletedCrop({
      unit: "px",
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    });
  }

  // 使用防抖效果更新预览画布
  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width
        && completedCrop?.height
        && imgRef.current
        && previewCanvasRef.current
      ) {
        canvasPreview(
          imgRef.current,
          previewCanvasRef.current,
          completedCrop,
          1,
          0,
        );
      }
    },
    100,
    [completedCrop],
  );

  /**
   * 获取裁剪后的图片DataURL
   */
  async function getCroppedImageDataUrl(): Promise<string> {
    const image = imgRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!image || !previewCanvas || !completedCrop) {
      throw new Error("Crop canvas does not exist");
    }

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

    const blob = await offscreen.convertToBlob({
      type: "image/png",
    });

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 处理下载裁剪图片
   */
  async function handleDownload() {
    try {
      setIsProcessing(true);
      const dataUrl = await getCroppedImageDataUrl();

      // 创建下载链接
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${characterName}-sprite-cropped.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    catch (error) {
      console.error("下载失败:", error);
    }
    finally {
      setIsProcessing(false);
    }
  }

  /**
   * 处理应用裁剪
   */
  async function handleApplyCrop() {
    try {
      setIsProcessing(true);
      const dataUrl = await getCroppedImageDataUrl();
      onCropComplete?.(dataUrl);
    }
    catch (error) {
      console.error("应用裁剪失败:", error);
    }
    finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold">
          立绘裁剪 -
          {" "}
          {characterName}
        </h1>
      </div>

      <div className="divider my-0"></div>

      <div className="flex flex-col lg:flex-row gap-8 justify-center">
        {/* 左侧：原始图片裁剪区域 */}
        <div className="w-full lg:w-1/2 p-2 gap-4 flex flex-col items-center">
          <h2 className="text-xl font-bold">裁剪预览</h2>
          <div className="w-full rounded-lg flex items-center justify-center">
            {spriteUrl && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={c => setCompletedCrop(c)}
                // 立绘裁剪不限制宽高比
                minHeight={10}
              >
                <img
                  ref={imgRef}
                  alt="Sprite to crop"
                  src={spriteUrl}
                  onLoad={onImageLoad}
                  style={{
                    maxHeight: "70vh",
                  }}
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            )}
          </div>
        </div>

        {/* 右侧：裁剪预览和控制 */}
        {completedCrop && (
          <div className="w-full lg:w-1/2 p-2 gap-4 flex flex-col items-center">
            <h2 className="text-xl font-bold">渲染预览</h2>
            <div className="w-full h-full bg-info/30 rounded-lg p-4 gap-4 flex flex-col">
              <RenderPreview
                previewCanvasRef={previewCanvasRef}
                transform={transform}
                characterName={characterName}
                dialogContent={dialogContent}
                characterNameTextSize="text-sm"
                dialogTextSize="text-sm"
              />

              <TransformControl
                transform={transform}
                setTransform={setTransform}
                previewCanvasRef={previewCanvasRef}
              />

              {/* 批量操作按钮 - 在剩余空间中居中 */}
              <div className="flex-1 flex items-center justify-center">
                <div className="flex gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      // TODO: 实现应用功能，下面两行只是为了解决未应用的lint错误以进行阶段的提交
                      handleApplyCrop();
                      if (isProcessing)
                        console.warn("批量位移功能开发中...");
                    }}
                    type="button"
                    disabled={!completedCrop}
                  >
                    单体应用
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      // TODO: 实现批量裁剪功能
                      console.warn("批量裁剪功能开发中...");
                    }}
                    type="button"
                    disabled={!completedCrop}
                  >
                    一键应用
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={handleDownload}
                    type="button"
                  >
                    下载图像
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
