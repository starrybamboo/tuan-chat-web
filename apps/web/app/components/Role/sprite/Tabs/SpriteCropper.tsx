import type { PixelCrop } from "react-image-crop";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ReactCrop } from "react-image-crop";

import type { ImageLoadContext } from "@/utils/imgCropper";
import type { AvatarCropContext, RoleAvatar, RoleAvatarVariant, RoleAvatarVariantCompositionConfig, SpriteCropContext } from "api";

import { isMobileScreen } from "@/utils/getScreenSize";
import {
  canvasPreview,
  canvasToBlob,
  createTopCenteredSquareCrop,
  useCropPreview,
} from "@/utils/imgCropper";
import { imageOriginalUrlFromUrl } from "@/utils/mediaUrl";
import { useApplyCropAvatarMutation, useApplyCropMutation, useUpdateRoleAvatarVariantMutation } from "api/hooks/RoleAndAvatarHooks";

import type { PreviewAnchorPosition } from "../../Preview/previewAnchor";
import type { Transform } from "../TransformControl";

import { AvatarPreview } from "../../Preview/AvatarPreview";
import { RenderPreview } from "../../Preview/RenderPreview";
import {
  createAvatarCropContextFromImage,
  createAvatarCropContextFromSource,
  createSpriteCropContextFromImage,
  createSpriteCropContextFromSource,
  createPixelSpriteCropFromVariantConfig,
  createPixelCropFromVariantConfig,
  createVariantCompositionConfigFromAvatarCropContext,
} from "../avatarCropContext";
import { TransformControl } from "../TransformControl";
import {
  getEffectiveOriginUrl,
  getSpriteCropSourceUrl,
  parseTransformFromAvatar,
  parseTransformFromSpriteTransform,
  toSpriteTransformPayload,
} from "../utils";
import { useImageCropWorker } from "../worker/useImageCropWorker";
import "react-image-crop/dist/ReactCrop.css";

function isLocalImageSource(url: string): boolean {
  return /^(?:blob|data|file|asset):/i.test(url);
}

function toCropCanvasSourceUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  if (!value || isLocalImageSource(value)) {
    return value;
  }

  const originalUrl = imageOriginalUrlFromUrl(value) || value;
  try {
    const baseUrl = typeof window !== "undefined" ? window.location.href : "http://localhost/";
    const url = new URL(originalUrl, baseUrl);
    if (url.protocol === "http:" || url.protocol === "https:") {
      // 裁剪画布需要 CORS 可读；加稳定 query 避免复用已被普通预览加载过的 no-cors 缓存。
      url.searchParams.set("tc-cors-crop", "1");
    }
    return url.toString();
  }
  catch {
    return originalUrl;
  }
}

