import type { ReactNode } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import { UserCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { RoleAvatar, RoleAvatarVariant } from "api";

import { Button } from "@/components/common/Button";
import { DoubleClickEditableText } from "@/components/common/DoubleClickEditableText";
import { AvatarPreview } from "@/components/Role/Preview/AvatarPreview";
import { RenderPreview } from "@/components/Role/Preview/RenderPreview";
import { canvasPreview, createFullImageCrop } from "@/utils/imgCropper";
import { useUpdateRoleAvatarMutation } from "api/hooks/RoleAndAvatarHooks";

import type { Transform } from "../TransformControl";

import { loadPreviewSpriteImage, preloadPreviewSpriteImages } from "../previewSpriteImageCache";
import {

  getEffectiveAvatarUrl,
  getEffectiveOriginUrl,
  getEffectiveSpriteOriginalUrl,
  getEffectiveSpriteUrl,
  getSpriteCropSourceUrl,
  parseTransformFromAvatar,
} from "../utils";

type AvatarSettingsTabProps = {
  /** 有立绘的头像列表 */
  spritesAvatars: RoleAvatar[];
  /** 完整的角色头像列表 */
  roleAvatars: RoleAvatar[];
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 角色名，用于预览 */
  characterName: string;
  /** 可绑定的立绘组列表 */
  availableVariants?: RoleAvatarVariant[];
  /** 应用完成后的回调（用于关闭弹窗等） */
  onApply?: () => void;
  /** 显示将当前头像移出立绘组的动作 */
  showUnassignVariantAction?: boolean;
  /** 将当前头像移出立绘组 */
  onUnassignVariant?: (avatar: RoleAvatar) => Promise<boolean>;
  /** 将当前头像归入目标立绘组，并按立绘组上下文重建裁剪结果 */
  onAssignVariant?: (avatar: RoleAvatar, variantId: number) => Promise<boolean>;
  /** 从立绘预览进入立绘校正 */
  onOpenSpriteCropper?: () => void;
  /** 从聊天头像预览进入头像校正 */
  onOpenAvatarCropper?: () => void;
  /** 当前头像是否有可用于立绘校正的原图 */
  canOpenSpriteCropper?: boolean;
  /** 当前头像是否有可用于头像校正的立绘源图 */
  canOpenAvatarCropper?: boolean;
}

type PreviewProps = {
  characterName: string;
  imageUrl: string;
}

type SpritePreviewProps = PreviewProps & {
  transform: Transform;
}

type CalibrationPreviewShellProps = {
  title: string;
  actionLabel: string;
  disabledLabel: string;
  canOpen: boolean;
  onOpen?: () => void;
  className?: string;
  children: ReactNode;
}

type AvatarCalibrationStepStatus = "complete" | "actionable" | "blocked";

export type AvatarCalibrationStepProgress = {
  status: AvatarCalibrationStepStatus;
  completeCount: number;
  sourceCount: number;
  totalCount: number;
}

export type AvatarCalibrationWorkflowProgress = {
  sprite: AvatarCalibrationStepProgress;
  avatar: AvatarCalibrationStepProgress;
}

export type AvatarCalibrationPreviewPanelProps = {
  characterName: string;
  spriteImageUrl: string;
  avatarImageUrl: string;
  spriteTransform: Transform;
  workflowProgress: AvatarCalibrationWorkflowProgress;
  canOpenSpriteCropper: boolean;
  canOpenAvatarCropper: boolean;
  onOpenSpriteCropper?: () => void;
  onOpenAvatarCropper?: () => void;
}

const PREVIEW_GROUP_CLASS_NAME = "w-full max-w-[43rem]";
const WEBGAL_STAGE_CLASS_NAME = "w-full overflow-hidden";
const DEFAULT_CATEGORY = "默认";
const UNGROUPED_VARIANT_VALUE = "";
const UNGROUPED_VARIANT_LABEL = "未分组";

function normalizeVariantId(value: unknown): number | null {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return Math.floor(raw);
}

function getVariantLabel(variant: RoleAvatarVariant) {
  const id = normalizeVariantId(variant.variantId);
  return String(variant.name ?? "").trim() || `立绘组 ${id ?? ""}`;
}

function hasPositiveId(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasUsableCrop(crop: { width?: number; height?: number } | null | undefined) {
  return Boolean(crop?.width && crop.height);
}

function hasSpriteCalibration(avatar: RoleAvatar) {
  return hasUsableCrop(avatar.spriteCropContext?.crop) || hasPositiveId(avatar.spriteFileId);
}

function hasAvatarCalibration(avatar: RoleAvatar) {
  return hasUsableCrop(avatar.avatarCropContext?.crop) || hasPositiveId(avatar.avatarFileId);
}

function resolveStepProgress(
  avatars: RoleAvatar[],
  hasComplete: (avatar: RoleAvatar) => boolean,
  hasSource: (avatar: RoleAvatar) => boolean,
): AvatarCalibrationStepProgress {
  const totalCount = avatars.length;
  const completeCount = avatars.filter(hasComplete).length;
  const sourceCount = avatars.filter(hasSource).length;
  const actionableCount = avatars.filter(avatar => !hasComplete(avatar) && hasSource(avatar)).length;

  if (totalCount > 0 && completeCount >= totalCount) {
    return { status: "complete", completeCount, sourceCount, totalCount };
  }
  if (actionableCount > 0) {
    return { status: "actionable", completeCount, sourceCount, totalCount };
  }
  return { status: "blocked", completeCount, sourceCount, totalCount };
}

export function buildAvatarCalibrationWorkflowProgress(
  avatars: RoleAvatar[],
): AvatarCalibrationWorkflowProgress {
  return {
    sprite: resolveStepProgress(
      avatars,
      hasSpriteCalibration,
      avatar => Boolean(getEffectiveOriginUrl(avatar)),
    ),
    avatar: resolveStepProgress(
      avatars,
      hasAvatarCalibration,
      avatar => Boolean(getSpriteCropSourceUrl(avatar)),
    ),
  };
}

function EmptyPreviewImage({ label }: { label: string }) {
  return (
    <div className="
      flex size-full items-center justify-center rounded-md border
      border-dashed border-base-300 bg-base-200 text-xs text-base-content/50
    ">
      {label}
    </div>
  );
}

function CalibrationPreviewShell({
  title,
  actionLabel,
  disabledLabel,
  canOpen,
  onOpen,
  className,
  children,
}: CalibrationPreviewShellProps) {
  const isInteractive = canOpen && Boolean(onOpen);
  const shellClassName = `
    group relative block overflow-hidden rounded-md text-left
    outline-none transition
    ${className ?? "w-full"}
    ${isInteractive
    ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
    : "cursor-default"}
  `;
  const content = (
    <>
      <span className="pointer-events-none block">{children}</span>
      <span
        className={`
          pointer-events-none absolute inset-0 flex items-center justify-center
          bg-black/0 opacity-0 transition
          ${isInteractive ? "group-hover:bg-black/35 group-hover:opacity-100 group-focus-visible:bg-black/35 group-focus-visible:opacity-100" : ""}
        `}
      >
        {isInteractive && (
          <span className="
            inline-flex items-center gap-2 rounded-md border border-white/25
            bg-black/65 px-3 py-2 text-sm font-medium text-white shadow-lg
          ">
            <span>{actionLabel}</span>
          </span>
        )}
      </span>
      <span className="
        pointer-events-none absolute left-2 top-2 rounded-md bg-black/50
        px-2 py-1 text-xs font-medium text-white/90 opacity-0 transition
        group-hover:opacity-100 group-focus-visible:opacity-100
      ">
        {title}
      </span>
    </>
  );

  if (!isInteractive) {
    return (
      <div className={shellClassName} title={disabledLabel}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={shellClassName}
      onClick={onOpen}
      title={actionLabel}
      aria-label={actionLabel}
    >
      {content}
    </button>
  );
}

function isCalibrationStepReady(progress: AvatarCalibrationStepProgress) {
  return progress.totalCount > 0 && progress.completeCount >= progress.totalCount;
}

/**
 * 立绘 → 头像 的树形连接线：一条「连续」SVG 路径，末端自然收成 ► 箭头头。
 * 整条线 + 箭头是同一个连续笔画（除起点外没有 M 跳笔），
 * 这样配合绘制动画（stroke-dasharray / pathLength）时箭头会随线一起从头画到尾，
 * 不会因拆成独立子路径而提前整段出现。状态颜色沿用：就绪绿 / 未就绪红。
 */
function TreeConnector({ hasAvatar, drawKey }: { hasAvatar: boolean; drawKey: string }) {
  const lineColor = hasAvatar ? "text-success/80" : "text-error/80";
  return (
    <svg
      key={drawKey}
      aria-hidden="true"
      className={`avatar-connector-draw-line absolute -top-3 left-7 h-20 overflow-visible ${lineColor}`}
      style={{ width: "max(42px, calc(0.25rem + (100% - 2rem) / 15 - 0.25rem))" }}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path
        d="M2 0 V68 Q2 94 28 94 H100 L84 86 L100 94 L84 102"
        fill="none"
        pathLength={1}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function WebgalSpritePreview({ characterName, imageUrl, transform }: SpritePreviewProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pendingImageRef = useRef<HTMLImageElement | null>(null);
  const pendingBitmapRef = useRef<ImageBitmap | null>(null);
  const pendingImageUrlRef = useRef<string | null>(null);
  const [drawVersion, setDrawVersion] = useState(0);
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(imageUrl || null);
  const [renderTransform, setRenderTransform] = useState<Transform>(() => transform);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const displayTransform = renderedImageUrl === imageUrl ? transform : renderTransform;

  const drawSourceToPreview = useCallback(async (
    image: HTMLImageElement,
    bitmap: ImageBitmap | null,
  ) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) {
      return;
    }

    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;
    if (!width || !height) {
      return;
    }
    const { pixelCrop } = createFullImageCrop(width, height);
    await canvasPreview(image, canvas, pixelCrop, 1, 0, { previewMode: true });
    if (bitmap) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  useEffect(() => {
    if (!imageUrl) {
      pendingImageRef.current = null;
      pendingBitmapRef.current = null;
      pendingImageUrlRef.current = null;
      setIsImageLoading(false);
      return;
    }

    let cancelled = false;
    const targetTransform = transform;
    setIsImageLoading(imageUrl !== renderedImageUrl);
    loadPreviewSpriteImage(imageUrl)
      .then(({ image, bitmap }) => {
        if (cancelled) {
          return;
        }
        pendingImageRef.current = image;
        pendingBitmapRef.current = bitmap;
        pendingImageUrlRef.current = imageUrl;
        setRenderTransform(targetTransform);
        setDrawVersion(version => version + 1);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setIsImageLoading(false);
        console.error("加载立绘预览失败:", error, imageUrl);
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, renderedImageUrl, transform]);

  useLayoutEffect(() => {
    const pendingUrl = pendingImageUrlRef.current;
    const image = pendingImageRef.current;
    if (!pendingUrl || !image || pendingUrl !== imageUrl) {
      return;
    }

    let active = true;
    void drawSourceToPreview(image, pendingBitmapRef.current).then(() => {
      if (!active || pendingUrl !== imageUrl) {
        return;
      }
      setRenderedImageUrl(pendingUrl);
      setIsImageLoading(false);
      pendingImageRef.current = null;
      pendingBitmapRef.current = null;
      pendingImageUrlRef.current = null;
    });

    return () => {
      active = false;
    };
  }, [drawSourceToPreview, drawVersion, imageUrl]);

  return (
    <section
      className="flex min-h-0 min-w-0 items-start overflow-hidden"
      aria-label="立绘预览"
    >
      {imageUrl
        ? (
            <div className={`${WEBGAL_STAGE_CLASS_NAME} relative`}>
              <RenderPreview
                previewCanvasRef={previewCanvasRef}
                transform={displayTransform}
                characterName={characterName}
                dialogContent="点击进行立绘矫正"
              />
              {isImageLoading && (
                <div className="
                  absolute inset-0 rounded-md bg-base-300/20
                  backdrop-blur-[1px] flex items-center justify-center
                  text-base-content/70
                ">
                  <span className="loading loading-spinner loading-sm" aria-label="正在加载预览" />
                </div>
              )}
            </div>
          )
        : (
            <div className={`${WEBGAL_STAGE_CLASS_NAME} aspect-video`}>
              <EmptyPreviewImage label="暂无立绘" />
            </div>
          )}
    </section>
  );
}

function ChatAvatarPreview({ characterName, imageUrl }: PreviewProps) {
  const hasAvatar = Boolean(imageUrl);

  return (
    <section
      className="min-w-0 overflow-hidden"
      aria-label="头像预览"
    >
      <div className="
        min-w-0 overflow-hidden rounded-md border
        border-base-300/70 bg-black py-3 pl-4 pr-3 shadow-sm
      ">
        <AvatarPreview
          characterName={characterName}
          currentAvatarUrl={imageUrl}
          isAvatarMissing={!hasAvatar}
          mode="chat"
        />
      </div>
    </section>
  );
}

/**
 * 单头像与立绘组设置共用的预览规范；组模式只在外层增加组级操作。
 */
export function AvatarCalibrationPreviewPanel({
  characterName,
  spriteImageUrl,
  avatarImageUrl,
  spriteTransform,
  workflowProgress,
  canOpenSpriteCropper,
  canOpenAvatarCropper,
  onOpenSpriteCropper,
  onOpenAvatarCropper,
}: AvatarCalibrationPreviewPanelProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className={`${PREVIEW_GROUP_CLASS_NAME} flex min-h-0 min-w-0 flex-1 flex-col gap-3`}>
        <CalibrationPreviewShell
          title="立绘预览"
          actionLabel="进入立绘校正"
          disabledLabel="当前头像缺少可用于立绘校正的原图"
          canOpen={canOpenSpriteCropper}
          onOpen={onOpenSpriteCropper}
        >
          <WebgalSpritePreview
            characterName={characterName}
            imageUrl={spriteImageUrl}
            transform={spriteTransform}
          />
        </CalibrationPreviewShell>
        <div className="relative min-w-0 pl-8 pt-3">
          <TreeConnector
            hasAvatar={isCalibrationStepReady(workflowProgress.avatar)}
            drawKey={`${spriteImageUrl}|${avatarImageUrl}`}
          />
          <CalibrationPreviewShell
            title="聊天头像预览"
            actionLabel="进入头像校正"
            disabledLabel="当前头像缺少可用于头像校正的立绘源图"
            canOpen={canOpenAvatarCropper}
            onOpen={onOpenAvatarCropper}
            className="ml-auto w-14/15"
          >
            <ChatAvatarPreview
              characterName={characterName}
              imageUrl={avatarImageUrl}
            />
          </CalibrationPreviewShell>
        </div>
      </div>
    </div>
  );
}

/**
 * 头像设置 Tab 内容组件
 * 使用外部（左侧）的头像列表，编辑头像基础信息。
 */
export function AvatarSettingsTab({
  spritesAvatars,
  roleAvatars,
  selectedIndex,
  characterName,
  availableVariants = [],
  showUnassignVariantAction = false,
  onUnassignVariant,
  onAssignVariant,
  onOpenSpriteCropper,
  onOpenAvatarCropper,
  canOpenSpriteCropper = false,
  canOpenAvatarCropper = false,
}: AvatarSettingsTabProps) {
  // 当前选中的头像（从完整列表中根据 spritesAvatars 的 avatarId 查找）
  const currentSpriteAvatar = spritesAvatars[selectedIndex];
  const currentAvatar = useMemo(() => {
    if (!currentSpriteAvatar)
      return null;
    return roleAvatars.find(a => a.avatarId === currentSpriteAvatar.avatarId) || currentSpriteAvatar;
  }, [roleAvatars, currentSpriteAvatar]);
  // 头像标题设置
  const [editingName, setEditingName] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [isUnassigningVariant, setIsUnassigningVariant] = useState(false);
  const roleIdForMutation = currentAvatar?.roleId ?? currentSpriteAvatar?.roleId ?? 0;
  const { mutateAsync: updateAvatar, isPending: isSaving } = useUpdateRoleAvatarMutation(roleIdForMutation);
  const previewCharacterName = characterName.trim() || "角色";
  const fallbackAvatarTitle = currentAvatar ? `头像${selectedIndex + 1}` : "未命名头像";
  const avatarTitleRecord = useMemo<Record<string, string>>(() => {
    if (!currentAvatar?.avatarTitle)
      return {};
    if (typeof currentAvatar.avatarTitle === "string") {
      return { label: currentAvatar.avatarTitle };
    }
    return currentAvatar.avatarTitle as Record<string, string>;
  }, [currentAvatar]);
  // 同步表单值（当切换立绘时）
  useEffect(() => {
    if (currentAvatar) {
      queueMicrotask(() => setEditingName(avatarTitleRecord.label || fallbackAvatarTitle));
      queueMicrotask(() => setEditingCategory(currentAvatar.category?.trim() || DEFAULT_CATEGORY));
    }
  }, [currentAvatar, avatarTitleRecord, fallbackAvatarTitle]);

  const variantOptions = useMemo(() => {
    const map = new Map<number, RoleAvatarVariant>();
    availableVariants.forEach((variant) => {
      const id = normalizeVariantId(variant.variantId);
      if (id != null) {
        map.set(id, variant);
      }
    });
    if (currentAvatar?.variantGroup) {
      const id = normalizeVariantId(currentAvatar.variantGroup.variantId);
      if (id != null) {
        map.set(id, currentAvatar.variantGroup);
      }
    }
    return Array.from(map.values()).sort((a, b) => (
      getVariantLabel(a).localeCompare(getVariantLabel(b), "zh-CN")
    ));
  }, [availableVariants, currentAvatar?.variantGroup]);
  const currentVariantId = normalizeVariantId(currentAvatar?.variantId);

  const saveAvatarSettings = useCallback(async (
    nextNameValue: string,
    nextCategoryValue: string,
    nextVariantIdValue: number | null = normalizeVariantId(currentAvatar?.variantId),
  ) => {
    if (!currentAvatar?.avatarId) {
      return;
    }

    const nextLabel = nextNameValue.trim() || avatarTitleRecord.label || fallbackAvatarTitle;
    const nextCategory = nextCategoryValue.trim() || DEFAULT_CATEGORY;
    const currentLabel = avatarTitleRecord.label || fallbackAvatarTitle;
    const currentCategory = currentAvatar.category?.trim() || DEFAULT_CATEGORY;
    const nextVariantId = normalizeVariantId(nextVariantIdValue);
    const currentVariantId = normalizeVariantId(currentAvatar.variantId);

    const hasBasicChanges = nextLabel !== currentLabel || nextCategory !== currentCategory;
    const hasVariantChange = nextVariantId !== currentVariantId;

    if (!hasBasicChanges && !hasVariantChange) {
      return;
    }

    try {
      let nextAvatarForVariant = currentAvatar;
      let handledVariantChangeExternally = false;
      if (hasBasicChanges) {
        const updateResult = await updateAvatar({
          avatarId: currentAvatar.avatarId,
          roleId: currentAvatar.roleId ?? currentSpriteAvatar?.roleId,
          avatarTitle: {
            ...avatarTitleRecord,
            label: nextLabel,
          },
          category: nextCategory,
        } as RoleAvatar);
        nextAvatarForVariant = {
          ...currentAvatar,
          ...updateResult?.data,
          avatarTitle: {
            ...avatarTitleRecord,
            label: nextLabel,
          },
          category: nextCategory,
        };
        setEditingName(nextLabel);
        setEditingCategory(nextCategory);
      }

      if (hasVariantChange) {
        if (nextVariantId == null) {
          if (onUnassignVariant && currentVariantId != null) {
            const unassigned = await onUnassignVariant(nextAvatarForVariant);
            if (!unassigned) {
              return;
            }
            handledVariantChangeExternally = true;
          }
          else {
            await updateAvatar({
              avatarId: currentAvatar.avatarId,
              roleId: currentAvatar.roleId ?? currentSpriteAvatar?.roleId,
              variantId: null,
            } as unknown as RoleAvatar);
          }
        }
        else {
          if (!onAssignVariant) {
            throw new Error("缺少立绘组绑定流程");
          }
          const assigned = await onAssignVariant(nextAvatarForVariant, nextVariantId);
          if (!assigned) {
            return;
          }
        }
      }
      if (!handledVariantChangeExternally) {
        appToast.success("头像设置已保存");
      }
    }
    catch (error) {
      console.error("更新头像设置失败:", error);
      appToast.error("保存失败，请稍后重试");
    }
  }, [
    currentAvatar,
    currentSpriteAvatar,
    updateAvatar,
    avatarTitleRecord,
    fallbackAvatarTitle,
    onAssignVariant,
    onUnassignVariant,
  ]);

  const avatarDisplayUrl = useMemo(() => {
    if (!currentAvatar)
      return "";
    return getEffectiveAvatarUrl(currentAvatar);
  }, [currentAvatar]);

  const spriteDisplayUrl = useMemo(() => {
    if (!currentAvatar)
      return "";
    return getEffectiveSpriteOriginalUrl(currentAvatar) || getEffectiveSpriteUrl(currentAvatar);
  }, [currentAvatar]);

  const spritePreviewTransform = useMemo(() => (
    parseTransformFromAvatar(currentAvatar)
  ), [currentAvatar]);
  const workflowProgress = useMemo(() => (
    buildAvatarCalibrationWorkflowProgress(currentAvatar ? [currentAvatar] : [])
  ), [currentAvatar]);

  useEffect(() => {
    if (spritesAvatars.length === 0) {
      return;
    }

    const preloadWindow = [
      spritesAvatars[selectedIndex - 2],
      spritesAvatars[selectedIndex - 1],
      spritesAvatars[selectedIndex],
      spritesAvatars[selectedIndex + 1],
      spritesAvatars[selectedIndex + 2],
    ];
    preloadPreviewSpriteImages(preloadWindow.map(avatar => (
      avatar ? getEffectiveSpriteOriginalUrl(avatar) || getEffectiveSpriteUrl(avatar) : null
    )));
  }, [selectedIndex, spritesAvatars]);
  const canUnassignVariant = Boolean(
    showUnassignVariantAction
    && onUnassignVariant
    && currentAvatar?.avatarId
    && currentVariantId,
  );

  const handleUnassignVariant = useCallback(async () => {
    if (!currentAvatar?.avatarId || !onUnassignVariant || !currentVariantId) {
      appToast.error("当前头像未绑定立绘组");
      return;
    }
    if (isUnassigningVariant) {
      return;
    }

    try {
      setIsUnassigningVariant(true);
      await onUnassignVariant(currentAvatar);
    }
    catch (error) {
      console.error("移出立绘组失败:", error);
      appToast.error(error instanceof Error ? error.message : "移出立绘组失败，请稍后重试");
    }
    finally {
      setIsUnassigningVariant(false);
    }
  }, [currentAvatar, currentVariantId, isUnassigningVariant, onUnassignVariant]);

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
      {currentAvatar && (
        <div className="
          mb-3 flex w-full shrink-0 flex-wrap items-center gap-2 border-b
          border-base-300/70 pb-3
        ">
          <div className="
            flex min-w-0 flex-1 flex-wrap items-center gap-2
          ">
            <DoubleClickEditableText
              value={editingName}
              disabled={isSaving}
              trigger="click"
              className="min-w-0 max-w-full"
              displayClassName="
                block min-w-0 max-w-[22rem] truncate rounded-md px-1 py-1
                text-base font-semibold text-base-content cursor-text
                hover:bg-base-200/70
              "
              inputClassName="
                input input-sm input-ghost h-8 min-h-8 w-[min(22rem,60vw)]
                rounded-md px-1 text-base font-semibold
              "
              placeholder={fallbackAvatarTitle}
              invalidBehavior="revert"
              validate={nextValue => (nextValue.trim().length ? null : "头像名称不能为空")}
              onCommit={(nextValue) => {
                const nextName = nextValue.trim() || fallbackAvatarTitle;
                setEditingName(nextName);
                void saveAvatarSettings(nextName, editingCategory);
              }}
              displayProps={{
                role: "button",
                tabIndex: 0,
                title: "点击修改头像名称",
                "aria-label": "点击修改头像名称",
              }}
            />

            <DoubleClickEditableText
              value={editingCategory}
              disabled={isSaving}
              trigger="click"
              className="shrink-0"
              displayClassName="
                inline-flex max-w-[9rem] truncate rounded-md bg-base-200/60
                px-2 py-1 text-xs font-medium text-base-content/70 cursor-text
                hover:bg-base-200 hover:text-base-content
              "
              inputClassName="
                input input-xs input-ghost h-7 min-h-7 w-28 rounded-md
                px-2 text-xs
              "
              placeholder={DEFAULT_CATEGORY}
              invalidBehavior="revert"
              validate={nextValue => (nextValue.trim().length ? null : "分类不能为空")}
              onCommit={(nextValue) => {
                const nextCategory = nextValue.trim() || DEFAULT_CATEGORY;
                setEditingCategory(nextCategory);
                void saveAvatarSettings(editingName, nextCategory);
              }}
              displayProps={{
                role: "button",
                tabIndex: 0,
                title: "点击修改分类",
                "aria-label": "点击修改分类",
              }}
            />
          </div>

          <div className="
            ml-auto flex min-w-0 shrink-0 items-center gap-2
          ">
            {showUnassignVariantAction && (
              <Button
                variant="warning"
                size="sm"
                className="h-8 min-h-8 gap-1.5 rounded-md px-3"
                onClick={() => void handleUnassignVariant()}
                disabled={!canUnassignVariant || isSaving || isUnassigningVariant}
                title={canUnassignVariant ? "将当前头像移出立绘组" : "当前头像未绑定立绘组"}
              >
                {isUnassigningVariant && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
                <span>{isUnassigningVariant ? "移出中" : "移出立绘组"}</span>
              </Button>
            )}

            <select
              className="
                select select-sm select-bordered h-8 min-h-8 max-w-[14rem]
                rounded-md bg-base-100/70 pr-8 text-sm text-base-content/85
                disabled:text-base-content/50
              "
              value={String(currentVariantId ?? UNGROUPED_VARIANT_VALUE)}
              onChange={(event) => {
                const value = event.target.value;
                const nextVariantId = value ? Number(value) : null;
                void saveAvatarSettings(editingName, editingCategory, nextVariantId);
              }}
              disabled={isSaving || isUnassigningVariant}
              aria-label="选择立绘组"
              title="选择立绘组"
            >
              <option value={UNGROUPED_VARIANT_VALUE}>{UNGROUPED_VARIANT_LABEL}</option>
              {variantOptions.map((variant) => {
                const id = normalizeVariantId(variant.variantId);
                if (id == null) {
                  return null;
                }
                return (
                  <option key={id} value={String(id)}>
                    {getVariantLabel(variant)}
                  </option>
                );
              })}
            </select>

            {isSaving && (
              <span
                className="loading loading-spinner loading-xs shrink-0"
                aria-label="保存中"
              />
            )}
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="
        flex-1 min-h-0 relative overflow-hidden
      ">
        <div className="absolute inset-0 overflow-auto p-3 xl:overflow-hidden">
          {currentAvatar
            ? (
                <AvatarCalibrationPreviewPanel
                  characterName={previewCharacterName}
                  spriteImageUrl={spriteDisplayUrl}
                  avatarImageUrl={avatarDisplayUrl}
                  spriteTransform={spritePreviewTransform}
                  workflowProgress={workflowProgress}
                  canOpenSpriteCropper={canOpenSpriteCropper}
                  canOpenAvatarCropper={canOpenAvatarCropper}
                  onOpenSpriteCropper={onOpenSpriteCropper}
                  onOpenAvatarCropper={onOpenAvatarCropper}
                />
              )
            : (
                <div className="
                  flex flex-col items-center justify-center h-full
                  text-base-content/50
                ">
                  <UserCircle className="size-16 mb-2 opacity-50" weight="regular" aria-hidden="true" />
                  <p>请从左侧选择一个头像</p>
                </div>
              )}
        </div>
      </div>

    </div>
  );
}
