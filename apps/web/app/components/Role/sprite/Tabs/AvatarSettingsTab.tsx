import type { RoleAvatar, RoleAvatarVariant } from "api";
import type { ReactNode } from "react";

import { CheckCircle, ImageSquare, UserCircle } from "@phosphor-icons/react";
import { useSetDefaultRoleAvatarMutation, useUpdateRoleAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { DoubleClickEditableText } from "@/components/common/DoubleClickEditableText";
import { MediaImage } from "@/components/common/mediaImage";
import { DisplayChatBubble } from "@/components/Role/Preview/displayChatBubble";
import { RenderPreview } from "@/components/Role/Preview/RenderPreview";
import { canvasPreview, createFullImageCrop } from "@/utils/imgCropper";

import type { Transform } from "../TransformControl";

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
  /** 当前角色正在使用的默认头像 ID */
  defaultAvatarId?: number;
  /** 应用完成后的回调（用于关闭弹窗等） */
  onApply?: () => void;
  /** 默认头像设置成功后的回调，用于同步外层选中状态 */
  onDefaultAvatarApplied?: (avatar: RoleAvatar) => void;
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
  /** 替换当前头像源图，替换后进入立绘校正 */
  onReplaceAvatarSource?: (avatar: RoleAvatar, file: File) => Promise<void>;
  /** 当前是否正在替换头像源图 */
  isReplacingAvatarSource?: boolean;
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

const AVATAR_PREVIEW_MESSAGES = ["这是使用新头像的\n聊天消息！"];
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
  children,
}: CalibrationPreviewShellProps) {
  const isInteractive = canOpen && Boolean(onOpen);

  return (
    <div
      role="button"
      className={`
        group relative block w-full overflow-hidden rounded-md text-left
        outline-none transition
        ${isInteractive
        ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
        : "cursor-default"}
      `}
      onClick={() => {
        if (isInteractive) {
          onOpen?.();
        }
      }}
      onKeyDown={(event) => {
        if (!isInteractive || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }
        event.preventDefault();
        onOpen?.();
      }}
      aria-disabled={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
      title={isInteractive ? actionLabel : disabledLabel}
      aria-label={isInteractive ? actionLabel : disabledLabel}
    >
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
    </div>
  );
}

function getStepStatusLabel(
  progress: AvatarCalibrationStepProgress,
  blockedLabel: string,
) {
  if (progress.totalCount > 1) {
    if (progress.status === "complete") {
      return "全部完成";
    }
    if (progress.completeCount > 0) {
      return `${progress.completeCount}/${progress.totalCount} 已完成`;
    }
    if (progress.status === "actionable") {
      return `${progress.sourceCount}/${progress.totalCount} 可校正`;
    }
  }
  if (progress.status === "complete") {
    return "已完成";
  }
  if (progress.status === "actionable") {
    return "待校正";
  }
  return blockedLabel;
}

const CHEVRON_STEP_CUT = "16px";
const CHEVRON_STEP_CLIP_PATHS = [
  `polygon(0 0, 100% 0, 100% calc(100% - ${CHEVRON_STEP_CUT}), 50% 100%, 0 calc(100% - ${CHEVRON_STEP_CUT}))`,
  `polygon(0 0, 50% ${CHEVRON_STEP_CUT}, 100% 0, 100% calc(100% - ${CHEVRON_STEP_CUT}), 50% 100%, 0 calc(100% - ${CHEVRON_STEP_CUT}))`,
] as const;

function isCalibrationStepReady(progress: AvatarCalibrationStepProgress) {
  return progress.totalCount > 0 && progress.completeCount >= progress.totalCount;
}

function getChevronStepToneClassName(isReady: boolean) {
  return isReady
    ? "bg-emerald-500/85 shadow-emerald-950/25"
    : "bg-rose-500/85 shadow-rose-950/25";
}

function ChevronFlowStep({
  progress,
  title,
  blockedLabel,
  readyLabel,
  shape,
  className = "",
}: {
  progress: AvatarCalibrationStepProgress;
  title: string;
  blockedLabel: string;
  readyLabel: string;
  shape: 0 | 1;
  className?: string;
}) {
  const isReady = isCalibrationStepReady(progress);
  const statusLabel = isReady ? readyLabel : getStepStatusLabel(progress, blockedLabel);
  const style = shape === 1
    ? {
        clipPath: CHEVRON_STEP_CLIP_PATHS[shape],
        height: `calc(100% + ${CHEVRON_STEP_CUT})`,
        marginTop: `-${CHEVRON_STEP_CUT}`,
      }
    : { clipPath: CHEVRON_STEP_CLIP_PATHS[shape] };

  return (
    <div
      role="img"
      className={`
        hidden h-full min-h-24 w-5 shrink-0 self-stretch shadow-sm
        transition-colors md:block
        ${getChevronStepToneClassName(isReady)}
        ${className}
      `}
      style={style}
      title={`${title}：${statusLabel}`}
      aria-label={`${title}：${statusLabel}`}
    />
  );
}

function WebgalSpritePreview({ characterName, imageUrl, transform }: SpritePreviewProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  const drawSourceToPreview = useCallback(async (image: HTMLImageElement) => {
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
  }, []);

  useEffect(() => {
    const image = sourceImageRef.current;
    if (!imageUrl || !image?.complete || !image.naturalWidth) {
      return;
    }

    let cancelled = false;
    requestAnimationFrame(() => {
      if (!cancelled) {
        void drawSourceToPreview(image);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [drawSourceToPreview, imageUrl]);

  return (
    <section
      className="flex min-h-0 min-w-0 items-start overflow-hidden"
      aria-label="立绘预览"
    >
      {imageUrl
        ? (
            <div className={`${WEBGAL_STAGE_CLASS_NAME} relative`}>
              <MediaImage
                ref={sourceImageRef}
                src={imageUrl}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute size-px opacity-0"
                onLoad={(event) => {
                  void drawSourceToPreview(event.currentTarget);
                }}
              />
              <RenderPreview
                previewCanvasRef={previewCanvasRef}
                transform={transform}
                characterName={characterName}
                dialogContent="这是一段示例对话内容。"
              />
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
  return (
    <section
      className="min-w-0 overflow-hidden pt-3"
      aria-label="头像预览"
    >
      <div className="flex min-w-0 flex-col gap-2 overflow-hidden">
        <div className="
          min-w-0 overflow-hidden rounded-md border border-base-300/70 bg-base-100/45
          px-3 pt-3
        ">
          <DisplayChatBubble
            roleName={characterName}
            avatarUrl={imageUrl}
            content={AVATAR_PREVIEW_MESSAGES[0]}
            useChatBubbleStyle
          />
        </div>
        <div className="
          min-w-0 overflow-hidden rounded-md border border-base-300/70 bg-base-100/45
          px-3 pt-3
        ">
          <DisplayChatBubble
            roleName={characterName}
            avatarUrl={imageUrl}
            content={AVATAR_PREVIEW_MESSAGES[0]}
            useChatBubbleStyle={false}
          />
        </div>
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
      <div className={`
        ${PREVIEW_GROUP_CLASS_NAME} grid min-h-0 min-w-0 flex-1
        grid-cols-1 gap-x-2 md:grid-cols-[1.25rem_minmax(0,1fr)]
      `}>
        <ChevronFlowStep
          progress={workflowProgress.sprite}
          title="立绘校正"
          readyLabel="有立绘"
          blockedLabel="无立绘"
          shape={0}
          className="z-[1] md:col-start-1 md:row-start-1"
        />
        <div className="min-w-0 md:col-start-2 md:row-start-1">
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
        </div>
        <ChevronFlowStep
          progress={workflowProgress.avatar}
          title="头像校正"
          readyLabel="有头像"
          blockedLabel="缺头像"
          shape={1}
          className="md:col-start-1 md:row-start-2"
        />
        <div className="min-w-0 md:col-start-2 md:row-start-2">
          <CalibrationPreviewShell
            title="聊天头像预览"
            actionLabel="进入头像校正"
            disabledLabel="当前头像缺少可用于头像校正的立绘源图"
            canOpen={canOpenAvatarCropper}
            onOpen={onOpenAvatarCropper}
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
  defaultAvatarId,
  onDefaultAvatarApplied,
  showUnassignVariantAction = false,
  onUnassignVariant,
  onAssignVariant,
  onOpenSpriteCropper,
  onOpenAvatarCropper,
  canOpenSpriteCropper = false,
  canOpenAvatarCropper = false,
  onReplaceAvatarSource,
  isReplacingAvatarSource = false,
}: AvatarSettingsTabProps) {
  const replaceAvatarInputRef = useRef<HTMLInputElement | null>(null);
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
  const [localDefaultAvatarId, setLocalDefaultAvatarId] = useState(defaultAvatarId);
  const [isUnassigningVariant, setIsUnassigningVariant] = useState(false);
  const [isLocalReplacingAvatarSource, setIsLocalReplacingAvatarSource] = useState(false);
  const roleIdForMutation = currentAvatar?.roleId ?? currentSpriteAvatar?.roleId ?? 0;
  const { mutateAsync: updateAvatar, isPending: isSaving } = useUpdateRoleAvatarMutation(roleIdForMutation);
  const {
    mutateAsync: setDefaultAvatar,
    isPending: isSettingDefaultAvatar,
  } = useSetDefaultRoleAvatarMutation(roleIdForMutation);
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

  useEffect(() => {
    setLocalDefaultAvatarId(defaultAvatarId);
  }, [defaultAvatarId]);

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
        toast.success("头像设置已保存");
      }
    }
    catch (error) {
      console.error("更新头像设置失败:", error);
      toast.error("保存失败，请稍后重试");
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
  const isCurrentDefaultAvatar = Boolean(
    currentAvatar?.avatarId
    && localDefaultAvatarId
    && currentAvatar.avatarId === localDefaultAvatarId,
  );
  const canSetDefaultAvatar = Boolean(currentAvatar?.avatarId && roleIdForMutation);
  const canUnassignVariant = Boolean(
    showUnassignVariantAction
    && onUnassignVariant
    && currentAvatar?.avatarId
    && currentVariantId,
  );
  const isReplacingSource = isReplacingAvatarSource || isLocalReplacingAvatarSource;
  const canReplaceAvatarSource = Boolean(currentAvatar?.avatarId && onReplaceAvatarSource);

  const handleSetDefaultAvatar = useCallback(async () => {
    if (!currentAvatar?.avatarId || !roleIdForMutation) {
      toast.error("头像信息缺失，无法设为默认头像");
      return;
    }
    if (isCurrentDefaultAvatar || isSettingDefaultAvatar) {
      return;
    }

    try {
      const result = await setDefaultAvatar(currentAvatar);
      setLocalDefaultAvatarId(result.avatar.avatarId);
      toast.success("已设为默认头像");
      onDefaultAvatarApplied?.(result.avatar);
    }
    catch (error) {
      console.error("设置默认头像失败:", error);
      toast.error(error instanceof Error ? error.message : "设置默认头像失败，请稍后重试");
    }
  }, [
    currentAvatar,
    isCurrentDefaultAvatar,
    isSettingDefaultAvatar,
    onDefaultAvatarApplied,
    roleIdForMutation,
    setDefaultAvatar,
  ]);

  const handleUnassignVariant = useCallback(async () => {
    if (!currentAvatar?.avatarId || !onUnassignVariant || !currentVariantId) {
      toast.error("当前头像未绑定立绘组");
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
      toast.error(error instanceof Error ? error.message : "移出立绘组失败，请稍后重试");
    }
    finally {
      setIsUnassigningVariant(false);
    }
  }, [currentAvatar, currentVariantId, isUnassigningVariant, onUnassignVariant]);

  const handleReplaceAvatarFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }
    if (!currentAvatar?.avatarId || !onReplaceAvatarSource) {
      toast.error("头像信息缺失，无法替换头像");
      return;
    }
    if (isReplacingSource) {
      return;
    }

    void (async () => {
      try {
        setIsLocalReplacingAvatarSource(true);
        await onReplaceAvatarSource(currentAvatar, file);
      }
      catch (error) {
        console.error("替换头像失败:", error);
      }
      finally {
        setIsLocalReplacingAvatarSource(false);
      }
    })();
  }, [currentAvatar, isReplacingSource, onReplaceAvatarSource]);

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
      {currentAvatar && (
        <div className="
          mb-3 flex w-full shrink-0 flex-wrap items-center gap-2 border-b
          border-base-300/70 pb-3
        ">
          <input
            ref={replaceAvatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleReplaceAvatarFileChange}
          />
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
            <button
              type="button"
              className="btn btn-outline btn-sm h-8 min-h-8 gap-1.5 rounded-md px-3"
              onClick={() => replaceAvatarInputRef.current?.click()}
              disabled={!canReplaceAvatarSource || isSaving || isReplacingSource}
              title={canReplaceAvatarSource ? "替换当前头像的源图" : "当前头像无法替换源图"}
            >
              {isReplacingSource
                ? <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                : <ImageSquare className="size-4 shrink-0" aria-hidden="true" />}
              <span>{isReplacingSource ? "替换中" : "替换头像"}</span>
            </button>

            <button
              type="button"
              className={`
                btn btn-sm h-8 min-h-8 gap-1.5 rounded-md px-3
                ${isCurrentDefaultAvatar ? "btn-outline btn-success" : "btn-primary"}
              `}
              onClick={() => void handleSetDefaultAvatar()}
              disabled={!canSetDefaultAvatar || isSaving || isSettingDefaultAvatar || isCurrentDefaultAvatar}
              title={isCurrentDefaultAvatar ? "当前头像已是默认头像" : "将当前头像设为默认头像"}
            >
              {isSettingDefaultAvatar
                ? <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                : <CheckCircle className="size-4 shrink-0" weight={isCurrentDefaultAvatar ? "fill" : "regular"} aria-hidden="true" />}
              <span>{isSettingDefaultAvatar ? "设置中" : isCurrentDefaultAvatar ? "默认头像" : "设为默认"}</span>
            </button>

            {showUnassignVariantAction && (
              <button
                type="button"
                className="btn btn-outline btn-warning btn-sm h-8 min-h-8 gap-1.5 rounded-md px-3"
                onClick={() => void handleUnassignVariant()}
                disabled={!canUnassignVariant || isSaving || isUnassigningVariant}
                title={canUnassignVariant ? "将当前头像移出立绘组" : "当前头像未绑定立绘组"}
              >
                {isUnassigningVariant && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
                <span>{isUnassigningVariant ? "移出中" : "移出立绘组"}</span>
              </button>
            )}

            <select
              className="
                select select-sm select-bordered h-8 min-h-8 max-w-[14rem]
                rounded-md bg-base-100/70 pr-8 text-sm text-base-content/85
                disabled:text-base-content/35
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

            <span
              className="
                flex h-8 shrink-0 items-center rounded-md bg-base-200/60
                px-2.5 font-mono text-xs text-base-content/55
              "
              title={`头像 ID：${currentAvatar.avatarId ?? "-"}`}
            >
              #
              {currentAvatar.avatarId ?? "-"}
            </span>

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
                  <UserCircle className="size-16 mb-2 opacity-50" weight="duotone" aria-hidden="true" />
                  <p>请从左侧选择一个头像</p>
                </div>
              )}
        </div>
      </div>

    </div>
  );
}
