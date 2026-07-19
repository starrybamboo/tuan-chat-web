import type { RoleAvatar, RoleAvatarVariant, RoleAvatarVariantCompositionConfig } from "api";

import {
  ArrowLeftIcon,
  FolderOpenIcon,
  GearIcon,
  ImageIcon,
  TrashIcon,
  UserCircleIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useApplyCropAvatarMutation,
  useApplyCropMutation,
  useCreateRoleAvatarVariantMutation,
  useDeleteRoleAvatarVariantMutation,
  useDeleteRoleAvatarMutation,
  useRoleAvatarVariantsQuery,
  useReserveRoleAvatarMutation,
  useSetDefaultRoleAvatarMutation,
  useUpdateRoleAvatarMutation,
  useUpdateRoleAvatarVariantMutation,
  useUploadAvatarMutation,
} from "api/hooks/RoleAndAvatarHooks";
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "vaul";

import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { surfaceClassName, textClassName } from "@/components/common/DesignLanguage";
import { IconButton } from "@/components/common/IconButton";
import { MediaImage } from "@/components/common/mediaImage";
import { InlineAlert } from "@/components/common/StatusPrimitives";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { ensureRoleAvatarDefaultMedia } from "@/components/Role/RoleCreation/hooks/createRoleDefaultAvatar";
import { isMobileScreen } from "@/utils/getScreenSize";
import { canvasPreview, canvasToBlob } from "@/utils/imgCropper";
import { normalizeImageFileOrNull } from "@/utils/media/mediaMime";
import { calculateFileSha256 } from "@/utils/media/mediaUpload";
import { imageOriginalUrlFromUrl } from "@/utils/media/mediaUrl";

import type { AvatarUploadFilesContext } from "../RoleInfoCard/AvatarUploadCropper";
import type { Role } from "../types";
import type { BatchSpriteCropApplyResult, PendingSpriteCropSubmission, VariantInitializationCropResult } from "./Tabs/SpriteCropper";
import type { WaitForAvatarUpload } from "./Tabs/spriteCropperUploadFlow";

import {
  canReuseAvatarMediaForVariantConfig,
  createAvatarCropContextFromVariantConfig,
  createPixelSpriteCropFromVariantConfig,
  createPixelCropFromVariantConfig,
  createSpriteCropContextFromVariantConfig,
  isOriginImageCompatibleWithVariantConfig,
} from "./avatarCropContext";
import { resolveAvatarUploadName } from "./avatarUploadName";
import { enqueueAvatarUploadWorkflow, removeAvatarUploadWorkflow } from "./avatarUploadWorkflowQueue";
import { type DefaultSpriteMediaUploadResult, uploadOriginAndDefaultSpriteMedia } from "./defaultSpriteMedia";
import { useAvatarDeletion } from "./hooks/useAvatarDeletion";
import {
  AvatarCalibrationPreviewPanel,
  AvatarSettingsTab,
  buildAvatarCalibrationWorkflowProgress,
} from "./Tabs/AvatarSettingsTab";
import { SpriteCropper } from "./Tabs/SpriteCropper";
import { getCropSubmitTaskKey, SpriteCropSubmissionCoordinator } from "./Tabs/spriteCropperUploadFlow";
import { SpriteListGrid } from "./Tabs/SpriteListGrid";
import { VariantAssignmentDialog } from "./Tabs/VariantAssignmentDialog";
import {

  getEffectiveAvatarUrl,
  getEffectiveOriginUrl,
  getEffectiveSpriteOriginalUrl,
  getEffectiveSpriteUrl,
  getSpriteCropSourceUrl,
  parseTransformFromAvatar,
  parseTransformFromVariantConfig,
  toSpriteTransformPayload,
} from "./utils";
import { buildVariantAssignmentFailureToast } from "./variantAssignmentFailure";
import { getVariantFolderClickAction } from "./variantFolderInteraction";

export type SettingsTab = "cropper" | "avatarCropper" | "setting";

const UNGROUPED_VARIANT_KEY = "__ungrouped__";
const DEFAULT_VARIANT = "未分组";
// 头像优先随左栏缩小；缩到下限后再减少列数，避免出现半列空白。
const AVATAR_LIST_GRID_TEMPLATE_COLUMNS = "repeat(auto-fit, minmax(min(5.75rem, 100%), 1fr))";
const AVATAR_FOLDER_GRID_TEMPLATE_COLUMNS = "repeat(auto-fill, minmax(min(5.75rem, 100%), 1fr))";
const AVATAR_FOLDER_STACK_CARD_CLASS_NAMES = [
  "left-[6%] top-[22%] z-[1] rotate-[-12deg] opacity-70 scale-[0.76]",
  "right-[5%] top-[15%] z-[2] rotate-[10deg] opacity-80 scale-[0.8]",
  "left-[18%] bottom-[8%] z-[3] rotate-[6deg] opacity-90 scale-[0.84]",
  "left-1/2 top-1/2 z-[4] -translate-x-1/2 -translate-y-1/2 rotate-[-1deg] opacity-100 scale-100",
] as const;
const selectedVariantFolderClassName = "border-warning bg-warning/15 shadow-lg ring-1 ring-inset ring-warning/70 dark:bg-warning/20";
const selectedVariantFolderLabelClassName = "text-warning";

type PendingVariantInitialization = {
  name: string;
  existingVariantId?: number;
}

type PendingUploadAvatarWorkflow = {
  avatarIds: number[];
  target: AvatarUploadFilesContext["target"];
  batchKey: string;
}

type OptimisticUploadAvatar = RoleAvatar & {
  localAvatarUrl: string;
  localOriginUrl: string;
  localSpriteUrl: string;
  optimisticUploadKey: string;
  optimisticUploadPending: boolean;
}

type OptimisticAvatarUploadCompletion = {
  promise: Promise<RoleAvatar>;
  resolve: (avatar: RoleAvatar) => void;
  reject: (error: unknown) => void;
}

type LocalSpriteCropOverride = {
  localSpriteUrl: string;
  spriteCropContext?: RoleAvatar["spriteCropContext"];
  spriteTransform?: RoleAvatar["spriteTransform"];
};

function createOptimisticAvatarUploadCompletion(): OptimisticAvatarUploadCompletion {
  let resolve!: (avatar: RoleAvatar) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<RoleAvatar>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  // 等待者会在最终提交阶段接收错误；这里提前挂载处理器，避免用户尚未点击提交时产生未处理拒绝。
  void promise.catch(() => undefined);
  return { promise, resolve, reject };
}

function getOptimisticUploadKey(avatar: RoleAvatar | undefined) {
  return (avatar as (RoleAvatar & { optimisticUploadKey?: string }) | undefined)?.optimisticUploadKey;
}

type PendingVariantRemovalConfirm =
  | {
    mode: "deleteVariant";
    variantId: number;
    label: string;
    avatarCount: number;
  }
  | {
    mode: "unassignAvatars";
    avatars: RoleAvatar[];
    label: string;
    avatarCount: number;
  }

type AvatarUploadFilesSelectedContext = AvatarUploadFilesContext & {
  uploadDefaults?: Pick<RoleAvatar, "category" | "variantId">;
}

function getAvatarVariantKey(avatar: RoleAvatar | null | undefined) {
  const variantId = normalizeVariantId(avatar?.variantId);
  return variantId
    ? String(variantId)
    : UNGROUPED_VARIANT_KEY;
}

function normalizeVariantId(value: unknown): number | null {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return Math.floor(raw);
}

function getVariantDisplayName(variant: RoleAvatarVariant) {
  const variantId = normalizeVariantId(variant.variantId);
  return String(variant.name ?? "").trim() || `立绘组 ${variantId ?? ""}`;
}

function getAvatarVariantLabel(avatar: RoleAvatar | null | undefined) {
  const variantKey = getAvatarVariantKey(avatar);
  if (variantKey === UNGROUPED_VARIANT_KEY) {
    return DEFAULT_VARIANT;
  }
  return String(avatar?.variantGroup?.name ?? "").trim() || `立绘组 ${variantKey}`;
}

function getFallbackVariantLabel(variantKey: string) {
  if (variantKey === UNGROUPED_VARIANT_KEY) {
    return DEFAULT_VARIANT;
  }
  return `立绘组 ${variantKey}`;
}

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
    return Promise.reject(new Error("图片地址为空"));
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!isLocalImageSource(src)) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => {
      image.width = image.naturalWidth;
      image.height = image.naturalHeight;
      resolve(image);
    };
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
}

function createCropOutputCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function createCroppedSpriteAndAvatarByVariantConfig(
  avatar: RoleAvatar,
  config: RoleAvatarVariantCompositionConfig,
) {
  const sourceUrl = getEffectiveOriginUrl(avatar);
  if (!sourceUrl) {
    throw new Error("缺少可裁剪的原图");
  }

  if (!createSpriteCropContextFromVariantConfig(config)) {
    throw new Error("目标立绘组缺少立绘裁剪配置，请先校正立绘组");
  }

  const originImage = await loadCropCanvasImage(sourceUrl);
  if (!isOriginImageCompatibleWithVariantConfig(config, originImage)) {
    throw new Error("原图尺寸与目标立绘组不一致");
  }

  const spriteCrop = createPixelSpriteCropFromVariantConfig(config, {
    naturalWidth: originImage.naturalWidth,
    naturalHeight: originImage.naturalHeight,
    width: originImage.naturalWidth,
    height: originImage.naturalHeight,
  });
  const spriteCropContext = createSpriteCropContextFromVariantConfig(config, avatar.originFileId);
  if (!spriteCrop || !spriteCropContext) {
    throw new Error("无法应用目标立绘组的立绘裁剪配置");
  }

  const spriteCanvas = createCropOutputCanvas(
    Math.round(spriteCrop.pixelCrop.width),
    Math.round(spriteCrop.pixelCrop.height),
  );
  await canvasPreview(originImage, spriteCanvas, spriteCrop.pixelCrop, 1, 0, { previewMode: false });
  const spriteBlob = await canvasToBlob(spriteCanvas);

  const spriteObjectUrl = URL.createObjectURL(spriteBlob);
  const spriteImage = await loadCropCanvasImage(spriteObjectUrl);
  URL.revokeObjectURL(spriteObjectUrl);
  const avatarCrop = createPixelCropFromVariantConfig(config, {
    naturalWidth: spriteImage.naturalWidth,
    naturalHeight: spriteImage.naturalHeight,
    width: spriteImage.naturalWidth,
    height: spriteImage.naturalHeight,
  });
  if (!avatarCrop) {
    throw new Error("无法应用目标立绘组的头像槽位");
  }

  const avatarCanvas = createCropOutputCanvas(
    Math.round(avatarCrop.pixelCrop.width),
    Math.round(avatarCrop.pixelCrop.height),
  );
  await canvasPreview(spriteImage, avatarCanvas, avatarCrop.pixelCrop, 1, 0, { previewMode: false });
  return {
    spriteBlob,
    spriteCropContext,
    avatarBlob: await canvasToBlob(avatarCanvas),
  };
}

async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  processor: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = [];
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await processor(items[index]!, index);
    }
  }));

  return results;
}

type SpriteSettingsPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: SettingsTab;

  // 立绘相关
  spritesAvatars: RoleAvatar[];
  roleAvatars: RoleAvatar[];
  currentSpriteIndex: number;
  characterName: string;

  // 外部同步回调（仅在特定操作时调用）
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  // 同步外部立绘索引
  onSpriteIndexChange?: (index: number) => void;
  // 角色信息（用于删除功能）
  role?: Role;
}

/**
 * 立绘设置弹窗组件
 * 左侧固定显示头像列表，右侧 tab 切换不同功能：立绘校正、头像校正、头像设置
 * 内部维护共享的立绘索引状态
 */
