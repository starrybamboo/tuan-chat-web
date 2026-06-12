import type { RoleAvatar, RoleAvatarVariant } from "api";

import { UserCircle } from "@phosphor-icons/react";
import { useUpdateRoleAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { DoubleClickEditableText } from "@/components/common/DoubleClickEditableText";
import { MediaImage } from "@/components/common/mediaImage";
import { DisplayChatBubble } from "@/components/Role/Preview/displayChatBubble";
import { RenderPreview } from "@/components/Role/Preview/RenderPreview";
import { canvasPreview, createFullImageCrop } from "@/utils/imgCropper";

import type { Transform } from "../TransformControl";

import { getEffectiveAvatarUrl, getEffectiveSpriteOriginalUrl, getEffectiveSpriteUrl, parseTransformFromAvatar } from "../utils";

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
  /** 将当前头像归入目标立绘组，并按立绘组上下文重建裁剪结果 */
  onAssignVariant?: (avatar: RoleAvatar, variantId: number) => Promise<boolean>;
}

type PreviewProps = {
  characterName: string;
  imageUrl: string;
}

type SpritePreviewProps = PreviewProps & {
  transform: Transform;
}

const AVATAR_PREVIEW_MESSAGES = ["这是使用新头像的\n聊天消息！"];
const PREVIEW_GROUP_CLASS_NAME = "w-full max-w-[40rem]";
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
 * 头像设置 Tab 内容组件
 * 使用外部（左侧）的头像列表，编辑头像基础信息。
 */
export function AvatarSettingsTab({
  spritesAvatars,
  roleAvatars,
  selectedIndex,
  characterName,
  availableVariants = [],
  onAssignVariant,
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
          await updateAvatar({
            avatarId: currentAvatar.avatarId,
            roleId: currentAvatar.roleId ?? currentSpriteAvatar?.roleId,
            variantId: null,
          } as unknown as RoleAvatar);
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
      toast.success("头像设置已保存");
    }
    catch (error) {
      console.error("更新头像设置失败:", error);
      toast.error("保存失败，请稍后重试");
    }
  }, [currentAvatar, currentSpriteAvatar, updateAvatar, avatarTitleRecord, fallbackAvatarTitle, onAssignVariant]);

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
            <select
              className="
                select select-sm select-bordered h-8 min-h-8 max-w-[14rem]
                rounded-md bg-base-100/70 pr-8 text-sm text-base-content/85
                disabled:text-base-content/35
              "
              value={String(normalizeVariantId(currentAvatar.variantId) ?? UNGROUPED_VARIANT_VALUE)}
              onChange={(event) => {
                const value = event.target.value;
                const nextVariantId = value ? Number(value) : null;
                void saveAvatarSettings(editingName, editingCategory, nextVariantId);
              }}
              disabled={isSaving}
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
                <div className="flex min-w-0 flex-1 items-start">
                  <div className={`
                    ${PREVIEW_GROUP_CLASS_NAME} flex flex-col overflow-hidden
                  `}>
                    <WebgalSpritePreview
                      characterName={previewCharacterName}
                      imageUrl={spriteDisplayUrl}
                      transform={spritePreviewTransform}
                    />
                    <ChatAvatarPreview
                      characterName={previewCharacterName}
                      imageUrl={avatarDisplayUrl}
                    />
                  </div>
                </div>
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
