import type { RoleAvatar } from "api";
import type { Crop, PixelCrop } from "react-image-crop";
import type { Transform } from "./TransformControl";

import { canvasPreview, canvasToBlob, getCroppedImageUrl, useDebounceEffect } from "@/utils/imgCropper";
import { useApplyCropAvatarMutation, useApplyCropMutation, useUpdateAvatarTransformMutation } from "api/queryHooks";
import { useEffect, useRef, useState } from "react";
import { ReactCrop } from "react-image-crop";
import { AvatarPreview } from "./AvatarPreview";
import { RenderPreview } from "./RenderPreview";
import { TransformControl } from "./TransformControl";
import { useImageCropWorker } from "./useImageCropWorker";
import { parseTransformFromAvatar } from "./utils";
import "react-image-crop/dist/ReactCrop.css";

/**
 * 立绘裁剪组件的属性接口
 */
interface SpriteCropperProps {
  // 要裁剪的立绘URL（单体模式）
  spriteUrl?: string;
  // 角色头像列表（批量模式）
  roleAvatars: RoleAvatar[];
  // 初始立绘索引（批量模式下使用）
  initialSpriteIndex?: number;
  // 角色名称，用于预览
  characterName: string;
  // 裁剪完成回调（单体模式）
  onCropComplete?: (croppedImageUrl: string) => void;
  // 关闭组件回调
  onClose?: () => void;
  // 裁剪模式：'sprite' | 'avatar'，默认为 'sprite'
  cropMode?: "sprite" | "avatar";
  // 立绘索引变更回调（用于同步外部索引）
  onSpriteIndexChange?: (index: number) => void;
}

/**
 * 立绘裁剪组件
 * 用于裁剪现有立绘，支持预览和变换控制
 * 支持单体裁剪和批量裁剪模式
 * 支持立绘模式和头像模式（从立绘中裁剪头像）
 */