export function SpriteSettingsPopup({
  isOpen,
  onClose,
  defaultTab = "setting",
  spritesAvatars: remoteSpritesAvatars,
  roleAvatars,
  currentSpriteIndex,
  characterName,
  onAvatarChange,
  onSpriteIndexChange,
  role,
}: SpriteSettingsPopupProps) {
  // 内部维护 tab ״̬
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const isMobile = isMobileScreen();
  const [isMobileControlDrawerOpen, setIsMobileControlDrawerOpen] = useState(false);
  const [variantFilter, setVariantFilter] = useState<string>(UNGROUPED_VARIANT_KEY);
  const [selectedVariantKey, setSelectedVariantKey] = useState<string | null>(null);
  const [pendingVariantInitialization, setPendingVariantInitialization] = useState<PendingVariantInitialization | null>(null);
  const [pendingUploadAvatarWorkflows, setPendingUploadAvatarWorkflows] = useState<PendingUploadAvatarWorkflow[]>([]);
  const pendingUploadAvatarWorkflow = pendingUploadAvatarWorkflows[0] ?? null;
  const [pendingUploadSpriteCalibration, setPendingUploadSpriteCalibration] = useState<PendingUploadAvatarWorkflow | null>(null);
  const [variantDialogMode, setVariantDialogMode] = useState<"closed" | "select" | "create">("closed");
  const [variantNameDraft, setVariantNameDraft] = useState("");
  const [variantCreationIndices, setVariantCreationIndices] = useState<number[]>([]);
  const [pendingVariantSpriteCalibrationIndices, setPendingVariantSpriteCalibrationIndices] = useState<number[] | null>(null);
  const [optimisticUploadAvatars, setOptimisticUploadAvatars] = useState<OptimisticUploadAvatar[]>([]);
  const optimisticAvatarUploadCompletionsRef = useRef(new Map<string, OptimisticAvatarUploadCompletion>());
  const defaultSpriteMediaUploadsRef = useRef(new Map<string, Promise<DefaultSpriteMediaUploadResult>>());
  const spriteCropSubmissionCoordinatorRef = useRef(new SpriteCropSubmissionCoordinator());
  const localSpriteCropOverridesRef = useRef(new Map<string, LocalSpriteCropOverride>());
  const [localSpriteCropOverrides, setLocalSpriteCropOverrides] = useState<Map<string, LocalSpriteCropOverride>>(
    () => new Map(),
  );
  const nextOptimisticAvatarIdRef = useRef(-1);
  const [batchVariantCreationPrompt, setBatchVariantCreationPrompt] = useState<{
    indices: number[];
    successCount: number;
    failedCount: number;
    totalCount: number;
  } | null>(null);
  const [draggedAvatarIndices, setDraggedAvatarIndices] = useState<number[]>([]);
  const [variantDropTarget, setVariantDropTarget] = useState<string | null>(null);
  const optimisticAvatarIds = useMemo(() => (
    new Set(
      optimisticUploadAvatars
        .map(avatar => normalizeVariantId(avatar.avatarId))
        .filter((avatarId): avatarId is number => avatarId != null),
    )
  ), [optimisticUploadAvatars]);
  const baseSpritesAvatars = useMemo(
    () => [
      ...optimisticUploadAvatars,
      ...remoteSpritesAvatars.filter(avatar => !optimisticAvatarIds.has(normalizeVariantId(avatar.avatarId) ?? 0)),
    ],
    [optimisticAvatarIds, optimisticUploadAvatars, remoteSpritesAvatars],
  );
  const spritesAvatars = useMemo(() => baseSpritesAvatars.map((avatar) => {
    const taskKey = getCropSubmitTaskKey(avatar);
    const override = taskKey ? localSpriteCropOverrides.get(taskKey) : undefined;
    if (!override) {
      return avatar;
    }
    return {
      ...avatar,
      localAvatarUrl: override.localSpriteUrl,
      localSpriteUrl: override.localSpriteUrl,
      ...(override.spriteCropContext ? { spriteCropContext: override.spriteCropContext } : {}),
      ...(override.spriteTransform ? { spriteTransform: override.spriteTransform } : {}),
    } as RoleAvatar;
  }), [baseSpritesAvatars, localSpriteCropOverrides]);

  // ========== 内部共享的立绘索引 ==========
  // 使用外部传入的 currentSpriteIndex 作为初始值
  const [internalIndex, setInternalIndex] = useState(() => {
    // 确保初始索引在有效范围内
    if (spritesAvatars.length > 0) {
      return Math.max(0, Math.min(currentSpriteIndex, spritesAvatars.length - 1));
    }
    return 0;
  });

  // 记录上次的 isOpen 状态，用于检测弹窗打开
  const [wasOpen, setWasOpen] = useState(false);

  // ========== 多选状态管理 ==========
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const variantGroupsQuery = useRoleAvatarVariantsQuery(role?.id ?? 0, {
    enabled: isOpen && Boolean(role?.id),
  });
  const createVariantMutation = useCreateRoleAvatarVariantMutation(role?.id);
  const updateVariantMutation = useUpdateRoleAvatarVariantMutation(role?.id);
  const deleteVariantMutation = useDeleteRoleAvatarVariantMutation(role?.id);
  const updateRoleAvatarMutation = useUpdateRoleAvatarMutation(role?.id ?? 0);
  const setDefaultAvatarMutation = useSetDefaultRoleAvatarMutation(role?.id);
  const applyCropMutation = useApplyCropMutation();
  const applyCropAvatarMutation = useApplyCropAvatarMutation();

  const variantGroups = useMemo(() => {
    const groupMap = new Map<number, RoleAvatarVariant>();
    const addGroup = (group: RoleAvatarVariant | undefined) => {
      const id = normalizeVariantId(group?.variantId);
      if (id == null) {
        return;
      }
      if (group) {
        groupMap.set(id, group);
      }
    };

    spritesAvatars.forEach(avatar => addGroup(avatar.variantGroup));
    (variantGroupsQuery.data?.data ?? []).forEach(addGroup);

    return Array.from(groupMap.values()).sort((a, b) => {
      return getVariantDisplayName(a).localeCompare(getVariantDisplayName(b), "zh-CN");
    });
  }, [spritesAvatars, variantGroupsQuery.data]);

  const variantGroupById = useMemo(() => {
    const map = new Map<number, RoleAvatarVariant>();
    variantGroups.forEach((group) => {
      const id = normalizeVariantId(group.variantId);
      if (id != null) {
        map.set(id, group);
      }
    });
    return map;
  }, [variantGroups]);

  const bindableVariantGroups = useMemo(() => (
    variantGroups.filter(group => (
      normalizeVariantId(group.variantId) != null
      && Boolean(group.compositionConfig)
    ))
  ), [variantGroups]);

  const { variantOptions, variantCountMap, variantLabelMap } = useMemo(() => {
    const countMap = new Map<string, number>();
    const labelMap = new Map<string, string>();
    spritesAvatars.forEach((avatar) => {
      const variant = getAvatarVariantKey(avatar);
      countMap.set(variant, (countMap.get(variant) ?? 0) + 1);
      labelMap.set(variant, getAvatarVariantLabel(avatar));
    });
    const options = Array.from(countMap.keys()).sort((a, b) => {
      if (a === UNGROUPED_VARIANT_KEY)
        return -1;
      if (b === UNGROUPED_VARIANT_KEY)
        return 1;
      return (labelMap.get(a) ?? a).localeCompare(labelMap.get(b) ?? b, "zh-CN");
    });
    return { variantOptions: options, variantCountMap: countMap, variantLabelMap: labelMap };
  }, [spritesAvatars]);

  const variantFolderItems = useMemo(() => (
    variantGroups
      .map((variant) => {
        const variantId = normalizeVariantId(variant.variantId);
        if (!variantId) {
          return null;
        }
        const variantKey = String(variantId);
        const variantAvatars = spritesAvatars.filter(avatar => normalizeVariantId(avatar.variantId) === variantId);
        const baseAvatar = variantAvatars.find(avatar => (
          normalizeVariantId(avatar.variantId) === variantId
          && normalizeVariantId(avatar.avatarId) === normalizeVariantId(variant.baseAvatarId)
        ));
        const previewAvatars = [
          ...variantAvatars.filter(avatar => normalizeVariantId(avatar.avatarId) !== normalizeVariantId(baseAvatar?.avatarId)).slice(0, 3),
          ...(baseAvatar ? [baseAvatar] : []),
        ].slice(-AVATAR_FOLDER_STACK_CARD_CLASS_NAMES.length);
        return {
          variant,
          variantId,
          variantKey,
          label: getVariantDisplayName(variant),
          count: variantCountMap.get(variantKey) ?? 0,
          previewUrls: previewAvatars.map(avatar => getEffectiveAvatarUrl(avatar)).filter(Boolean),
        };
      })
      .filter((item): item is {
        variant: RoleAvatarVariant;
        variantId: number;
        variantKey: string;
        label: string;
        count: number;
        previewUrls: string[];
      } => Boolean(item))
  ), [spritesAvatars, variantCountMap, variantGroups]);

  const variantFilteredIndices = useMemo(() => (
    spritesAvatars
      .map((avatar, index) => (
        getAvatarVariantKey(avatar) === variantFilter ? index : -1
      ))
      .filter(index => index >= 0)
  ), [spritesAvatars, variantFilter]);

  useEffect(() => {
    if (variantFilter === UNGROUPED_VARIANT_KEY) {
      return;
    }
    if (variantOptions.includes(variantFilter)) {
      return;
    }
    const pendingVariantId = normalizeVariantId(variantFilter);
    if (pendingVariantId && variantGroupById.has(pendingVariantId)) {
      return;
    }
    setVariantFilter(UNGROUPED_VARIANT_KEY);
  }, [variantGroupById, variantOptions, variantFilter]);

  useEffect(() => {
    if (selectedVariantKey == null) {
      return;
    }
    const selectedVariantId = normalizeVariantId(selectedVariantKey);
    if (selectedVariantId && variantGroupById.has(selectedVariantId)) {
      return;
    }
    setSelectedVariantKey(null);
  }, [selectedVariantKey, variantGroupById]);

  const filteredIndices = variantFilteredIndices;
  const isVariantGroupView = variantFilter !== UNGROUPED_VARIANT_KEY;
  const activeVariantId = isVariantGroupView ? normalizeVariantId(variantFilter) : null;
  const activeVariantGroup = activeVariantId ? variantGroupById.get(activeVariantId) : undefined;
  const activeVariantLabel = activeVariantGroup
    ? getVariantDisplayName(activeVariantGroup)
    : variantLabelMap.get(variantFilter) ?? getFallbackVariantLabel(variantFilter);
  const selectedVariantId = normalizeVariantId(selectedVariantKey);
  const selectedVariantGroup = selectedVariantId ? variantGroupById.get(selectedVariantId) : undefined;
  const selectedVariantLabel = selectedVariantGroup
    ? getVariantDisplayName(selectedVariantGroup)
    : selectedVariantKey
      ? variantLabelMap.get(selectedVariantKey) ?? getFallbackVariantLabel(selectedVariantKey)
      : "";
  const isVariantFolderSelected = !isVariantGroupView && selectedVariantKey != null;
  const isVariantBatchSelection = isVariantGroupView || isVariantFolderSelected;
  const editingVariantGroup = isVariantGroupView ? activeVariantGroup : selectedVariantGroup;

  const selectedVariantIndices = useMemo(() => {
    if (selectedVariantKey == null) {
      return [];
    }
    return spritesAvatars
      .map((avatar, index) => (
        getAvatarVariantKey(avatar) === selectedVariantKey ? index : -1
      ))
      .filter(index => index >= 0);
  }, [selectedVariantKey, spritesAvatars]);

  const filteredIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    filteredIndices.forEach((originalIndex, filteredIndex) => {
      map.set(originalIndex, filteredIndex);
    });
    return map;
  }, [filteredIndices]);

  const filteredSelectedIndices = useMemo(() => {
    const next = new Set<number>();
    selectedIndices.forEach((originalIndex) => {
      const filteredIndex = filteredIndexMap.get(originalIndex);
      if (filteredIndex !== undefined) {
        next.add(filteredIndex);
      }
    });
    return next;
  }, [selectedIndices, filteredIndexMap]);

  const filteredSprites = useMemo(
    () => filteredIndices
      .map(index => spritesAvatars[index])
      .filter((avatar): avatar is RoleAvatar => Boolean(avatar)),
    [filteredIndices, spritesAvatars],
  );
  // 当前选中的头像数据。校正入口需要在过滤列表之外也能访问当前默认头像。
  const currentAvatar = useMemo(() => {
    if (spritesAvatars.length > 0 && internalIndex < spritesAvatars.length) {
      return spritesAvatars[internalIndex] || null;
    }
    return null;
  }, [spritesAvatars, internalIndex]);
  const spriteCropperSourceIndices = useMemo(() => {
    if (isVariantFolderSelected) {
      return selectedVariantIndices;
    }
    if (isVariantGroupView || (isMultiSelectMode && selectedIndices.size > 0)) {
      return filteredIndices;
    }
    return filteredIndices;
  }, [
    filteredIndices,
    isMultiSelectMode,
    isVariantFolderSelected,
    isVariantGroupView,
    selectedIndices.size,
    selectedVariantIndices,
  ]);
  const spriteCropperItems = useMemo(() => (
    spriteCropperSourceIndices
      .map(originalIndex => ({
        originalIndex,
        avatar: spritesAvatars[originalIndex],
      }))
      .filter((item): item is { originalIndex: number; avatar: RoleAvatar } => (
        Boolean(item.avatar)
        && Boolean(getEffectiveOriginUrl(item.avatar))
      ))
  ), [spriteCropperSourceIndices, spritesAvatars]);
  const avatarCropperSourceIndices = useMemo(() => {
    if (isVariantGroupView) {
      return filteredIndices;
    }
    if (isVariantFolderSelected) {
      return selectedVariantIndices;
    }
    if (isMultiSelectMode && selectedIndices.size > 0) {
      return filteredIndices.filter(index => selectedIndices.has(index));
    }
    return filteredIndices;
  }, [
    filteredIndices,
    isMultiSelectMode,
    isVariantFolderSelected,
    isVariantGroupView,
    selectedIndices,
    selectedVariantIndices,
  ]);
  const avatarCropperItems = useMemo(() => (
    avatarCropperSourceIndices
      .map(originalIndex => ({
        originalIndex,
        avatar: spritesAvatars[originalIndex],
      }))
      .filter((item): item is { originalIndex: number; avatar: RoleAvatar } => (
        Boolean(item.avatar) && Boolean(getSpriteCropSourceUrl(item.avatar))
      ))
  ), [avatarCropperSourceIndices, spritesAvatars]);
  const spriteCropperAvatars = useMemo(
    () => spriteCropperItems.map(item => item.avatar),
    [spriteCropperItems],
  );
  const avatarCropperAvatars = useMemo(
    () => avatarCropperItems.map(item => item.avatar),
    [avatarCropperItems],
  );
  const spriteCropperInitialIndex = useMemo(() => {
    const index = spriteCropperItems.findIndex(item => item.originalIndex === internalIndex);
    return index >= 0 ? index : 0;
  }, [internalIndex, spriteCropperItems]);
  const avatarCropperInitialIndex = useMemo(() => {
    const index = avatarCropperItems.findIndex(item => item.originalIndex === internalIndex);
    return index >= 0 ? index : 0;
  }, [avatarCropperItems, internalIndex]);
  const spriteCropperSelectedIndices = useMemo(() => {
    const indexMap = new Map<number, number>();
    spriteCropperItems.forEach((item, index) => {
      indexMap.set(item.originalIndex, index);
    });
    const next = new Set<number>();
    selectedIndices.forEach((originalIndex) => {
      const cropperIndex = indexMap.get(originalIndex);
      if (cropperIndex !== undefined) {
        next.add(cropperIndex);
      }
    });
    return next;
  }, [selectedIndices, spriteCropperItems]);
  const avatarCropperSelectedIndices = useMemo(() => {
    const indexMap = new Map<number, number>();
    avatarCropperItems.forEach((item, index) => {
      indexMap.set(item.originalIndex, index);
    });
    const next = new Set<number>();
    selectedIndices.forEach((originalIndex) => {
      const cropperIndex = indexMap.get(originalIndex);
      if (cropperIndex !== undefined) {
        next.add(cropperIndex);
      }
    });
    return next;
  }, [avatarCropperItems, selectedIndices]);
  const spriteCropperGroupSelectedIndices = useMemo(() => (
    new Set(spriteCropperItems.map((_, index) => index))
  ), [spriteCropperItems]);
  const avatarCropperGroupSelectedIndices = useMemo(() => (
    new Set(avatarCropperItems.map((_, index) => index))
  ), [avatarCropperItems]);
  const effectiveSpriteCropperSelectedIndices = isVariantBatchSelection
    ? spriteCropperGroupSelectedIndices
    : spriteCropperSelectedIndices;
  const effectiveAvatarCropperSelectedIndices = isVariantBatchSelection
    ? avatarCropperGroupSelectedIndices
    : avatarCropperSelectedIndices;
  const effectiveSpriteCropperMultiSelectMode = isVariantBatchSelection
    ? effectiveSpriteCropperSelectedIndices.size > 0
    : isMultiSelectMode;
  const effectiveAvatarCropperMultiSelectMode = isVariantBatchSelection
    ? effectiveAvatarCropperSelectedIndices.size > 0
    : isMultiSelectMode;

  useEffect(() => {
    setIsMultiSelectMode(false);
    setSelectedIndices(new Set());
  }, [variantFilter]);

  useEffect(() => {
    if (filteredIndices.length === 0) {
      return;
    }
    if (isVariantFolderSelected) {
      return;
    }
    if (!filteredIndices.includes(internalIndex)) {
      setInternalIndex(filteredIndices[0]);
    }
  }, [filteredIndices, internalIndex, isVariantFolderSelected]);

  const selectedAvatarItems = useMemo(() => (
    Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(index => ({
        index,
        avatar: spritesAvatars[index],
      }))
      .filter((item): item is { index: number; avatar: RoleAvatar } => Boolean(item.avatar))
  ), [selectedIndices, spritesAvatars]);
  const variantGroupAvatarItems = useMemo(() => (
    filteredIndices
      .map(index => ({
        index,
        avatar: spritesAvatars[index],
      }))
      .filter((item): item is { index: number; avatar: RoleAvatar } => Boolean(item.avatar))
  ), [filteredIndices, spritesAvatars]);
  const selectedVariantAvatarItems = useMemo(() => (
    selectedVariantIndices
      .map(index => ({
        index,
        avatar: spritesAvatars[index],
      }))
      .filter((item): item is { index: number; avatar: RoleAvatar } => Boolean(item.avatar))
  ), [selectedVariantIndices, spritesAvatars]);
  // 进入立绘组目录时，组本身就是一个隐式多选集。
  const effectiveSelectedAvatarItems = isVariantGroupView
    ? variantGroupAvatarItems
    : isVariantFolderSelected
      ? selectedVariantAvatarItems
      : selectedAvatarItems;
  const selectedAvatarCount = selectedAvatarItems.length;
  const effectiveSelectedAvatarCount = effectiveSelectedAvatarItems.length;
  const selectedVariantKeys = useMemo(() => {
    const keys = new Set<string>();
    effectiveSelectedAvatarItems.forEach(({ avatar }) => {
      keys.add(getAvatarVariantKey(avatar));
    });
    return keys;
  }, [effectiveSelectedAvatarItems]);
  const selectedVariantSummary = useMemo(() => {
    if (isVariantFolderSelected && selectedVariantLabel) {
      return selectedVariantLabel;
    }
    if (selectedVariantKeys.size === 0) {
      return DEFAULT_VARIANT;
    }
    if (selectedVariantKeys.size > 1) {
      return "混合立绘组";
    }
    const [variantKey] = Array.from(selectedVariantKeys);
    return variantLabelMap.get(variantKey) ?? getFallbackVariantLabel(variantKey);
  }, [isVariantFolderSelected, selectedVariantKeys, selectedVariantLabel, variantLabelMap]);
  const selectedWithVariantCount = useMemo(() => (
    effectiveSelectedAvatarItems.filter(({ avatar }) => getAvatarVariantKey(avatar) !== UNGROUPED_VARIANT_KEY).length
  ), [effectiveSelectedAvatarItems]);

  // 当前选中的立绘 URL
  const currentSpriteCropperAvatar = spriteCropperAvatars[spriteCropperInitialIndex];
  const currentAvatarCropperAvatar = avatarCropperAvatars[avatarCropperInitialIndex];
  const currentSpriteUrl = currentSpriteCropperAvatar
    ? (getEffectiveOriginUrl(currentSpriteCropperAvatar) || null)
    : null;
  const canShowCurrentAvatarCropper = Boolean(
    isVariantGroupView
    || isVariantFolderSelected
    || (isMultiSelectMode && selectedIndices.size > 0)
    || (currentAvatar && getSpriteCropSourceUrl(currentAvatar)),
  );
  const currentAvatarCropSourceUrl = canShowCurrentAvatarCropper && currentAvatarCropperAvatar
    ? (getSpriteCropSourceUrl(currentAvatarCropperAvatar) || null)
    : null;
  const currentAvatarSpriteSourceUrl = currentAvatar ? getEffectiveOriginUrl(currentAvatar) : "";
  const currentAvatarCropperSourceUrl = currentAvatar ? getSpriteCropSourceUrl(currentAvatar) : "";
  const canOpenCurrentSpriteCropper = Boolean(currentAvatarSpriteSourceUrl);
  const canOpenCurrentAvatarCropper = Boolean(currentAvatarCropperSourceUrl);

  // ========== 上传和删除功能 ==========
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
  const { mutateAsync: reserveRoleAvatar } = useReserveRoleAvatarMutation();
  const { mutateAsync: deleteRoleAvatar } = useDeleteRoleAvatarMutation(role?.id);
  const getDefaultSpriteMedia = useCallback(async (file: File) => {
    const fileHash = await calculateFileSha256(file);
    const cacheKey = `${fileHash}:${file.size}:${file.type}`;
    const cachedPromise = defaultSpriteMediaUploadsRef.current.get(cacheKey);
    if (cachedPromise) {
      return cachedPromise;
    }

    const uploadPromise = uploadOriginAndDefaultSpriteMedia(file, { scene: 3 });
    defaultSpriteMediaUploadsRef.current.set(cacheKey, uploadPromise);
    uploadPromise.catch(() => {
      if (defaultSpriteMediaUploadsRef.current.get(cacheKey) === uploadPromise) {
        defaultSpriteMediaUploadsRef.current.delete(cacheKey);
      }
    });
    return uploadPromise;
  }, []);
  const removeOptimisticUploadAvatar = useCallback((uploadKey: string) => {
    setOptimisticUploadAvatars((prev) => {
      const removed = prev.find(item => item.optimisticUploadKey === uploadKey);
      if (removed) {
        URL.revokeObjectURL(removed.localOriginUrl);
      }
      return prev.filter(item => item.optimisticUploadKey !== uploadKey);
    });
  }, []);

  const updateOptimisticUploadAvatar = useCallback((
    uploadKey: string,
    uploadedAvatar: RoleAvatar,
    options: { complete?: boolean } = {},
  ) => {
    setOptimisticUploadAvatars(prev => prev.map((avatar) => {
      if (avatar.optimisticUploadKey !== uploadKey) {
        return avatar;
      }
      return {
        ...avatar,
        ...uploadedAvatar,
        roleId: uploadedAvatar.roleId ?? avatar.roleId,
        avatarId: uploadedAvatar.avatarId,
        localAvatarUrl: avatar.localAvatarUrl,
        localOriginUrl: avatar.localOriginUrl,
        localSpriteUrl: avatar.localSpriteUrl,
        optimisticUploadKey: avatar.optimisticUploadKey,
        optimisticUploadPending: options.complete ? false : avatar.optimisticUploadPending,
      };
    }));
  }, []);

  const patchOptimisticUploadAvatars = useCallback((
    avatars: RoleAvatar[],
    options: { clearAvatarUrl?: boolean; clearSpriteUrl?: boolean } = {},
  ) => {
    const avatarById = new Map<number, RoleAvatar>();
    const avatarByUploadKey = new Map<string, RoleAvatar>();
    avatars.forEach((avatar) => {
      const avatarId = normalizeVariantId(avatar.avatarId);
      if (avatarId) {
        avatarById.set(avatarId, avatar);
      }
      const uploadKey = getOptimisticUploadKey(avatar);
      if (uploadKey) {
        avatarByUploadKey.set(uploadKey, avatar);
      }
    });
    if (avatarById.size === 0 && avatarByUploadKey.size === 0) {
      return;
    }

    setOptimisticUploadAvatars(prev => prev.map((optimisticAvatar) => {
      const avatarId = normalizeVariantId(optimisticAvatar.avatarId);
      const nextAvatar = (avatarId ? avatarById.get(avatarId) : undefined)
        ?? avatarByUploadKey.get(optimisticAvatar.optimisticUploadKey);
      if (!nextAvatar) {
        return optimisticAvatar;
      }
      return {
        ...optimisticAvatar,
        ...nextAvatar,
        roleId: nextAvatar.roleId ?? optimisticAvatar.roleId,
        avatarId: nextAvatar.avatarId,
        localAvatarUrl: options.clearAvatarUrl ? "" : optimisticAvatar.localAvatarUrl,
        localOriginUrl: optimisticAvatar.localOriginUrl,
        localSpriteUrl: options.clearSpriteUrl ? "" : optimisticAvatar.localSpriteUrl,
        optimisticUploadKey: optimisticAvatar.optimisticUploadKey,
        optimisticUploadPending: optimisticAvatar.optimisticUploadPending,
      };
    }));
  }, []);

  const upsertLocalSpriteCropOverride = useCallback((
    taskKey: string,
    override: LocalSpriteCropOverride,
  ) => {
    const previous = localSpriteCropOverridesRef.current.get(taskKey);
    if (previous && previous.localSpriteUrl !== override.localSpriteUrl) {
      URL.revokeObjectURL(previous.localSpriteUrl);
    }
    const next = new Map(localSpriteCropOverridesRef.current);
    next.set(taskKey, override);
    localSpriteCropOverridesRef.current = next;
    setLocalSpriteCropOverrides(next);
  }, []);

  const removeLocalSpriteCropOverrides = useCallback((avatars: RoleAvatar[]) => {
    const next = new Map(localSpriteCropOverridesRef.current);
    let changed = false;
    avatars.forEach((avatar) => {
      const taskKey = getCropSubmitTaskKey(avatar);
      if (!taskKey) {
        return;
      }
      const previous = next.get(taskKey);
      if (!previous) {
        return;
      }
      URL.revokeObjectURL(previous.localSpriteUrl);
      next.delete(taskKey);
      spriteCropSubmissionCoordinatorRef.current.remove(avatar);
      changed = true;
    });
    if (changed) {
      localSpriteCropOverridesRef.current = next;
      setLocalSpriteCropOverrides(next);
    }
  }, []);

  const registerPendingSpriteCropSubmissions = useCallback((
    submissions: PendingSpriteCropSubmission[],
    toastId?: string,
  ) => {
    let completedCount = 0;
    let failedCount = 0;
    let failureMessage: string | undefined;
    const completeToast = () => {
      completedCount += 1;
      if (!toastId || completedCount < submissions.length) {
        return;
      }
      if (failedCount > 0) {
        appToast.error(failureMessage ?? `立绘保存失败：${failedCount}/${submissions.length}`, { id: toastId });
      }
      else {
        appToast.success("立绘已保存", { id: toastId });
      }
    };

    submissions.forEach((pendingSubmission) => {
      const taskKey = getCropSubmitTaskKey(pendingSubmission.avatar);
      if (!taskKey) {
        URL.revokeObjectURL(pendingSubmission.localSpriteUrl);
        failedCount += 1;
        failureMessage = "无法识别立绘保存任务，请重新应用裁剪";
        completeToast();
        return;
      }

      const submission = spriteCropSubmissionCoordinatorRef.current.enqueue(
        pendingSubmission.avatar,
        pendingSubmission.submit,
      );
      upsertLocalSpriteCropOverride(taskKey, {
        localSpriteUrl: pendingSubmission.localSpriteUrl,
        spriteCropContext: pendingSubmission.spriteCropContext,
        spriteTransform: pendingSubmission.spriteTransform,
      });

      void submission.then((uploadedAvatar) => {
        if (!spriteCropSubmissionCoordinatorRef.current.isCurrent(pendingSubmission.avatar, submission)) {
          return;
        }
        patchOptimisticUploadAvatars([uploadedAvatar], { clearSpriteUrl: true });
        const currentOverride = localSpriteCropOverridesRef.current.get(taskKey);
        if (currentOverride) {
          upsertLocalSpriteCropOverride(taskKey, {
            ...currentOverride,
            spriteCropContext: uploadedAvatar.spriteCropContext ?? currentOverride.spriteCropContext,
            spriteTransform: uploadedAvatar.spriteTransform ?? currentOverride.spriteTransform,
          });
        }
      }).catch((error) => {
        failedCount += 1;
        failureMessage = error instanceof Error ? error.message : "后台保存立绘失败，请重新应用裁剪";
        if (spriteCropSubmissionCoordinatorRef.current.isCurrent(pendingSubmission.avatar, submission)) {
          console.error("后台保存立绘失败:", error);
        }
      }).finally(completeToast);
    });
  }, [patchOptimisticUploadAvatars, upsertLocalSpriteCropOverride]);

  const createOptimisticUploadAvatar = useCallback((
    file: File,
    index: number,
    context: AvatarUploadFilesSelectedContext,
  ): OptimisticUploadAvatar | null => {
    if (!role?.id) {
      return null;
    }

    const uploadKey = `avatar-upload-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
    const optimisticAvatarId = nextOptimisticAvatarIdRef.current;
    nextOptimisticAvatarIdRef.current -= 1;
    optimisticAvatarUploadCompletionsRef.current.set(uploadKey, createOptimisticAvatarUploadCompletion());
    const localOriginUrl = URL.createObjectURL(file);
    return {
      roleId: role.id,
      avatarId: optimisticAvatarId,
      avatarTitle: { label: resolveAvatarUploadName(file.name) ?? file.name },
      ...(context.uploadDefaults?.category ? { category: context.uploadDefaults.category } : {}),
      ...(context.uploadDefaults?.variantId ? { variantId: context.uploadDefaults.variantId } : {}),
      localAvatarUrl: localOriginUrl,
      localOriginUrl,
      localSpriteUrl: localOriginUrl,
      optimisticUploadKey: uploadKey,
      optimisticUploadPending: true,
      spriteTransform: toSpriteTransformPayload({
        positionX: 0,
        positionY: 0,
        scale: 1,
        alpha: 1,
        rotation: 0,
      }),
    };
  }, [role?.id]);

  const waitForAvatarUpload = useCallback<WaitForAvatarUpload>(async (avatar) => {
    const optimisticAvatar = avatar as Partial<OptimisticUploadAvatar>;
    const uploadKey = optimisticAvatar.optimisticUploadKey;
    if (!uploadKey) {
      return avatar;
    }

    const completion = optimisticAvatarUploadCompletionsRef.current.get(uploadKey);
    if (!completion) {
      if (optimisticAvatar.optimisticUploadPending) {
        throw new Error("图片上传任务已中断，请重新选择图片");
      }
      return avatar;
    }
    return completion.promise;
  }, []);

  const waitForAvatarCropSubmit = useCallback<WaitForAvatarUpload>(
    avatar => spriteCropSubmissionCoordinatorRef.current.resolve(avatar, waitForAvatarUpload),
    [waitForAvatarUpload],
  );

  const enterOptimisticUploadWorkflow = useCallback((
    avatars: OptimisticUploadAvatar[],
  ) => {
    if (avatars.length === 0) {
      return;
    }

    setOptimisticUploadAvatars(prev => [...avatars, ...prev]);
    if (pendingUploadSpriteCalibration || pendingVariantInitialization) {
      // 新批次插入列表头部时同步平移索引，保持当前 variant 校正流程不被打断。
      setSelectedIndices(prev => new Set(Array.from(prev, index => index + avatars.length)));
      setInternalIndex(prev => prev + avatars.length);
      appToast.info("新图片已加入后台上传队列");
      return;
    }
    setVariantFilter(UNGROUPED_VARIANT_KEY);
    setSelectedIndices(new Set(avatars.map((_, index) => index)));
    setIsMultiSelectMode(avatars.length > 1);
    setInternalIndex(0);
    setActiveTab("cropper");
    if (isMobile) {
      setIsMobileControlDrawerOpen(false);
    }
    appToast.info("已进入裁剪流程，图片会在后台继续上传");
  }, [isMobile, pendingUploadSpriteCalibration, pendingVariantInitialization]);

  const enterUploadedAvatarWorkflow = useCallback((
    avatarIds: number[],
    context: AvatarUploadFilesSelectedContext,
  ) => {
    if (avatarIds.length === 0) {
      return;
    }

    setPendingUploadAvatarWorkflows(prev => enqueueAvatarUploadWorkflow(prev, {
      avatarIds,
      target: context.target,
      batchKey: context.batchKey,
    }));
  }, []);

  const handleAvatarUploadFilesSelected = useCallback(async (
    files: File[],
    context: AvatarUploadFilesSelectedContext,
  ) => {
    if (!role?.id) {
      appToast.error("角色信息缺失，无法上传头像");
      return;
    }

    const imageFiles = (await Promise.all(files.map(async file => await normalizeImageFileOrNull(file))))
      .filter((file): file is File => Boolean(file));
    if (imageFiles.length === 0) {
      appToast.error("请选择图片文件");
      return;
    }

    const toastId = `avatar-origin-upload-${Date.now()}`;
    const createdAvatarIdsByIndex: Array<number | undefined> = [];
    const optimisticAvatars = imageFiles
      .map((file, index) => createOptimisticUploadAvatar(file, index, context))
      .filter((avatar): avatar is OptimisticUploadAvatar => Boolean(avatar));
    enterOptimisticUploadWorkflow(optimisticAvatars);
    const uploadCompletions = optimisticAvatars.map(avatar => (
      optimisticAvatarUploadCompletionsRef.current.get(avatar.optimisticUploadKey)
    ));
    let completedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    try {
      appToast.loading(`正在导入原图：0/${imageFiles.length}`, { id: toastId });
    await runWithConcurrencyLimit(imageFiles, 4, async (file, index) => {
      const optimisticAvatar = optimisticAvatars[index];
      const uploadCompletion = uploadCompletions[index];
      let reservedAvatarId: number | undefined;
      try {
          const mediaOutcome = getDefaultSpriteMedia(file).then(
            value => ({ status: "fulfilled" as const, value }),
            reason => ({ status: "rejected" as const, reason }),
          );
          const reserveRes = await reserveRoleAvatar({
            roleId: role.id,
            ...(context.uploadDefaults?.category ? { category: context.uploadDefaults.category } : {}),
            ...(context.uploadDefaults?.variantId ? { variantId: context.uploadDefaults.variantId } : {}),
          });
          reservedAvatarId = normalizeVariantId(reserveRes.data) ?? undefined;
          if (!reserveRes.success || !reservedAvatarId) {
            throw new Error(reserveRes.errMsg || "头像记录创建失败");
          }
          if (optimisticAvatar) {
            updateOptimisticUploadAvatar(optimisticAvatar.optimisticUploadKey, {
              roleId: role.id,
              avatarId: reservedAvatarId,
            } as RoleAvatar);
          }

          const mediaResult = await mediaOutcome;
          if (mediaResult.status === "rejected") {
            throw mediaResult.reason;
          }
          const defaultSpriteMedia = mediaResult.value;
          await defaultSpriteMedia.origin.ensurePrimaryCompletion?.();
          const uploadRes = await uploadAvatar({
            avatarId: reservedAvatarId,
            roleId: role.id,
            avatarFileId: defaultSpriteMedia.origin.fileId,
            originFileId: defaultSpriteMedia.origin.fileId,
            spriteFileId: defaultSpriteMedia.sprite.fileId,
            spriteCropContext: defaultSpriteMedia.spriteCropContext,
            variantId: context.uploadDefaults?.variantId,
            avatarName: resolveAvatarUploadName(file.name),
            autoApply: false,
            autoNameFirst: true,
          });
          const uploadedAvatar = uploadRes?.data;
          const avatarId = normalizeVariantId(uploadedAvatar?.avatarId);
          if (!avatarId || !uploadedAvatar) {
            throw new Error("头像创建失败");
          }

          if (context.uploadDefaults?.category) {
            await updateRoleAvatarMutation.mutateAsync({
              ...uploadedAvatar,
              roleId: uploadedAvatar.roleId ?? role.id,
              avatarId,
              category: context.uploadDefaults.category,
            } as RoleAvatar);
          }

          const completedAvatar: RoleAvatar = {
            ...optimisticAvatar,
            ...uploadedAvatar,
            roleId: uploadedAvatar.roleId ?? role.id,
            avatarId,
            ...(context.uploadDefaults?.category ? { category: context.uploadDefaults.category } : {}),
            optimisticUploadPending: false,
          } as RoleAvatar;

          createdAvatarIdsByIndex[index] = avatarId;
          if (optimisticAvatar) {
            updateOptimisticUploadAvatar(optimisticAvatar.optimisticUploadKey, {
              ...uploadedAvatar,
              roleId: uploadedAvatar.roleId ?? role.id,
              avatarId,
              ...(context.uploadDefaults?.category ? { category: context.uploadDefaults.category } : {}),
            } as RoleAvatar, { complete: true });
          }
          uploadCompletion?.resolve(completedAvatar);
          successCount += 1;
        }
        catch (error) {
          failedCount += 1;
          uploadCompletion?.reject(error);
          if (reservedAvatarId) {
            try {
              await deleteRoleAvatar(reservedAvatarId);
            }
            catch (cleanupError) {
              console.error("清理未完成头像记录失败:", cleanupError);
            }
          }
          if (optimisticAvatar) {
            removeOptimisticUploadAvatar(optimisticAvatar.optimisticUploadKey);
            removeLocalSpriteCropOverrides([optimisticAvatar]);
          }
          console.error("上传原图失败:", file.name, error);
        }
        finally {
          completedCount += 1;
          appToast.loading(
            `正在导入原图：${completedCount}/${imageFiles.length}（成功 ${successCount} 失败 ${failedCount}）`,
            { id: toastId },
          );
        }
      });

      const createdAvatarIds = createdAvatarIdsByIndex.filter((avatarId): avatarId is number => Boolean(avatarId));
      if (createdAvatarIds.length === 0) {
        appToast.error("导入失败：没有成功创建头像", { id: toastId });
        return;
      }

      if (context.target.mode !== "none") {
        enterUploadedAvatarWorkflow(createdAvatarIds, context);
      }
      appToast.success(
        failedCount > 0
          ? `部分导入完成：成功 ${successCount}/${imageFiles.length}，继续校正成功项`
          : `已导入 ${successCount} 个头像，继续校正`,
        { id: toastId },
      );
    }
    catch (error) {
      console.error("批量导入头像失败:", error);
      appToast.error(error instanceof Error ? error.message : "导入头像失败", { id: toastId });
    }
  }, [
    createOptimisticUploadAvatar,
    enterUploadedAvatarWorkflow,
    enterOptimisticUploadWorkflow,
    getDefaultSpriteMedia,
    removeOptimisticUploadAvatar,
    removeLocalSpriteCropOverrides,
    role?.id,
    updateOptimisticUploadAvatar,
    deleteRoleAvatar,
    updateRoleAvatarMutation,
    reserveRoleAvatar,
    uploadAvatar,
  ]);

  const handleReplaceAvatarSource = useCallback(async (avatar: RoleAvatar, file: File) => {
    const roleId = role?.id ?? avatar.roleId;
    if (!roleId || !avatar.avatarId) {
      throw new Error("头像信息缺失，无法替换头像");
    }

    const imageFile = await normalizeImageFileOrNull(file);
    if (!imageFile) {
      throw new Error("请选择图片文件");
    }

    const toastId = `avatar-source-replace-${avatar.avatarId}`;
    appToast.loading("正在替换头像源图...", { id: toastId });
    try {
      const defaultSpriteMedia = await uploadOriginAndDefaultSpriteMedia(imageFile, { scene: 3 });
      await defaultSpriteMedia.origin.ensurePrimaryCompletion?.();
      const updateRes = await updateRoleAvatarMutation.mutateAsync({
        ...avatar,
        roleId,
        avatarId: avatar.avatarId,
        originFileId: defaultSpriteMedia.origin.fileId,
        spriteFileId: defaultSpriteMedia.sprite.fileId,
        avatarFileId: defaultSpriteMedia.origin.fileId,
        spriteCropContext: defaultSpriteMedia.spriteCropContext,
        spriteTransform: toSpriteTransformPayload({
          positionX: 0,
          positionY: 0,
          scale: 1,
          alpha: 1,
          rotation: 0,
        }),
        avatarCropContext: null,
        variantId: null,
        variantGroup: undefined,
      } as unknown as RoleAvatar);
      if (!updateRes?.success) {
        throw new Error(updateRes?.errMsg || "替换头像失败");
      }

      const nextIndex = spritesAvatars.findIndex(item => item.avatarId === avatar.avatarId);
      if (nextIndex >= 0) {
        setInternalIndex(nextIndex);
        setSelectedIndices(new Set([nextIndex]));
      }
      else {
        setSelectedIndices(new Set());
      }
      setIsMultiSelectMode(false);
      setPendingUploadSpriteCalibration(null);
      setPendingVariantInitialization(null);
      setActiveTab("cropper");
      if (isMobile) {
        setIsMobileControlDrawerOpen(false);
      }
      appToast.success("已替换源图，请继续立绘校正", { id: toastId });
    }
    catch (error) {
      appToast.error(error instanceof Error ? error.message : "替换头像失败，请稍后重试", { id: toastId });
      throw error;
    }
  }, [
    isMobile,
    role?.id,
    spritesAvatars,
    updateRoleAvatarMutation,
  ]);

  // 内部索引变更处理
  const handleInternalIndexChange = useCallback((index: number) => {
    setInternalIndex(index);
  }, []);
  const handleSpriteCropperIndexChange = useCallback((index: number) => {
    const originalIndex = spriteCropperItems[index]?.originalIndex;
    if (originalIndex !== undefined) {
      handleInternalIndexChange(originalIndex);
    }
  }, [handleInternalIndexChange, spriteCropperItems]);
  const handleAvatarCropperIndexChange = useCallback((index: number) => {
    const originalIndex = avatarCropperItems[index]?.originalIndex;
    if (originalIndex !== undefined) {
      handleInternalIndexChange(originalIndex);
    }
  }, [avatarCropperItems, handleInternalIndexChange]);

  const handleAvatarSelectById = useCallback((avatarId: number) => {
    const index = spritesAvatars.findIndex(a => a.avatarId === avatarId);
    if (index !== -1) {
      handleInternalIndexChange(index);
    }
  }, [spritesAvatars, handleInternalIndexChange]);

  // 应用头像到外部（同步外部状态）
  const handleAvatarChange = useCallback((avatarUrl: string, avatarId: number) => {
    onAvatarChange?.(avatarUrl, avatarId);
    // 同步外部立绘索引
    if (onSpriteIndexChange) {
      const nextIndex = spritesAvatars.findIndex(a => a.avatarId === avatarId);
      onSpriteIndexChange(nextIndex !== -1 ? nextIndex : internalIndex);
    }
  }, [onAvatarChange, onSpriteIndexChange, spritesAvatars, internalIndex]);

  const handleDefaultAvatarApplied = useCallback((avatar: RoleAvatar) => {
    if (!avatar.avatarId) {
      return;
    }

    const nextIndex = spritesAvatars.findIndex(item => item.avatarId === avatar.avatarId);
    if (nextIndex === -1) {
      return;
    }

    handleInternalIndexChange(nextIndex);
    onSpriteIndexChange?.(nextIndex);
  }, [handleInternalIndexChange, onSpriteIndexChange, spritesAvatars]);

  const handleSetDefaultAvatar = useCallback(async (avatar: RoleAvatar) => {
    if (!avatar.avatarId || !(avatar.roleId ?? role?.id)) {
      appToast.error("头像信息缺失，无法设为默认头像");
      return;
    }
    if (role?.avatarId === avatar.avatarId || setDefaultAvatarMutation.isPending) {
      return;
    }

    try {
      const result = await setDefaultAvatarMutation.mutateAsync(avatar);
      handleDefaultAvatarApplied(result.avatar);
      appToast.success("已设为默认头像");
    }
    catch (error) {
      console.error("设置默认头像失败:", error);
      appToast.error(error instanceof Error ? error.message : "设置默认头像失败，请稍后重试");
    }
  }, [
    handleDefaultAvatarApplied,
    role?.avatarId,
    role?.id,
    setDefaultAvatarMutation,
  ]);

  const queryClient = useQueryClient();
  const repairedDefaultAvatarIdsRef = useRef<Set<number>>(new Set());
  const deletionHook = useAvatarDeletion({
    role,
    avatars: spritesAvatars,
    selectedAvatarId: currentAvatar?.avatarId ?? 0,
    onAvatarChange: handleAvatarChange,
    onAvatarSelect: handleAvatarSelectById,
  });

  useEffect(() => {
    if (!isOpen || !role?.id) {
      return;
    }
    const avatarToRepair = spritesAvatars.find(avatar => (
      Boolean(avatar.avatarId) && !avatar.avatarFileId && !avatar.spriteFileId && !avatar.originFileId
    ));
    const avatarId = avatarToRepair?.avatarId;
    if (!avatarId || repairedDefaultAvatarIdsRef.current.has(avatarId)) {
      return;
    }

    repairedDefaultAvatarIdsRef.current.add(avatarId);
    void ensureRoleAvatarDefaultMedia(queryClient, role.id, avatarId)
      .catch((error) => {
        console.error("补齐默认头像立绘失败:", error);
      });
  }, [isOpen, queryClient, role?.id, spritesAvatars]);
  const { handleBatchDelete, isDeleting: isDeletingAvatar } = deletionHook;

  // 批量删除确认对话框状态
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  const [variantRemovalConfirm, setVariantRemovalConfirm] = useState<PendingVariantRemovalConfirm | null>(null);

  // 处理多选状态变化
  const handleMultiSelectChange = useCallback((indices: Set<number>, isMultiMode: boolean) => {
    if (!isVariantGroupView) {
      setSelectedVariantKey(null);
    }
    setSelectedIndices(indices);
    setIsMultiSelectMode(isMultiMode);
  }, [isVariantGroupView]);

  // 请求批量删除
  const handleBatchDeleteRequest = useCallback(() => {
    if (selectedIndices.size === 0)
      return;
    if (selectedIndices.size >= spritesAvatars.length) {
      appToast.error("无法删除所有头像，至少需要保留一个");
      return;
    }
    setBatchDeleteConfirmOpen(true);
  }, [selectedIndices, spritesAvatars.length]);

  // 执行批量删除
  const handleBatchDeleteConfirm = useCallback(async () => {
    // Get avatar IDs from selected indices
    const avatarIdsToDelete = Array.from(selectedIndices)
      .map(index => spritesAvatars[index]?.avatarId)
      .filter((id): id is number => id !== undefined);

    if (avatarIdsToDelete.length === 0)
      return;

    try {
      await handleBatchDelete(avatarIdsToDelete);
      // Exit multi-select mode and clear selections
      setIsMultiSelectMode(false);
      setSelectedIndices(new Set());
      setBatchDeleteConfirmOpen(false);

      // Reset internal index if needed
      if (internalIndex >= spritesAvatars.length - avatarIdsToDelete.length) {
        setInternalIndex(Math.max(0, spritesAvatars.length - avatarIdsToDelete.length - 1));
      }
    }
    catch (error) {
      console.error("批量删除失败:", error);
      appToast.error("批量删除失败，请稍后重试");
    }
  }, [selectedIndices, spritesAvatars, handleBatchDelete, internalIndex]);

  // 当弹窗从关闭变为打开时，重置为 defaultTab 并同步外部索引
  useEffect(() => {
    if (isOpen && !wasOpen) {
      setActiveTab(defaultTab);
      const validIndex = Math.max(0, Math.min(currentSpriteIndex, spritesAvatars.length - 1));
      const currentAvatar = spritesAvatars[validIndex];
      const currentAvatarVariantKey = currentAvatar
        ? getAvatarVariantKey(currentAvatar)
        : UNGROUPED_VARIANT_KEY;
      setInternalIndex(validIndex);
      setVariantFilter(currentAvatarVariantKey);
      setSelectedVariantKey(
        currentAvatarVariantKey === UNGROUPED_VARIANT_KEY ? null : currentAvatarVariantKey,
      );
      setIsMobileControlDrawerOpen(isMobile);
    }
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, defaultTab, currentSpriteIndex, spritesAvatars, isMobile]);

  useEffect(() => {
    if (!isOpen) {
      setIsMobileControlDrawerOpen(false);
      setPendingVariantInitialization(null);
      setPendingUploadAvatarWorkflows([]);
      setPendingUploadSpriteCalibration(null);
      setOptimisticUploadAvatars((prev) => {
        prev.forEach(item => URL.revokeObjectURL(item.localOriginUrl));
        return [];
      });
      optimisticAvatarUploadCompletionsRef.current.clear();
      defaultSpriteMediaUploadsRef.current.clear();
      localSpriteCropOverridesRef.current.forEach(item => URL.revokeObjectURL(item.localSpriteUrl));
      localSpriteCropOverridesRef.current = new Map();
      setLocalSpriteCropOverrides(new Map());
      spriteCropSubmissionCoordinatorRef.current.clear();
      nextOptimisticAvatarIdRef.current = -1;
      setPendingVariantSpriteCalibrationIndices(null);
      setBatchVariantCreationPrompt(null);
      setSelectedVariantKey(null);
    }
  }, [isOpen]);

  useEffect(() => () => {
    localSpriteCropOverridesRef.current.forEach(item => URL.revokeObjectURL(item.localSpriteUrl));
    localSpriteCropOverridesRef.current.clear();
    spriteCropSubmissionCoordinatorRef.current.clear();
  }, []);

  const handleTabChange = useCallback((tab: SettingsTab) => {
    if (tab !== "avatarCropper") {
      setPendingVariantInitialization(null);
    }
    setActiveTab(tab);
    if (isMobile) {
      setIsMobileControlDrawerOpen(false);
    }
  }, [isMobile]);

  const activeTabLabel = useMemo(() => {
    if (activeTab === "cropper")
      return "立绘校正";
    if (activeTab === "avatarCropper")
      return "头像校正";
    return "头像设置";
  }, [activeTab]);

  const roleDisplayName = characterName.trim() || "角色";
  const currentUploadVariantId = activeVariantId ?? undefined;
  const currentUploadVariantGroup = activeVariantGroup;
  const isVariantMutationPending = createVariantMutation.isPending
    || updateVariantMutation.isPending
    || deleteVariantMutation.isPending
    || updateRoleAvatarMutation.isPending
    || applyCropAvatarMutation.isPending;
  const isVariantWorkflowPending = Boolean(pendingVariantInitialization)
    || Boolean(pendingVariantSpriteCalibrationIndices)
    || isVariantMutationPending;
  const handleVariantFilterChange = useCallback((nextVariant: string) => {
    setVariantFilter(nextVariant);
    if (nextVariant !== UNGROUPED_VARIANT_KEY) {
      setSelectedVariantKey(nextVariant);
    }
    const firstVariantIndex = spritesAvatars.findIndex(avatar => (
      getAvatarVariantKey(avatar) === nextVariant
    ));
    if (firstVariantIndex >= 0) {
      setInternalIndex(firstVariantIndex);
    }
  }, [spritesAvatars]);

  const handleSelectVariantFolder = useCallback((variantKey: string) => {
    setSelectedVariantKey(variantKey);
    setSelectedIndices(new Set());
    setIsMultiSelectMode(false);
    const firstVariantIndex = spritesAvatars.findIndex(avatar => (
      getAvatarVariantKey(avatar) === variantKey
    ));
    if (firstVariantIndex >= 0) {
      setInternalIndex(firstVariantIndex);
    }
  }, [spritesAvatars]);

  const handleVariantFolderClick = useCallback((variantKey: string) => {
    const action = getVariantFolderClickAction(selectedVariantKey, variantKey);
    if (action === "enter") {
      handleVariantFilterChange(variantKey);
      return;
    }
    handleSelectVariantFolder(variantKey);
  }, [handleSelectVariantFolder, handleVariantFilterChange, selectedVariantKey]);

  const getSelectedVariantCreationIndices = useCallback(() => {
    if (!role?.id) {
      appToast.error("角色信息缺失，无法新建立绘组");
      return null;
    }

    if (!isMultiSelectMode || selectedAvatarItems.length === 0) {
      appToast.error("请先选择未分组头像");
      return null;
    }

    const sourceItems = selectedAvatarItems;
    const validIndices: number[] = [];
    let needsSpriteCalibration = false;
    let allHaveOrigin = true;
    const seen = new Set<number>();

    for (const { index, avatar } of sourceItems) {
      if (seen.has(index)) {
        continue;
      }
      seen.add(index);
      if (getAvatarVariantKey(avatar) !== UNGROUPED_VARIANT_KEY) {
        appToast.error("所选头像包含已绑定立绘组的头像");
        return null;
      }
      const originUrl = getEffectiveOriginUrl(avatar);
      const spriteCropSourceUrl = getSpriteCropSourceUrl(avatar);
      allHaveOrigin = allHaveOrigin && Boolean(originUrl);
      if (!avatar.avatarId || (!originUrl && !spriteCropSourceUrl)) {
        appToast.error("所选头像需要都有原图或已生成立绘");
        return null;
      }
      const hasSpriteCropContext = Boolean(
        avatar.spriteCropContext?.crop
        && avatar.spriteCropContext.sourceWidth
        && avatar.spriteCropContext.sourceHeight,
      );
      if (!hasSpriteCropContext) {
        if (!originUrl) {
          appToast.error("所选头像缺少原图，无法补齐立绘校正");
          return null;
        }
        needsSpriteCalibration = true;
      }
      if (hasSpriteCropContext && !spriteCropSourceUrl) {
        appToast.error("所选头像缺少已生成立绘，请先完成立绘裁剪");
        return null;
      }
      validIndices.push(index);
    }

    if (validIndices.length === 0) {
      appToast.error("没有可用于新建立绘组的头像");
      return null;
    }
    if (needsSpriteCalibration && !allHaveOrigin) {
      appToast.error("本批次需要补齐立绘校正，所选头像都必须有原图");
      return null;
    }
    return {
      indices: validIndices,
      needsSpriteCalibration,
    };
  }, [isMultiSelectMode, role?.id, selectedAvatarItems]);

  const handleCreateVariantFromSelection = useCallback(() => {
    const creation = getSelectedVariantCreationIndices();
    if (!creation) {
      return;
    }
    const { indices: validIndices, needsSpriteCalibration } = creation;

    if (needsSpriteCalibration) {
      const baseIndex = validIndices.includes(internalIndex) ? internalIndex : validIndices[0];
      setInternalIndex(baseIndex);
      setSelectedIndices(new Set(validIndices));
      setIsMultiSelectMode(validIndices.length > 1);
      setPendingVariantSpriteCalibrationIndices(validIndices);
      setActiveTab("cropper");
      if (isMobile) {
        setIsMobileControlDrawerOpen(false);
      }
      appToast.info("先完成立绘校正，完成后继续创建立绘组");
      return;
    }

    setVariantCreationIndices(validIndices);
    setVariantNameDraft(`立绘组 ${variantGroups.length + 1}`);
    setVariantDialogMode("create");
  }, [getSelectedVariantCreationIndices, internalIndex, isMobile, variantGroups.length]);

  const handleConfirmVariantName = useCallback((nextName: string) => {
    const name = nextName.trim();
    if (!name) {
      appToast.error("请输入立绘组名称");
      return;
    }
    if (variantCreationIndices.length === 0) {
      appToast.error("没有可用于新建立绘组的头像");
      return;
    }

    const validIndices = variantCreationIndices.filter(index => Boolean(spritesAvatars[index]));
    if (validIndices.length === 0) {
      appToast.error("没有可用于新建立绘组的头像");
      return;
    }

    const baseIndex = validIndices.includes(internalIndex) ? internalIndex : validIndices[0];
    setInternalIndex(baseIndex);
    if (validIndices.length > 1) {
      setIsMultiSelectMode(true);
      setSelectedIndices(new Set(validIndices));
    }
    else {
      setIsMultiSelectMode(false);
      setSelectedIndices(new Set());
    }
    setPendingVariantInitialization({ name });
    setVariantDialogMode("closed");
    setVariantCreationIndices([]);
    setActiveTab("avatarCropper");
    if (isMobile) {
      setIsMobileControlDrawerOpen(false);
    }
  }, [
    internalIndex,
    isMobile,
    spritesAvatars,
    variantCreationIndices,
  ]);

  const handleCancelVariantName = useCallback(() => {
    setVariantDialogMode("closed");
    setVariantCreationIndices([]);
  }, []);

  const handleOpenSpriteCropperForSelection = useCallback(() => {
    if (effectiveSelectedAvatarItems.length === 0) {
      appToast.error("请先选择头像");
      return;
    }
    const firstCropCandidate = effectiveSelectedAvatarItems.find(({ avatar }) => getEffectiveOriginUrl(avatar));
    if (!firstCropCandidate) {
      appToast.error("所选头像缺少可用于立绘校正的原图");
      return;
    }
    setInternalIndex(firstCropCandidate.index);
    setActiveTab("cropper");
    if (isMobile) {
      setIsMobileControlDrawerOpen(false);
    }
  }, [effectiveSelectedAvatarItems, isMobile]);

  const handleOpenSpriteCropperForCurrentAvatar = useCallback(() => {
    if (!currentAvatar) {
      appToast.error("请先选择头像");
      return;
    }
    const variantKey = getAvatarVariantKey(currentAvatar);
    if (variantKey !== UNGROUPED_VARIANT_KEY) {
      const firstCropCandidateIndex = spritesAvatars.findIndex(avatar => (
        getAvatarVariantKey(avatar) === variantKey && Boolean(getEffectiveOriginUrl(avatar))
      ));
      if (firstCropCandidateIndex < 0) {
        appToast.error("当前立绘组缺少可用于立绘校正的原图");
        return;
      }
      setSelectedVariantKey(null);
      setVariantFilter(variantKey);
      setInternalIndex(firstCropCandidateIndex);
      setActiveTab("cropper");
      if (isMobile) {
        setIsMobileControlDrawerOpen(false);
      }
      return;
    }
    if (!currentAvatarSpriteSourceUrl) {
      appToast.error("当前头像缺少可用于立绘校正的原图");
      return;
    }
    setActiveTab("cropper");
    if (isMobile) {
      setIsMobileControlDrawerOpen(false);
    }
  }, [currentAvatar, currentAvatarSpriteSourceUrl, isMobile, spritesAvatars]);

  const handleOpenAvatarCropperForSelection = useCallback(() => {
    if (effectiveSelectedAvatarItems.length === 0) {
      appToast.error("请先选择头像");
      return;
    }
    const firstCropCandidate = effectiveSelectedAvatarItems.find(({ avatar }) => getSpriteCropSourceUrl(avatar));
    if (!firstCropCandidate) {
      appToast.error("所选头像缺少可裁剪的立绘源图");
      return;
    }
    setInternalIndex(firstCropCandidate.index);
    setActiveTab("avatarCropper");
    if (isMobile) {
      setIsMobileControlDrawerOpen(false);
    }
  }, [effectiveSelectedAvatarItems, isMobile]);

  const handleOpenAvatarCropperForCurrentAvatar = useCallback(() => {
    if (!currentAvatar) {
      appToast.error("请先选择头像");
      return;
    }
    const variantKey = getAvatarVariantKey(currentAvatar);
    if (variantKey !== UNGROUPED_VARIANT_KEY) {
      const firstCropCandidateIndex = spritesAvatars.findIndex(avatar => (
        getAvatarVariantKey(avatar) === variantKey && Boolean(getSpriteCropSourceUrl(avatar))
      ));
      if (firstCropCandidateIndex < 0) {
        appToast.error("当前立绘组缺少可用于头像裁剪的立绘源图");
        return;
      }
      setSelectedVariantKey(null);
      setVariantFilter(variantKey);
      setInternalIndex(firstCropCandidateIndex);
      setActiveTab("avatarCropper");
      if (isMobile) {
        setIsMobileControlDrawerOpen(false);
      }
      return;
    }
    if (!currentAvatarCropperSourceUrl) {
      appToast.error("当前头像缺少可裁剪的立绘源图");
      return;
    }
    setActiveTab("avatarCropper");
    if (isMobile) {
      setIsMobileControlDrawerOpen(false);
    }
  }, [currentAvatar, currentAvatarCropperSourceUrl, isMobile, spritesAvatars]);

  const handleBatchSpriteCropApplied = useCallback((result: BatchSpriteCropApplyResult) => {
    if (result.successCount <= 0) {
      return;
    }
    const pendingSpriteSubmissions = result.pendingSpriteSubmissions ?? [];
    if (pendingSpriteSubmissions.length > 0) {
      const toastId = `sprite-crop-save-${Date.now()}`;
      appToast.loading("正在保存立绘…", { id: toastId });
      registerPendingSpriteCropSubmissions(pendingSpriteSubmissions, toastId);
    }
    else {
      patchOptimisticUploadAvatars(result.avatars, { clearSpriteUrl: true });
    }
    const updatedAvatarIds = new Set(
      result.avatars
        .map(avatar => normalizeVariantId(avatar.avatarId))
        .filter((avatarId): avatarId is number => avatarId != null),
    );
    const currentFlowAvatarIds = new Set([
      ...effectiveSelectedAvatarItems
        .map(({ avatar }) => normalizeVariantId(avatar.avatarId))
        .filter((avatarId): avatarId is number => avatarId != null),
      ...[normalizeVariantId(currentAvatar?.avatarId)].filter((avatarId): avatarId is number => avatarId != null),
    ]);
    if (currentFlowAvatarIds.size > 0 && !Array.from(updatedAvatarIds).some(avatarId => currentFlowAvatarIds.has(avatarId))) {
      return;
    }
    const updatedIndices = spritesAvatars
      .map((avatar, index) => {
        const avatarId = normalizeVariantId(avatar.avatarId);
        return avatarId != null && updatedAvatarIds.has(avatarId) ? index : -1;
      })
      .filter(index => index >= 0);
    const fallbackIndices = effectiveSelectedAvatarItems.length > 0
      ? effectiveSelectedAvatarItems.map(item => item.index)
      : currentAvatar
        ? [internalIndex]
        : [];
    const nextAvatarCropIndices = updatedIndices.length > 0 ? updatedIndices : fallbackIndices;
    const enterAvatarCropperAfterSpriteCrop = () => {
      const baseIndex = nextAvatarCropIndices.includes(internalIndex)
        ? internalIndex
        : nextAvatarCropIndices[0];
      if (baseIndex !== undefined) {
        setInternalIndex(baseIndex);
      }
      if (!isVariantBatchSelection && nextAvatarCropIndices.length > 0) {
        setSelectedIndices(new Set(nextAvatarCropIndices));
        setIsMultiSelectMode(nextAvatarCropIndices.length > 1);
      }
      setActiveTab("avatarCropper");
      if (isMobile) {
        setIsMobileControlDrawerOpen(false);
      }
    };
    if (pendingUploadSpriteCalibration) {
      const successfulUploadIds = pendingUploadSpriteCalibration.avatarIds
        .filter(avatarId => updatedAvatarIds.size === 0 || updatedAvatarIds.has(avatarId));
      const uploadIndices = successfulUploadIds
        .map(avatarId => spritesAvatars.findIndex(avatar => normalizeVariantId(avatar.avatarId) === avatarId))
        .filter(index => index >= 0);

      if (uploadIndices.length === 0) {
        appToast.error("没有可继续头像校正的上传头像");
        setPendingUploadSpriteCalibration(null);
        return;
      }

      const baseIndex = uploadIndices.includes(internalIndex) ? internalIndex : uploadIndices[0];
      setInternalIndex(baseIndex);
      setSelectedIndices(new Set(uploadIndices));
      setIsMultiSelectMode(uploadIndices.length > 1);
      setPendingUploadSpriteCalibration(null);

      const { target } = pendingUploadSpriteCalibration;
      if (target.mode === "new") {
        setPendingVariantInitialization({ name: target.name });
      }
      else if (target.mode === "existing" && !target.variantGroup?.compositionConfig) {
        setPendingVariantInitialization({
          name: target.variantGroup ? getVariantDisplayName(target.variantGroup) : `立绘组 ${target.variantId}`,
          existingVariantId: target.variantId,
        });
      }
      else {
        setPendingVariantInitialization(null);
      }
      setActiveTab("avatarCropper");
      if (isMobile) {
        setIsMobileControlDrawerOpen(false);
      }
      appToast.info("立绘校正完成，继续头像校正");
      return;
    }
    if (pendingVariantSpriteCalibrationIndices) {
      const fallbackIndices = pendingVariantSpriteCalibrationIndices
        .filter(index => Boolean(spritesAvatars[index]));
      const calibratedIndexSet = new Set(fallbackIndices);
      const nextIndices = updatedIndices
        .filter(index => calibratedIndexSet.has(index));
      const creationIndices = nextIndices.length > 0 ? nextIndices : fallbackIndices;
      if (creationIndices.length === 0) {
        appToast.error("没有可用于新建立绘组的头像");
        setPendingVariantSpriteCalibrationIndices(null);
        return;
      }
      setVariantCreationIndices(creationIndices);
      setVariantNameDraft(`立绘组 ${variantGroups.length + 1}`);
      setVariantDialogMode("create");
      setPendingVariantSpriteCalibrationIndices(null);
      return;
    }

    enterAvatarCropperAfterSpriteCrop();
    if (!isVariantBatchSelection && result.totalCount > 1) {
      setBatchVariantCreationPrompt({
        indices: nextAvatarCropIndices,
        successCount: result.successCount,
        failedCount: result.failedCount,
        totalCount: result.totalCount,
      });
    }
  }, [
    currentAvatar,
    effectiveSelectedAvatarItems,
    internalIndex,
    isVariantBatchSelection,
    isMobile,
    patchOptimisticUploadAvatars,
    pendingUploadSpriteCalibration,
    pendingVariantSpriteCalibrationIndices,
    registerPendingSpriteCropSubmissions,
    spritesAvatars,
    variantGroups.length,
  ]);

  const handleAvatarCropApplied = useCallback((result: BatchSpriteCropApplyResult) => {
    if (result.successCount <= 0) {
      return;
    }
    removeLocalSpriteCropOverrides(result.avatars);
    patchOptimisticUploadAvatars(result.avatars, { clearAvatarUrl: true, clearSpriteUrl: true });
    const updatedAvatarIds = new Set(
      result.avatars
        .map(avatar => normalizeVariantId(avatar.avatarId))
        .filter((avatarId): avatarId is number => avatarId != null),
    );
    const currentFlowAvatarIds = new Set([
      ...effectiveSelectedAvatarItems
        .map(({ avatar }) => normalizeVariantId(avatar.avatarId))
        .filter((avatarId): avatarId is number => avatarId != null),
      ...[normalizeVariantId(currentAvatar?.avatarId)].filter((avatarId): avatarId is number => avatarId != null),
    ]);
    if (currentFlowAvatarIds.size > 0 && !Array.from(updatedAvatarIds).some(avatarId => currentFlowAvatarIds.has(avatarId))) {
      return;
    }
    const nextIndex = spritesAvatars.findIndex((avatar) => {
      const avatarId = normalizeVariantId(avatar.avatarId);
      return avatarId != null && updatedAvatarIds.has(avatarId);
    });
    if (nextIndex >= 0) {
      setInternalIndex(nextIndex);
    }
    setPendingUploadSpriteCalibration(null);
    setPendingVariantInitialization(null);
    setActiveTab("setting");
    if (!isVariantBatchSelection) {
      setIsMultiSelectMode(false);
      setSelectedIndices(new Set());
    }
    if (isMobile) {
      setIsMobileControlDrawerOpen(false);
    }
    appToast.success(result.totalCount > 1
      ? `头像校正完成：成功 ${result.successCount}/${result.totalCount}`
      : "头像校正完成");
  }, [currentAvatar, effectiveSelectedAvatarItems, isMobile, isVariantBatchSelection, patchOptimisticUploadAvatars, removeLocalSpriteCropOverrides, spritesAvatars]);

  const handleCancelBatchVariantCreation = useCallback(() => {
    setBatchVariantCreationPrompt(null);
  }, []);

  const handleConfirmBatchVariantCreation = useCallback(() => {
    if (!batchVariantCreationPrompt) {
      return;
    }
    const validIndices = batchVariantCreationPrompt.indices.filter(index => Boolean(spritesAvatars[index]));
    if (validIndices.length === 0) {
      appToast.error("没有可用于新建立绘组的头像");
      setBatchVariantCreationPrompt(null);
      return;
    }

    const invalidAvatar = validIndices
      .map(index => spritesAvatars[index])
      .find(avatar => !avatar || getAvatarVariantKey(avatar) !== UNGROUPED_VARIANT_KEY);
    if (invalidAvatar) {
      appToast.error("所选头像包含已绑定立绘组的头像");
      setBatchVariantCreationPrompt(null);
      return;
    }

    setVariantCreationIndices(validIndices);
    setVariantNameDraft(`立绘组 ${variantGroups.length + 1}`);
    setVariantDialogMode("create");
    setBatchVariantCreationPrompt(null);
  }, [batchVariantCreationPrompt, spritesAvatars, variantGroups.length]);

  const handleRequestVariantRemoval = useCallback(() => {
    if (!role?.id || effectiveSelectedAvatarItems.length === 0) {
      appToast.error("请先选择头像");
      return;
    }
    const avatarsToUpdate = effectiveSelectedAvatarItems
      .map(({ avatar }) => avatar)
      .filter(avatar => getAvatarVariantKey(avatar) !== UNGROUPED_VARIANT_KEY);
    if (avatarsToUpdate.length === 0) {
      appToast.error("所选头像均未绑定立绘组");
      return;
    }

    if (isVariantGroupView || isVariantFolderSelected) {
      const variantId = isVariantGroupView ? activeVariantId : selectedVariantId;
      const label = (isVariantGroupView ? activeVariantLabel : selectedVariantLabel) || "立绘组";
      if (!variantId) {
        appToast.error("请选择立绘组");
        return;
      }
      setVariantRemovalConfirm({
        mode: "deleteVariant",
        variantId,
        label,
        avatarCount: avatarsToUpdate.length,
      });
      return;
    }

    setVariantRemovalConfirm({
      mode: "unassignAvatars",
      avatars: avatarsToUpdate,
      label: selectedVariantSummary,
      avatarCount: avatarsToUpdate.length,
    });
  }, [
    activeVariantId,
    activeVariantLabel,
    effectiveSelectedAvatarItems,
    isVariantFolderSelected,
    isVariantGroupView,
    role?.id,
    selectedVariantId,
    selectedVariantLabel,
    selectedVariantSummary,
  ]);

  const handleRequestVariantFolderRemoval = useCallback((variantId: number, label: string, avatarCount: number) => {
    if (!role?.id) {
      appToast.error("角色信息缺失，无法解散立绘组");
      return;
    }
    if (!variantId) {
      appToast.error("请选择立绘组");
      return;
    }
    setVariantRemovalConfirm({
      mode: "deleteVariant",
      variantId,
      label,
      avatarCount,
    });
  }, [role?.id]);

  const handleConfirmVariantRemoval = useCallback(async () => {
    if (!variantRemovalConfirm) {
      return;
    }
    if (!role?.id) {
      appToast.error("角色信息缺失，无法移出立绘组");
      return;
    }

    try {
      if (variantRemovalConfirm.mode === "deleteVariant") {
        await deleteVariantMutation.mutateAsync(variantRemovalConfirm.variantId);
        appToast.success(`已解散 ${variantRemovalConfirm.label}，${variantRemovalConfirm.avatarCount} 个头像已移回未分组`);
      }
      else {
        await Promise.all(variantRemovalConfirm.avatars.map(avatar => updateRoleAvatarMutation.mutateAsync({
          ...avatar,
          roleId: avatar.roleId ?? role.id,
          variantId: null,
          variantGroup: undefined,
        } as unknown as RoleAvatar)));
        appToast.success(`已移回未分组 ${variantRemovalConfirm.avatarCount} 个头像`);
      }
      setSelectedIndices(new Set());
      setIsMultiSelectMode(false);
      setVariantFilter(UNGROUPED_VARIANT_KEY);
      setSelectedVariantKey(null);
      setVariantRemovalConfirm(null);
    }
    catch (error) {
      console.error("移出立绘组失败:", error);
      appToast.error("移出失败，请稍后重试");
    }
  }, [deleteVariantMutation, role?.id, updateRoleAvatarMutation, variantRemovalConfirm]);

  const handleUnassignSingleAvatarVariant = useCallback(async (avatar: RoleAvatar) => {
    if (!role?.id || !avatar.avatarId) {
      throw new Error("头像信息缺失，无法移出立绘组");
    }

    const result = await updateRoleAvatarMutation.mutateAsync({
      ...avatar,
      roleId: avatar.roleId ?? role.id,
      variantId: null,
      variantGroup: undefined,
    } as unknown as RoleAvatar);
    if (!result.success) {
      throw new Error(result.errMsg || "移出立绘组失败");
    }

    appToast.success("已移出立绘组");
    return true;
  }, [role?.id, updateRoleAvatarMutation]);

  const assignAvatarItemsToVariant = useCallback(async (
    avatarItems: Array<{ index: number; avatar: RoleAvatar }>,
    variantId: number,
    options?: {
      allowReassign?: boolean;
      actionLabel?: string;
      switchToVariant?: boolean;
    },
  ) => {
    if (!role?.id || !variantId) {
      appToast.error("请选择要绑定的立绘组");
      return false;
    }
    const variantGroup = variantGroupById.get(variantId);
    if (!variantGroup?.compositionConfig) {
      appToast.error("该立绘组缺少合成配置，无法绑定");
      return false;
    }
    if (avatarItems.length === 0) {
      appToast.error("请先选择头像");
      return false;
    }

    const uniqueItems = Array.from(
      new Map(avatarItems.map(item => [
        item.avatar.avatarId ?? item.index,
        item,
      ])).values(),
    );
    const targetVariantKey = String(variantId);
    const itemsToAssign = uniqueItems.filter(({ avatar }) => (
      getAvatarVariantKey(avatar) !== targetVariantKey
    ));

    if (!options?.allowReassign && uniqueItems.some(({ avatar }) => (
      getAvatarVariantKey(avatar) !== UNGROUPED_VARIANT_KEY
    ))) {
      appToast.error("所选头像包含已绑定立绘组的头像，请先移出原组");
      return false;
    }
    if (itemsToAssign.length === 0) {
      appToast.success("所选头像已在该立绘组中");
      if (options?.switchToVariant !== false) {
        setSelectedVariantKey(targetVariantKey);
        setVariantFilter(targetVariantKey);
      }
      return true;
    }

    const actionLabel = options?.actionLabel ?? "绑定立绘组";
    const toastId = `sprite-batch-assign-variant-${Date.now()}`;
    const variantTransform = parseTransformFromVariantConfig(variantGroup.compositionConfig);
    const variantSpriteTransform = toSpriteTransformPayload(variantTransform);
    let completedCount = 0;
    let successCount = 0;
    const failures: Array<{ itemIndex: number; error: unknown }> = [];
    try {
      appToast.loading(`正在${actionLabel}：0/${itemsToAssign.length}`, { id: toastId });
      await runWithConcurrencyLimit(itemsToAssign, 4, async ({ avatar }, itemIndex) => {
        try {
          const roleId = avatar.roleId ?? role.id;
          if (!roleId || !avatar.avatarId) {
            throw new Error("头像信息缺失");
          }

          if (canReuseAvatarMediaForVariantConfig(avatar, variantGroup.compositionConfig)) {
            const updateRes = await updateRoleAvatarMutation.mutateAsync({
              ...avatar,
              roleId,
              avatarId: avatar.avatarId,
              variantId,
              variantGroup: undefined,
              spriteTransform: variantSpriteTransform ?? avatar.spriteTransform,
            } as RoleAvatar);
            if (!updateRes?.success) {
              throw new Error(updateRes?.errMsg || "绑定立绘组失败");
            }
            successCount += 1;
            return;
          }

          const croppedResult = await createCroppedSpriteAndAvatarByVariantConfig(
            avatar,
            variantGroup.compositionConfig!,
          );
          const spriteUpdateRes = await applyCropMutation.mutateAsync({
            roleId,
            avatarId: avatar.avatarId,
            croppedImageBlob: croppedResult.spriteBlob,
            transform: variantTransform,
            currentAvatar: avatar,
            spriteCropContext: croppedResult.spriteCropContext,
          });
          const spriteUpdatedAvatar = spriteUpdateRes?.data ?? {
            ...avatar,
            spriteCropContext: croppedResult.spriteCropContext,
            spriteTransform: variantSpriteTransform ?? avatar.spriteTransform,
          };
          const avatarCropContext = createAvatarCropContextFromVariantConfig(
            variantGroup.compositionConfig,
            spriteUpdatedAvatar.spriteFileId,
          );
          if (!avatarCropContext) {
            throw new Error("无法应用目标立绘组的头像槽位");
          }
          await applyCropAvatarMutation.mutateAsync({
            roleId,
            avatarId: avatar.avatarId,
            croppedImageBlob: croppedResult.avatarBlob,
            currentAvatar: spriteUpdatedAvatar,
            avatarCropContext,
            variantId,
          });

          successCount += 1;
        }
        catch (error) {
          failures.push({ itemIndex, error });
          console.error("绑定立绘组时处理头像失败:", avatar.avatarId, error);
        }
        finally {
          completedCount += 1;
          appToast.loading(`正在${actionLabel}：${completedCount}/${itemsToAssign.length}`, { id: toastId });
        }
      });

      const failureErrors = failures
        .sort((first, second) => first.itemIndex - second.itemIndex)
        .map(failure => failure.error);
      if (successCount === 0) {
        appToast.error(buildVariantAssignmentFailureToast(0, failureErrors), { id: toastId });
        return false;
      }

      setSelectedIndices(new Set());
      setIsMultiSelectMode(false);
      if (options?.switchToVariant !== false) {
        setSelectedVariantKey(targetVariantKey);
        setVariantFilter(targetVariantKey);
      }
      if (failureErrors.length > 0) {
        appToast.error(buildVariantAssignmentFailureToast(successCount, failureErrors), { id: toastId });
      }
      else {
        appToast.success(`已绑定 ${successCount} 个头像`, { id: toastId });
      }
      return true;
    }
    catch (error) {
      console.error("批量绑定立绘组失败:", error);
      appToast.error(buildVariantAssignmentFailureToast(0, [error]), { id: toastId });
      return false;
    }
  }, [
    applyCropAvatarMutation,
    applyCropMutation,
    role?.id,
    updateRoleAvatarMutation,
    variantGroupById,
  ]);

  useEffect(() => {
    if (
      !pendingUploadAvatarWorkflow
      || pendingUploadSpriteCalibration
      || pendingVariantInitialization
    ) {
      return;
    }

    const uploadedItems = pendingUploadAvatarWorkflow.avatarIds
      .map((avatarId) => {
        const index = spritesAvatars.findIndex(avatar => normalizeVariantId(avatar.avatarId) === avatarId);
        return index >= 0 && spritesAvatars[index]
          ? { index, avatar: spritesAvatars[index]! }
          : null;
      })
      .filter((item): item is { index: number; avatar: RoleAvatar } => Boolean(item));

    if (uploadedItems.length < pendingUploadAvatarWorkflow.avatarIds.length) {
      return;
    }

    const isCropFlowActive = activeTab === "cropper" || activeTab === "avatarCropper";
    const uploadedIndices = uploadedItems.map(item => item.index);
    if (!isCropFlowActive) {
      const firstIndex = uploadedIndices[0];
      if (firstIndex !== undefined) {
        setInternalIndex(firstIndex);
      }
      setSelectedIndices(new Set(uploadedIndices));
      setIsMultiSelectMode(uploadedIndices.length > 1);
      setVariantFilter(UNGROUPED_VARIANT_KEY);
    }
    setPendingUploadAvatarWorkflows(prev => (
      removeAvatarUploadWorkflow(prev, pendingUploadAvatarWorkflow.batchKey)
    ));

    const { target } = pendingUploadAvatarWorkflow;
    if (target.mode === "existing" && target.variantGroup?.compositionConfig) {
      void assignAvatarItemsToVariant(uploadedItems, target.variantId, {
        allowReassign: true,
        actionLabel: "应用立绘组",
      });
      return;
    }

    setPendingUploadSpriteCalibration(pendingUploadAvatarWorkflow);
    if (!isCropFlowActive) {
      setActiveTab("cropper");
      if (isMobile) {
        setIsMobileControlDrawerOpen(false);
      }
      appToast.info("先完成立绘校正，完成后继续头像校正");
    }
  }, [
    activeTab,
    assignAvatarItemsToVariant,
    isMobile,
    pendingUploadAvatarWorkflow,
    pendingUploadSpriteCalibration,
    pendingVariantInitialization,
    spritesAvatars,
  ]);

  const handleBatchAssignVariant = useCallback(async (variantId: number) => {
    const assigned = await assignAvatarItemsToVariant(effectiveSelectedAvatarItems, variantId, {
      allowReassign: false,
      actionLabel: "绑定立绘组",
      switchToVariant: false,
    });
    if (assigned) {
      setSelectedVariantKey(String(variantId));
    }
  }, [assignAvatarItemsToVariant, effectiveSelectedAvatarItems]);

  const handleAvatarListDragStart = useCallback((filteredIndex: number) => {
    const originalIndex = filteredIndices[filteredIndex];
    if (originalIndex === undefined || !spritesAvatars[originalIndex]) {
      setDraggedAvatarIndices([]);
      return;
    }

    const dragIndices = isMultiSelectMode && selectedIndices.has(originalIndex)
      ? Array.from(selectedIndices)
      : [originalIndex];
    const nextIndices = Array.from(new Set(dragIndices))
      .filter(index => Boolean(spritesAvatars[index]));
    setDraggedAvatarIndices(nextIndices);
  }, [filteredIndices, isMultiSelectMode, selectedIndices, spritesAvatars]);

  const handleAvatarListDragEnd = useCallback(() => {
    setDraggedAvatarIndices([]);
    setVariantDropTarget(null);
  }, []);

  const handleVariantFolderDragOver = useCallback((
    event: DragEvent<HTMLButtonElement>,
    variantKey: string,
  ) => {
    if (draggedAvatarIndices.length === 0) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setVariantDropTarget(variantKey);
  }, [draggedAvatarIndices.length]);

  const handleVariantFolderDrop = useCallback(async (
    event: DragEvent<HTMLButtonElement>,
    variantId: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const avatarItems = draggedAvatarIndices
      .map(index => ({
        index,
        avatar: spritesAvatars[index],
      }))
      .filter((item): item is { index: number; avatar: RoleAvatar } => Boolean(item.avatar));

    setDraggedAvatarIndices([]);
    setVariantDropTarget(null);
    if (avatarItems.length === 0) {
      return;
    }

    const assigned = await assignAvatarItemsToVariant(avatarItems, variantId, {
      allowReassign: true,
      actionLabel: "移动到立绘组",
      switchToVariant: false,
    });
    if (assigned) {
      setSelectedVariantKey(String(Math.floor(variantId)));
    }
  }, [assignAvatarItemsToVariant, draggedAvatarIndices, spritesAvatars]);

  const handleVariantInitializationComplete = useCallback(async (result: VariantInitializationCropResult) => {
    if (!role?.id || !pendingVariantInitialization) {
      throw new Error("立绘组创建状态已失效");
    }
    if (!result.baseAvatar.avatarId) {
      throw new Error("基准头像信息缺失，无法创建立绘组");
    }
    if (result.croppedAvatars.length === 0) {
      throw new Error("没有可绑定到立绘组的裁剪结果");
    }

    let variantId: number;
    if (pendingVariantInitialization.existingVariantId) {
      const currentVariant = variantGroupById.get(pendingVariantInitialization.existingVariantId);
      await updateVariantMutation.mutateAsync({
        variantId: pendingVariantInitialization.existingVariantId,
        name: currentVariant?.name ?? pendingVariantInitialization.name,
        baseAvatarId: currentVariant?.baseAvatarId ?? result.baseAvatar.avatarId,
        compositionConfig: result.compositionConfig,
      });
      variantId = pendingVariantInitialization.existingVariantId;
    }
    else {
      const createRes = await createVariantMutation.mutateAsync({
        roleId: role.id,
        baseAvatarId: result.baseAvatar.avatarId,
        name: pendingVariantInitialization.name,
        compositionConfig: result.compositionConfig,
      });
      variantId = Number(createRes.data?.variantId ?? 0);
    }
    if (!Number.isFinite(variantId) || variantId <= 0) {
      throw new Error("初始化立绘组失败");
    }

    const variantSpriteTransform = toSpriteTransformPayload(parseTransformFromVariantConfig(result.compositionConfig));
    await Promise.all(result.croppedAvatars.map(item => updateRoleAvatarMutation.mutateAsync({
      ...item.avatar,
      roleId: item.avatar.roleId ?? role.id,
      variantId: Math.floor(variantId),
      avatarCropContext: item.avatarCropContext,
      spriteTransform: variantSpriteTransform ?? item.avatar.spriteTransform,
    } as RoleAvatar)));

    setPendingVariantInitialization(null);
    setVariantFilter(String(Math.floor(variantId)));
    setIsMultiSelectMode(false);
    setSelectedIndices(new Set());
    setActiveTab("setting");
    appToast.success(`已初始化立绘组，绑定 ${result.croppedAvatars.length} 个头像`);
  }, [
    createVariantMutation,
    pendingVariantInitialization,
    role?.id,
    updateRoleAvatarMutation,
    updateVariantMutation,
    variantGroupById,
  ]);

  const variantFoldersSlot = isVariantGroupView
    ? (
        <div className="flex min-w-0 items-center gap-2 px-1">
          <IconButton
            size="xs"
            shape="square"
            onClick={() => handleVariantFilterChange(UNGROUPED_VARIANT_KEY)}
            title="返回立绘组列表"
            label="返回立绘组列表"
            icon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
          />
          <span className="min-w-0 truncate text-xs font-semibold text-base-content/85">
            {activeVariantLabel}
          </span>
        </div>
      )
    : (
        <section className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2 px-1.5 py-1 text-xs text-base-content/70">
            <span className="truncate font-semibold text-base-content/85">
              立绘组
            </span>
          </div>
          <div
            className="grid w-full min-w-0 gap-2"
            style={{ gridTemplateColumns: AVATAR_FOLDER_GRID_TEMPLATE_COLUMNS }}
          >
            {variantFolderItems.map((item) => {
          const isDropTarget = item.variantKey === variantDropTarget;
          const isSelected = selectedVariantKey === item.variantKey;
          return (
            <div key={item.variantKey} className="min-w-0">
              <div className={`group/variant-folder relative w-full overflow-visible ${isSelected ? "z-10" : ""}`}>
              <button
                type="button"
                className={`
                  group/avatar-folder relative aspect-square w-full overflow-hidden rounded-xl border
                  shadow-sm transition-[border-color,box-shadow,background-color,transform]
                  hover:-translate-y-0.5 hover:shadow-md
                  motion-reduce:transition-none motion-reduce:hover:translate-y-0
                  ${isSelected
                    ? selectedVariantFolderClassName
                    : "border-base-300/80 bg-base-200/70 hover:border-info/50 hover:bg-base-300/70"}
                  ${isDropTarget ? "border-info bg-info/10 ring-2 ring-info/40" : ""}
                `}
                title={isSelected
                  ? `${item.label} · 再次点击进入组内管理`
                  : `立绘组 ID：${item.variantId}`}
                aria-label={isSelected
                  ? `进入立绘组 ${item.label}`
                  : `选择立绘组 ${item.label}`}
                aria-pressed={isSelected}
                onClick={() => handleVariantFolderClick(item.variantKey)}
                onDragOver={event => handleVariantFolderDragOver(event, item.variantKey)}
                onDragLeave={() => {
                  if (variantDropTarget === item.variantKey) {
                    setVariantDropTarget(null);
                  }
                }}
                onDrop={event => handleVariantFolderDrop(event, item.variantId)}
              >
                <span
                  className="
                    pointer-events-none absolute inset-0 bg-gradient-to-br
                    from-base-100/70 via-base-100/15 to-base-content/10
                  "
                  aria-hidden="true"
                />
                {item.previewUrls.length > 0
                  ? item.previewUrls.map((previewUrl, previewIndex) => (
                      <span
                        key={`${item.variantKey}-${previewUrl}-${previewIndex}`}
                        className={`
                          absolute aspect-[3/4] w-[58%] overflow-hidden rounded-lg
                          border border-base-100/85 bg-base-100 shadow-md
                          transition-transform duration-200 ease-out
                          group-hover/avatar-folder:scale-[1.04]
                          motion-reduce:transition-none motion-reduce:group-hover/avatar-folder:scale-100
                          ${AVATAR_FOLDER_STACK_CARD_CLASS_NAMES[previewIndex]}
                        `}
                        aria-hidden="true"
                      >
                        <MediaImage
                          src={previewUrl}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                          draggable={false}
                        />
                      </span>
                    ))
                  : (
                      <div className="
                        flex size-full items-center justify-center text-base-content/45
                      ">
                        <FolderOpenIcon className="size-9" weight="regular" aria-hidden="true" />
                      </div>
                    )}
                <span className="
                  absolute bottom-1.5 right-1.5 z-10 rounded-full bg-base-100/95 px-1.5 py-0.5
                  text-[0.625rem] font-medium leading-none text-base-content/70 shadow-sm
                ">
                  {item.count}
                </span>
                {isDropTarget && (
                  <span className="
                    absolute inset-0 z-20 flex items-center justify-center
                    bg-info/15 text-xs font-semibold text-info
                  ">
                    放入
                  </span>
                )}
              </button>
              <div className="
                pointer-events-none absolute right-1.5 top-1.5 z-20 flex items-center gap-0.5
                rounded-full bg-neutral/80 p-0.5 shadow-md ring-1 ring-white/20 backdrop-blur
                opacity-0 transition-opacity duration-200
                group-hover/variant-folder:opacity-100 group-focus-within/variant-folder:opacity-100
              ">
                <div className="group/tool relative pointer-events-auto">
                  <button
                    type="button"
                    className="
                      inline-flex size-7 items-center justify-center rounded-full
                      border-0 bg-transparent p-0 text-neutral-content
                      transition-[border-radius,transform] duration-150
                      hover:scale-105 hover:rounded-lg active:scale-95
                      disabled:text-neutral-content/50
                    "
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRequestVariantFolderRemoval(item.variantId, item.label, item.count);
                    }}
                    disabled={isVariantMutationPending}
                    aria-label={`解散立绘组 ${item.label}`}
                  >
                    <TrashIcon className="size-4" aria-hidden="true" />
                  </button>
                  <span className="
                    pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-md
                    bg-neutral/95 px-2 py-1 text-xs whitespace-nowrap text-neutral-content
                    opacity-0 shadow-md ring-1 ring-white/15 transition
                    group-hover/tool:opacity-100 group-focus-within/tool:opacity-100
                  ">
                    解散立绘组
                  </span>
                </div>
              </div>
              </div>
              <button
                type="button"
                className={`
                  mt-1 block w-full truncate text-center text-xs transition-colors
                  ${isSelected
                    ? selectedVariantFolderLabelClassName
                    : "text-base-content/70 hover:text-base-content"}
                `}
                title={isSelected
                  ? `${item.label} · 再次点击进入组内管理`
                  : `${item.label} · ${item.count}`}
                aria-label={isSelected
                  ? `进入立绘组 ${item.label}`
                  : `选择立绘组 ${item.label}`}
                onClick={() => handleVariantFolderClick(item.variantKey)}
              >
                {item.label}
                <span className="text-base-content/50">
                  {" "}
                  ·
                  {" "}
                  {item.count}
                </span>
              </button>
            </div>
          );
            })}
          </div>
        </section>
      );

  const batchPreviewBaseAvatarId = normalizeVariantId(editingVariantGroup?.baseAvatarId);
  const batchPreviewItem = (
    batchPreviewBaseAvatarId
      ? effectiveSelectedAvatarItems.find(({ avatar }) => normalizeVariantId(avatar.avatarId) === batchPreviewBaseAvatarId)
      : undefined
  )
    ?? effectiveSelectedAvatarItems.find(({ avatar }) => getEffectiveAvatarUrl(avatar) || getEffectiveSpriteUrl(avatar))
    ?? effectiveSelectedAvatarItems[0]
    ?? (currentAvatar ? { index: internalIndex, avatar: currentAvatar } : null);
  const batchPreviewAvatar = batchPreviewItem?.avatar ?? null;
  const batchPreviewSpriteUrl = batchPreviewAvatar
    ? getEffectiveSpriteOriginalUrl(batchPreviewAvatar) || getEffectiveSpriteUrl(batchPreviewAvatar)
    : "";
  const batchPreviewAvatarUrl = batchPreviewAvatar ? getEffectiveAvatarUrl(batchPreviewAvatar) : "";
  const batchPreviewTransform = editingVariantGroup?.compositionConfig
    ? parseTransformFromVariantConfig(editingVariantGroup.compositionConfig)
    : parseTransformFromAvatar(batchPreviewAvatar);
  const batchWorkflowProgress = buildAvatarCalibrationWorkflowProgress(
    effectiveSelectedAvatarItems.map(({ avatar }) => avatar),
  );
  const canOpenBatchSpriteCropper = effectiveSelectedAvatarItems.some(({ avatar }) => getEffectiveOriginUrl(avatar));
  const canOpenBatchAvatarCropper = effectiveSelectedAvatarItems.some(({ avatar }) => getSpriteCropSourceUrl(avatar));
  const batchHeaderTitle = isVariantBatchSelection ? selectedVariantSummary : "批量设置";

  const batchSettingsPanel = (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
      <div className="
        mb-3 flex w-full shrink-0 flex-wrap items-center gap-2 border-b
        border-base-300/70 pb-3
      ">
        <div className="
          flex min-w-0 flex-1 flex-wrap items-center gap-2
        ">
          <span className="
            block min-w-0 max-w-[22rem] truncate rounded-md px-1 py-1
            text-base font-semibold text-base-content
          ">
            {batchHeaderTitle}
          </span>
          {!isVariantBatchSelection && (
            <span className="
              inline-flex max-w-[9rem] shrink-0 truncate rounded-md
              bg-base-200/60 px-2 py-1 text-xs font-medium text-base-content/70
            ">
              已选
              {" "}
              {effectiveSelectedAvatarCount}
              {" "}
              个头像
            </span>
          )}
        </div>

        <div className="
          ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2
        ">
          {!isVariantBatchSelection && (
            <Button
              tone="primary"
              appearance="solid"
              size="sm"
              className="h-8 min-h-8 gap-2 rounded-md px-3"
              onClick={() => setVariantDialogMode("select")}
              disabled={isVariantWorkflowPending || effectiveSelectedAvatarCount === 0}
              title="加入立绘组"
              icon={<FolderOpenIcon className="size-4" aria-hidden="true" />}
            >
              加入立绘组
            </Button>
          )}

          {!isVariantBatchSelection && (
            <IconButton
              variant="error"
              size="sm"
              shape="square"
              className="h-8 min-h-8 rounded-md"
              onClick={handleRequestVariantRemoval}
              disabled={isVariantMutationPending || selectedWithVariantCount === 0}
              title="移回未分组"
              label="移回未分组"
              loading={isVariantMutationPending}
              icon={<TrashIcon className="size-4" aria-hidden="true" />}
            />
          )}
        </div>
      </div>

      <div className="
        flex-1 min-h-0 relative overflow-hidden
      ">
        <div className="absolute inset-0 overflow-auto p-3 xl:overflow-hidden">
          <AvatarCalibrationPreviewPanel
            characterName={roleDisplayName}
            spriteImageUrl={batchPreviewSpriteUrl}
            avatarImageUrl={batchPreviewAvatarUrl}
            spriteTransform={batchPreviewTransform}
            workflowProgress={batchWorkflowProgress}
            canOpenSpriteCropper={canOpenBatchSpriteCropper}
            canOpenAvatarCropper={canOpenBatchAvatarCropper}
            onOpenSpriteCropper={handleOpenSpriteCropperForSelection}
            onOpenAvatarCropper={handleOpenAvatarCropperForSelection}
          />
        </div>
      </div>
    </div>
  );

  const avatarListPanel = (
    <>
      <div className="
        flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5
        md:p-3
      ">
        <SpriteListGrid
          avatars={filteredSprites}
          allAvatars={spritesAvatars}
          totalAvatarsCount={spritesAvatars.length}
          selectedIndex={isVariantFolderSelected ? -1 : (filteredIndexMap.get(internalIndex) ?? 0)}
          onSelect={(index) => {
            const originalIndex = filteredIndices[index];
            if (originalIndex === undefined)
              return;
            if (!isVariantGroupView) {
              setSelectedVariantKey(null);
            }
            handleInternalIndexChange(originalIndex);
          }}
          mode="manage"
          className="size-full min-w-0"
          gridCols=""
          gridTemplateColumns={AVATAR_LIST_GRID_TEMPLATE_COLUMNS}
          role={role}
          onAvatarChange={handleAvatarChange}
          onAvatarSelect={handleAvatarSelectById}
          defaultAvatarId={role?.avatarId}
          onSetDefaultAvatar={handleSetDefaultAvatar}
          isSettingDefaultAvatar={setDefaultAvatarMutation.isPending}
          onReplaceAvatarSource={handleReplaceAvatarSource}
          isReplacingAvatarSource={updateRoleAvatarMutation.isPending}
          onUploadFilesSelected={handleAvatarUploadFilesSelected}
          selectedIndices={filteredSelectedIndices}
          isMultiSelectMode={isMultiSelectMode}
          groupByCategory
          uploadVariantId={currentUploadVariantId}
          lockedUploadVariantGroup={currentUploadVariantGroup}
          availableVariants={variantGroups}
          beforeContentSlot={variantFoldersSlot}
          onDeleteSelected={isVariantGroupView || isVariantFolderSelected
            ? undefined
            : handleBatchDeleteRequest}
          onAvatarDragStart={handleAvatarListDragStart}
          onAvatarDragEnd={handleAvatarListDragEnd}
          onMultiSelectChange={(indices, isMultiMode) => {
            const nextSelected = new Set<number>();
            indices.forEach((filteredIndex) => {
              const originalIndex = filteredIndices[filteredIndex];
              if (originalIndex !== undefined) {
                nextSelected.add(originalIndex);
              }
            });
            handleMultiSelectChange(nextSelected, isMultiMode);
          }}
        />
      </div>
    </>
  );

  const tabNavigation = (
    <div className="shrink-0 border-b border-base-300 bg-base-200/50">
      <nav className="
        flex flex-wrap gap-1.5 p-2 overflow-x-hidden
        md:flex-nowrap md:overflow-x-auto md:overscroll-x-none
      ">
        {/* 头像设置 Tab */}
        <button
          type="button"
          onClick={() => handleTabChange("setting")}
          className={`
            flex items-center gap-1.5
            sm:gap-2
            px-2.5 py-2
            sm:px-3
            rounded-lg text-xs
            sm:text-sm
            transition-colors whitespace-nowrap
            ${
            activeTab === "setting"
              ? "bg-info text-info-content"
              : "hover:bg-base-300"
          }
          `}
        >
          <GearIcon className="
            size-4
            sm:size-5
            shrink-0
          " aria-hidden="true" />
          <span>头像设置</span>
        </button>

      </nav>
    </div>
  );

  const cropperBackButton = activeTab === "cropper" || activeTab === "avatarCropper"
    ? (
        <IconButton
          size="sm"
          shape="square"
          className="shrink-0"
          onClick={() => handleTabChange("setting")}
          label="返回头像设置"
          tooltip="返回头像设置"
          tooltipPlacement="right"
          icon={<ArrowLeftIcon className="size-icon-compact" aria-hidden="true" />}
        />
      )
    : null;

  const emptyCropperToolbar = cropperBackButton
    ? (
        <div className={surfaceClassName({
          level: "content",
          className: "mb-2 flex shrink-0 items-center gap-2 p-1.5",
        })}>
          {cropperBackButton}
          <span className={textClassName({
            variant: "componentTitle",
            wrap: "truncate",
            className: "min-w-0",
          })}>
            {activeTabLabel}
          </span>
        </div>
      )
    : null;

  if (!isOpen)
    return null;

  return (
    <ToastWindow
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={isMobile}
      disableScroll
      panelClassName="
        md:!h-[88vh] md:!max-h-[88vh] md:!w-[90vw]
        md:!max-w-[90vw] md:!overflow-hidden
      "
    >
      <div className="
        flex size-full min-h-0 min-w-0 flex-col overflow-x-hidden
        md:w-full md:max-w-none md:flex-row
      ">
        {/* 左侧头像列表 - 桌面端固定显示 */}
        <div className="
          hidden
          md:flex md:w-[clamp(9.5rem,calc(100vw_-_52rem),32rem)]
          md:shrink-0 md:border-r
          border-base-300 bg-base-200/30
          md:min-h-0 md:overflow-hidden md:flex-col
        ">
          {avatarListPanel}
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-x-hidden">
          {/* 移动端折叠控制按钮 */}
          {isMobile && (
            <div className="
              shrink-0 border-b border-base-300 bg-base-200/50 p-2.5
            ">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsMobileControlDrawerOpen(true)}
                  className="min-w-0 flex-1 justify-between bg-base-200"
                >
                  <span className="flex items-center gap-2">
                    <ImageIcon className="size-5" aria-hidden="true" />
                    <span>头像与工具</span>
                  </span>
                  <span className="
                    text-sm text-base-content/70 truncate max-w-28
                  ">
                    {activeTabLabel}
                  </span>
                </Button>
                <IconButton
                  size="sm"
                  shape="square"
                  className="shrink-0"
                  onClick={onClose}
                  label="返回角色页面"
                  icon={<ArrowLeftIcon className="size-5" aria-hidden="true" />}
                />
              </div>
            </div>
          )}

          {/* Tab 内容区域 */}
          <div className="
            flex-1 overflow-y-auto overflow-x-hidden p-3
            md:p-4
            min-h-0
          ">
            {/* 立绘校正内容 */}
            {activeTab === "cropper" && (
              <div className="h-full">
                {currentSpriteUrl
                  ? (
                      <div className="flex h-full min-h-0 flex-col gap-2">
                        {pendingUploadSpriteCalibration && (
                          <div className="
                            flex shrink-0 items-center justify-between gap-3
                            rounded-md border border-info/30 bg-info/5 px-3 py-2
                            text-sm text-base-content
                          ">
                            <span className="min-w-0 truncate">
                              正在校正刚导入的
                              {" "}
                              <span className="font-semibold">
                                {pendingUploadSpriteCalibration.avatarIds.length}
                                {" "}
                                个头像
                              </span>
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="shrink-0"
                              onClick={() => setPendingUploadSpriteCalibration(null)}
                              disabled={isVariantMutationPending}
                            >
                              取消
                            </Button>
                          </div>
                        )}
                        {pendingVariantSpriteCalibrationIndices && (
                          <div className="
                            flex shrink-0 items-center justify-between gap-3
                            rounded-md border border-info/30 bg-info/5 px-3 py-2
                            text-sm text-base-content
                          ">
                            <span className="min-w-0 truncate">
                              正在为新立绘组补齐立绘校正
                              {" "}
                              <span className="font-semibold">
                                {pendingVariantSpriteCalibrationIndices.length}
                                {" "}
                                个头像
                              </span>
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="shrink-0"
                              onClick={() => setPendingVariantSpriteCalibrationIndices(null)}
                              disabled={isVariantMutationPending}
                            >
                              取消
                            </Button>
                          </div>
                        )}
                        <div className="min-h-0 flex-1">
                          <SpriteCropper
                            spriteUrl={currentSpriteUrl}
                            roleAvatars={spriteCropperAvatars}
                            initialSpriteIndex={spriteCropperInitialIndex}
                            characterName={characterName}
                            waitForAvatarUpload={waitForAvatarUpload}
                            toolbarStart={cropperBackButton}
                            cropMode="sprite"
                            onSpriteIndexChange={handleSpriteCropperIndexChange}
                            selectedIndices={effectiveSpriteCropperSelectedIndices}
                            isMultiSelectMode={effectiveSpriteCropperMultiSelectMode}
                            availableVariants={variantGroups}
                            allowVariantGroupEditing={isVariantBatchSelection}
                            editingVariantGroup={editingVariantGroup}
                            forceBatchMode={isVariantBatchSelection}
                            onBatchSpriteCropApplied={handleBatchSpriteCropApplied}
                            onSingleSpriteCropApplied={handleBatchSpriteCropApplied}
                          />
                        </div>
                      </div>
                    )
                  : (
                      <div className="flex h-full min-h-0 flex-col gap-2">
                        {emptyCropperToolbar}
                        <div className="
                          flex flex-1 flex-col items-center justify-center
                          text-base-content/70
                        ">
                          <ImageIcon className="size-12 mb-2" weight="regular" aria-hidden="true" />
                          <p>当前没有可用的立绘进行校正</p>
                        </div>
                      </div>
                    )}
              </div>
            )}

            {/* 头像校正内容 */}
            {activeTab === "avatarCropper" && (
              <div className="h-full">
                {currentAvatarCropSourceUrl
                  ? (
                      <div className="flex h-full min-h-0 flex-col gap-2">
                        {pendingVariantInitialization && (
                          <div className="
                            flex shrink-0 items-center justify-between gap-3
                            rounded-md border border-info/30 bg-info/5 px-3 py-2
                            text-sm text-base-content
                          ">
                            <span className="min-w-0 truncate">
                              正在创建
                              {" "}
                              <span className="font-semibold">
                                {pendingVariantInitialization.name}
                              </span>
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="shrink-0"
                              onClick={() => setPendingVariantInitialization(null)}
                              disabled={isVariantMutationPending}
                            >
                              取消
                            </Button>
                          </div>
                        )}
                        <div className="min-h-0 flex-1">
                          <SpriteCropper
                            spriteUrl={currentAvatarCropSourceUrl}
                            roleAvatars={avatarCropperAvatars}
                            initialSpriteIndex={avatarCropperInitialIndex}
                            characterName={characterName}
                            waitForAvatarUpload={waitForAvatarUpload}
                            waitForAvatarCropSubmit={waitForAvatarCropSubmit}
                            toolbarStart={cropperBackButton}
                            cropMode="avatar"
                            onSpriteIndexChange={handleAvatarCropperIndexChange}
                            selectedIndices={effectiveAvatarCropperSelectedIndices}
                            isMultiSelectMode={effectiveAvatarCropperMultiSelectMode}
                            availableVariants={variantGroups}
                            allowVariantGroupEditing={isVariantBatchSelection}
                            editingVariantGroup={editingVariantGroup}
                            forceBatchMode={isVariantBatchSelection}
                            onAvatarCropApplied={handleAvatarCropApplied}
                            variantInitialization={pendingVariantInitialization
                              ? {
                                  active: true,
                                  name: pendingVariantInitialization.name,
                                  onComplete: handleVariantInitializationComplete,
                                  onCancel: () => setPendingVariantInitialization(null),
                                }
                              : undefined}
                          />
                        </div>
                      </div>
                    )
                  : (
                      <div className="flex h-full min-h-0 flex-col gap-2">
                        {emptyCropperToolbar}
                        <div className="
                          flex flex-1 flex-col items-center justify-center
                          text-base-content/70
                        ">
                          <UserCircleIcon className="size-12 mb-2" weight="regular" aria-hidden="true" />
                          <p>当前没有可用的立绘进行头像裁剪，请先完成立绘裁剪。</p>
                        </div>
                      </div>
                    )}
              </div>
            )}

            {/* 头像设置内容 */}
            {activeTab === "setting" && (
              isVariantBatchSelection || (isMultiSelectMode && selectedAvatarCount > 0)
                ? batchSettingsPanel
                : (
                    <AvatarSettingsTab
                      spritesAvatars={spritesAvatars}
                      roleAvatars={roleAvatars}
                      selectedIndex={internalIndex}
                      characterName={characterName}
                      availableVariants={variantGroups}
                      onUnassignVariant={handleUnassignSingleAvatarVariant}
                      onAssignVariant={(avatar, variantId) => assignAvatarItemsToVariant(
                        [{ index: internalIndex, avatar }],
                        variantId,
                        {
                          allowReassign: true,
                          actionLabel: "绑定立绘组",
                        },
                      )}
                      onOpenSpriteCropper={handleOpenSpriteCropperForCurrentAvatar}
                      onOpenAvatarCropper={handleOpenAvatarCropperForCurrentAvatar}
                      canOpenSpriteCropper={canOpenCurrentSpriteCropper}
                      canOpenAvatarCropper={canOpenCurrentAvatarCropper}
                    />
                  )
            )}

          </div>
        </div>
      </div>

      {/* 移动端：头像与工具抽屉 */}
      {isMobile && (
        <Drawer.Root
          open={isMobileControlDrawerOpen}
          onOpenChange={setIsMobileControlDrawerOpen}
          direction="bottom"
        >
          <Drawer.Portal>
            <Drawer.Overlay className="
              fixed inset-0 z-1200 bg-black/40
              md:hidden
              pointer-events-auto
            " />
            <Drawer.Content className="
              fixed inset-x-0 bottom-0 z-1201 h-[75vh] rounded-t-2xl border
              border-base-300 bg-base-100
              md:hidden
              flex flex-col pointer-events-auto
            ">
              <div className="
                mx-auto mt-2 h-1.5 w-12 rounded-full bg-base-content/30
              " />
              <div className="flex items-center justify-between px-3 py-2">
                <Drawer.Title className="text-base font-semibold">头像与工具</Drawer.Title>
                <Drawer.Description className="sr-only">
                  在移动端查看头像列表并切换头像设置。
                </Drawer.Description>
                <IconButton
                  size="sm"
                  shape="square"
                  onClick={() => setIsMobileControlDrawerOpen(false)}
                  label="关闭头像与工具抽屉"
                  icon={<XIcon className="size-5" aria-hidden="true" />}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
                {tabNavigation}
                <div className="
                  w-full min-h-0 max-h-[46vh] overflow-hidden border-y
                  border-base-300 bg-base-200/30 flex flex-col
                ">
                  {avatarListPanel}
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}

      <VariantAssignmentDialog
        open={variantDialogMode !== "closed"}
        mode={variantDialogMode === "create" ? "create" : "select"}
        selectedCount={variantDialogMode === "create"
          ? variantCreationIndices.length
          : effectiveSelectedAvatarCount}
        variants={bindableVariantGroups}
        selectedVariantId={null}
        allowUnassigned={false}
        isPending={isVariantWorkflowPending}
        onClose={handleCancelVariantName}
        onSelectVariant={(variantId) => {
          if (variantId == null) {
            return;
          }
          setVariantDialogMode("closed");
          void handleBatchAssignVariant(variantId);
        }}
        onRequestCreate={handleCreateVariantFromSelection}
        onBackToSelection={() => setVariantDialogMode("select")}
        initialVariantName={variantNameDraft}
        onConfirmCreate={handleConfirmVariantName}
      />

      <ConfirmDialog
        open={Boolean(batchVariantCreationPrompt)}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelBatchVariantCreation();
          }
        }}
        onConfirm={handleConfirmBatchVariantCreation}
        title="创建新的立绘组？"
        description={batchVariantCreationPrompt
          ? (
              <p className="text-sm text-base-content/70">
              已完成批量立绘上传：成功
              {" "}
              <span className="font-semibold text-base-content">
                {batchVariantCreationPrompt.successCount}
                /
                {batchVariantCreationPrompt.totalCount}
              </span>
              {batchVariantCreationPrompt.failedCount > 0 && (
                <>
                  {" "}
                  ，失败
                  {" "}
                  <span className="font-semibold text-error">
                    {batchVariantCreationPrompt.failedCount}
                  </span>
                </>
              )}
              。是否继续为这批头像创建新的立绘组？
            </p>
            )
          : null}
        confirmLabel="创建立绘组"
        cancelLabel="暂不创建"
        variant="info"
      />

      <ConfirmDialog
        open={Boolean(variantRemovalConfirm)}
        onOpenChange={(open) => {
          if (!open && !isVariantMutationPending) {
            setVariantRemovalConfirm(null);
          }
        }}
        onConfirm={handleConfirmVariantRemoval}
        title={variantRemovalConfirm?.mode === "deleteVariant" ? "确认解散立绘组" : "确认移回未分组"}
        description={variantRemovalConfirm
          ? (
              <InlineAlert
                tone="error"
                icon={<WarningCircleIcon className="size-6" aria-hidden="true" />}
                className="my-1 text-left"
              >
              <span>
                {variantRemovalConfirm.mode === "deleteVariant"
                  ? (
                      <>
                        将删除
                        {" "}
                        <span className="font-semibold">{variantRemovalConfirm.label}</span>
                        {" "}
                        这个立绘组，并把组内
                        {" "}
                        <span className="font-semibold">{variantRemovalConfirm.avatarCount}</span>
                        {" "}
                        个头像移回未分组。头像和图片文件会保留。
                      </>
                    )
                  : (
                      <>
                        将选中的
                        {" "}
                        <span className="font-semibold">{variantRemovalConfirm.avatarCount}</span>
                        {" "}
                        个头像移回未分组，并解除当前立绘组绑定。
                      </>
                    )}
              </span>
            </InlineAlert>
            )
          : null}
        confirmLabel={isVariantMutationPending
          ? "处理中..."
          : variantRemovalConfirm?.mode === "deleteVariant" ? "确认解散" : "确认移回"}
        cancelLabel="取消"
        variant="danger"
        icon={<WarningCircleIcon className="size-6" weight="regular" />}
      />

      <ConfirmDialog
        open={batchDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open)
            setBatchDeleteConfirmOpen(false);
        }}
        onConfirm={handleBatchDeleteConfirm}
        title="确认批量删除"
        description={(
          <div className="space-y-3">
            <p>
              确定要删除选中的
              {" "}
              <span className="font-bold text-error">{selectedIndices.size}</span>
              {" "}
              个头像吗？删除后不可恢复。
            </p>
            {selectedIndices.size >= spritesAvatars.length && (
              <InlineAlert
                tone="warning"
                icon={<WarningCircleIcon className="size-6" aria-hidden="true" />}
                className="text-left"
              >
                <span>无法删除所有头像，至少需要保留一个</span>
              </InlineAlert>
            )}
          </div>
        )}
        confirmLabel={isDeletingAvatar ? "删除中..." : "确认删除"}
        cancelLabel="取消"
        icon={<TrashIcon className="size-6" weight="regular" />}
        variant="danger"
      />
    </ToastWindow>
  );
}
