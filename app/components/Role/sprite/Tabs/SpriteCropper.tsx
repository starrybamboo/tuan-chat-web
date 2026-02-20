import type { RoleAvatar } from "api";
import type { PixelCrop } from "react-image-crop";
import type { PreviewAnchorPosition } from "../../Preview/previewAnchor";
import type { Transform } from "../TransformControl";
import type { ImageLoadContext } from "@/utils/imgCropper";
import { useApplyCropAvatarMutation, useApplyCropMutation, useUpdateAvatarTransformMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ReactCrop } from "react-image-crop";
import { isMobileScreen } from "@/utils/getScreenSize";
import {
  canvasPreview,
  canvasToBlob,
  createTopCenteredSquareCrop,
  useCropPreview,
} from "@/utils/imgCropper";
import { AvatarPreview } from "../../Preview/AvatarPreview";
import { RenderPreview } from "../../Preview/RenderPreview";
import { TransformControl } from "../TransformControl";
import { getEffectiveSpriteUrl, parseTransformFromAvatar } from "../utils";
import { useImageCropWorker } from "../worker/useImageCropWorker";
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
  // 左侧列表的多选索引（从外部传入）
  selectedIndices?: Set<number>;
  // 是否处于多选模式（从外部传入）
  isMultiSelectMode?: boolean;
}

/**
 * 立绘裁剪组件
 * 用于裁剪现有立绘，支持预览和变换控制
 * 支持单体裁剪和批量裁剪模式
 * 支持立绘模式和头像模式（从立绘中裁剪头像）
 */
// 默认空集合，避免在默认参数中使用 new 表达式
const EMPTY_SET = new Set<number>();

