import type { AvatarCropContext, RoleAvatar, RoleAvatarVariant, RoleAvatarVariantCompositionConfig, SpriteCropContext } from "api";
import type { ReactNode } from "react";
import type { Coordinates } from "react-advanced-cropper";
import type { PixelCrop } from "react-image-crop";

import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useApplyCropAvatarMutation, useApplyCropMutation, useUpdateRoleAvatarVariantMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { appToast } from "@/components/common/appToast/appToast";
import { Button, buttonClassName } from "@/components/common/Button";
import { surfaceClassName, textClassName } from "@/components/common/DesignLanguage";
import { DialogFrame } from "@/components/common/DialogFrame";
import { Badge, ProgressBar } from "@/components/common/StatusPrimitives";
import { useIsMobile } from "@/utils/getScreenSize";
import {
  canvasPreview,
  canvasToBlob,
  useCropPreview,
} from "@/utils/imgCropper";
import { imageOriginalUrlFromUrl } from "@/utils/media/mediaUrl";

import type { PreviewAnchorPosition } from "../../Preview/previewAnchor";
import type { Transform } from "../TransformControl";

import { AvatarPreview } from "../../Preview/AvatarPreview";
import { RenderPreview } from "../../Preview/RenderPreview";
import {
  createAvatarCropContextFromImage,
  createAvatarCropContextFromSource,
  createSpriteCropContextFromImage,
  createSpriteCropContextFromSource,
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
import {
  createBatchCropApplicationProgress,
  createSingleCropApplicationProgress,
  type CropApplicationProgress,
} from "./cropApplicationProgress";
import { createCropPreparationKey, CurrentCropPreparation } from "./cropPreparation";
import { DeferredCropCommit } from "./deferredCropCommit";
import { resolveSpriteCropperOperationMode } from "./spriteCropperMode";
import {
  getCropSubmitTaskKey,
  isCropSubmitWaitingForUpload,
  resolveCropSubmitAvatar,
  type WaitForAvatarUpload,
} from "./spriteCropperUploadFlow";
import { createCropStateFromCoordinates, createInitialCropCoordinates } from "./zoomableCropMath";
import { ZoomableCropper } from "./ZoomableCropper";

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

function getPositiveAvatarId(value: unknown): number | undefined {
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

/** 单张立绘本地生效后交给父级调度的后台提交任务。 */
export type PendingSpriteCropSubmission = {
  avatar: RoleAvatar;
  localSpriteUrl: string;
  spriteCropContext: SpriteCropContext;
  spriteTransform?: RoleAvatar["spriteTransform"];
  submit: () => Promise<RoleAvatar>;
};

export type BatchSpriteCropApplyResult = {
  avatars: RoleAvatar[];
  totalCount: number;
  successCount: number;
  failedCount: number;
  pendingSpriteSubmissions?: PendingSpriteCropSubmission[];
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
  // 乐观上传中的头像在最终提交阶段解析为服务端记录
  waitForAvatarUpload?: WaitForAvatarUpload;
  // 头像裁剪提交前等待原图与后台立绘提交完成
  waitForAvatarCropSubmit?: WaitForAvatarUpload;
  // 裁剪工具栏最左侧的返回入口
  toolbarStart?: ReactNode;
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
  // 立绘组是一个批量配置单元，只有一张图时也不能退回普通单体裁剪。
  forceBatchMode?: boolean;
  // 立绘组初始化模式：裁剪完成后由外层创建并绑定 variant
  variantInitialization?: {
    active: boolean;
    name: string;
    onComplete: (result: VariantInitializationCropResult) => Promise<void> | void;
    onCancel?: () => void;
  };
  onBatchSpriteCropApplied?: (result: BatchSpriteCropApplyResult) => void;
  onSingleSpriteCropApplied?: (result: BatchSpriteCropApplyResult) => void;
  onAvatarCropApplied?: (result: BatchSpriteCropApplyResult) => void;
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
const CROP_FLOW_STEPS = [
  { label: "立绘裁剪", step: 1 },
  { label: "头像裁剪", step: 2 },
] as const;
const ignoreProgressDialogClose = () => undefined;

export function SpriteCropper({
  spriteUrl,
  roleAvatars,
  initialSpriteIndex = 0,
  characterName,
  onCropComplete,
  waitForAvatarUpload,
  waitForAvatarCropSubmit,
  toolbarStart,
  cropMode = "sprite",
  onSpriteIndexChange,
  selectedIndices = EMPTY_SET,
  isMultiSelectMode = false,
  availableVariants = EMPTY_VARIANTS,
  allowVariantGroupEditing = false,
  editingVariantGroup,
  forceBatchMode = false,
  variantInitialization,
  onBatchSpriteCropApplied,
  onSingleSpriteCropApplied,
  onAvatarCropApplied,
}: SpriteCropperProps) {
  const isMobile = useIsMobile();

  // 确定工作模式
  const isMutiAvatars = roleAvatars.length > 0;
  const isAvatarMode = cropMode === "avatar";
  const isVariantInitializationMode = isAvatarMode && Boolean(variantInitialization?.active);

  // 头像裁剪必须来自已生成立绘；立绘校正必须来自上传原图。
  const filteredAvatars = useMemo(() => roleAvatars.filter((avatar) => {
    if (isAvatarMode) {
      return Boolean(getSpriteCropSourceUrl(avatar));
    }
    return Boolean(getEffectiveOriginUrl(avatar));
  }), [isAvatarMode, roleAvatars]);
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
  const operationMode = resolveSpriteCropperOperationMode({
    isMultiSelectMode,
    selectedCount: selectedIndices.size,
    forceBatchMode,
  });
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
  const isCurrentAvatarStillUploading = isCropSubmitWaitingForUpload(currentAvatar);
  const selectedUploadingAvatarCount = selectedAvatarIndices
    .filter(index => isCropSubmitWaitingForUpload(filteredAvatars[index]))
    .length;
  const hasUploadingSelectedAvatars = selectedUploadingAvatarCount > 0;
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
  const initialCropCoordinates = useMemo(() => {
    if (isAvatarMode) {
      const configCoordinates = createInitialCropCoordinates(
        initialAvatarCompositionConfig?.avatarSlot,
        initialAvatarCompositionConfig?.canvas?.width,
        initialAvatarCompositionConfig?.canvas?.height,
      );
      if (configCoordinates) {
        return configCoordinates;
      }
      return createInitialCropCoordinates(
        currentAvatar?.avatarCropContext?.crop,
        currentAvatar?.avatarCropContext?.sourceWidth,
        currentAvatar?.avatarCropContext?.sourceHeight,
      );
    }
    const configCoordinates = createInitialCropCoordinates(
      initialAvatarCompositionConfig?.spriteCrop?.crop,
      initialAvatarCompositionConfig?.spriteCrop?.sourceWidth,
      initialAvatarCompositionConfig?.spriteCrop?.sourceHeight,
    );
    if (configCoordinates) {
      return configCoordinates;
    }
    return createInitialCropCoordinates(
      currentAvatar?.spriteCropContext?.crop,
      currentAvatar?.spriteCropContext?.sourceWidth,
      currentAvatar?.spriteCropContext?.sourceHeight,
    );
  }, [currentAvatar, initialAvatarCompositionConfig, isAvatarMode]);
  const rawCurrentUrl = getCurrentSourceUrl();
  const currentUrl = toCropCanvasSourceUrl(rawCurrentUrl);
  const currentAvatarId = getPositiveAvatarId(currentAvatar?.avatarId) ?? 0;
  const isCurrentAvatarMissing = isAvatarMode && Boolean(currentAvatar) && !currentAvatar?.avatarFileId;

  // 用于标识当前“切换到哪张图”的稳定 key：切换时立刻让预览进入不可见状态，避免中间帧闪烁
  const spriteSwitchKey = isMutiAvatars
    ? `${getCropSubmitTaskKey(filteredAvatars[currentSpriteIndex]) ?? `index:${currentSpriteIndex}`}:url:${currentUrl}`
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
  const [cropApplicationProgress, setCropApplicationProgress] = useState<CropApplicationProgress | null>(null);

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
  const [desktopCropControlsTarget, setDesktopCropControlsTarget] = useState<HTMLDivElement | null>(null);
  const handleDesktopCropControlsTarget = useCallback((node: HTMLDivElement | null) => {
    setDesktopCropControlsTarget(previous => previous === node ? previous : node);
  }, []);

  // 使用displayTransform作为实际的transform
  const transform = displayTransform;

  // 使用 useCropPreview 管理裁剪状态
  const {
    imgRef,
    previewCanvasRef,
    completedCrop,
    setCompletedCrop,
    previewDataUrl: currentAvatarUrl,
    reset: resetCropState,
  } = useCropPreview({
    mode: useCallback(() => isAvatarMode ? "avatar" : "sprite", [isAvatarMode]),
    // 坐标提交已在上游做尾随防抖，Canvas 收到新状态后立即绘制。
    debounceMs: 0,
    immediateFirstPreview: true,
    previewMaxSize: 512,
    enablePreviewUrlUpdate: false,
    // 让首次绘制延后一帧：给外部状态（如 transform）留出提交时间，避免“新画布 + 旧 transform”的中间帧
    deferInitialPreviewDraw: true,
    onCanvasUpdate: useCallback(() => {
      // Canvas 绘制完成即可展示，无需等待 PNG 编码。
      if (latestSwitchKeyRef.current === spriteSwitchKey) {
        setPreviewReadyKey(spriteSwitchKey);
        setRenderKey(prev => prev + 1);
      }
    }, [spriteSwitchKey]),
  });

  const cropCommitterRef = useRef<DeferredCropCommit | null>(null);
  if (!cropCommitterRef.current) {
    cropCommitterRef.current = new DeferredCropCommit(setCompletedCrop);
  }
  const cropCommitter = cropCommitterRef.current!;
  const cropPreparationRef = useRef<CurrentCropPreparation | null>(null);
  if (!cropPreparationRef.current) {
    cropPreparationRef.current = new CurrentCropPreparation();
  }
  const cropPreparation = cropPreparationRef.current!;

  useEffect(() => () => {
    cropCommitter.cancel();
    cropPreparation.clear();
  }, [cropCommitter, cropPreparation]);

  const flushPendingCropCommit = useCallback(() => {
    cropCommitter.flush();
  }, [cropCommitter]);

  // 图片加载后的扩展处理：同步裁剪源并解析立绘 Transform。
  const handleCropperImageReady = useCallback((image: HTMLImageElement) => {
    imgRef.current = image;
    if (!isAvatarMode) {
      const currentSprite = filteredAvatars[currentSpriteIndex];
      if (currentSprite) {
        const newTransform = (isManualCropLocked || isVariantGroupEditingMode)
          ? parseTransformFromSpriteTransform(currentCompositionConfig?.spriteTransform)
          : parseTransformFromAvatar(currentSprite);
        setDisplayTransform(newTransform);
      }
    }
  }, [currentCompositionConfig?.spriteTransform, imgRef, isAvatarMode, isManualCropLocked, isVariantGroupEditingMode, filteredAvatars, currentSpriteIndex]);

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
    cropCommitter.reset();
    cropPreparation.clear();
    resetCropState();
    setPreviewReadyKey("");
  }, [cropCommitter, cropPreparation, currentUrl, resetCropState]);

  const handleZoomableCropAreaChange = useCallback((coordinates: Coordinates, image: HTMLImageElement) => {
    const cropState = createCropStateFromCoordinates(coordinates, image);
    cropCommitter.schedule(spriteSwitchKey, cropState.completedCrop);
  }, [cropCommitter, spriteSwitchKey]);

  // 切换图片时立刻让预览不可见（不依赖 effect），等新预览绘制完成后再显示
  // 这里不需要显式清空 previewReadyKey：isPreviewReady 会因 key 不一致立即变为 false

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
  const renderCroppedImageBlobFromImg = useCallback(async (
    img: HTMLImageElement,
    cropToUse: PixelCrop,
    displaySize: { width: number; height: number },
    allowMainThreadFallback = true,
  ): Promise<Blob> => {
    // 使用 Worker 在后台线程处理图像裁剪
    try {
      const blob = await cropImage({
        img,
        crop: cropToUse,
        scale: 1,
        rotate: 0,
        displaySize: {
          width: displaySize.width,
          height: displaySize.height,
        },
      });
      return blob;
    }
    catch (error) {
      if (!allowMainThreadFallback) {
        throw error;
      }
      console.error("Worker 裁剪失败，回退到主线程处理:", error);

      // 回退方案：在主线程使用 OffscreenCanvas
      const scaleX = img.naturalWidth / displaySize.width;
      const scaleY = img.naturalHeight / displaySize.height;
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
          displaySize,
        },
      );

      return await canvasToBlob(outputCanvas);
    }
  }, [cropImage]);

  const getCropPreparationKey = useCallback((
    img: HTMLImageElement,
    crop: PixelCrop,
    displaySize: { width: number; height: number },
  ) => createCropPreparationKey({
    sourceKey: spriteSwitchKey,
    imageSrc: img.currentSrc || img.src,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    displayWidth: displaySize.width,
    displayHeight: displaySize.height,
    crop,
  }), [spriteSwitchKey]);

  const getCroppedImageBlobFromImg = useCallback(async (
    img: HTMLImageElement,
    options?: {
      crop?: PixelCrop;
      displaySize?: { width: number; height: number };
    },
  ): Promise<Blob> => {
    const cropToUse = options?.crop ?? cropCommitter.getLatest() ?? completedCrop;
    if (!cropToUse) {
      throw new Error("No completed crop");
    }

    const currentImg = imgRef.current;
    const displaySize = options?.displaySize ?? {
      width: currentImg?.width ?? 0,
      height: currentImg?.height ?? 0,
    };
    if (!displaySize.width || !displaySize.height) {
      throw new Error("Preview image size is 0");
    }

    const key = getCropPreparationKey(img, cropToUse, displaySize);
    return cropPreparation.read(key)
      ?? renderCroppedImageBlobFromImg(img, cropToUse, displaySize);
  }, [completedCrop, cropCommitter, cropPreparation, getCropPreparationKey, imgRef, renderCroppedImageBlobFromImg]);

  useEffect(() => {
    const img = imgRef.current;
    if (!completedCrop || !img?.naturalWidth || !img.naturalHeight || !img.width || !img.height) {
      return;
    }

    const displaySize = { width: img.width, height: img.height };
    const key = getCropPreparationKey(img, completedCrop, displaySize);
    cropPreparation.prepare(
      key,
      () => renderCroppedImageBlobFromImg(img, completedCrop, displaySize, false),
    );
  }, [completedCrop, cropPreparation, getCropPreparationKey, imgRef, renderCroppedImageBlobFromImg]);

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
      setCropApplicationProgress(createSingleCropApplicationProgress("preparing"));
      let appliedAvatarResult: RoleAvatar | null = null;

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

      cropCommitter.cancel();
      const cropSnapshot = cropCommitter.getLatest() ?? completedCrop;
      if (!cropSnapshot) {
        throw new Error("No completed crop");
      }

      const ready = await waitForPreviewReady();
      const img = imgRef.current;
      if (!ready || !img) {
        throw new Error("图片预览尚未准备完成，请稍后再试");
      }
      const croppedBlob = await getCroppedImageBlobFromImg(img, { crop: cropSnapshot });

      // --- 共同的 Mutation 调用逻辑 ---
      if (isAvatarMode) {
        if (waitForAvatarCropSubmit || isCropSubmitWaitingForUpload(currentAvatar)) {
          setCropApplicationProgress(createSingleCropApplicationProgress("waitingForUpload"));
        }
        const submitAvatar = waitForAvatarCropSubmit
          ? await waitForAvatarCropSubmit(currentAvatar)
          : await resolveCropSubmitAvatar(currentAvatar, waitForAvatarUpload);
        const avatarId = getPositiveAvatarId(submitAvatar.avatarId);
        if (!submitAvatar.roleId || !avatarId) {
          throw new Error("头像记录尚未准备完成，无法提交裁剪");
        }
        const avatarCropContext = createAvatarCropContextFromImage(
          cropSnapshot,
          img,
          submitAvatar.spriteFileId,
        );
        if (!avatarCropContext) {
          throw new Error("无法生成头像裁剪上下文");
        }
        setCropApplicationProgress(createSingleCropApplicationProgress("uploading"));
        const updateRes = await applyCropAvatarMutation.mutateAsync({
          roleId: submitAvatar.roleId,
          avatarId,
          croppedImageBlob: croppedBlob,
          currentAvatar: submitAvatar,
          avatarCropContext,
          variantId: submitAvatar.variantId,
        });
        if (!updateRes?.success || !updateRes.data) {
          throw new Error(updateRes?.errMsg || "头像上传失败");
        }
        const updatedAvatar = {
          ...submitAvatar,
          ...updateRes.data,
          avatarCropContext,
        };
        appliedAvatarResult = updatedAvatar;
        setCropApplicationProgress(createSingleCropApplicationProgress("saving"));
        if (isVariantGroupEditingMode) {
          const nextCompositionConfig = withFallbackSpriteCrop(
            createVariantCompositionConfigFromAvatarCropContext(
              avatarCropContext,
              updatedAvatar.spriteCropContext ?? submitAvatar.spriteCropContext,
              currentCompositionConfig?.spriteTransform,
            ),
            currentCompositionConfig,
          );
          await updateEditingVariantCompositionConfig(nextCompositionConfig);
        }
        if (isVariantInitializationMode) {
          const compositionConfig = createVariantCompositionConfigFromAvatarCropContext(
            avatarCropContext,
            submitAvatar.spriteCropContext,
            submitAvatar.spriteTransform,
          );
          if (!compositionConfig?.spriteCrop) {
            throw new Error("无法生成立绘组合成配置");
          }
          await variantInitialization?.onComplete({
            baseAvatar: updatedAvatar,
            compositionConfig,
            croppedAvatars: [{
              avatar: updatedAvatar,
              avatarCropContext,
            }],
          });
        }
      }
      else {
        const spriteCropContext = createSpriteCropContextFromImage(
          cropSnapshot,
          img,
          currentAvatar.originFileId,
        );
        if (!spriteCropContext) {
          throw new Error("无法生成立绘裁剪上下文");
        }
        const spriteTransform = applyTransform
          ? toSpriteTransformPayload(transform)
          : currentAvatar.spriteTransform;
        const submitSpriteCrop = async (reportProgress = false) => {
          if (reportProgress && isCropSubmitWaitingForUpload(currentAvatar)) {
            setCropApplicationProgress(createSingleCropApplicationProgress("waitingForUpload"));
          }
          const submitAvatar = await resolveCropSubmitAvatar(currentAvatar, waitForAvatarUpload);
          const avatarId = getPositiveAvatarId(submitAvatar.avatarId);
          if (!submitAvatar.roleId || !avatarId) {
            throw new Error("头像记录尚未准备完成，无法提交裁剪");
          }
          const submitSpriteCropContext = {
            ...spriteCropContext,
            sourceOriginFileId: submitAvatar.originFileId ?? spriteCropContext.sourceOriginFileId,
          };
          if (reportProgress) {
            setCropApplicationProgress(createSingleCropApplicationProgress("uploading"));
          }
          const updateRes = await applyCropMutation.mutateAsync({
            roleId: submitAvatar.roleId,
            avatarId,
            croppedImageBlob: croppedBlob,
            transform: applyTransform ? transform : undefined,
            currentAvatar: submitAvatar,
            spriteCropContext: submitSpriteCropContext,
          });
          if (!updateRes?.success || !updateRes.data) {
            throw new Error(updateRes?.errMsg || "立绘上传失败");
          }
          if (reportProgress) {
            setCropApplicationProgress(createSingleCropApplicationProgress("saving"));
          }
          if (isVariantGroupEditingMode) {
            await updateEditingVariantCompositionConfig(
              createCompositionConfigFromSpriteCropContext(
                currentCompositionConfig,
                submitSpriteCropContext,
                applyTransform ? transform : undefined,
              ),
            );
          }
          return {
            ...submitAvatar,
            ...updateRes.data,
            spriteCropContext: submitSpriteCropContext,
            spriteTransform,
          };
        };

        if (onSingleSpriteCropApplied) {
          const localSpriteUrl = URL.createObjectURL(croppedBlob);
          const previewAvatar = {
            ...currentAvatar,
            localAvatarUrl: localSpriteUrl,
            localSpriteUrl,
            spriteCropContext,
            spriteTransform,
          } as RoleAvatar;
          onSingleSpriteCropApplied({
            avatars: [previewAvatar],
            totalCount: 1,
            successCount: 1,
            failedCount: 0,
            pendingSpriteSubmissions: [{
              avatar: previewAvatar,
              localSpriteUrl,
              spriteCropContext,
              spriteTransform,
              submit: submitSpriteCrop,
            }],
          });
        }
        else {
          await submitSpriteCrop(true);
          appToast.success("立绘已应用");
        }
      }

      // --- 共同的回调逻辑 ---
      setCropApplicationProgress(createSingleCropApplicationProgress("updatingPreview"));
      if (isAvatarMode && appliedAvatarResult) {
        onAvatarCropApplied?.({
          avatars: [appliedAvatarResult],
          totalCount: 1,
          successCount: 1,
          failedCount: 0,
        });
      }
      if (onCropComplete) {
        onCropComplete(await blobToDataUrl(croppedBlob));
      }
    }
    catch (error) {
      console.error("应用裁剪失败:", error);
      appToast.error(error instanceof Error ? error.message : "应用裁剪失败");
    }
    finally {
      setCropApplicationProgress(null);
      setIsCropping(false);
    }
  }

  /**
   * 应用相同裁剪参数到选中的头像/立绘
   * 优化版本：并行处理 + 并发控制
   * @param applyTransform 是否同时应用变换（仅立绘模式有效）
   */
  async function handleBatchCropAll(applyTransform: boolean = false) {
    const cropSnapshot = cropCommitter.getLatest() ?? completedCrop;
    if (!isMutiAvatars || !cropSnapshot)
      return;

    cropCommitter.cancel();

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
      setCropApplicationProgress(createBatchCropApplicationProgress("preparing", {
        itemTotal: avatarsToProcess.length,
      }));
      if (shouldRespectVariantLock && avatarsToProcess.some(avatar => isAvatarVariantLocked(avatar))) {
        throw new Error("所选头像包含已绑定立绘组，裁剪已锁定");
      }

      const ready = await waitForPreviewReady();
      if (!ready) {
        throw new Error("Preview not ready for batch crop");
      }

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
      setCropApplicationProgress(createBatchCropApplicationProgress("loading", {
        itemTotal: avatarsToProcess.length,
      }));

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
          if (!imageUrl) {
            loadFail += 1;
            loadDone += 1;
            if (loadDone % 2 === 0 || loadDone === avatarsToProcess.length) {
              setCropApplicationProgress(createBatchCropApplicationProgress("loading", {
                completed: loadDone,
                itemTotal: avatarsToProcess.length,
                success: loadSuccess,
                failed: loadFail,
              }));
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
              setCropApplicationProgress(createBatchCropApplicationProgress("loading", {
                completed: loadDone,
                itemTotal: avatarsToProcess.length,
                success: loadSuccess,
                failed: loadFail,
              }));
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
      setCropApplicationProgress(createBatchCropApplicationProgress("cropping", {
        itemTotal: loadedImages.length,
      }));

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
              setCropApplicationProgress(createBatchCropApplicationProgress("cropping", {
                completed: cropDone,
                itemTotal: loadedImages.length,
                success: cropSuccess,
                failed: cropFail,
              }));
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
              setCropApplicationProgress(createBatchCropApplicationProgress("cropping", {
                completed: cropDone,
                itemTotal: loadedImages.length,
                success: cropSuccess,
                failed: cropFail,
              }));
            }
          }
        },
      );

      const croppedResults = cropResults.filter(isNonNullable);
      const successCount = croppedResults.length;
      console.warn(`裁剪完成，成功 ${successCount}/${loadedImages.length} 张`);

      // 阶段3：上传结果（并发控制）
      console.warn(`进入上传阶段，待上传 ${croppedResults.length} 张图片`);
      setCropApplicationProgress(createBatchCropApplicationProgress("uploading", {
        itemTotal: croppedResults.length,
      }));

      if (croppedResults.length === 0) {
        console.error("没有可上传的图片，跳过上传阶段");
        appToast.error("批量处理中断：没有可上传的图片", { id: toastId });
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
              setCropApplicationProgress(createBatchCropApplicationProgress("uploading", {
                completed: uploadDone,
                itemTotal: croppedResults.length,
                success: uploadSuccess,
                failed: uploadFail,
              }));
            }
            console.warn("跳过无效上传项", { idx, item });
            return null;
          }

          try {
            const submitAvatar = waitForAvatarCropSubmit
              ? await waitForAvatarCropSubmit(item.avatar)
              : await resolveCropSubmitAvatar(item.avatar, waitForAvatarUpload);
            const avatarId = getPositiveAvatarId(submitAvatar.avatarId);
            if (!submitAvatar.roleId || !avatarId) {
              throw new Error("头像记录尚未准备完成，无法提交裁剪");
            }
            if (isAvatarMode) {
              const avatarCropContext = createAvatarCropContextFromSource(
                cropSnapshot,
                item.img.naturalWidth,
                item.img.naturalHeight,
                item.img.naturalWidth / displaySnapshot.width,
                item.img.naturalHeight / displaySnapshot.height,
                submitAvatar.spriteFileId,
              );
              if (!avatarCropContext) {
                throw new Error("无法生成头像裁剪上下文");
              }
              const updateRes = await applyCropAvatarMutation.mutateAsync({
                roleId: submitAvatar.roleId,
                avatarId,
                croppedImageBlob: item.croppedBlob,
                currentAvatar: submitAvatar,
                avatarCropContext,
                variantId: submitAvatar.variantId,
              });
              if (!updateRes?.success || !updateRes.data) {
                throw new Error(updateRes?.errMsg || "头像上传失败");
              }
              if (isVariantInitializationMode || isVariantGroupEditingMode) {
                uploadedAvatarCropResults.push({
                  avatar: {
                    ...submitAvatar,
                    ...updateRes.data,
                    avatarCropContext,
                  },
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
                submitAvatar.originFileId,
              );
              if (!spriteCropContext) {
                throw new Error("无法生成立绘裁剪上下文");
              }
              const updateRes = await applyCropMutation.mutateAsync({
                roleId: submitAvatar.roleId,
                avatarId,
                croppedImageBlob: item.croppedBlob,
                transform: applyTransform ? transform : undefined, // 根据参数决定是否应用transform
                currentAvatar: submitAvatar,
                spriteCropContext,
              });
              if (!updateRes?.success) {
                throw new Error("立绘上传失败");
              }
              uploadedSpriteCropResults.push({
                ...submitAvatar,
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
              setCropApplicationProgress(createBatchCropApplicationProgress("uploading", {
                completed: uploadDone,
                itemTotal: croppedResults.length,
                success: uploadSuccess,
                failed: uploadFail,
              }));
            }
          }
        },
      );

      const uploadSuccessCount = uploadResults.filter(Boolean).length;
      console.warn(`上传阶段完成，成功 ${uploadSuccessCount}/${croppedResults.length} 张`);
      const totalCount = avatarsToProcess.length;
      const totalFail = Math.max(0, totalCount - uploadSuccessCount);
      setCropApplicationProgress(createBatchCropApplicationProgress("saving", {
        completed: totalCount,
        itemTotal: totalCount,
        success: uploadSuccessCount,
        failed: totalFail,
      }));
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
        appToast.success(`立绘组创建完成：成功 ${uploadSuccessCount}/${totalCount}`, { id: toastId });
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
          appToast.success(`立绘组更新完成：成功 ${uploadSuccessCount}/${totalCount}`, { id: toastId });
        }
        else {
          appToast.error(`立绘组更新完成：成功 ${uploadSuccessCount}/${totalCount}，失败 ${totalFail}`, { id: toastId });
        }
      }
      else if (totalFail === 0) {
        appToast.success(`批量处理完成：成功 ${uploadSuccessCount}/${totalCount}`, { id: toastId });
      }
      else {
        appToast.error(`批量处理完成：成功 ${uploadSuccessCount}/${totalCount}，失败 ${totalFail}`, { id: toastId });
      }
      if (!isAvatarMode && uploadSuccessCount > 0) {
        onBatchSpriteCropApplied?.({
          avatars: uploadedSpriteCropResults,
          totalCount,
          successCount: uploadSuccessCount,
          failedCount: totalFail,
        });
      }
      if (isAvatarMode && uploadSuccessCount > 0) {
        onAvatarCropApplied?.({
          avatars: uploadedAvatarCropResults.map(item => item.avatar),
          totalCount,
          successCount: uploadSuccessCount,
          failedCount: totalFail,
        });
      }
    }
    catch (error) {
      console.error("批量裁剪失败:", error);
      const errMsg = error instanceof Error ? error.message : "未知错误";
      appToast.error(`批量裁剪失败：${errMsg}`, { id: toastId });
    }
    finally {
      setCropApplicationProgress(null);
      setIsCropping(false);
    }
  }

  const handlePreviewPanelClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isMobile) {
      return;
    }
    if (isManualCropLocked) {
      appToast.error("已绑定立绘组，裁剪已锁定");
      return;
    }

    const target = event.target as HTMLElement | null;
    // 交互控件（按钮/输入等）点击时不打开裁剪弹窗，避免移动端误触。
    if (target?.closest("button, a, input, select, textarea, [role=\"button\"], [data-no-crop-modal=\"true\"]")) {
      return;
    }

    setIsCropModalOpen(true);
  }, [isManualCropLocked, isMobile]);

  const handlePreviewPanelKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isMobile) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    if (isManualCropLocked) {
      appToast.error("已绑定立绘组，裁剪已锁定");
      return;
    }
    setIsCropModalOpen(true);
  }, [isManualCropLocked, isMobile]);

  const isManualApplyDisabled = !completedCrop
    || !isPreviewReady
    || !isCanvasReady()
    || isProcessing
    || isManualCropLocked
    || (operationMode === "batch" && hasLockedSelectedAvatars);
  const cropApplyButtonLabel = isVariantInitializationMode
    ? operationMode === "batch" ? "批量创建立绘组" : "创建立绘组"
    : isAvatarMode ? "应用裁剪" : operationMode === "batch" ? "批量应用立绘" : "一键应用";
  const cropApplyHint = operationMode === "batch"
    ? hasUploadingSelectedAvatars
      ? `已选头像中有 ${selectedUploadingAvatarCount} 个仍在上传，可立即裁剪，提交时自动等待上传完成。`
      : hasLockedSelectedAvatars
      ? `已选头像中有 ${selectedLockedAvatarCount} 个绑定了立绘组，裁剪已锁定。`
      : isVariantInitializationMode
        ? "当前裁剪框会作为立绘组头像槽位，并应用到已选头像。"
        : isAvatarMode
          ? "批量模式会将当前裁剪框应用到已选头像。"
          : "批量模式会先上传已选立绘，完成后可继续创建立绘组。"
    : isManualCropLocked
      ? "已绑定立绘组，裁剪已锁定。"
      : isCurrentAvatarStillUploading
        ? "图片正在上传，可继续裁剪，提交时自动等待上传完成。"
      : "";
  const cropModeLabel = isVariantInitializationMode
    ? `${operationMode === "single" ? "创建立绘组" : `批量创建立绘组 · 已选 ${selectedIndices.size} 个`}${
      variantInitialization?.name ? ` · ${variantInitialization.name}` : ""
    }`
    : operationMode === "single"
      ? "单体模式"
      : `批量模式 · 已选 ${selectedIndices.size} 个`;
  const cropApplyButton = (
    <Button
      variant="primary"
      size="sm"
      className="min-w-24"
      data-no-crop-modal="true"
      onClick={(e) => {
        e.stopPropagation();
        if (operationMode === "batch") {
          handleBatchCropAll(!isAvatarMode);
          return;
        }
        handleApplyCrop(!isAvatarMode);
      }}
      disabled={isManualApplyDisabled}
      loading={isCropping}
    >
      {cropApplyButtonLabel}
    </Button>
  );
  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
      {/* 裁剪流程与操作统一收拢在单行工具栏中。 */}
      <div className={surfaceClassName({
        level: "content",
        className: "mb-2 flex w-full min-w-0 flex-wrap items-center gap-2 p-1.5 md:flex-nowrap",
      })}>
        {toolbarStart}
        <ol className="flex min-w-0 shrink-0 items-center gap-1" aria-label="裁剪流程">
          {CROP_FLOW_STEPS.map((step, index) => {
              const isActiveStep = step.step === (isAvatarMode ? 2 : 1);
              return (
                <li
                  key={step.step}
                  className="flex min-w-0 items-center gap-1"
                  aria-current={isActiveStep ? "step" : undefined}
                >
                  <Badge
                    tone={isActiveStep ? "info" : "neutral"}
                    appearance={isActiveStep ? "solid" : "ghost"}
                    className="gap-1.5"
                  >
                    <span className="font-semibold tabular-nums">
                      {step.step}
                    </span>
                    <span>
                      {step.label}
                    </span>
                  </Badge>
                  {index < CROP_FLOW_STEPS.length - 1 && (
                    <ArrowRightIcon className="size-icon-compact shrink-0 text-base-content/30" aria-hidden="true" />
                  )}
                </li>
              );
            })}
        </ol>
        <h3 className={textClassName({
          variant: "supporting",
          wrap: "truncate",
          className: "min-w-0 flex-1",
        })}>
          {cropModeLabel}
        </h3>
        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2">
          {cropApplyHint && (
            <div
              className={textClassName({
                variant: "supporting",
                wrap: "truncate",
                className: "hidden max-w-72 text-right 2xl:block",
              })}
              title={cropApplyHint}
            >
              {cropApplyHint}
            </div>
          )}
          {cropApplyButton}
        </div>
      </div>

      <div className={surfaceClassName({
        level: "inset",
        className: "relative min-h-0 flex-1 overflow-hidden",
      })}>
        <div className="
          grid h-full min-h-0 grid-cols-1 items-stretch overflow-auto p-2
          sm:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] sm:overflow-hidden
        ">
          {/* 左侧：原始图片裁剪区域 - 移动端隐藏，通过弹窗显示 */}
          <div className="
            order-2 hidden w-full shrink-0 flex-col items-center p-2
            sm:order-1 sm:flex sm:h-full sm:min-w-0 sm:w-auto
          ">
            {!isMobile && currentUrl && (
              <div className="relative flex h-full min-h-0 w-full flex-col">
                {isBatchMode && (
                  <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <button
                      type="button"
                      className={buttonClassName({
                        size: "xs",
                        shape: "circle",
                        className: "bg-base-100/80 hover:bg-base-100 shadow",
                      })}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectedSwitch("prev");
                      }}
                      disabled={!hasPrevSelected || isProcessing}
                      title="上一个选中头像"
                      aria-label="上一个选中头像"
                    >
                      <CaretLeftIcon className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={buttonClassName({
                        size: "xs",
                        shape: "circle",
                        className: "bg-base-100/80 hover:bg-base-100 shadow",
                      })}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectedSwitch("next");
                      }}
                      disabled={!hasNextSelected || isProcessing}
                      title="下一个选中头像"
                      aria-label="下一个选中头像"
                    >
                      <CaretRightIcon className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
                <ZoomableCropper
                  key={`${spriteSwitchKey}:desktop`}
                  image={currentUrl}
                  aspect={isAvatarMode ? 1 : undefined}
                  initialCoordinates={initialCropCoordinates}
                  disabled={isManualCropLocked}
                  className="h-[min(64vh,680px)] sm:h-full"
                  controlsPortalTarget={desktopCropControlsTarget}
                  onAreaChange={handleZoomableCropAreaChange}
                  onAreaChangeEnd={flushPendingCropCommit}
                  onImageReady={handleCropperImageReady}
                />
              </div>
            )}
          </div>

          {isMobile && !completedCrop && currentUrl && (
            <div className="order-1 flex w-full items-center justify-center p-4 sm:hidden">
              <Button
                variant="outline"
                onClick={() => {
                  if (isManualCropLocked) {
                    appToast.error("已绑定立绘组，裁剪已锁定");
                    return;
                  }
                  setIsCropModalOpen(true);
                }}
              >
                打开裁剪并预览
              </Button>
            </div>
          )}

          {/* 右侧：裁剪预览和控制 - 移动端放上面 */}
          {currentUrl && (
            <div className="
              order-1 flex w-full shrink-0 flex-col items-start p-2
              sm:order-2 sm:h-full sm:min-w-0 sm:w-auto sm:overflow-y-auto
            ">
              {/* 预览内容区域 */}
              {completedCrop && (
                <div
                  className="
                    relative flex w-full flex-col cursor-pointer
                    sm:cursor-default
                  "
                  onClick={handlePreviewPanelClick}
                  onKeyDown={handlePreviewPanelKeyDown}
                  {...(isMobile
                    ? { role: "button" as const, tabIndex: 0, "aria-label": "打开裁剪区域调整" }
                    : {})}
                >
                  {/* 移动端点击提示 */}
                  <div className="
                    absolute bottom-3 right-3 z-10 rounded bg-base-100/70 px-2 py-1
                    pointer-events-none text-[11px] text-base-content/60 backdrop-blur-sm
                    sm:hidden
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
                            isAvatarMissing={isCurrentAvatarMissing}
                            characterName={characterName}
                            hideTitle={true}
                            layout={isMobile ? "toggle" : "vertical"}
                            chatMessages={["点击进行头像矫正"]}
                          />
                        )
                      : (
                          <div
                            className="w-full"
                            style={{ visibility: isPreviewReady ? "visible" : "hidden" }}
                          >
                            <RenderPreview
                              previewCanvasRef={previewCanvasRef}
                              transform={transform}
                              anchorPosition={previewAnchorPosition}
                              characterName={characterName}
                              dialogContent="点击进行立绘矫正"
                            />
                          </div>
                        )}
                  </div>
                </div>
              )}

              {!isMobile && (
                <div
                  ref={handleDesktopCropControlsTarget}
                  className={completedCrop ? "mt-3 w-full" : "w-full"}
                  data-no-crop-modal="true"
                />
              )}

              {!isAvatarMode && completedCrop && (
                <div className="mt-3 w-full" data-no-crop-modal="true">
                  <TransformControl
                    transform={transform}
                    setTransform={setDisplayTransform}
                    anchorPosition={previewAnchorPosition}
                    setAnchorPosition={setPreviewAnchorPosition}
                    disabled={isManualCropLocked}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 移动端裁剪弹窗 */}
      <DialogFrame
        open={isCropModalOpen}
        mode="inline"
        onClose={() => setIsCropModalOpen(false)}
        ariaLabel="调整裁剪区域"
        closeButtonLabel="关闭裁剪区域调整"
        rootClassName="z-50 bg-black/50 sm:hidden"
        panelClassName="
          m-3 flex h-[min(90dvh,44rem)] w-[calc(100%-1.5rem)] max-w-lg
          flex-col overflow-hidden rounded-lg bg-base-100 !p-0
        "
      >
            <div className="shrink-0 border-b border-base-300 px-4 py-3">
              <h3 className="text-base font-semibold">调整裁剪区域</h3>
              <p className="mt-0.5 text-xs text-base-content/55">拖动画面定位，双指缩放</p>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-3">
              {isMobile && isCropModalOpen && currentUrl && (
                <div className="relative h-full min-h-0 w-full">
                  {isBatchMode && (
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                      <button
                        type="button"
                        className={buttonClassName({
                          size: "xs",
                          shape: "circle",
                          className: "bg-base-100/80 hover:bg-base-100 shadow",
                        })}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectedSwitch("prev");
                        }}
                        disabled={!hasPrevSelected || isProcessing}
                        title="上一个选中头像"
                        aria-label="上一个选中头像"
                      >
                        <CaretLeftIcon className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={buttonClassName({
                          size: "xs",
                          shape: "circle",
                          className: "bg-base-100/80 hover:bg-base-100 shadow",
                        })}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectedSwitch("next");
                        }}
                        disabled={!hasNextSelected || isProcessing}
                        title="下一个选中头像"
                        aria-label="下一个选中头像"
                      >
                        <CaretRightIcon className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  <ZoomableCropper
                    key={`${spriteSwitchKey}:modal`}
                    image={currentUrl}
                    aspect={isAvatarMode ? 1 : undefined}
                    initialCoordinates={initialCropCoordinates}
                    disabled={isManualCropLocked}
                    className="h-full"
                    onAreaChange={handleZoomableCropAreaChange}
                    onAreaChangeEnd={flushPendingCropCommit}
                    onImageReady={handleCropperImageReady}
                  />
                </div>
              )}
            </div>
            <div className="flex shrink-0 justify-end border-t border-base-300 px-4 py-3">
              <Button
                variant="primary"
                onClick={() => setIsCropModalOpen(false)}
              >
                确定
              </Button>
            </div>
      </DialogFrame>

      <DialogFrame
        open={cropApplicationProgress !== null}
        mode="inline"
        onClose={ignoreProgressDialogClose}
        ariaLabel="正在应用裁剪"
        closeOnOverlayClick={false}
        closeOnEscape={false}
        rootClassName="z-[80] bg-black/50"
        panelClassName="!max-w-sm overflow-hidden !p-0"
      >
        {cropApplicationProgress && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-base-content">正在应用裁剪</h3>
                <p className="mt-1 text-sm text-base-content/70">{cropApplicationProgress.label}</p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-base-content/55">
                {cropApplicationProgress.current}
                /
                {cropApplicationProgress.total}
              </span>
            </div>
            <ProgressBar
              value={cropApplicationProgress.current}
              max={cropApplicationProgress.total}
              label={cropApplicationProgress.label}
              className="h-2 w-full"
            />
            <p className="mt-3 text-xs text-base-content/55">
              {cropApplicationProgress.detail}
            </p>
          </div>
        )}
      </DialogFrame>
    </div>
  );
}
