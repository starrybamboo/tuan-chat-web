import type { RoleAvatar } from "api";
import type { Crop, PixelCrop } from "react-image-crop";
import type { Transform } from "./TransformControl";
import { canvasPreview } from "@/components/common/uploader/imgCopper/canvasPreview";
import { useDebounceEffect } from "@/components/common/uploader/imgCopper/useDebounceEffect";
import { useApplyCropMutation, useUpdateAvatarTransformMutation } from "api/queryHooks";
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
  // 要裁剪的立绘URL（单体模式）
  spriteUrl?: string;
  // 角色头像列表（批量模式）
  roleAvatars?: RoleAvatar[];
  // 初始立绘索引（批量模式下使用）
  initialSpriteIndex?: number;
  // 角色名称，用于预览
  characterName: string;
  // 对话内容，用于预览
  dialogContent?: string;
  // 裁剪完成回调（单体模式）
  onCropComplete?: (croppedImageUrl: string) => void;
  // 批量裁剪完成回调
  onBatchCropComplete?: (croppedImages: { avatarId: number; croppedImageUrl: string }[]) => void;
  // 关闭组件回调
  onClose?: () => void;
}

// 默认空数组，避免重新渲染
const DEFAULT_AVATARS: RoleAvatar[] = [];

/**
 * 立绘裁剪组件
 * 用于裁剪现有立绘，支持预览和变换控制
 * 支持单体裁剪和批量裁剪模式
 */
