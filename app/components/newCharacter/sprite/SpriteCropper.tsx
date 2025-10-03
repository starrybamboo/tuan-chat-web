import type { RoleAvatar } from "api";
import type { Crop, PixelCrop } from "react-image-crop";
import type { Transform } from "./TransformControl";
import { canvasPreview } from "@/components/common/uploader/imgCopper/canvasPreview";
import { useDebounceEffect } from "@/components/common/uploader/imgCopper/useDebounceEffect";
import { useApplyCropAvatarMutation, useApplyCropMutation, useUpdateAvatarTransformMutation } from "api/queryHooks";
import { useRef, useState } from "react";
import { ReactCrop } from "react-image-crop";
import { AvatarPreview } from "./AvatarPreview";
import { PerformanceMonitor } from "./PerformanceMonitor";
import { RenderPreview } from "./RenderPreview";
import { TransformControl } from "./TransformControl";
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

  const [displayTransform, setDisplayTransform] = useState<Transform>(() => ({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  }));

  // 当前头像URL状态 - 用于头像模式下的实时预览
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState("");

  // 使用displayTransform作为实际的transform
  const transform = displayTransform;

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
    const { width, height } = e.currentTarget;

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
   * 分为三个阶段：图片加载 -> 图片裁剪 -> 上传操作
   */
  async function handleBatchCropAll() {
    if (!isMutiAvatars || !completedCrop)
      return;

    // 初始化性能监控器
    const monitor = new PerformanceMonitor(`批量裁剪-${isAvatarMode ? "头像" : "立绘"}`);
    monitor.start();

    try {
      setIsProcessing(true);

      console.warn(`开始批量裁剪所有${isAvatarMode ? "头像(从立绘)" : "立绘"}`, {
        avatarCount: filteredAvatars.length,
        transform: isAvatarMode ? undefined : transform,
      });

      // 过滤有效的头像数据
      const validAvatars = filteredAvatars.filter(
        avatar => avatar.spriteUrl && avatar.avatarId && avatar.roleId,
      );

      console.warn(`有效${isAvatarMode ? "头像" : "立绘"}数量: ${validAvatars.length}/${filteredAvatars.length}`);

      // ===== 阶段1: 批量加载所有图片 =====
      const loadedImages = await monitor.measure("阶段1-批量加载图片", async () => {
        console.warn(`[阶段1] 开始批量加载 ${validAvatars.length} 张图片...`);

        const imagePromises = validAvatars.map(async (avatar, i) => {
          const img = new Image();
          img.crossOrigin = "anonymous";

          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load image: ${avatar.spriteUrl}`));
            img.src = avatar.spriteUrl!;
          });

          console.warn(`  ✓ 加载完成 ${i + 1}/${validAvatars.length}: ${avatar.avatarId}`);
          return { avatar, img };
        });

        return await Promise.all(imagePromises);
      });

      console.warn(`[阶段1] 完成! 成功加载 ${loadedImages.length} 张图片`);

      // ===== 阶段2: 批量裁剪所有图片 =====
      const croppedData = await monitor.measure("阶段2-批量裁剪图片", async () => {
        console.warn(`[阶段2] 开始批量裁剪 ${loadedImages.length} 张图片...`);

        const cropPromises = loadedImages.map(async ({ avatar, img }, i) => {
          // 裁剪图片并转换为Blob
          const dataUrl = await getCroppedImageFromImg(img);
          const response = await fetch(dataUrl);
          const blob = await response.blob();

          console.warn(`  ✓ 裁剪完成 ${i + 1}/${loadedImages.length}: ${avatar.avatarId}`);
          return { avatar, blob };
        });

        return await Promise.all(cropPromises);
      });

      console.warn(`[阶段2] 完成! 成功裁剪 ${croppedData.length} 张图片`);

      // ===== 阶段3: 批量上传所有裁剪结果 =====
      await monitor.measure("阶段3-批量上传", async () => {
        console.warn(`[阶段3] 开始批量上传 ${croppedData.length} 张图片...`);

        // 上传操作需要顺序执行以避免服务器压力过大
        for (let i = 0; i < croppedData.length; i++) {
          const { avatar, blob } = croppedData[i];

          if (isAvatarMode) {
            await applyCropAvatarMutation.mutateAsync({
              roleId: avatar.roleId!,
              avatarId: avatar.avatarId!,
              croppedImageBlob: blob,
              currentAvatar: avatar,
            });
          }
          else {
            await applyCropMutation.mutateAsync({
              roleId: avatar.roleId!,
              avatarId: avatar.avatarId!,
              croppedImageBlob: blob,
              transform, // 立绘模式同时应用当前的transform设置
              currentAvatar: avatar,
            });
          }

          console.warn(`  ✓ 上传完成 ${i + 1}/${croppedData.length}: ${avatar.avatarId}`);
        }
      });

      console.warn(`[阶段3] 完成! 成功上传 ${croppedData.length} 张图片`);

      // 打印性能报告
      monitor.printReport(validAvatars.length);
    }
    catch (error) {
      console.error("批量裁剪失败:", error);
      // 即使出错也打印性能报告
      monitor.printReport(filteredAvatars.length);
    }
    finally {
      setIsProcessing(false);
      // 清理性能标记，避免内存泄漏
      monitor.clear();
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
        const dataUrl = await getCroppedImageFromImg(tempImg);

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
                onClick={() => setCurrentSpriteIndex(index)}
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

      {isMutiAvatars && <div className="divider my-0"></div>}

      <div className="flex flex-col lg:flex-row gap-8 justify-center">
        {/* 左侧：原始图片裁剪区域 */}
        <div className="w-full md:w-1/2 p-2 gap-4 flex flex-col items-center">
          <h2 className="text-xl font-bold">裁剪预览</h2>
          <div className="w-full rounded-lg flex items-center justify-center">
            {currentUrl && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={c => setCompletedCrop(c)}
                // 头像模式限制1:1宽高比，立绘模式不限制
                aspect={isAvatarMode ? 1 : undefined}
                minHeight={10}
              >
                <img
                  ref={imgRef}
                  alt="Sprite to crop"
                  src={currentUrl}
                  onLoad={onImageLoad}
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

        {/* 右侧：裁剪预览和控制 */}
        {completedCrop && (
          <div className="w-full lg:w-2/3 p-2 gap-4 flex flex-col items-center">
            <h2 className="text-xl font-bold">
              {isAvatarMode ? "头像预览" : "渲染预览"}
            </h2>
            <div className="w-full h-full bg-info/30 rounded-lg p-4 gap-4 flex flex-col relative">
              {isAvatarMode
                ? (
                    <AvatarPreview
                      previewCanvasRef={previewCanvasRef}
                      currentAvatarUrl={currentAvatarUrl}
                      characterName={characterName}
                      hideTitle={true}
                    />
                  )
                : (
                    <>
                      <RenderPreview
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
                            onClick={handleApplyCrop}
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
                              onClick={handleApplyTransform}
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
                            onClick={handleDownload}
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
                            onClick={handleBatchCropAll}
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
                              onClick={handleBatchApplyTransform}
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
                        </>
                      )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
