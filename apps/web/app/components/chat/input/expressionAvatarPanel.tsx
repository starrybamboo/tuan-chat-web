import type { MouseEvent } from "react";

import { ArrowLeftIcon, CaretDownIcon, CaretRightIcon, FolderOpenIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { MediaImage } from "@/components/common/mediaImage";
import { Button, buttonClassName } from "@/components/common/Button";
import { IconButton } from "@/components/common/IconButton";
import { CollapsibleMotion } from "@/components/common/motion/CollapsibleMotion";
import { CountBadge } from "@/components/common/StatusPrimitives";
import { structuralListItemMotionProps } from "@/components/common/motion/listItemMotion";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { getEffectiveAvatarThumbUrl, getEffectiveAvatarUrl } from "@/components/Role/sprite/utils";
import { AddRoleIcon, ExpandCornersIcon, EyedropperIcon, NarratorIcon } from "@/icons";

import type { RoleAvatar } from "../../../../api";

import {
  buildExpressionChooserAvatarCategoryGroups,
  buildExpressionChooserAvatarVariantGroups,
  EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID,
  getExpressionChooserAvatarVariantFolders,
  resolveExpressionChooserActiveVariantId,
} from "./expressionChooserModel";

function getAvatarCategoryCollapseKey(roleId: number, variantId: number, category: string) {
  return `${roleId}:${variantId}:${category}`;
}

const avatarVariantStackCardClassNames = [
  "left-[9%] top-[18%] rotate-[-8deg] opacity-80 scale-[0.82]",
  "right-[10%] top-[12%] rotate-[7deg] opacity-85 scale-[0.84]",
  "left-[15%] bottom-[10%] rotate-[5deg] opacity-90 scale-[0.88]",
  "left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rotate-[-1deg] opacity-100 scale-100",
] as const;

type ExpressionAvatarPanelProps = {
  className?: string;
  selectedRoleId: number;
  selectedAvatarId?: number;
  roleAvatars: RoleAvatar[];
  storedAvatarVariantId?: number | null;
  narratorTitle: string;
  narratorDescription: string;
  isNarratorMode: boolean;
  isNoRoleMode: boolean;
  isMobile: boolean;
  isAvatarFullscreen: boolean;
  isMobileFullscreen: boolean;
  isAvatarSamplerActive: boolean;
  onAvatarSamplerChange: (active: boolean) => void;
  onRequestClose?: () => void;
  onRequestFullscreen?: (next: boolean) => void;
  onAvatarChange: (avatarId: number) => void;
  onAvatarVariantChange: (roleId: number, variantId: number) => void;
};

export function ExpressionAvatarPanel({
  className,
  selectedRoleId,
  selectedAvatarId,
  roleAvatars,
  storedAvatarVariantId,
  narratorTitle,
  narratorDescription,
  isNarratorMode,
  isNoRoleMode,
  isMobile,
  isAvatarFullscreen,
  isMobileFullscreen,
  isAvatarSamplerActive,
  onAvatarSamplerChange,
  onRequestClose,
  onRequestFullscreen,
  onAvatarChange,
  onAvatarVariantChange,
}: ExpressionAvatarPanelProps) {
  const [collapsedAvatarCategoryKeys, setCollapsedAvatarCategoryKeys] = useState<Set<string>>(() => new Set());
  const avatarVariantGroups = useMemo(
    () => buildExpressionChooserAvatarVariantGroups(roleAvatars),
    [roleAvatars],
  );
  const avatarVariantFolders = useMemo(
    () => getExpressionChooserAvatarVariantFolders(avatarVariantGroups),
    [avatarVariantGroups],
  );
  const activeAvatarVariantId = useMemo(() => resolveExpressionChooserActiveVariantId({
    groups: avatarVariantGroups,
    preferredVariantId: storedAvatarVariantId,
    selectedAvatarId,
  }), [avatarVariantGroups, selectedAvatarId, storedAvatarVariantId]);
  const activeAvatarVariantGroup = useMemo(
    () => avatarVariantGroups.find(group => group.variantId === activeAvatarVariantId),
    [activeAvatarVariantId, avatarVariantGroups],
  );
  const ungroupedAvatarVariantGroup = useMemo(
    () => avatarVariantGroups.find(group => group.variantId === EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID),
    [avatarVariantGroups],
  );
  const isAvatarVariantGroupView = activeAvatarVariantId !== EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID;
  const displayedAvatarVariantGroup = isAvatarVariantGroupView
    ? activeAvatarVariantGroup
    : ungroupedAvatarVariantGroup;
  const visibleAvatarCategorySections = useMemo(
    () => displayedAvatarVariantGroup
      ? [{
          variantId: displayedAvatarVariantGroup.variantId,
          categoryGroups: buildExpressionChooserAvatarCategoryGroups(displayedAvatarVariantGroup.avatars),
        }]
      : [],
    [displayedAvatarVariantGroup],
  );
  const showAvatarVariantGroups = avatarVariantFolders.length > 0;

  const avatarListClassName = "flex-1 min-h-0";
  const avatarGridClassName = isAvatarFullscreen
    ? (isMobileFullscreen
        ? "flex flex-wrap gap-0.5"
        : "grid grid-cols-[repeat(auto-fill,5.75rem)] justify-start gap-2")
    : "grid grid-cols-[repeat(auto-fill,5.75rem)] justify-start gap-2";
  const avatarVariantFolderGridClassName = isAvatarFullscreen
    ? (isMobileFullscreen
        ? "grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-1.5"
        : "grid grid-cols-[repeat(auto-fill,5.75rem)] justify-start gap-2")
    : "grid grid-cols-[repeat(auto-fill,5.75rem)] justify-start gap-2";
  const toolbarClassName = isAvatarFullscreen
    ? (isMobileFullscreen
        ? "sticky top-0 z-10 -mx-1.5 px-1.5 py-1 bg-base-100/95 backdrop-blur border-b border-base-200/70 rounded-t-xl"
        : "sticky top-0 z-10 -mx-3 px-3 py-2 bg-base-100/95 backdrop-blur border-b border-base-200/70 rounded-t-xl")
    : "";
  const avatarSize = isMobileFullscreen ? 18 : 21;
  const avatarItemClassName = isAvatarFullscreen
    ? (isMobileFullscreen
        ? "w-18 h-18 overflow-hidden cursor-pointer leading-none"
        : "size-[5.75rem] rounded-lg bg-base-100/90 ring-1 ring-base-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center p-1")
    : "size-[5.75rem] rounded-lg transition-all hover:bg-base-200 cursor-pointer flex items-center justify-center p-1";
  const shouldShowAvatarPanelTitle = isAvatarFullscreen || isAvatarVariantGroupView;
  const avatarPanelTitle = isAvatarVariantGroupView
    ? `${narratorTitle}【${activeAvatarVariantGroup?.label ?? "立绘组"}】`
    : "头像列表";
  const avatarPanelCount = isAvatarVariantGroupView
    ? (activeAvatarVariantGroup?.avatars.length ?? 0)
    : roleAvatars.length;

  const handleSamplerToggle = (event?: MouseEvent<HTMLButtonElement>) => {
    if (isAvatarSamplerActive) {
      onAvatarSamplerChange(false);
      return;
    }
    onAvatarSamplerChange(true);
    onRequestClose?.();
    if (typeof document !== "undefined") {
      const activeElement = document.activeElement as HTMLElement | null;
      activeElement?.blur();
    }
    event?.currentTarget.blur();
  };

  const handleFullscreenToggle = () => {
    onRequestFullscreen?.(!isAvatarFullscreen);
  };

  const handleAvatarVariantGroupSelect = (variantId: number) => {
    onAvatarVariantChange(selectedRoleId, variantId);
  };

  const handleReturnToUngroupedAvatars = () => {
    onAvatarVariantChange(selectedRoleId, EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID);
  };

  const handleToggleAvatarCategory = (collapseKey: string) => {
    setCollapsedAvatarCategoryKeys((prev) => {
      const next = new Set(prev);
      if (next.has(collapseKey)) {
        next.delete(collapseKey);
      }
      else {
        next.add(collapseKey);
      }
      return next;
    });
  };

  return (
    <div className={className}>
      {roleAvatars.length > 0
        ? (
            <>
              <div className={`
                flex items-center gap-2 pb-2
                ${toolbarClassName}
                ${shouldShowAvatarPanelTitle ? `justify-between` : `justify-end`}
              `}>
                {shouldShowAvatarPanelTitle && (
                  <div className="
                    flex min-w-0 items-center gap-2 text-sm font-medium
                    text-base-content/70
                  ">
                    {isAvatarVariantGroupView && (
                      <IconButton
                        icon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
                        label="返回默认头像"
                        variant="ghost"
                        size="xs"
                        shape="square"
                        className="shrink-0"
                        type="button"
                        onClick={handleReturnToUngroupedAvatars}
                        title="返回默认"
                      />
                    )}
                    <span className="truncate">
                      {avatarPanelTitle}
                    </span>
                    <span className="text-xs text-base-content/50">
                      {avatarPanelCount}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={buttonClassName({
                      variant: "ghost",
                      size: "xs",
                      className: `gap-1 ${isAvatarSamplerActive ? "border-info/40 bg-base-300 text-info shadow-sm" : ""}`,
                    })}
                    onClick={handleSamplerToggle}
                    title={isAvatarSamplerActive ? "退出取样" : "墨水取样：点击消息头像"}
                    aria-label={isAvatarSamplerActive ? "退出取样" : "墨水取样：点击消息头像"}
                  >
                    <EyedropperIcon className="size-4" />
                    <span className="text-xs">{isAvatarSamplerActive ? "取样中" : "取样"}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="gap-1"
                    onClick={handleFullscreenToggle}
                    title={isAvatarFullscreen ? "退出全屏" : "全屏"}
                    aria-label={isAvatarFullscreen ? "退出全屏" : "全屏"}
                  >
                    <ExpandCornersIcon className="size-4" />
                    <span className="text-xs">{isAvatarFullscreen ? "退出全屏" : "全屏"}</span>
                  </Button>
                </div>
              </div>
              <div className={`
                ${avatarListClassName}
                w-full overflow-y-auto overflow-x-hidden
                ${isAvatarFullscreen ? `pb-4` : ""}
              `}>
                <CollapsibleMotion
                  open={showAvatarVariantGroups && !isAvatarVariantGroupView}
                  className={isMobileFullscreen ? "mb-2" : "mb-3"}
                >
                      <div className={avatarVariantFolderGridClassName}>
                        {avatarVariantFolders.map((group, groupIndex) => {
                        const previewAvatars = group.avatars.slice(0, avatarVariantStackCardClassNames.length);
                        return (
                          <motion.div
                            key={group.variantId}
                            className="min-w-0"
                            {...structuralListItemMotionProps({
                              index: groupIndex,
                              staggerDelay: 0.02,
                              maxDelay: 0.12,
                            })}
                          >
                            <button
                              type="button"
                              className={`
                                group/avatar-variant relative aspect-square w-full overflow-hidden rounded-xl
                                border border-base-300/70 bg-base-200/60 shadow-sm
                                transition-[border-color,box-shadow,background-color,transform]
                                hover:-translate-y-0.5 hover:border-info/45 hover:bg-base-300/70 hover:shadow-md
                                motion-reduce:transition-none motion-reduce:hover:translate-y-0
                              `}
                              onClick={() => handleAvatarVariantGroupSelect(group.variantId)}
                              title={`${group.label} · ${group.avatars.length}`}
                              aria-label={`选择立绘组 ${group.label}`}
                            >
                              <span
                                className="
                                  pointer-events-none absolute inset-0 bg-gradient-to-br
                                  from-base-100/70 via-base-100/10 to-base-content/10
                                "
                                aria-hidden="true"
                              />
                              {previewAvatars.length > 0
                                ? previewAvatars.map((avatar, avatarIndex) => {
                                    const previewUrl = getEffectiveAvatarThumbUrl(avatar) || getEffectiveAvatarUrl(avatar);
                                    return (
                                      <span
                                        key={avatar.avatarId ?? `${group.variantId}-${avatarIndex}`}
                                        className={`
                                          absolute aspect-[3/4] w-[58%] overflow-hidden rounded-lg
                                          border border-base-100/80 bg-base-100 shadow-sm
                                          transition-transform duration-200 ease-out
                                          group-hover/avatar-variant:scale-[1.03]
                                          motion-reduce:transition-none motion-reduce:group-hover/avatar-variant:scale-100
                                          ${avatarVariantStackCardClassNames[avatarIndex]}
                                        `}
                                        aria-hidden="true"
                                      >
                                        {previewUrl
                                          ? (
                                              <MediaImage
                                                src={previewUrl}
                                                alt=""
                                                className="size-full object-cover"
                                                loading="lazy"
                                                decoding="async"
                                                draggable={false}
                                              />
                                            )
                                          : (
                                              <span className="
                                                flex size-full items-center justify-center
                                                text-base-content/35
                                              ">
                                                <FolderOpenIcon className="size-5" weight="regular" aria-hidden="true" />
                                              </span>
                                            )}
                                      </span>
                                    );
                                  })
                                : (
                                    <div className="
                                      flex size-full items-center justify-center
                                      text-base-content/45
                                    ">
                                      <FolderOpenIcon className="size-8" weight="regular" aria-hidden="true" />
                                    </div>
                                  )}
                              <span className="
                                absolute bottom-1.5 right-1.5 z-20 rounded-full bg-base-100/95 px-1.5 py-0.5
                                text-[0.625rem] font-medium leading-none text-base-content/70 shadow-sm
                              ">
                                {group.avatars.length}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="
                                mt-1 block w-full truncate text-center text-xs
                                text-base-content/70 hover:text-base-content
                              "
                              title={`${group.label} · ${group.avatars.length}`}
                              onClick={() => handleAvatarVariantGroupSelect(group.variantId)}
                            >
                              {group.label}
                              <span className="text-base-content/50">
                                {" "}
                                ·
                                {" "}
                                {group.avatars.length}
                              </span>
                            </button>
                          </motion.div>
                        );
                        })}
                      </div>
                </CollapsibleMotion>
                {visibleAvatarCategorySections.map(section => (
                  <div key={section.variantId} className="min-w-0">
                    {section.categoryGroups.map((group) => {
                      const avatars = group.avatars;
                      const categoryLabel = group.category;
                      const collapseKey = getAvatarCategoryCollapseKey(selectedRoleId, section.variantId, group.category);
                      const isCollapsed = collapsedAvatarCategoryKeys.has(collapseKey);
                      return (
                        <div key={`${section.variantId}-${group.category}`} className={isMobileFullscreen ? `
                          mb-1.5
                          last:mb-0
                        ` : `
                          mb-3
                          last:mb-0
                        `}>
                          <button
                            type="button"
                            className={`
                              flex w-full min-w-0 items-center justify-between gap-2
                              rounded-md px-1.5 py-1 text-xs font-semibold
                              text-base-content/70 hover:bg-base-200
                              ${isMobileFullscreen ? `mb-0.5` : `mb-2`}
                            `}
                            onClick={() => handleToggleAvatarCategory(collapseKey)}
                            aria-expanded={!isCollapsed}
                            title={isCollapsed ? `展开${categoryLabel}` : `折叠${categoryLabel}`}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              {isCollapsed
                                ? <CaretRightIcon className="size-3.5 shrink-0" aria-hidden="true" />
                                : <CaretDownIcon className="size-3.5 shrink-0" aria-hidden="true" />}
                              <span className="truncate text-base-content/85">{categoryLabel}</span>
                            </span>
                            <CountBadge tone="neutral" className="shrink-0">{avatars.length}</CountBadge>
                          </button>
                          <CollapsibleMotion open={!isCollapsed} className={avatarGridClassName}>
                                {avatars.map((avatar, avatarIndex) => {
                                const avatarId = avatar.avatarId ?? -1;
                                const isSelectedAvatar = selectedAvatarId === avatarId;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onAvatarVariantChange(selectedRoleId, section.variantId);
                                      onAvatarChange(avatarId);
                                      onRequestClose?.();
                                    }}
                                    className={`
                                      ${avatarItemClassName}
                                      ${isSelectedAvatar ? "bg-info/10 ring-2 ring-info/45" : ""}
                                    `}
                                    key={avatar.avatarId ?? `${section.variantId}-${group.category}-${avatarIndex}`}
                                    title="点击选择头像"
                                    aria-label={`选择头像${avatarIndex + 1}`}
                                    aria-pressed={isSelectedAvatar}
                                  >
                                    <RoleAvatarComponent
                                      avatarId={avatar.avatarId || -1}
                                      avatarUrl={getEffectiveAvatarUrl(avatar)}
                                      avatarThumbUrl={getEffectiveAvatarThumbUrl(avatar)}
                                      roleId={selectedRoleId}
                                      width={avatarSize}
                                      isRounded={false}
                                      withTitle={false}
                                      stopToastWindow={true}
                                      hoverToScale={!isMobile}
                                      imageLoading="lazy"
                                      imageDecoding="async"
                                    />
                                  </button>
                                );
                                })}
                          </CollapsibleMotion>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )
        : isNoRoleMode
          ? (
              <div className="
                flex flex-col items-center justify-center h-full text-base-content/60
                py-12
              ">
                <AddRoleIcon className="
                  size-16 mx-auto mb-3 text-base-content/30
                " />
                <div className="text-sm font-medium mb-1">未选择角色</div>
                <div className="
                  text-xs text-base-content/50 max-w-[200px] text-center
                ">请从左侧列表选择你的角色，或添加新角色</div>
              </div>
            )
          : isNarratorMode
            ? (
                <div className="
                  flex flex-col items-center justify-center h-full
                  text-base-content/60 py-12
                ">
                  <NarratorIcon className="
                    size-16 mx-auto mb-3 text-base-content/30
                  " />
                  <div className="text-sm font-medium mb-1">{narratorTitle}</div>
                  <div className="
                    text-xs text-base-content/50 max-w-[200px] text-center
                  ">{narratorDescription}</div>
                </div>
              )
            : (
                <div className="text-center py-12 text-base-content/60">
                  <div className="text-sm mb-2">暂无可用头像</div>
                  <div className="text-xs text-base-content/50">请先为角色添加头像差分</div>
                </div>
              )}
    </div>
  );
}