export function SpriteCropper({
  spriteUrl,
  roleAvatars = DEFAULT_AVATARS,
  initialSpriteIndex = 0,
  characterName,
  dialogContent = "这是一段示例对话内容。",
  onCropComplete,
  onBatchCropComplete,
}: SpriteCropperProps) {
  // 确定工作模式
  const isBatchMode = roleAvatars.length > 0;
  const spritesAvatars = roleAvatars.filter(avatar => avatar.spriteUrl);

  // 批量模式下的当前立绘索引，使用传入的初始索引
  const [currentSpriteIndex, setCurrentSpriteIndex] = useState(() => {
    // 确保初始索引在有效范围内
    if (isBatchMode && spritesAvatars.length > 0) {
      return Math.max(0, Math.min(initialSpriteIndex, spritesAvatars.length - 1));
    }
    return 0;
  });
  // 批量裁剪的结果存储
  const [batchResults, setBatchResults] = useState<{ avatarId: number; croppedImageUrl: string }[]>([]);
  // 操作模式：'single' | 'batch'
  const [operationMode, setOperationMode] = useState<"single" | "batch">("single");

  // 获取当前立绘URL
  const getCurrentSpriteUrl = () => {
    if (isBatchMode && spritesAvatars.length > 0) {
      return spritesAvatars[currentSpriteIndex]?.spriteUrl || "";
    }
    return spriteUrl || "";
  };

  // 获取当前立绘的avatarId
  const getCurrentAvatarId = () => {
    if (isBatchMode && spritesAvatars.length > 0) {
      return spritesAvatars[currentSpriteIndex]?.avatarId || 0;
    }
    return 0;
  };

  const currentUrl = getCurrentSpriteUrl();
  const currentAvatarId = getCurrentAvatarId();
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

  // Transform更新mutation hook
  const updateTransformMutation = useUpdateAvatarTransformMutation();

  // 裁剪应用mutation hook
  const applyCropMutation = useApplyCropMutation();

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

      // 获取裁剪后的canvas
      const canvas = previewCanvasRef.current;
      if (!canvas) {
        throw new Error("Canvas not found");
      }

      // 将canvas转换为Blob
      const croppedBlob = await canvasToBlob(canvas);

      if (isBatchMode) {
        // 批量模式：上传并更新当前立绘
        const currentAvatar = spritesAvatars[currentSpriteIndex];
        if (!currentAvatar) {
          throw new Error("当前立绘数据不存在");
        }

        console.warn("批量模式：应用裁剪到当前立绘", {
          avatarId: currentAvatar.avatarId,
          currentSpriteIndex,
        });

        if (!currentAvatar.avatarId || !currentAvatar.roleId) {
          throw new Error("当前立绘数据缺少必要字段");
        }

        await applyCropMutation.mutateAsync({
          roleId: currentAvatar.roleId,
          avatarId: currentAvatar.avatarId,
          croppedImageBlob: croppedBlob,
          transform, // 同时应用当前的transform设置
          currentAvatar,
        });

        // 保存结果用于UI显示
        const dataUrl = await getCroppedImageDataUrl();
        const newResult = { avatarId: currentAvatar.avatarId!, croppedImageUrl: dataUrl };
        const updatedResults = [...batchResults];

        // 更新或添加结果
        const existingIndex = updatedResults.findIndex(r => r.avatarId === currentAvatar.avatarId);
        if (existingIndex >= 0) {
          updatedResults[existingIndex] = newResult;
        }
        else {
          updatedResults.push(newResult);
        }

        setBatchResults(updatedResults);

        // 自动切换到下一个立绘（如果有的话）
        if (currentSpriteIndex < spritesAvatars.length - 1) {
          setCurrentSpriteIndex(currentSpriteIndex + 1);
        }
      }
      else {
        // 单体模式：上传并更新立绘
        if (!currentAvatarId) {
          throw new Error("单体模式下缺少avatarId");
        }

        const currentAvatar = roleAvatars.find(avatar => avatar.avatarId === currentAvatarId);
        if (!currentAvatar) {
          throw new Error("找不到当前头像数据");
        }

        if (!currentAvatar.roleId) {
          throw new Error("当前头像数据缺少roleId");
        }

        await applyCropMutation.mutateAsync({
          roleId: currentAvatar.roleId,
          avatarId: currentAvatarId,
          croppedImageBlob: croppedBlob,
          transform, // 同时应用当前的transform设置
          currentAvatar,
        });

        // 获取dataUrl用于回调
        const dataUrl = await getCroppedImageDataUrl();
        onCropComplete?.(dataUrl);
      }
    }
    catch (error) {
      console.error("应用裁剪失败:", error);
    }
    finally {
      setIsProcessing(false);
    }
  }

  /**
   * 将canvas数据转换为Blob
   */
  async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
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

  /**
   * 处理批量裁剪完成
   */
  async function handleBatchComplete() {
    if (isBatchMode && batchResults.length > 0) {
      onBatchCropComplete?.(batchResults);
    }
  }

  /**
   * 处理应用位移（单体模式）
   */
  async function handleApplyTransform() {
    if (!isBatchMode && !currentAvatarId) {
      console.error("单体模式下缺少avatarId");
      return;
    }

    if (isBatchMode && spritesAvatars.length === 0) {
      console.error("批量模式下没有可用的立绘");
      return;
    }

    try {
      setIsProcessing(true);

      const currentAvatar = isBatchMode
        ? spritesAvatars[currentSpriteIndex]
        : roleAvatars.find(avatar => avatar.avatarId === currentAvatarId);

      if (!currentAvatar) {
        console.error("找不到当前头像数据");
        return;
      }

      console.warn("应用Transform到单个头像", {
        avatarId: currentAvatar.avatarId,
        transform,
      });

      await updateTransformMutation.mutateAsync({
        roleId: currentAvatar.roleId!,
        avatarId: currentAvatar.avatarId!,
        transform,
        currentAvatar,
      });

      console.warn("Transform应用成功");
    }
    catch (error) {
      console.error("应用Transform失败:", error);
    }
    finally {
      setIsProcessing(false);
    }
  }

  /**
   * 处理批量应用位移
   */
  async function handleBatchApplyTransform() {
    if (!isBatchMode || spritesAvatars.length === 0) {
      console.error("批量模式下没有可用的立绘");
      return;
    }

    try {
      setIsProcessing(true);

      console.warn("开始批量应用Transform", {
        avatarCount: spritesAvatars.length,
        transform,
      });

      // 批量应用当前transform到所有立绘
      for (const avatar of spritesAvatars) {
        await updateTransformMutation.mutateAsync({
          roleId: avatar.roleId!,
          avatarId: avatar.avatarId!,
          transform,
          currentAvatar: avatar,
        });
      }
    }
    catch (error) {
      console.error("批量应用Transform失败:", error);
    }
    finally {
      setIsProcessing(false);
    }
  }

  /**
   * 获取指定图片的裁剪结果（通用函数）
   */
  async function getCroppedImageFromImg(img: HTMLImageElement): Promise<string> {
    if (!completedCrop) {
      throw new Error("No completed crop");
    }

    // 如果是当前显示的图片，直接使用现有的处理逻辑
    if (imgRef.current && img.src === imgRef.current.src) {
      return await getCroppedImageDataUrl();
    }

    // 对于其他图片，确保尺寸和当前图片一致
    const currentImg = imgRef.current;
    if (!currentImg) {
      throw new Error("No current image reference");
    }

    // 设置临时图片的显示尺寸和当前图片一致
    const tempDisplayWidth = currentImg.width;
    const tempDisplayHeight = currentImg.height;

    // 计算缩放比例
    const scaleToCurrentDisplay = Math.min(
      tempDisplayWidth / img.naturalWidth,
      tempDisplayHeight / img.naturalHeight,
    );

    img.width = img.naturalWidth * scaleToCurrentDisplay;
    img.height = img.naturalHeight * scaleToCurrentDisplay;

    // 创建临时预览canvas
    const tempPreviewCanvas = document.createElement("canvas");

    // 使用canvasPreview处理图片（和当前预览完全相同的逻辑）
    await canvasPreview(
      img,
      tempPreviewCanvas,
      completedCrop,
      1,
      0,
    );

    // 创建最终输出canvas
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const outputCanvas = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
    );
    const outputCtx = outputCanvas.getContext("2d");
    if (!outputCtx) {
      throw new Error("No 2d context");
    }

    // 将预览canvas的内容复制到输出canvas
    outputCtx.drawImage(
      tempPreviewCanvas,
      0,
      0,
      tempPreviewCanvas.width,
      tempPreviewCanvas.height,
      0,
      0,
      outputCanvas.width,
      outputCanvas.height,
    );

    const blob = await outputCanvas.convertToBlob({
      type: "image/png",
    });

    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 应用相同裁剪参数到所有立绘
   */
  async function handleBatchCropAll() {
    if (!isBatchMode || !completedCrop)
      return;

    try {
      setIsProcessing(true);
      const results: { avatarId: number; croppedImageUrl: string }[] = [];

      console.warn("开始批量裁剪所有立绘", {
        avatarCount: spritesAvatars.length,
        transform,
      });

      // 为每个立绘应用相同的裁剪参数并上传
      for (let i = 0; i < spritesAvatars.length; i++) {
        const avatar = spritesAvatars[i];
        if (!avatar.spriteUrl || !avatar.avatarId)
          continue;

        console.warn(`处理立绘 ${i + 1}/${spritesAvatars.length}:`, avatar.avatarId);

        // 创建临时图片元素
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          tempImg.onload = () => resolve();
          tempImg.onerror = () => reject(new Error(`Failed to load image: ${avatar.spriteUrl}`));
          tempImg.src = avatar.spriteUrl!;
        });

        // 使用通用函数获取裁剪结果的dataUrl（用于UI显示）
        const dataUrl = await getCroppedImageFromImg(tempImg);

        // 将dataUrl转换为Blob用于上传
        const response = await fetch(dataUrl);
        const croppedBlob = await response.blob();

        // 检查必要字段
        if (!avatar.roleId) {
          console.error(`立绘 ${i + 1} 缺少roleId，跳过处理`);
          continue;
        }

        // 上传裁剪后的图片并更新头像记录
        await applyCropMutation.mutateAsync({
          roleId: avatar.roleId,
          avatarId: avatar.avatarId,
          croppedImageBlob: croppedBlob,
          transform, // 同时应用当前的transform设置
          currentAvatar: avatar,
        });

        results.push({ avatarId: avatar.avatarId, croppedImageUrl: dataUrl });
      }

      setBatchResults(results);

      // 批量应用后不自动调用回调，让用户手动确认
    }
    catch (error) {
      console.error("批量裁剪失败:", error);
    }
    finally {
      setIsProcessing(false);
    }
  }

  /**
   * 批量下载：将当前裁剪参数应用到所有立绘并下载
   */
  async function handleBatchDownload() {
    if (!isBatchMode || !completedCrop)
      return;

    try {
      setIsProcessing(true);

      // 为每个立绘应用相同的裁剪参数并下载
      for (let i = 0; i < spritesAvatars.length; i++) {
        const avatar = spritesAvatars[i];
        if (!avatar.spriteUrl || !avatar.avatarId)
          continue;

        // 创建临时图片元素
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          tempImg.onload = () => resolve();
          tempImg.onerror = () => reject(new Error(`Failed to load image: ${avatar.spriteUrl}`));
          tempImg.src = avatar.spriteUrl!;
        });

        // 使用通用函数获取裁剪结果
        const dataUrl = await getCroppedImageFromImg(tempImg);

        // 下载当前立绘
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${characterName}-sprite-${i + 1}-cropped.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 添加延迟避免浏览器阻止多次下载
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    catch (error) {
      console.error("批量下载失败:", error);
    }
    finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 批量模式下的立绘选择器 - 移动到分隔线上方 */}
      {isBatchMode && spritesAvatars.length > 1 && (
        <div className="flex w-full justify-between">
          <div className="flex items-center mb-4 gap-4">
            <h1 className="text-xl md:text-2xl font-bold">
              {operationMode === "single" ? "单体模式" : "批量模式"}
              {" "}
              -
              {" "}
              {characterName}
            </h1>
            {/* 模式切换控件 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">单体</span>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={operationMode === "batch"}
                onChange={e => setOperationMode(e.target.checked ? "batch" : "single")}
                disabled={!isBatchMode || isProcessing}
              />
              <span className="text-sm font-medium">批量</span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto justify-center">
            {spritesAvatars.map((avatar, index) => (
              <button
                key={avatar.avatarId}
                type="button"
                onClick={() => setCurrentSpriteIndex(index)}
                className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${index === currentSpriteIndex
                  ? "border-primary"
                  : "border-base-300 hover:border-primary/50"
                }`}
              >
                <img
                  src={avatar.avatarUrl || "/favicon.ico"}
                  alt={`立绘 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="divider my-0"></div>

      <div className="flex flex-col lg:flex-row gap-8 justify-center">
        {/* 左侧：原始图片裁剪区域 */}
        <div className="w-full lg:w-1/2 p-2 gap-4 flex flex-col items-center">
          <h2 className="text-xl font-bold">裁剪预览</h2>
          <div className="w-full rounded-lg flex items-center justify-center">
            {currentUrl && (
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
                  src={currentUrl}
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
          <div className="w-full lg:w-2/3 p-2 gap-4 flex flex-col items-center">
            <h2 className="text-xl font-bold">渲染预览</h2>
            <div className="w-full h-full bg-info/30 rounded-lg p-4 gap-4 flex flex-col relative">
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

              {/* 操作按钮 - 在剩余空间中居中 */}
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col gap-2">
                  {/* 第一行：主要操作按钮 */}
                  <div className="flex gap-2 justify-center">
                    {/* 根据模式显示不同的操作按钮 */}
                    {operationMode === "single"
                      ? (
                          <>
                            <button
                              className="btn btn-accent"
                              onClick={handleApplyCrop}
                              type="button"
                              disabled={!completedCrop || isProcessing || applyCropMutation.isPending}
                            >
                              {(isProcessing || applyCropMutation.isPending)
                                ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  )
                                : (
                                    "应用裁剪"
                                  )}
                            </button>
                            <button
                              className="btn btn-info"
                              onClick={handleApplyTransform}
                              type="button"
                              disabled={isProcessing}
                            >
                              {isProcessing && updateTransformMutation.isPending
                                ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  )
                                : (
                                    "应用位移"
                                  )}
                            </button>
                          </>
                        )
                      : (
                          <>
                            <button
                              className="btn btn-accent"
                              onClick={handleBatchCropAll}
                              type="button"
                              disabled={!completedCrop || isProcessing || applyCropMutation.isPending}
                            >
                              {(isProcessing || applyCropMutation.isPending)
                                ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  )
                                : (
                                    "一键裁剪"
                                  )}
                            </button>
                            <button
                              className="btn btn-info"
                              onClick={handleBatchApplyTransform}
                              type="button"
                              disabled={isProcessing}
                            >
                              {isProcessing && updateTransformMutation.isPending
                                ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  )
                                : (
                                    "一键位移"
                                  )}
                            </button>
                            <button
                              className="btn btn-success"
                              onClick={handleBatchComplete}
                              type="button"
                              disabled={batchResults.length === 0}
                            >
                              完成
                            </button>
                          </>
                        )}
                  </div>

                  {/* 第二行：下载按钮 */}
                  <div className="flex justify-center gap-2">
                    <button
                      className="btn btn-outline"
                      onClick={handleDownload}
                      type="button"
                      disabled={isProcessing}
                    >
                      下载图像
                    </button>

                    {isBatchMode && (
                      <button
                        className="btn btn-outline btn-info"
                        onClick={handleBatchDownload}
                        type="button"
                        disabled={!completedCrop || isProcessing}
                      >
                        {isProcessing
                          ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            )
                          : (
                              "批量下载"
                            )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