export function SpriteCropper({
  spriteUrl,
  roleAvatars,
  initialSpriteIndex = 0,
  characterName,
  onCropComplete,
  cropMode = "sprite",
  onSpriteIndexChange,
}: SpriteCropperProps) {
  // 确定工作模式
  const isMutiAvatars = roleAvatars.length > 0;
  const isAvatarMode = cropMode === "avatar";

  // 根据裁剪模式过滤头像列表
  const filteredAvatars = roleAvatars.filter(avatar => avatar.spriteUrl);

  // 批量模式下的当前立绘索引，使用传入的初始索引
  const [currentSpriteIndex, setCurrentSpriteIndex] = useState(() => {
    // 确保初始索引在有效范围内
    if (filteredAvatars.length > 0) {
      return Math.max(0, Math.min(initialSpriteIndex, filteredAvatars.length - 1));
    }
    return 0;
  });

  // 当外部 initialSpriteIndex 变化时，同步内部状态
  useEffect(() => {
    if (filteredAvatars.length > 0) {
      const validIndex = Math.max(0, Math.min(initialSpriteIndex, filteredAvatars.length - 1));
      if (validIndex !== currentSpriteIndex) {
        // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
        setCurrentSpriteIndex(validIndex);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpriteIndex, filteredAvatars.length]);

  // 批量裁剪的结果存储
  // 操作模式：'single' | 'batch'
  const [operationMode, setOperationMode] = useState<"single" | "batch">("single");

  // 获取当前立绘URL
  const getCurrentSpriteUrl = () => {
    if (filteredAvatars.length > 0) {
      return filteredAvatars[currentSpriteIndex]?.spriteUrl || "";
    }
    return spriteUrl || "";
  };

  // 获取当前立绘的avatarId
  const getCurrentAvatarId = () => {
    if (filteredAvatars.length > 0) {
      return filteredAvatars[currentSpriteIndex]?.avatarId || 0;
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

  // 加载状态
  const [isProcessing, setIsProcessing] = useState(false);

  // Transform更新mutation hook
  const updateTransformMutation = useUpdateAvatarTransformMutation();

  // 裁剪应用mutation hook - 根据模式选择合适的hook
  const applyCropMutation = useApplyCropMutation();
  const applyCropAvatarMutation = useApplyCropAvatarMutation();

  // 使用 Worker 进行图像裁剪
  const { cropImage, cropImagesWithConcurrency } = useImageCropWorker();

  const [displayTransform, setDisplayTransform] = useState<Transform>(() => ({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  }));

  // 当前头像URL状态 - 用于头像模式下的实时预览
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState("");

  // 添加渲染key用于强制重新渲染
  const [renderKey, setRenderKey] = useState(0);

  // 移动端裁剪弹窗状态
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // 使用displayTransform作为实际的transform
  const transform = displayTransform;

  // 监听操作模式切换和裁剪弹窗关闭，重新绘制 Canvas
  useEffect(() => {
    if (completedCrop && imgRef.current && previewCanvasRef.current) {
      const timeoutId = setTimeout(() => {
        canvasPreview(
          imgRef.current!,
          previewCanvasRef.current!,
          completedCrop,
          1,
          0,
        );

        if (isAvatarMode && previewCanvasRef.current) {
          setCurrentAvatarUrl(previewCanvasRef.current.toDataURL());
        }

        setRenderKey(prev => prev + 1);
      }, 50); // 增加延迟，确保布局完全稳定

      return () => clearTimeout(timeoutId);
    }
  }, [operationMode, completedCrop, isAvatarMode, isCropModalOpen]);

  /**
   * 处理应用变换（单体模式）
   */
  async function handleApplyTransform() {
    if (!isMutiAvatars && !currentAvatarId) {
      console.error("单体模式下缺少avatarId");
      return;
    }

    if (isMutiAvatars && filteredAvatars.length === 0) {
      console.error("批量模式下没有可用的头像");
      return;
    }

    try {
      setIsProcessing(true);

      const currentAvatar = isMutiAvatars
        ? filteredAvatars[currentSpriteIndex]
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
   * 处理批量应用变换
   */
  async function handleBatchApplyTransform() {
    if (!isMutiAvatars || filteredAvatars.length === 0) {
      console.error("批量模式下没有可用的头像");
      return;
    }

    try {
      setIsProcessing(true);

      console.warn("开始批量应用Transform", {
        avatarCount: filteredAvatars.length,
        transform,
      });

      // 批量应用当前transform到所有头像
      for (const avatar of filteredAvatars) {
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
   * 图片加载完成后的处理函数
   * 设置初始裁剪区域
   */
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    // 使用 naturalWidth/naturalHeight 获取图片原始尺寸，因为隐藏图片的 width/height 可能为 0
    const width = e.currentTarget.naturalWidth;
    const height = e.currentTarget.naturalHeight;

    // 根据裁剪模式设置不同的初始裁剪区域
    if (isAvatarMode) {
      // 头像模式：使用1:1宽高比
      const size = Math.min(width, height);
      const x = (width - size) / 2;
      const y = (height - size) / 2;
      const newCrop = {
        unit: "%" as const,
        x: (x / width) * 100,
        y: (y / height) * 100,
        width: (size / width) * 100,
        height: (size / height) * 100,
      };
      setCrop(newCrop);
      setCompletedCrop({
        unit: "px",
        x,
        y,
        width: size,
        height: size,
      });
    }
    else {
      // 立绘模式：覆盖整个原图
      const newCrop = {
        unit: "%" as const,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      };
      setCrop(newCrop);
      setCompletedCrop({
        unit: "px",
        x: 0,
        y: 0,
        width,
        height,
      });
    }

    // 在图片加载完成时设置completedCrop后立即绘制到预览Canvas
    const initialCompletedCrop: PixelCrop = isAvatarMode
      ? {
          unit: "px",
          x: (width - Math.min(width, height)) / 2,
          y: (height - Math.min(width, height)) / 2,
          width: Math.min(width, height),
          height: Math.min(width, height),
        }
      : {
          unit: "px",
          x: 0,
          y: 0,
          width,
          height,
        };

    if (imgRef.current && previewCanvasRef.current) {
      canvasPreview(
        imgRef.current,
        previewCanvasRef.current,
        initialCompletedCrop, // 使用代表全图的 crop 对象
        1,
        0,
      );

      // 在头像模式下，初始化头像URL状态
      if (isAvatarMode) {
        // 延迟一小段时间确保canvas已经更新
        setTimeout(() => {
          if (previewCanvasRef.current) {
            setCurrentAvatarUrl(previewCanvasRef.current.toDataURL());
          }
        }, 50);
      }
    }

    // 从当前头像数据中解析并设置Transform（仅立绘模式需要）
    if (!isAvatarMode) {
      const currentSprite = filteredAvatars[currentSpriteIndex];
      if (currentSprite) {
        const newTransform = parseTransformFromAvatar(currentSprite);
        setDisplayTransform(newTransform);
      }
    }
  }

  /**
   * 将Img数据转换为Blob
   * 使用 Web Worker 优化,将图像处理转移到后台线程
   */
  async function getCroppedImageBlobFromImg(img: HTMLImageElement): Promise<Blob> {
    if (!completedCrop) {
      throw new Error("No completed crop");
    }

    // 如果是当前显示的图片，直接使用现有的处理逻辑
    if (imgRef.current && img.src === imgRef.current.src) {
      // 直接用预览canvas导出blob
      if (!previewCanvasRef.current)
        throw new Error("No preview canvas");
      return await canvasToBlob(previewCanvasRef.current);
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

    // 使用 Worker 在后台线程处理图像裁剪
    try {
      const blob = await cropImage({
        img,
        crop: completedCrop,
        scale: 1,
        rotate: 0,
      });
      return blob;
    }
    catch (error) {
      console.error("Worker 裁剪失败，回退到主线程处理:", error);

      // 回退方案：在主线程使用 OffscreenCanvas
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const outputCanvas = new OffscreenCanvas(
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
      );

      await canvasPreview(
        img,
        outputCanvas,
        completedCrop,
        1,
        0,
      );

      return await outputCanvas.convertToBlob({
        type: "image/png",
      });
    }
  }

  /**
   * 获取指定图片的裁剪结果（通用函数）
   */
  async function getCroppedImageUrlFromImg(img: HTMLImageElement): Promise<string> {
    const blob = await getCroppedImageBlobFromImg(img);
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
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

        // 在头像模式下，更新头像URL状态以实现实时预览
        if (isAvatarMode) {
          // 延迟一小段时间确保canvas已经更新
          const timeoutId = setTimeout(() => {
            if (previewCanvasRef.current) {
              setCurrentAvatarUrl(previewCanvasRef.current.toDataURL());
            }
          }, 50);
          return () => clearTimeout(timeoutId);
        }
      }
    },
    100,
    [completedCrop, isAvatarMode],
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
    return await getCroppedImageUrl(image, previewCanvas, completedCrop);
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

      // 1. 统一获取 currentAvatar (处理第一个差异点)
      // ----------------------------------------------------
      let currentAvatar: RoleAvatar | undefined;

      if (isMutiAvatars) { // 假设 isBatchMode 重命名为 isMutiAvatars
        currentAvatar = filteredAvatars[currentSpriteIndex];
      }
      else {
        currentAvatar = roleAvatars.find(avatar => avatar.avatarId === currentAvatarId);
      }

      // 2. 执行共同的校验和核心逻辑
      // ----------------------------------------------------
      if (!currentAvatar) {
        throw new Error("找不到当前头像数据");
      }
      if (!currentAvatar.roleId || !currentAvatar.avatarId) {
        throw new Error("当前头像数据缺少必要字段 (roleId or avatarId)");
      }

      const canvas = previewCanvasRef.current;
      if (!canvas) {
        throw new Error("Canvas not found");
      }
      const croppedBlob = await canvasToBlob(canvas);

      // --- 共同的 Mutation 调用逻辑 ---
      if (isAvatarMode) {
        await applyCropAvatarMutation.mutateAsync({
          roleId: currentAvatar.roleId,
          avatarId: currentAvatar.avatarId,
          croppedImageBlob: croppedBlob,
          currentAvatar,
        });
      }
      else {
        await applyCropMutation.mutateAsync({
          roleId: currentAvatar.roleId,
          avatarId: currentAvatar.avatarId,
          croppedImageBlob: croppedBlob,
          transform, // 立绘模式同时应用当前的transform设置
          currentAvatar,
        });
      }

      // --- 共同的回调逻辑 ---
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

  /**
   * 应用相同裁剪参数到所有头像/立绘
   * 优化版本：并行处理 + 并发控制
   */
  async function handleBatchCropAll() {
    if (!isMutiAvatars || !completedCrop)
      return;

    const MAX_CONCURRENCY = 8; // 最大并发数

    try {
      setIsProcessing(true);

      console.warn(`开始批量裁剪 ${filteredAvatars.length} 张${isAvatarMode ? "头像" : "立绘"}（最大并发:${MAX_CONCURRENCY}）`);

      // 阶段1：加载图片（并发控制）
      const results = await cropImagesWithConcurrency(
        filteredAvatars,
        MAX_CONCURRENCY,
        async (avatar, index) => {
          const imageUrl = avatar.spriteUrl;
          if (!imageUrl || !avatar.avatarId)
            return null;

          console.warn(`加载 ${index + 1}/${filteredAvatars.length}`);

          const tempImg = new Image();
          tempImg.crossOrigin = "anonymous";

          await new Promise<void>((resolve, reject) => {
            tempImg.onload = () => resolve();
            tempImg.onerror = () => reject(new Error(`Failed to load: ${imageUrl}`));
            tempImg.src = imageUrl!;
          });

          return { avatar, img: tempImg, index };
        },
      );

      const loadedImages = results.filter(Boolean);

      // 阶段2：裁剪图片（并发控制）
      console.warn(`阶段1加载完成，共 ${loadedImages.length} 张图片`);

      console.warn("开始裁剪图片blob");
      const cropResults = await cropImagesWithConcurrency(
        loadedImages,
        MAX_CONCURRENCY,
        async (item: any, _) => {
          if (!item) {
            console.warn("跳过空项");
            return null;
          }

          try {
            const croppedBlob = await getCroppedImageBlobFromImg(item.img);
            console.warn(`裁剪完成 (${item.index + 1}/${loadedImages.length})`);
            return { ...item, croppedBlob };
          }
          catch (error) {
            console.error(`裁剪失败 (${item.index + 1}):`, error);
            return null;
          }
        },
      );

      const croppedResults = cropResults.filter(Boolean);
      const successCount = croppedResults.length;
      console.warn(`裁剪完成，成功 ${successCount}/${loadedImages.length} 张`);

      // 阶段3：上传结果（并发控制）
      console.warn(`进入上传阶段，待上传 ${croppedResults.length} 张图片`);

      if (croppedResults.length === 0) {
        console.error("没有可上传的图片，跳过上传阶段");
        return;
      }

      console.warn("开始上传图片");
      const uploadResults = await cropImagesWithConcurrency(
        croppedResults,
        MAX_CONCURRENCY,
        async (item: any, idx: number) => {
          if (!item || !item.avatar.roleId)
            return null;

          try {
            if (isAvatarMode) {
              await applyCropAvatarMutation.mutateAsync({
                roleId: item.avatar.roleId,
                avatarId: item.avatar.avatarId!,
                croppedImageBlob: item.croppedBlob,
                currentAvatar: item.avatar,
              });
            }
            else {
              await applyCropMutation.mutateAsync({
                roleId: item.avatar.roleId,
                avatarId: item.avatar.avatarId!,
                croppedImageBlob: item.croppedBlob,
                transform,
                currentAvatar: item.avatar,
              });
            }
            console.warn(`上传完成 (${idx + 1}/${croppedResults.length})`);
            return true;
          }
          catch (error) {
            console.error(`上传失败 (${idx + 1}):`, error);
            return false;
          }
        },
      );

      const uploadSuccessCount = uploadResults.filter(Boolean).length;
      console.warn(`上传阶段完成，成功 ${uploadSuccessCount}/${croppedResults.length} 张`);
    }
    catch (error) {
      console.error("批量裁剪失败:", error);
    }
    finally {
      setIsProcessing(false);
    }
  }

  /**
   * 批量下载：将当前裁剪参数应用到所有头像/立绘并下载
   */
  async function handleBatchDownload() {
    if (!isMutiAvatars || !completedCrop)
      return;

    try {
      setIsProcessing(true);

      // 为每个头像/立绘应用相同的裁剪参数并下载
      for (let i = 0; i < filteredAvatars.length; i++) {
        const avatar = filteredAvatars[i];
        // 头像模式下从立绘裁剪头像，立绘模式下处理立绘
        const imageUrl = avatar.spriteUrl;
        if (!imageUrl || !avatar.avatarId)
          continue;

        // 创建临时图片元素
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          tempImg.onload = () => resolve();
          tempImg.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
          tempImg.src = imageUrl!;
        });

        // 使用通用函数获取裁剪结果
        const dataUrl = await getCroppedImageUrlFromImg(tempImg);

        // 下载当前头像/立绘
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${characterName}-${isAvatarMode ? "avatar" : "sprite"}-${i + 1}-cropped.png`;
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
      {/* 批量模式下的头像/立绘选择器 - 移动到分隔线上方 */}
      {isMutiAvatars && filteredAvatars.length > 1 && (
        <div className="flex w-full justify-between">
          <div className="flex items-center mb-4 gap-4">
            <h1 className="text-xl md:text-2xl font-bold">
              {operationMode === "single" ? "单体模式" : "批量模式"}
              {isAvatarMode ? " - 从立绘裁剪头像" : " - 立绘裁剪"}
            </h1>
            <div className="border-l-2 border-primary h-6 mx-2"></div>
            {/* 模式切换控件 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">单体</span>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={operationMode === "batch"}
                onChange={e => setOperationMode(e.target.checked ? "batch" : "single")}
                disabled={!isMutiAvatars || isProcessing}
              />
              <span className="text-sm font-bold">批量</span>
            </div>
          </div>
          <div
            className="gap-2 overflow-x-auto justify-start max-w-[96px] md:max-w-[416px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50 hidden md:flex"
            onWheel={(e) => {
              // 防止页面滚动
              e.preventDefault();
              // 横向滚动，减小滚动幅度
              const container = e.currentTarget;
              container.scrollLeft += e.deltaY * 0.3;
            }}
          >
            {filteredAvatars.map((avatar, index) => (
              <button
                key={avatar.avatarId}
                type="button"
                onClick={() => {
                  setCurrentSpriteIndex(index);
                  onSpriteIndexChange?.(index);
                }}
                className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${index === currentSpriteIndex
                  ? "border-primary"
                  : "border-base-300 hover:border-primary/50"
                }`}
              >
                <img
                  src={avatar.avatarUrl || "/favicon.ico"}
                  alt={`${isAvatarMode ? "头像" : "立绘"} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {isMutiAvatars && filteredAvatars.length > 1 && <div className="divider my-0"></div>}

      {/* 隐藏的图片元素，用于移动端绑定 imgRef 和触发 onImageLoad */}
      {currentUrl && (
        <img
          ref={imgRef}
          alt="Hidden sprite for processing"
          src={currentUrl}
          onLoad={onImageLoad}
          style={{ display: "none" }}
          crossOrigin="anonymous"
        />
      )}

      <div className="flex flex-col lg:flex-row gap-8 justify-center">
        {/* 左侧：原始图片裁剪区域 - 移动端隐藏，通过弹窗显示 */}
        <div className="w-full md:w-1/2 p-2 gap-4 flex-col items-center order-2 md:order-1 hidden md:flex">
          <h2 className="text-xl font-bold hidden md:block">裁剪预览</h2>
          <div className="w-full rounded-lg flex items-center justify-center">
            {currentUrl && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(_, percentCrop) => {
                  // 使用百分比裁剪计算基于原始图片尺寸的像素值
                  if (imgRef.current) {
                    const naturalWidth = imgRef.current.naturalWidth;
                    const naturalHeight = imgRef.current.naturalHeight;
                    const pixelCrop: PixelCrop = {
                      unit: "px",
                      x: (percentCrop.x / 100) * naturalWidth,
                      y: (percentCrop.y / 100) * naturalHeight,
                      width: (percentCrop.width / 100) * naturalWidth,
                      height: (percentCrop.height / 100) * naturalHeight,
                    };
                    setCompletedCrop(pixelCrop);
                  }
                }}
                // 头像模式限制1:1宽高比，立绘模式不限制
                aspect={isAvatarMode ? 1 : undefined}
                minHeight={10}
              >
                <img
                  alt="Sprite to crop"
                  src={currentUrl}
                  style={{
                    maxHeight: "70vh",
                    minWidth: "20vh",
                  }}
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            )}
          </div>
        </div>

        {/* 右侧：裁剪预览和控制 - 移动端放上面 */}
        {completedCrop && (
          <div className="w-full lg:w-2/3 p-2 gap-4 flex flex-col items-center order-1 md:order-2">
            <h2 className="text-xl font-bold hidden md:block">
              {isAvatarMode ? "头像预览" : "渲染预览"}
            </h2>
            {/* 移动端点击提示 */}
            <div
              className="w-full h-full bg-info/30 rounded-lg p-4 gap-4 flex flex-col relative cursor-pointer md:cursor-default"
              onClick={() => {
                // 仅移动端点击时打开弹窗
                if (window.innerWidth < 768) {
                  setIsCropModalOpen(true);
                }
              }}
            >
              {/* 移动端点击提示 */}
              <div className="absolute top-6 right-6 text-xs text-base-content/50 z-10 md:hidden">
                点击画布调整裁剪
              </div>
              {isAvatarMode
                ? (
                    <AvatarPreview
                      key={`avatar-${renderKey}`}
                      previewCanvasRef={previewCanvasRef}
                      currentAvatarUrl={currentAvatarUrl}
                      characterName={characterName}
                      hideTitle={true}
                    />
                  )
                : (
                    <>
                      <RenderPreview
                        key={`render-${renderKey}`}
                        previewCanvasRef={previewCanvasRef}
                        transform={transform}
                        characterName={characterName}
                        dialogContent="这是一段示例对话内容。"
                      />

                      <TransformControl
                        transform={transform}
                        setTransform={setDisplayTransform}
                        previewCanvasRef={previewCanvasRef}
                      />
                    </>
                  )}

              {/* 操作按钮区 */}
              <div className="flex-1 flex items-center justify-center">
                <div className="flex gap-2 justify-center">
                  {operationMode === "single"
                    ? (
                        <>
                          <button
                            className="btn btn-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyCrop();
                            }}
                            type="button"
                            disabled={!completedCrop || isProcessing || (isAvatarMode ? applyCropAvatarMutation.isPending : applyCropMutation.isPending)}
                          >
                            {(isProcessing || (isAvatarMode ? applyCropAvatarMutation.isPending : applyCropMutation.isPending))
                              ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                )
                              : (
                                  "应用裁剪"
                                )}
                          </button>
                          {!isAvatarMode && (
                            <button
                              className="btn btn-info"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyTransform();
                              }}
                              type="button"
                              disabled={isProcessing}
                            >
                              {isProcessing && updateTransformMutation.isPending
                                ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  )
                                : (
                                    "应用变换"
                                  )}
                            </button>
                          )}
                          <button
                            className="btn btn-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload();
                            }}
                            type="button"
                            disabled={isProcessing}
                          >
                            下载图像
                          </button>
                        </>
                      )
                    : (
                        <>
                          <button
                            className="btn btn-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBatchCropAll();
                            }}
                            type="button"
                            disabled={!completedCrop || isProcessing || (isAvatarMode ? applyCropAvatarMutation.isPending : applyCropMutation.isPending)}
                          >
                            {(isProcessing || (isAvatarMode ? applyCropAvatarMutation.isPending : applyCropMutation.isPending))
                              ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                )
                              : (
                                  "一键裁剪"
                                )}
                          </button>
                          {!isAvatarMode && (
                            <button
                              className="btn btn-info"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBatchApplyTransform();
                              }}
                              type="button"
                              disabled={isProcessing}
                            >
                              {isProcessing && updateTransformMutation.isPending
                                ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  )
                                : (
                                    "一键变换"
                                  )}
                            </button>
                          )}
                          <button
                            className="btn btn-outline btn-info"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBatchDownload();
                            }}
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
                        </>
                      )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 移动端裁剪弹窗 */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 md:hidden">
          <div className="bg-base-100 rounded-lg p-4 m-4 max-h-[90vh] overflow-auto w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">调整裁剪区域</h3>
              <button
                type="button"
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setIsCropModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-center">
              {currentUrl && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(_, percentCrop) => {
                    // 使用百分比裁剪计算基于原始图片尺寸的像素值
                    if (imgRef.current) {
                      const naturalWidth = imgRef.current.naturalWidth;
                      const naturalHeight = imgRef.current.naturalHeight;
                      const pixelCrop: PixelCrop = {
                        unit: "px",
                        x: (percentCrop.x / 100) * naturalWidth,
                        y: (percentCrop.y / 100) * naturalHeight,
                        width: (percentCrop.width / 100) * naturalWidth,
                        height: (percentCrop.height / 100) * naturalHeight,
                      };
                      setCompletedCrop(pixelCrop);
                    }
                  }}
                  aspect={isAvatarMode ? 1 : undefined}
                  minHeight={10}
                >
                  <img
                    alt="Sprite to crop modal"
                    src={currentUrl}
                    style={{
                      maxHeight: "60vh",
                    }}
                    crossOrigin="anonymous"
                  />
                </ReactCrop>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsCropModalOpen(false)}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