export function SpriteCropper({
  spriteUrl,
  roleAvatars,
  initialSpriteIndex = 0,
  characterName,
  onCropComplete,
  cropMode = "sprite",
  onSpriteIndexChange,
  selectedIndices = EMPTY_SET,
  isMultiSelectMode = false,
}: SpriteCropperProps) {
  const isMobile = isMobileScreen();
  const actionButtonSizeClass = isMobile ? "btn-sm" : "";

  // 确定工作模式
  const isMutiAvatars = roleAvatars.length > 0;
  const isAvatarMode = cropMode === "avatar";

  // 裁剪源：默认使用 spriteUrl，可切换为 originUrl（如果存在）
  const [sourceMode, setSourceMode] = useState<"sprite" | "origin">("sprite");

  // 过滤头像列表：无立绘时允许使用头像作为默认立绘；仍保留 originUrl 作为“原图”裁剪源
  const filteredAvatars = roleAvatars.filter(avatar => Boolean(getEffectiveSpriteUrl(avatar)) || Boolean(avatar.originUrl));
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
        setCurrentSpriteIndex(validIndex);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpriteIndex, filteredAvatars.length]);

  // 操作模式：根据外部多选状态自动确定
  // 如果处于多选模式且选中了多个头像，则为批量模式
  const operationMode = isMultiSelectMode && selectedIndices.size > 1 ? "batch" : "single";
  const selectedAvatarIndices = Array.from(selectedIndices)
    .filter(index => index >= 0 && index < filteredAvatars.length)
    .sort((a, b) => a - b);
  const isBatchMode = operationMode === "batch" && selectedAvatarIndices.length > 0;
  const currentSelectedPosition = selectedAvatarIndices.indexOf(currentSpriteIndex);
  const hasPrevSelected = currentSelectedPosition > 0;
  const hasNextSelected = currentSelectedPosition >= 0 && currentSelectedPosition < selectedAvatarIndices.length - 1;

  useEffect(() => {
    if (!isBatchMode)
      return;
    if (currentSelectedPosition === -1) {
      const nextIndex = selectedAvatarIndices[0];
      setCurrentSpriteIndex(nextIndex);
      onSpriteIndexChange?.(nextIndex);
    }
  }, [isBatchMode, currentSelectedPosition, selectedAvatarIndices, onSpriteIndexChange]);

  const currentSourceAvatar = filteredAvatars.length > 0 ? filteredAvatars[currentSpriteIndex] : undefined;
  const canUseOriginForCurrent = !!currentSourceAvatar?.originUrl;

  // 如果当前头像没有 originUrl，则自动回退到 sprite 模式
  useEffect(() => {
    if (sourceMode === "origin" && !canUseOriginForCurrent) {
      setSourceMode("sprite");
    }
  }, [sourceMode, canUseOriginForCurrent]);

  const getAvatarSourceUrl = useCallback((avatar?: RoleAvatar): string => {
    if (!avatar)
      return "";
    if (sourceMode === "origin" && avatar.originUrl)
      return avatar.originUrl;
    return getEffectiveSpriteUrl(avatar) || avatar.originUrl || "";
  }, [sourceMode]);

  // 获取当前裁剪源 URL
  const getCurrentSourceUrl = () => {
    if (filteredAvatars.length > 0) {
      return getAvatarSourceUrl(filteredAvatars[currentSpriteIndex]);
    }
    return spriteUrl || "";
  };

  const handleSelectedSwitch = useCallback((direction: "prev" | "next") => {
    if (!isBatchMode)
      return;
    if (currentSelectedPosition === -1)
      return;
    const offset = direction === "prev" ? -1 : 1;
    const nextPosition = currentSelectedPosition + offset;
    const nextIndex = selectedAvatarIndices[nextPosition];
    if (nextIndex == null)
      return;
    setCurrentSpriteIndex(nextIndex);
    onSpriteIndexChange?.(nextIndex);
  }, [isBatchMode, currentSelectedPosition, selectedAvatarIndices, onSpriteIndexChange]);

  // 获取当前立绘的avatarId
  const getCurrentAvatarId = () => {
    if (filteredAvatars.length > 0) {
      return filteredAvatars[currentSpriteIndex]?.avatarId || 0;
    }
    return 0;
  };

  const currentUrl = getCurrentSourceUrl();
  const currentAvatarId = getCurrentAvatarId();

  // 用于标识当前“切换到哪张图”的稳定 key：切换时立刻让预览进入不可见状态，避免中间帧闪烁
  const spriteSwitchKey = isMutiAvatars
    ? `avatar:${filteredAvatars[currentSpriteIndex]?.avatarId ?? currentSpriteIndex}:source:${sourceMode}`
    : `url:${currentUrl}:source:${sourceMode}`;
  const latestSwitchKeyRef = useRef<string>(spriteSwitchKey);
  const lastResetSourceUrlRef = useRef<string | null>(null);
  const [previewReadyKey, setPreviewReadyKey] = useState<string>("");
  const isPreviewReady = previewReadyKey === spriteSwitchKey;

  useEffect(() => {
    latestSwitchKeyRef.current = spriteSwitchKey;
  }, [spriteSwitchKey]);

  // 加载状态 - 分离不同操作的loading״̬
  const [isCropping, setIsCropping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  // Transform更新mutation hook
  const updateTransformMutation = useUpdateAvatarTransformMutation();

  // 裁剪应用mutation hook - 根据模式选择合适的hook
  const applyCropMutation = useApplyCropMutation();
  const applyCropAvatarMutation = useApplyCropAvatarMutation();

  // 统一的处理中状态：任何操作进行时都为true，用于禁用所有按钮
  const isProcessing = isCropping || isDownloading || isTransforming;

  // 使用 Worker 进行图像裁剪
  const { cropImage, cropImagesWithConcurrency } = useImageCropWorker();

  const [displayTransform, setDisplayTransform] = useState<Transform>(() => ({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  }));
  const [previewAnchorPosition, setPreviewAnchorPosition] = useState<PreviewAnchorPosition>("center");

  // 添加渲染key用于强制重新渲染
  const [renderKey, setRenderKey] = useState(0);

  // 移动端裁剪弹窗状态
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // 使用displayTransform作为实际的transform
  const transform = displayTransform;

  // 图片加载后的扩展处理：解析 Transform（仅立绘模式需要）
  const handleImageLoadExtend = useCallback((_e: React.SyntheticEvent<HTMLImageElement>, _context: ImageLoadContext) => {
    if (!isAvatarMode) {
      const currentSprite = filteredAvatars[currentSpriteIndex];
      if (currentSprite) {
        const newTransform = parseTransformFromAvatar(currentSprite);
        setDisplayTransform(newTransform);
      }
    }
  }, [isAvatarMode, filteredAvatars, currentSpriteIndex]);

  // 使用 useCropPreview 管理裁剪状态
  const {
    imgRef,
    previewCanvasRef,
    crop,
    completedCrop,
    previewDataUrl: currentAvatarUrl,
    onImageLoad,
    onCropChange,
    onCropComplete: handleCropComplete,
    reset: resetCropState,
  } = useCropPreview({
    mode: useCallback(() => isAvatarMode ? "avatar" : "sprite", [isAvatarMode]),
    initialCrop: useCallback(({ width, height, mode }: { width: number; height: number; mode: "avatar" | "sprite" }) => {
      if (mode !== "avatar")
        return undefined;
      return createTopCenteredSquareCrop(width, height);
    }, []),
    onImageLoadExtend: handleImageLoadExtend,
    // 让首次绘制延后一帧：给外部状态（如 transform）留出提交时间，避免“新画布 + 旧 transform”的中间帧
    deferInitialPreviewDraw: true,
    onPreviewUpdate: useCallback(() => {
      // 只接受“最新切换目标”的预览更新，避免快速切换导致旧回调把预览误标记为 ready
      if (latestSwitchKeyRef.current === spriteSwitchKey) {
        setPreviewReadyKey(spriteSwitchKey);
      }
    }, [spriteSwitchKey]),
  });

  // 切换裁剪源/图片时重置裁剪状态，避免沿用旧的 crop 尺寸导致“看起来没切换”
  useLayoutEffect(() => {
    // 首次挂载不重置，避免与初始化 onLoad 竞争导致 completedCrop 被清空。
    if (lastResetSourceUrlRef.current === null) {
      lastResetSourceUrlRef.current = currentUrl;
      return;
    }

    if (lastResetSourceUrlRef.current === currentUrl) {
      return;
    }

    lastResetSourceUrlRef.current = currentUrl;
    resetCropState();
    setPreviewReadyKey("");
  }, [currentUrl, resetCropState]);

  // 切换图片时立刻让预览不可见（不依赖 effect），等新预览绘制完成后再显示
  // 这里不需要显式清空 previewReadyKey：isPreviewReady 会因 key 不一致立即变为 false

  // 监听操作模式切换和裁剪弹窗关闭，重新绘制 Canvas
  useLayoutEffect(() => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current)
      return;

    // 等布局/样式应用后再画，避免出现“新布局 + 旧画面/空白”闪烁
    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        canvasPreview(
          imgRef.current!,
          previewCanvasRef.current!,
          completedCrop,
          1,
          0,
        );

        setRenderKey(prev => prev + 1);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [operationMode, completedCrop, isAvatarMode, isCropModalOpen, imgRef, previewCanvasRef]);

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
      setIsTransforming(true);

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
      setIsTransforming(false);
    }
  }

  /**
   * 处理批量应用变换
   */

  const isCanvasReady = useCallback(() => {
    const img = imgRef.current;
    const canvas = previewCanvasRef.current;
    return !!(
      img
      && canvas
      && img.width > 0
      && img.height > 0
      && canvas.width > 0
      && canvas.height > 0
    );
  }, [imgRef, previewCanvasRef]);

  const waitForPreviewReady = useCallback(async (timeoutMs = 2000): Promise<boolean> => {
    if (isPreviewReady && isCanvasReady())
      return true;

    const start = performance.now();
    return await new Promise<boolean>((resolve) => {
      const tick = () => {
        if (isPreviewReady && isCanvasReady())
          return resolve(true);
        if (performance.now() - start >= timeoutMs)
          return resolve(false);
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }, [isPreviewReady, isCanvasReady]);

  /**
   * 将Img数据转换为Blob
   * 使用 Web Worker 优化,将图像处理转移到后台线程
   */
  async function getCroppedImageBlobFromImg(
    img: HTMLImageElement,
    options?: {
      crop?: PixelCrop;
      displaySize?: { width: number; height: number };
    },
  ): Promise<Blob> {
    const cropToUse = options?.crop ?? completedCrop;
    if (!cropToUse) {
      throw new Error("No completed crop");
    }

    // 如果是当前显示的图片，且没有覆盖 crop，则直接使用现有的预览 canvas
    if (!options?.crop && imgRef.current && img.src === imgRef.current.src) {
      if (!previewCanvasRef.current)
        throw new Error("No preview canvas");
      if (previewCanvasRef.current.width === 0 || previewCanvasRef.current.height === 0) {
        throw new Error("Preview canvas has zero size");
      }
      return await canvasToBlob(previewCanvasRef.current);
    }

    const currentImg = imgRef.current;
    const tempDisplayWidth = options?.displaySize?.width ?? currentImg?.width ?? 0;
    const tempDisplayHeight = options?.displaySize?.height ?? currentImg?.height ?? 0;
    if (!tempDisplayWidth || !tempDisplayHeight) {
      throw new Error("Preview image size is 0");
    }

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
        crop: cropToUse,
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
        cropToUse.width * scaleX,
        cropToUse.height * scaleY,
      );

      await canvasPreview(
        img,
        outputCanvas,
        cropToUse,
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

  /**
   * 处理下载裁剪图片
   */
  async function handleDownload() {
    try {
      setIsDownloading(true);
      const canvas = previewCanvasRef.current;
      if (!canvas || !completedCrop) {
        throw new Error("Canvas not ready");
      }
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);

      // 创建下载链接
      const a = document.createElement("a");
      a.href = url;
      a.download = `${characterName}-sprite-cropped.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    catch (error) {
      console.error("下载失败:", error);
    }
    finally {
      setIsDownloading(false);
    }
  }

  /**
   * 处理应用裁剪
   * @param applyTransform 是否同时应用变换（仅立绘模式有效）
   */
  async function handleApplyCrop(applyTransform: boolean = false) {
    try {
      setIsCropping(true);

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
          transform: applyTransform ? transform : undefined, // 根据参数决定是否应用transform
          currentAvatar,
        });
      }

      // --- 共同的回调逻辑 ---
      const blob = await canvasToBlob(canvas);
      const dataUrl = URL.createObjectURL(blob);
      onCropComplete?.(dataUrl);
    }
    catch (error) {
      console.error("应用裁剪失败:", error);
    }
    finally {
      setIsCropping(false);
    }
  }

  /**
   * 应用相同裁剪参数到选中的头像/立绘
   * 优化版本：并行处理 + 并发控制
   * @param applyTransform 是否同时应用变换（仅立绘模式有效）
   */
  async function handleBatchCropAll(applyTransform: boolean = false) {
    if (!isMutiAvatars || !completedCrop)
      return;

    const MAX_CONCURRENCY = 8; // 最大并发数
    const MAX_LOAD_ATTEMPTS = 3; // 图片加载最大尝试次数（含首次）
    const LOAD_RETRY_DELAY_MS = 300; // 重试基础延迟
    const toastId = `sprite-batch-crop-${Date.now()}`;

    // 获取要处理的头像列表（仅处理选中的）
    const avatarsToProcess = Array.from(selectedIndices)
      .map(index => filteredAvatars[index])
      .filter(Boolean);

    try {
      setIsCropping(true);
      toast.loading("批量处理中：准备中...", { id: toastId });

      const ready = await waitForPreviewReady();
      if (!ready) {
        throw new Error("Preview not ready for batch crop");
      }

      const cropSnapshot = completedCrop;
      const displaySnapshot = {
        width: imgRef.current?.width ?? 0,
        height: imgRef.current?.height ?? 0,
      };

      if (!cropSnapshot?.width || !cropSnapshot?.height) {
        throw new Error("Invalid crop snapshot");
      }
      if (!displaySnapshot.width || !displaySnapshot.height) {
        throw new Error("Preview display size is 0");
      }

      console.warn(`开始批量裁剪 ${avatarsToProcess.length} 张${isAvatarMode ? "头像" : "立绘"}（最大并发:${MAX_CONCURRENCY}）`);
      toast.loading(`批量处理中：加载图片 0/${avatarsToProcess.length}`, { id: toastId });

      // 阶段1：加载图片（并发控制）
      let loadDone = 0;
      let loadSuccess = 0;
      let loadFail = 0;
      const failedLoadItems: Array<{ index: number; avatarId?: number; imageUrl?: string }> = [];

      const loadImageOnce = (imageUrl: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const tempImg = new Image();
          tempImg.crossOrigin = "anonymous";
          tempImg.onload = () => resolve(tempImg);
          tempImg.onerror = () => reject(new Error(`Failed to load: ${imageUrl}`));
          tempImg.src = imageUrl;
        });
      };

      const loadImageWithRetry = async (imageUrl: string): Promise<HTMLImageElement> => {
        let lastError: unknown;
        for (let attempt = 1; attempt <= MAX_LOAD_ATTEMPTS; attempt += 1) {
          try {
            if (attempt > 1) {
              await new Promise(resolve => setTimeout(resolve, LOAD_RETRY_DELAY_MS * attempt));
            }
            return await loadImageOnce(imageUrl);
          }
          catch (error) {
            lastError = error;
            console.warn(`加载失败，准备重试(${attempt}/${MAX_LOAD_ATTEMPTS})`, { imageUrl, error });
          }
        }
        throw lastError instanceof Error ? lastError : new Error("Image load failed");
      };

      const results = await cropImagesWithConcurrency(
        avatarsToProcess,
        MAX_CONCURRENCY,
        async (avatar, index) => {
          const imageUrl = getAvatarSourceUrl(avatar);
          if (!imageUrl || !avatar.avatarId) {
            loadFail += 1;
            loadDone += 1;
            if (loadDone % 2 === 0 || loadDone === avatarsToProcess.length) {
              toast.loading(`批量处理中：加载图片 ${loadDone}/${avatarsToProcess.length}（成功 ${loadSuccess} 失败 ${loadFail}）`, { id: toastId });
            }
            console.warn("跳过无效头像数据", { index, imageUrl, avatarId: avatar.avatarId });
            return null;
          }

          console.warn(`加载 ${index + 1}/${avatarsToProcess.length}`);
          try {
            const tempImg = await loadImageWithRetry(imageUrl);
            loadSuccess += 1;
            return { avatar, img: tempImg, index };
          }
          catch (error) {
            loadFail += 1;
            failedLoadItems.push({ index, avatarId: avatar.avatarId, imageUrl });
            console.error("加载图片失败", { index, imageUrl, error });
            return null;
          }
          finally {
            loadDone += 1;
            if (loadDone % 2 === 0 || loadDone === avatarsToProcess.length) {
              toast.loading(`批量处理中：加载图片 ${loadDone}/${avatarsToProcess.length}（成功 ${loadSuccess} 失败 ${loadFail}）`, { id: toastId });
            }
          }
        },
      );

      const loadedImages = results.filter(Boolean);

      // 阶段2：裁剪图片（并发控制）
      console.warn(`阶段1加载完成，共 ${loadedImages.length} 张图片`);
      if (failedLoadItems.length > 0) {
        console.warn("加载失败的图片（已重试）", failedLoadItems);
      }
      toast.loading(`批量处理中：裁剪图片 0/${loadedImages.length}`, { id: toastId });

      console.warn("开始裁剪图片blob");
      let cropDone = 0;
      let cropSuccess = 0;
      let cropFail = 0;
      const cropResults = await cropImagesWithConcurrency(
        loadedImages,
        MAX_CONCURRENCY,
        async (item: any, _) => {
          if (!item) {
            console.warn("跳过空项");
            cropFail += 1;
            cropDone += 1;
            if (cropDone % 2 === 0 || cropDone === loadedImages.length) {
              toast.loading(`批量处理中：裁剪图片 ${cropDone}/${loadedImages.length}（成功 ${cropSuccess} 失败 ${cropFail}）`, { id: toastId });
            }
            return null;
          }

          try {
            const croppedBlob = await getCroppedImageBlobFromImg(item.img, {
              crop: cropSnapshot,
              displaySize: displaySnapshot,
            });
            console.warn(`裁剪完成 (${item.index + 1}/${loadedImages.length})`);
            cropSuccess += 1;
            return { ...item, croppedBlob };
          }
          catch (error) {
            console.error(`裁剪失败 (${item.index + 1}):`, error);
            cropFail += 1;
            return null;
          }
          finally {
            cropDone += 1;
            if (cropDone % 2 === 0 || cropDone === loadedImages.length) {
              toast.loading(`批量处理中：裁剪图片 ${cropDone}/${loadedImages.length}（成功 ${cropSuccess} 失败 ${cropFail}）`, { id: toastId });
            }
          }
        },
      );

      const croppedResults = cropResults.filter(Boolean);
      const successCount = croppedResults.length;
      console.warn(`裁剪完成，成功 ${successCount}/${loadedImages.length} 张`);

      // 阶段3：上传结果（并发控制）
      console.warn(`进入上传阶段，待上传 ${croppedResults.length} 张图片`);
      toast.loading(`批量处理中：上传图片 0/${croppedResults.length}`, { id: toastId });

      if (croppedResults.length === 0) {
        console.error("没有可上传的图片，跳过上传阶段");
        toast.error("批量处理中断：没有可上传的图片", { id: toastId });
        return;
      }

      console.warn("开始上传图片");
      let uploadDone = 0;
      let uploadSuccess = 0;
      let uploadFail = 0;
      const uploadResults = await cropImagesWithConcurrency(
        croppedResults,
        MAX_CONCURRENCY,
        async (item: any, idx: number) => {
          if (!item || !item.avatar.roleId) {
            uploadFail += 1;
            uploadDone += 1;
            if (uploadDone % 2 === 0 || uploadDone === croppedResults.length) {
              toast.loading(`批量处理中：上传图片 ${uploadDone}/${croppedResults.length}（成功 ${uploadSuccess} 失败 ${uploadFail}）`, { id: toastId });
            }
            console.warn("跳过无效上传项", { idx, item });
            return null;
          }

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
                transform: applyTransform ? transform : undefined, // 根据参数决定是否应用transform
                currentAvatar: item.avatar,
              });
            }
            console.warn(`上传完成 (${idx + 1}/${croppedResults.length})`);
            uploadSuccess += 1;
            return true;
          }
          catch (error) {
            console.error(`上传失败 (${idx + 1}):`, error);
            uploadFail += 1;
            return false;
          }
          finally {
            uploadDone += 1;
            if (uploadDone % 2 === 0 || uploadDone === croppedResults.length) {
              toast.loading(`批量处理中：上传图片 ${uploadDone}/${croppedResults.length}（成功 ${uploadSuccess} 失败 ${uploadFail}）`, { id: toastId });
            }
          }
        },
      );

      const uploadSuccessCount = uploadResults.filter(Boolean).length;
      console.warn(`上传阶段完成，成功 ${uploadSuccessCount}/${croppedResults.length} 张`);
      const totalCount = avatarsToProcess.length;
      const totalFail = Math.max(0, totalCount - uploadSuccessCount);
      if (totalFail === 0) {
        toast.success(`批量处理完成：成功 ${uploadSuccessCount}/${totalCount}`, { id: toastId });
      }
      else {
        toast.error(`批量处理完成：成功 ${uploadSuccessCount}/${totalCount}，失败 ${totalFail}`, { id: toastId });
      }
    }
    catch (error) {
      console.error("批量裁剪失败:", error);
      const errMsg = error instanceof Error ? error.message : "未知错误";
      toast.error(`批量裁剪失败：${errMsg}`, { id: toastId });
    }
    finally {
      setIsCropping(false);
    }
  }

  /**
   * 批量下载：将当前裁剪参数应用到选中的头像/立绘并下载
   */
  async function handleBatchDownload() {
    if (!isMutiAvatars || !completedCrop)
      return;

    // 获取要处理的头像列表（仅处理选中的）
    const avatarsToProcess = Array.from(selectedIndices)
      .map(index => filteredAvatars[index])
      .filter(Boolean);

    try {
      setIsDownloading(true);

      // 为每个选中的头像/立绘应用相同的裁剪参数并下载
      for (let i = 0; i < avatarsToProcess.length; i++) {
        const avatar = avatarsToProcess[i];
        // 头像模式下从立绘裁剪头像，立绘模式下处理立绘
        const imageUrl = getAvatarSourceUrl(avatar);
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
      setIsDownloading(false);
    }
  }

  const handlePreviewPanelClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isMobile) {
      return;
    }

    const target = event.target as HTMLElement | null;
    // 交互控件（按钮/输入等）点击时不打开裁剪弹窗，避免移动端误触。
    if (target?.closest("button, a, input, select, textarea, [role=\"button\"], [data-no-crop-modal=\"true\"]")) {
      return;
    }

    setIsCropModalOpen(true);
  }, [isMobile]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full">
      {/* 模式显示 */}
      <div className="mb-2 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold leading-tight sm:text-lg">
          {operationMode === "single" ? "单体模式" : `批量模式 (已选 ${selectedIndices.size} 个)`}
          {isAvatarMode ? " - 从立绘裁剪头像" : " - 立绘裁剪"}
        </h3>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isMutiAvatars && (
            <button
              type="button"
              className="btn btn-sm btn-ghost gap-2 whitespace-nowrap"
              disabled={!canUseOriginForCurrent}
              onClick={() => {
                setSourceMode(prev => prev === "sprite" ? "origin" : "sprite");
              }}
              title={!canUseOriginForCurrent ? "当前头像没有 originUrl" : "切换裁剪源"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              切换至
              {sourceMode === "sprite" ? "原图" : "立绘"}
            </button>
          )}
          {isMultiSelectMode && selectedIndices.size > 1 && (
            <div className="badge badge-primary">
              选中
              {selectedIndices.size}
              个头像
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden">
        <div className="flex flex-col lg:flex-row items-stretch h-full p-2 min-h-0 overflow-auto">
          {/* 左侧：原始图片裁剪区域 - 移动端隐藏，通过弹窗显示 */}
          <div className="w-full md:basis-1/3 p-2 flex-col items-center order-2 md:order-1 hidden md:flex md:flex-none h-full">
            {currentUrl && (
              <div className="relative w-full">
                {isBatchMode && (
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <button
                      type="button"
                      className="btn btn-xs btn-circle bg-base-100/80 hover:bg-base-100 shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectedSwitch("prev");
                      }}
                      disabled={!hasPrevSelected || isProcessing}
                      title="上一个选中头像"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-circle bg-base-100/80 hover:bg-base-100 shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectedSwitch("next");
                      }}
                      disabled={!hasNextSelected || isProcessing}
                      title="下一个选中头像"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
                <ReactCrop
                  crop={crop}
                  onChange={onCropChange}
                  onComplete={handleCropComplete}
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
                    }}
                    crossOrigin="anonymous"
                  />
                </ReactCrop>
              </div>
            )}
          </div>

          {/* 右侧：裁剪预览和控制 - 移动端放上面 */}
          {completedCrop && (
            <div className="w-full md:basis-2/3 p-2 flex flex-col order-1 md:order-2 md:flex-none h-full">
              {/* 预览内容区域 */}
              <div
                className="bg-info/30 rounded-lg p-4 flex flex-col relative cursor-pointer md:cursor-default max-h-[70vh]"
                onClick={handlePreviewPanelClick}
              >
                {/* 移动端点击提示 */}
                <div className="absolute bottom-3 right-3 rounded bg-base-100/70 px-2 py-1 text-[11px] text-base-content/60 backdrop-blur-sm pointer-events-none z-10 md:hidden">
                  点击画布调整裁剪
                </div>

                {/* 预览内容（滚动由上层容器控制） */}
                <div className="min-h-0">
                  {isAvatarMode
                    ? (
                        <AvatarPreview
                          previewCanvasRef={previewCanvasRef}
                          previewRenderKey={renderKey}
                          currentAvatarUrl={currentAvatarUrl}
                          characterName={characterName}
                          hideTitle={true}
                          layout={isMobile ? "toggle" : "vertical"}
                        />
                      )
                    : (
                        <>
                          <div className="flex flex-col gap-4">
                            <div style={{ visibility: isPreviewReady ? "visible" : "hidden" }}>
                              <RenderPreview
                                previewCanvasRef={previewCanvasRef}
                                transform={transform}
                                anchorPosition={previewAnchorPosition}
                                characterName={characterName}
                                dialogContent="这是一段示例对话内容。"
                              />
                            </div>

                            <div data-no-crop-modal="true">
                              <TransformControl
                                transform={transform}
                                setTransform={setDisplayTransform}
                                anchorPosition={previewAnchorPosition}
                                setAnchorPosition={setPreviewAnchorPosition}
                              />
                            </div>
                          </div>
                        </>
                      )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮区 - 固定在右下角 */}
      <div className="mt-4 flex shrink-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
        {operationMode === "batch" && (
          <div className="text-xs text-base-content/60 self-center">
            批量模式说明：
            <br />
            只会将当前裁剪框应用到所有立绘，切换后应用裁剪框不会分别生效。
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
          {operationMode === "single"
            ? (
                <>
                  <button
                    className={`btn btn-outline rounded-md ${actionButtonSizeClass}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload();
                    }}
                    type="button"
                    disabled={isProcessing}
                  >
                    {isDownloading
                      ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        )
                      : (
                          "下载图像"
                        )}
                  </button>
                  {!isAvatarMode && (
                    <>
                      <button
                        className={`btn btn-secondary rounded-md ${actionButtonSizeClass}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyTransform();
                        }}
                        type="button"
                        disabled={isProcessing}
                      >
                        {isTransforming
                          ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            )
                          : (
                              "应用变换"
                            )}
                      </button>
                      <button
                        className={`btn btn-primary rounded-md ${actionButtonSizeClass}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyCrop(false);
                        }}
                        type="button"
                        disabled={!completedCrop || isProcessing}
                      >
                        {isCropping
                          ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            )
                          : (
                              "应用裁剪"
                            )}
                      </button>
                      <button
                        className={`btn btn-info rounded-md ${actionButtonSizeClass}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyCrop(true);
                        }}
                        type="button"
                        disabled={!completedCrop || isProcessing}
                      >
                        {isCropping
                          ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            )
                          : (
                              "一键应用"
                            )}
                      </button>
                    </>
                  )}
                  {isAvatarMode && (
                    <button
                      className={`btn btn-primary rounded-md ${actionButtonSizeClass}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyCrop(false);
                      }}
                      type="button"
                      disabled={!completedCrop || isProcessing}
                    >
                      {isCropping
                        ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          )
                        : (
                            "应用裁剪"
                          )}
                    </button>
                  )}
                </>
              )
            : (
                <>
                  <button
                    className={`btn btn-outline btn-info rounded-md ${actionButtonSizeClass}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBatchDownload();
                    }}
                    type="button"
                    disabled={!completedCrop || isProcessing}
                  >
                    {isDownloading
                      ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        )
                      : (
                          "批量下载"
                        )}
                  </button>
                  {!isAvatarMode && (
                    <>
                      <button
                        className={`btn btn-info rounded-md ${actionButtonSizeClass}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBatchCropAll(true);
                        }}
                        type="button"
                        disabled={!completedCrop || isProcessing}
                      >
                        {isCropping
                          ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            )
                          : (
                              "一键应用"
                            )}
                      </button>
                    </>
                  )}
                  {isAvatarMode && (
                    <button
                      className={`btn btn-info rounded-md ${actionButtonSizeClass}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBatchCropAll(false);
                      }}
                      type="button"
                      disabled={!completedCrop || isProcessing}
                    >
                      {isCropping
                        ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          )
                        : (
                            "一键应用"
                          )}
                    </button>
                  )}
                </>
              )}
        </div>
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
                <div className="relative w-full">
                  {isBatchMode && (
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                      <button
                        type="button"
                        className="btn btn-xs btn-circle bg-base-100/80 hover:bg-base-100 shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectedSwitch("prev");
                        }}
                        disabled={!hasPrevSelected || isProcessing}
                        title="上一个选中头像"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-circle bg-base-100/80 hover:bg-base-100 shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectedSwitch("next");
                        }}
                        disabled={!hasNextSelected || isProcessing}
                        title="下一个选中头像"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <ReactCrop
                    crop={crop}
                    onChange={onCropChange}
                    onComplete={handleCropComplete}
                    aspect={isAvatarMode ? 1 : undefined}
                    minHeight={10}
                  >
                    <img
                      ref={imgRef}
                      alt="Sprite to crop modal"
                      src={currentUrl}
                      onLoad={onImageLoad}
                      style={{
                        maxHeight: "60vh",
                      }}
                      crossOrigin="anonymous"
                    />
                  </ReactCrop>
                </div>
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