function loadCropCanvasImage(rawUrl: string): Promise<HTMLImageElement> {
  const src = toCropCanvasSourceUrl(rawUrl);
  if (!src) {
    return Promise.reject(new Error("Image src is empty"));
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!isLocalImageSource(src)) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function getPositiveVariantId(value: unknown): number | undefined {
  const id = Number(value ?? 0);
  if (!Number.isFinite(id) || id <= 0) {
    return undefined;
  }
  return Math.floor(id);
}

function getAvatarVariantId(avatar: RoleAvatar | undefined): number | undefined {
  return getPositiveVariantId(avatar?.variantId ?? avatar?.variantGroup?.variantId);
}

function isAvatarVariantLocked(avatar: RoleAvatar | undefined): boolean {
  return Boolean(getAvatarVariantId(avatar));
}

function isNonNullable<T>(value: T | null | undefined): value is T {
  return value != null;
}

function createCompositionConfigFromSpriteCropContext(
  currentConfig: RoleAvatarVariantCompositionConfig | undefined,
  spriteCropContext: SpriteCropContext | undefined,
  spriteTransform?: Transform,
): RoleAvatarVariantCompositionConfig | undefined {
  const crop = spriteCropContext?.crop;
  if (
    !spriteCropContext?.sourceWidth
    || !spriteCropContext.sourceHeight
    || !crop?.width
    || !crop.height
  ) {
    return undefined;
  }

  const outputWidth = Math.round(spriteCropContext.outputWidth ?? crop.width);
  const outputHeight = Math.round(spriteCropContext.outputHeight ?? crop.height);
  if (!outputWidth || !outputHeight) {
    return undefined;
  }

  return {
    ...currentConfig,
    mode: currentConfig?.mode ?? "sprite_avatar_overlay",
    canvas: {
      width: outputWidth,
      height: outputHeight,
    },
    spriteCrop: {
      sourceOriginFileId: spriteCropContext.sourceOriginFileId,
      sourceWidth: Math.round(spriteCropContext.sourceWidth),
      sourceHeight: Math.round(spriteCropContext.sourceHeight),
      crop: {
        x: crop.x ?? 0,
        y: crop.y ?? 0,
        width: crop.width,
        height: crop.height,
      },
      outputWidth,
      outputHeight,
    },
    spriteTransform: spriteTransform
      ? toSpriteTransformPayload(spriteTransform)
      : currentConfig?.spriteTransform,
    output: currentConfig?.output ?? {
      format: "webp",
    },
  };
}

function withFallbackSpriteCrop(
  nextConfig: RoleAvatarVariantCompositionConfig | undefined,
  currentConfig: RoleAvatarVariantCompositionConfig | undefined,
) {
  if (!nextConfig) {
    return undefined;
  }
  if (nextConfig.spriteCrop || !currentConfig?.spriteCrop) {
    return nextConfig;
  }
  return {
    ...nextConfig,
    spriteCrop: currentConfig.spriteCrop,
  };
}

export type VariantInitializationCropResult = {
  baseAvatar: RoleAvatar;
  compositionConfig: RoleAvatarVariantCompositionConfig;
  croppedAvatars: Array<{
    avatar: RoleAvatar;
    avatarCropContext: AvatarCropContext;
  }>;
};

export type BatchSpriteCropApplyResult = {
  avatars: RoleAvatar[];
  totalCount: number;
  successCount: number;
  failedCount: number;
};

type UploadedAvatarCropResult = {
  avatar: RoleAvatar;
  avatarCropContext: AvatarCropContext;
};

/**
 * 立绘裁剪组件的属性接口
 */
type SpriteCropperProps = {
  // 要裁剪的立绘源地址（单体模式）
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
  // 可直接应用的立绘组
  availableVariants?: RoleAvatarVariant[];
  // 正在编辑立绘组目录时，允许组内头像绕过单头像锁定并批量应用。
  allowVariantGroupEditing?: boolean;
  editingVariantGroup?: RoleAvatarVariant;
  // 立绘组初始化模式：裁剪完成后由外层创建并绑定 variant
  variantInitialization?: {
    active: boolean;
    name: string;
    onComplete: (result: VariantInitializationCropResult) => Promise<void> | void;
    onCancel?: () => void;
  };
  onBatchSpriteCropApplied?: (result: BatchSpriteCropApplyResult) => void;
  onSingleSpriteCropApplied?: (result: BatchSpriteCropApplyResult) => void;
}

/**
 * 立绘裁剪组件
 * 用于裁剪现有立绘，支持预览和变换控制
 * 支持单体裁剪和批量裁剪模式
 * 支持立绘模式和头像模式（从立绘中裁剪头像）
 */
// 默认空集合，避免在默认参数中使用 new 表达式
const EMPTY_SET = new Set<number>();
const EMPTY_VARIANTS: RoleAvatarVariant[] = [];

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
  availableVariants = EMPTY_VARIANTS,
  allowVariantGroupEditing = false,
  editingVariantGroup,
  variantInitialization,
  onBatchSpriteCropApplied,
  onSingleSpriteCropApplied,
}: SpriteCropperProps) {
  const isMobile = isMobileScreen();
  const actionButtonSizeClass = isMobile ? "btn-sm" : "";

  // 确定工作模式
  const isMutiAvatars = roleAvatars.length > 0;
  const isAvatarMode = cropMode === "avatar";
  const isVariantInitializationMode = isAvatarMode && Boolean(variantInitialization?.active);

  // 头像裁剪必须来自已生成立绘；立绘校正必须来自上传原图。
  const filteredAvatars = roleAvatars.filter((avatar) => {
    if (isAvatarMode) {
      return Boolean(getSpriteCropSourceUrl(avatar));
    }
    return Boolean(getEffectiveOriginUrl(avatar));
  });
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
  }, [initialSpriteIndex, filteredAvatars.length, currentSpriteIndex]);

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

  const getAvatarSourceUrl = useCallback((avatar?: RoleAvatar): string => {
    if (!avatar)
      return "";
    if (isAvatarMode) {
      return getSpriteCropSourceUrl(avatar);
    }
    return getEffectiveOriginUrl(avatar);
  }, [isAvatarMode]);

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

  const currentAvatar = filteredAvatars[currentSpriteIndex];
  const editingVariantId = getPositiveVariantId(editingVariantGroup?.variantId);
  const currentVariantId = getAvatarVariantId(currentAvatar) ?? editingVariantId;
  const isVariantGroupEditingMode = Boolean(
    allowVariantGroupEditing
    && editingVariantId
    && currentVariantId === editingVariantId,
  );
  const shouldRespectVariantLock = !isVariantGroupEditingMode && !isVariantInitializationMode;
  const selectedLockedAvatarCount = shouldRespectVariantLock
    ? selectedAvatarIndices
        .filter(index => isAvatarVariantLocked(filteredAvatars[index]))
        .length
    : 0;
  const hasLockedSelectedAvatars = selectedLockedAvatarCount > 0;
  const isManualCropLocked = shouldRespectVariantLock && isAvatarVariantLocked(currentAvatar);
  const currentVariantGroup = useMemo(() => {
    if (!currentVariantId) {
      return undefined;
    }
    if (editingVariantId === currentVariantId && editingVariantGroup) {
      return editingVariantGroup;
    }
    const fromList = availableVariants.find(variant => (
      getPositiveVariantId(variant.variantId) === currentVariantId
    ));
    if (fromList) {
      return fromList;
    }
    return getPositiveVariantId(currentAvatar?.variantGroup?.variantId) === currentVariantId
      ? currentAvatar?.variantGroup
      : undefined;
  }, [availableVariants, currentAvatar?.variantGroup, currentVariantId, editingVariantGroup, editingVariantId]);
  const currentCompositionConfig = currentVariantGroup?.compositionConfig;
  const initialAvatarCompositionConfig = (isManualCropLocked || isVariantGroupEditingMode)
    ? currentCompositionConfig
    : undefined;
  const rawCurrentUrl = getCurrentSourceUrl();
  const currentUrl = toCropCanvasSourceUrl(rawCurrentUrl);
  const currentAvatarId = currentAvatar?.avatarId || 0;

  // 用于标识当前“切换到哪张图”的稳定 key：切换时立刻让预览进入不可见状态，避免中间帧闪烁
  const spriteSwitchKey = isMutiAvatars
    ? `avatar:${filteredAvatars[currentSpriteIndex]?.avatarId ?? currentSpriteIndex}:url:${currentUrl}`
    : `url:${currentUrl}`;
  const latestSwitchKeyRef = useRef<string>(spriteSwitchKey);
  const lastResetSourceUrlRef = useRef<string | null>(null);
  const [previewReadyKey, setPreviewReadyKey] = useState<string>("");
  const isPreviewReady = previewReadyKey === spriteSwitchKey;

  useEffect(() => {
    latestSwitchKeyRef.current = spriteSwitchKey;
  }, [spriteSwitchKey]);

  // 加载状态 - 分离不同操作的loading״̬
  const [isCropping, setIsCropping] = useState(false);

  // 裁剪应用mutation hook - 根据模式选择合适的hook
  const applyCropMutation = useApplyCropMutation();
  const applyCropAvatarMutation = useApplyCropAvatarMutation();
  const updateVariantMutation = useUpdateRoleAvatarVariantMutation(currentVariantGroup?.roleId);

  const updateEditingVariantCompositionConfig = useCallback(async (
    compositionConfig: RoleAvatarVariantCompositionConfig | undefined,
  ) => {
    if (!isVariantGroupEditingMode || !editingVariantId || !compositionConfig) {
      return;
    }
    await updateVariantMutation.mutateAsync({
      variantId: editingVariantId,
      name: currentVariantGroup?.name,
      baseAvatarId: currentVariantGroup?.baseAvatarId,
      compositionConfig,
    });
  }, [
    currentVariantGroup?.baseAvatarId,
    currentVariantGroup?.name,
    editingVariantId,
    isVariantGroupEditingMode,
    updateVariantMutation,
  ]);

  // 统一的处理中状态：任何操作进行时都为true，用于禁用所有按钮
  const isProcessing = isCropping;

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
        const newTransform = (isManualCropLocked || isVariantGroupEditingMode)
          ? parseTransformFromSpriteTransform(currentCompositionConfig?.spriteTransform)
          : parseTransformFromAvatar(currentSprite);
        setDisplayTransform(newTransform);
      }
    }
  }, [currentCompositionConfig?.spriteTransform, isAvatarMode, isManualCropLocked, isVariantGroupEditingMode, filteredAvatars, currentSpriteIndex]);

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
    initialCrop: useCallback(({
      width,
      height,
      naturalWidth,
      naturalHeight,
      mode,
    }: {
      width: number;
      height: number;
      naturalWidth: number;
      naturalHeight: number;
      mode: "avatar" | "sprite";
    }) => {
      if (initialAvatarCompositionConfig) {
        const image = {
          width,
          height,
          naturalWidth,
          naturalHeight,
        };
        return mode === "avatar"
          ? createPixelCropFromVariantConfig(initialAvatarCompositionConfig, image)
          : createPixelSpriteCropFromVariantConfig(initialAvatarCompositionConfig, image);
      }
      if (mode !== "avatar")
        return undefined;
      return createTopCenteredSquareCrop(width, height);
    }, [initialAvatarCompositionConfig]),
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

  // 切换图片时重置裁剪状态，避免沿用旧的 crop 尺寸导致“看起来没切换”
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

    const currentImg = imgRef.current;
    const tempDisplayWidth = options?.displaySize?.width ?? currentImg?.width ?? 0;
    const tempDisplayHeight = options?.displaySize?.height ?? currentImg?.height ?? 0;
    if (!tempDisplayWidth || !tempDisplayHeight) {
      throw new Error("Preview image size is 0");
    }

    // 使用 Worker 在后台线程处理图像裁剪
    try {
      const blob = await cropImage({
        img,
        crop: cropToUse,
        scale: 1,
        rotate: 0,
        displaySize: {
          width: tempDisplayWidth,
          height: tempDisplayHeight,
        },
      });
      return blob;
    }
    catch (error) {
      console.error("Worker 裁剪失败，回退到主线程处理:", error);

      // 回退方案：在主线程使用 OffscreenCanvas
      const scaleX = img.naturalWidth / tempDisplayWidth;
      const scaleY = img.naturalHeight / tempDisplayHeight;
      const outputWidth = Math.max(1, Math.round(cropToUse.width * scaleX));
      const outputHeight = Math.max(1, Math.round(cropToUse.height * scaleY));
      const outputCanvas: HTMLCanvasElement | OffscreenCanvas = typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(outputWidth, outputHeight)
        : document.createElement("canvas");

      await canvasPreview(
        img,
        outputCanvas,
        cropToUse,
        1,
        0,
        {
          previewMode: false,
          displaySize: {
            width: tempDisplayWidth,
            height: tempDisplayHeight,
          },
        },
      );

      return await canvasToBlob(outputCanvas);
    }
  }

  /**
   * 获取指定图片的裁剪结果（通用函数）
   */
  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("读取裁剪结果失败"));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 处理应用裁剪
   * @param applyTransform 是否同时应用变换（仅立绘模式有效）
   */
  async function handleApplyCrop(applyTransform: boolean = false) {
    try {
      setIsCropping(true);

      const currentAvatar = isMutiAvatars
        ? filteredAvatars[currentSpriteIndex]
        : roleAvatars.find(avatar => avatar.avatarId === currentAvatarId);

      if (!currentAvatar) {
        throw new Error("找不到当前头像数据");
      }
      if (!currentAvatar.roleId || !currentAvatar.avatarId) {
        throw new Error("当前头像数据缺少必要字段 (roleId or avatarId)");
      }
      if (shouldRespectVariantLock && isAvatarVariantLocked(currentAvatar)) {
        throw new Error("已绑定立绘组，裁剪已锁定");
      }

      const img = imgRef.current;
      if (!img) {
        throw new Error("Image not found");
      }
      const croppedBlob = await getCroppedImageBlobFromImg(img);

      // --- 共同的 Mutation 调用逻辑 ---
      if (isAvatarMode) {
        const avatarCropContext = createAvatarCropContextFromImage(
          completedCrop,
          imgRef.current,
          currentAvatar.spriteFileId,
        );
        if (!avatarCropContext) {
          throw new Error("无法生成头像裁剪上下文");
        }
        const updateRes = await applyCropAvatarMutation.mutateAsync({
          roleId: currentAvatar.roleId,
          avatarId: currentAvatar.avatarId,
          croppedImageBlob: croppedBlob,
          currentAvatar,
          avatarCropContext,
          variantId: currentAvatar.variantId,
        });
        if (isVariantGroupEditingMode) {
          const nextCompositionConfig = withFallbackSpriteCrop(
            createVariantCompositionConfigFromAvatarCropContext(
              avatarCropContext,
              updateRes?.data?.spriteCropContext ?? currentAvatar.spriteCropContext,
              currentCompositionConfig?.spriteTransform,
            ),
            currentCompositionConfig,
          );
          await updateEditingVariantCompositionConfig(nextCompositionConfig);
        }
        if (isVariantInitializationMode) {
          const compositionConfig = createVariantCompositionConfigFromAvatarCropContext(
            avatarCropContext,
            currentAvatar.spriteCropContext,
            currentAvatar.spriteTransform,
          );
          if (!compositionConfig?.spriteCrop) {
            throw new Error("无法生成立绘组合成配置");
          }
          await variantInitialization?.onComplete({
            baseAvatar: updateRes?.data ?? { ...currentAvatar, avatarCropContext },
            compositionConfig,
            croppedAvatars: [{
              avatar: updateRes?.data ?? { ...currentAvatar, avatarCropContext },
              avatarCropContext,
            }],
          });
        }
      }
      else {
        const spriteCropContext = createSpriteCropContextFromImage(
          completedCrop,
          img,
          currentAvatar.originFileId,
        );
        if (!spriteCropContext) {
          throw new Error("无法生成立绘裁剪上下文");
        }
        const updateRes = await applyCropMutation.mutateAsync({
          roleId: currentAvatar.roleId,
          avatarId: currentAvatar.avatarId,
          croppedImageBlob: croppedBlob,
          transform: applyTransform ? transform : undefined, // 根据参数决定是否应用transform
          currentAvatar,
          spriteCropContext,
        });
        const updatedAvatar = updateRes?.data ?? {
          ...currentAvatar,
          spriteCropContext,
        };
        if (isVariantGroupEditingMode) {
          await updateEditingVariantCompositionConfig(
            createCompositionConfigFromSpriteCropContext(
              currentCompositionConfig,
              spriteCropContext,
              applyTransform ? transform : undefined,
            ),
          );
        }
        onSingleSpriteCropApplied?.({
          avatars: [updatedAvatar],
          totalCount: 1,
          successCount: 1,
          failedCount: 0,
        });
      }

      // --- 共同的回调逻辑 ---
      if (onCropComplete) {
        onCropComplete(await blobToDataUrl(croppedBlob));
      }
    }
    catch (error) {
      console.error("应用裁剪失败:", error);
      toast.error(error instanceof Error ? error.message : "应用裁剪失败");
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
      .filter(isNonNullable);

    try {
      setIsCropping(true);
      toast.loading("批量处理中：准备中...", { id: toastId });
      if (shouldRespectVariantLock && avatarsToProcess.some(avatar => isAvatarVariantLocked(avatar))) {
        throw new Error("所选头像包含已绑定立绘组，裁剪已锁定");
      }

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

      const loadImageWithRetry = async (imageUrl: string): Promise<HTMLImageElement> => {
        let lastError: unknown;
        for (let attempt = 1; attempt <= MAX_LOAD_ATTEMPTS; attempt += 1) {
          try {
            if (attempt > 1) {
              await new Promise(resolve => setTimeout(resolve, LOAD_RETRY_DELAY_MS * attempt));
            }
            return await loadCropCanvasImage(imageUrl);
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

      const loadedImages = results.filter(isNonNullable);

      // 阶段2：裁剪图片（并发控制）
      console.warn(`阶段1加载完成，共 ${loadedImages.length} 张图片`);
      if (isVariantInitializationMode || isVariantGroupEditingMode) {
        const baseImage = loadedImages[0]?.img;
        if (!baseImage) {
          throw new Error(isVariantInitializationMode ? "没有可用于初始化立绘组的图片" : "没有可用于更新立绘组的图片");
        }
        const mismatchedImage = loadedImages.find(item => (
          item.img.naturalWidth !== baseImage.naturalWidth
          || item.img.naturalHeight !== baseImage.naturalHeight
        ));
        if (mismatchedImage) {
          throw new Error("所选图片尺寸不一致，不能作为同一立绘组配置");
        }
      }
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

      const croppedResults = cropResults.filter(isNonNullable);
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
      const uploadedAvatarCropResults: UploadedAvatarCropResult[] = [];
      const uploadedSpriteCropResults: RoleAvatar[] = [];
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
              const avatarCropContext = createAvatarCropContextFromSource(
                cropSnapshot,
                item.img.naturalWidth,
                item.img.naturalHeight,
                item.img.naturalWidth / displaySnapshot.width,
                item.img.naturalHeight / displaySnapshot.height,
                item.avatar.spriteFileId,
              );
              if (!avatarCropContext) {
                throw new Error("无法生成头像裁剪上下文");
              }
              const updateRes = await applyCropAvatarMutation.mutateAsync({
                roleId: item.avatar.roleId,
                avatarId: item.avatar.avatarId!,
                croppedImageBlob: item.croppedBlob,
                currentAvatar: item.avatar,
                avatarCropContext,
                variantId: item.avatar.variantId,
              });
              if (isVariantInitializationMode || isVariantGroupEditingMode) {
                uploadedAvatarCropResults.push({
                  avatar: updateRes?.data ?? { ...item.avatar, avatarCropContext },
                  avatarCropContext,
                });
              }
            }
            else {
              const spriteCropContext = createSpriteCropContextFromSource(
                cropSnapshot,
                item.img.naturalWidth,
                item.img.naturalHeight,
                item.img.naturalWidth / displaySnapshot.width,
                item.img.naturalHeight / displaySnapshot.height,
                item.avatar.originFileId,
              );
              if (!spriteCropContext) {
                throw new Error("无法生成立绘裁剪上下文");
              }
              const updateRes = await applyCropMutation.mutateAsync({
                roleId: item.avatar.roleId,
                avatarId: item.avatar.avatarId!,
                croppedImageBlob: item.croppedBlob,
                transform: applyTransform ? transform : undefined, // 根据参数决定是否应用transform
                currentAvatar: item.avatar,
                spriteCropContext,
              });
              if (!updateRes?.success) {
                throw new Error("立绘上传失败");
              }
              uploadedSpriteCropResults.push({
                ...item.avatar,
                ...updateRes.data,
                spriteCropContext,
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
      if (isVariantInitializationMode) {
        const baseCropResult = uploadedAvatarCropResults.find(item => (
          item.avatar.avatarId === currentAvatar?.avatarId
        )) ?? uploadedAvatarCropResults[0];
        if (!baseCropResult) {
          throw new Error("没有可用于创建立绘组的裁剪结果");
        }
        const compositionConfig = createVariantCompositionConfigFromAvatarCropContext(
          baseCropResult.avatarCropContext,
          baseCropResult.avatar.spriteCropContext,
          baseCropResult.avatar.spriteTransform,
        );
        if (!compositionConfig?.spriteCrop) {
          throw new Error("无法生成立绘组合成配置");
        }
        await variantInitialization?.onComplete({
          baseAvatar: baseCropResult.avatar,
          compositionConfig,
          croppedAvatars: uploadedAvatarCropResults,
        });
        toast.success(`立绘组创建完成：成功 ${uploadSuccessCount}/${totalCount}`, { id: toastId });
      }
      else if (isVariantGroupEditingMode) {
        if (isAvatarMode) {
          const baseCropResult = uploadedAvatarCropResults.find(item => (
            item.avatar.avatarId === currentAvatar?.avatarId
          )) ?? uploadedAvatarCropResults[0];
          if (!baseCropResult) {
            throw new Error("没有可用于更新立绘组的头像裁剪结果");
          }
          const compositionConfig = withFallbackSpriteCrop(
            createVariantCompositionConfigFromAvatarCropContext(
              baseCropResult.avatarCropContext,
              baseCropResult.avatar.spriteCropContext,
              currentCompositionConfig?.spriteTransform,
            ),
            currentCompositionConfig,
          );
          if (!compositionConfig?.avatarSlot) {
            throw new Error("无法生成立绘组头像槽位配置");
          }
          await updateEditingVariantCompositionConfig(compositionConfig);
        }
        else {
          const baseSpriteResult = uploadedSpriteCropResults.find(avatar => (
            avatar.avatarId === currentAvatar?.avatarId
          )) ?? uploadedSpriteCropResults[0];
          const compositionConfig = createCompositionConfigFromSpriteCropContext(
            currentCompositionConfig,
            baseSpriteResult?.spriteCropContext,
            applyTransform ? transform : undefined,
          );
          if (!compositionConfig?.spriteCrop) {
            throw new Error("无法生成立绘组立绘裁剪配置");
          }
          await updateEditingVariantCompositionConfig(compositionConfig);
        }
        if (totalFail === 0) {
          toast.success(`立绘组更新完成：成功 ${uploadSuccessCount}/${totalCount}`, { id: toastId });
        }
        else {
          toast.error(`立绘组更新完成：成功 ${uploadSuccessCount}/${totalCount}，失败 ${totalFail}`, { id: toastId });
        }
      }
      else if (totalFail === 0) {
        toast.success(`批量处理完成：成功 ${uploadSuccessCount}/${totalCount}`, { id: toastId });
      }
      else {
        toast.error(`批量处理完成：成功 ${uploadSuccessCount}/${totalCount}，失败 ${totalFail}`, { id: toastId });
      }
      if (!isAvatarMode && uploadSuccessCount > 0) {
        onBatchSpriteCropApplied?.({
          avatars: uploadedSpriteCropResults,
          totalCount,
          successCount: uploadSuccessCount,
          failedCount: totalFail,
        });
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

  const handlePreviewPanelClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isMobile) {
      return;
    }
    if (isManualCropLocked) {
      toast.error("已绑定立绘组，裁剪已锁定");
      return;
    }

    const target = event.target as HTMLElement | null;
    // 交互控件（按钮/输入等）点击时不打开裁剪弹窗，避免移动端误触。
    if (target?.closest("button, a, input, select, textarea, [role=\"button\"], [data-no-crop-modal=\"true\"]")) {
      return;
    }

    setIsCropModalOpen(true);
  }, [isManualCropLocked, isMobile]);

  const isManualApplyDisabled = !completedCrop
    || isProcessing
    || isManualCropLocked
    || (operationMode === "batch" && hasLockedSelectedAvatars);
  const cropApplyButtonLabel = isVariantInitializationMode
    ? operationMode === "batch" ? "批量创建立绘组" : "创建立绘组"
    : isAvatarMode ? "应用裁剪" : operationMode === "batch" ? "批量应用立绘" : "一键应用";
  const cropApplyHint = operationMode === "batch"
    ? hasLockedSelectedAvatars
      ? `已选头像中有 ${selectedLockedAvatarCount} 个绑定了立绘组，裁剪已锁定。`
      : isVariantInitializationMode
        ? "当前裁剪框会作为立绘组头像槽位，并应用到已选头像。"
        : isAvatarMode
          ? "批量模式会将当前裁剪框应用到已选头像。"
          : "批量模式会先上传已选立绘，完成后可继续创建立绘组。"
    : isManualCropLocked
      ? "已绑定立绘组，裁剪已锁定。"
      : "";
  const cropApplyButton = (
    <button
      className={`
        btn btn-primary btn-sm min-w-24 rounded-md px-4 font-semibold
        ${actionButtonSizeClass}
      `}
      data-no-crop-modal="true"
      onClick={(e) => {
        e.stopPropagation();
        if (operationMode === "batch") {
          handleBatchCropAll(!isAvatarMode);
          return;
        }
        handleApplyCrop(!isAvatarMode);
      }}
      type="button"
      disabled={isManualApplyDisabled}
    >
      {isCropping
        ? (
            <span className="loading loading-spinner loading-xs"></span>
          )
        : (
            cropApplyButtonLabel
          )}
    </button>
  );
  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full">
      {/* 模式显示 */}
      <div className="
        mb-2 flex w-full flex-col gap-2
        sm:flex-row sm:items-center sm:justify-between
      ">
        <div className="min-w-0">
          <h3 className="
            text-base/tight font-bold
            sm:text-lg
          ">
            {isVariantInitializationMode
              ? (
                  <>
                    {operationMode === "single" ? "创建立绘组" : `批量创建立绘组 (已选 ${selectedIndices.size} 个)`}
                    {variantInitialization?.name ? ` - ${variantInitialization.name}` : ""}
                  </>
                )
              : (
                  <>
                    {operationMode === "single" ? "单体模式" : `批量模式 (已选 ${selectedIndices.size} 个)`}
                    {isAvatarMode ? " - 从立绘裁剪头像" : " - 立绘裁剪"}
                  </>
                )}
          </h3>
        </div>
        <div className="
          flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1
        ">
          {cropApplyHint && (
            <div className="
              max-w-full whitespace-nowrap text-right text-xs text-base-content/60
            ">
              {cropApplyHint}
            </div>
          )}
          <div className="
            flex flex-wrap items-center justify-end gap-2
          ">
            {isMultiSelectMode && selectedIndices.size > 1 && (
              <div className="badge badge-primary">
                选中
                {selectedIndices.size}
                个头像
              </div>
            )}
            {cropApplyButton}
          </div>
        </div>
      </div>

      <div className="
        flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden
      ">
        <div className="
          flex flex-col
          lg:flex-row
          items-stretch h-full p-2 min-h-0 overflow-auto
        ">
          {/* 左侧：原始图片裁剪区域 - 移动端隐藏，通过弹窗显示 */}
          <div className="
            size-full
            lg:basis-[36%]
            p-2 flex-col items-center order-2
            md:order-1
            hidden
            md:flex md:flex-none
          ">
            {currentUrl && (
              <div className="relative w-full">
                {isBatchMode && (
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <button
                      type="button"
                      className="
                        btn btn-xs btn-circle bg-base-100/80
                        hover:bg-base-100
                        shadow
                      "
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectedSwitch("prev");
                      }}
                      disabled={!hasPrevSelected || isProcessing}
                      title="上一个选中头像"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="
                        btn btn-xs btn-circle bg-base-100/80
                        hover:bg-base-100
                        shadow
                      "
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectedSwitch("next");
                      }}
                      disabled={!hasNextSelected || isProcessing}
                      title="下一个选中头像"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
                <ReactCrop
                  crop={crop}
                  onChange={(nextCrop, percentCrop) => {
                    if (!isManualCropLocked) {
                      onCropChange(nextCrop, percentCrop);
                    }
                  }}
                  onComplete={(nextCrop, percentCrop) => {
                    if (!isManualCropLocked) {
                      handleCropComplete(nextCrop, percentCrop);
                    }
                  }}
                  // 头像模式限制1:1宽高比，立绘模式不限制
                  aspect={isAvatarMode ? 1 : undefined}
                  minHeight={10}
                  disabled={isManualCropLocked}
                >
                  <img
                    ref={imgRef}
                    alt="Sprite to crop"
                    src={currentUrl}
                    onLoad={onImageLoad}
                    style={{
                      maxHeight: "70vh",
                    }}
                    crossOrigin={isLocalImageSource(currentUrl) ? undefined : "anonymous"}
                  />
                </ReactCrop>
              </div>
            )}
          </div>

          {/* 右侧：裁剪预览和控制 - 移动端放上面 */}
          {completedCrop && (
            <div className="
              size-full
              lg:basis-[64%]
              p-2 flex flex-col items-start order-1
              md:order-2 md:flex-none
            ">
              {/* 预览内容区域 */}
              <div
                className="
                  relative flex w-full flex-col
                  cursor-pointer
                  md:cursor-default
                "
                onClick={handlePreviewPanelClick}
              >
                {/* 移动端点击提示 */}
                <div className="
                  absolute bottom-3 right-3 rounded bg-base-100/70 px-2 py-1
                  text-[11px] text-base-content/60 backdrop-blur-sm
                  pointer-events-none z-10
                  md:hidden
                ">
                  {isManualCropLocked ? "裁剪已锁定" : "点击画布调整裁剪"}
                </div>

                {/* 预览内容（滚动由上层容器控制） */}
                <div className="min-h-0 w-full">
                  {isAvatarMode
                    ? (
                        <AvatarPreview
                          previewCanvasRef={previewCanvasRef}
                          previewRenderKey={renderKey}
                          currentAvatarUrl={currentAvatarUrl}
                          characterName={characterName}
                          hideTitle={true}
                          layout={isMobile ? "toggle" : "vertical"}
                          chatMessages={["这是使用新头像的聊天消息！"]}
                        />
                      )
                    : (
                        <>
                          <div className="flex w-full flex-col gap-3">
                            <div
                              className="w-full"
                              style={{ visibility: isPreviewReady ? "visible" : "hidden" }}
                            >
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
                                disabled={isManualCropLocked}
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

      {/* 移动端裁剪弹窗 */}
      {isCropModalOpen && (
        <div className="
          fixed inset-0 z-50 flex items-center justify-center bg-black/50
          md:hidden
        ">
          <div className="
            bg-base-100 rounded-lg p-4 m-4 max-h-[90vh] overflow-auto w-full
            max-w-lg
          ">
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
                        className="
                          btn btn-xs btn-circle bg-base-100/80
                          hover:bg-base-100
                          shadow
                        "
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectedSwitch("prev");
                        }}
                        disabled={!hasPrevSelected || isProcessing}
                        title="上一个选中头像"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="
                          size-4
                        " viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="
                          btn btn-xs btn-circle bg-base-100/80
                          hover:bg-base-100
                          shadow
                        "
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectedSwitch("next");
                        }}
                        disabled={!hasNextSelected || isProcessing}
                        title="下一个选中头像"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="
                          size-4
                        " viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <ReactCrop
                    crop={crop}
                    onChange={(nextCrop, percentCrop) => {
                      if (!isManualCropLocked) {
                        onCropChange(nextCrop, percentCrop);
                      }
                    }}
                    onComplete={(nextCrop, percentCrop) => {
                      if (!isManualCropLocked) {
                        handleCropComplete(nextCrop, percentCrop);
                      }
                    }}
                    aspect={isAvatarMode ? 1 : undefined}
                    minHeight={10}
                    disabled={isManualCropLocked}
                  >
                    <img
                      ref={imgRef}
                      alt="Sprite to crop modal"
                      src={currentUrl}
                      onLoad={onImageLoad}
                      style={{
                        maxHeight: "60vh",
                      }}
                      crossOrigin={isLocalImageSource(currentUrl) ? undefined : "anonymous"}
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
