import type { MouseEvent } from "react";

import { ArrowLeftIcon, CaretDownIcon, CaretRightIcon, FolderOpenIcon } from "@phosphor-icons/react";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

import { RoomContext } from "@/components/chat/core/roomContext";
import { useRoomRoleSelectionStore } from "@/components/chat/stores/roomRoleSelectionStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { canManageRoomRoles, hasHostPrivileges } from "@/components/chat/utils/memberPermissions";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { MediaImage } from "@/components/common/mediaImage";
import { RoleAvatarByRole } from "@/components/common/roleAccess";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { RoleDetailPagePopup } from "@/components/common/roleDetailPagePopup";
import { RoleTypeBadge } from "@/components/common/roleTypeBadge";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { getEffectiveAvatarThumbUrl, getEffectiveAvatarUrl } from "@/components/Role/sprite/utils";
import { AddRingLight, AddRoleIcon, ExpandCornersIcon, EyedropperIcon, IdentificationCardIcon, NarratorIcon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";

import type { UserRole } from "../../../../api";

import { useGetRoleAvatarsQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
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

export function ExpressionChooser({
  roleId,
  selectedAvatarId,
  handleExpressionChange,
  handleRoleChange,
  showNarratorOption = true,
  onRequestClose,
  defaultFullscreen = false,
  fullscreenLayoutMode = "dialog",
  onRequestFullscreen,
  fitContainer = false,
}: {
  roleId: number;
  selectedAvatarId?: number;
  handleExpressionChange: (avatarId: number) => void;
  handleRoleChange: (roleId: number) => void;
  /** 是否显示旁白选项（WebGAL 联动模式下使用） */
  showNarratorOption?: boolean;
  onRequestClose?: () => void;
  defaultFullscreen?: boolean;
  /** 全屏时的布局模式：`dialog` 保持原本固定高度；`fill` 填满父容器 */
  fullscreenLayoutMode?: "dialog" | "fill";
  onRequestFullscreen?: (next: boolean) => void;
  /** 由房间输入框弹层控制尺寸时，选择器填满父容器 */
  fitContainer?: boolean;
}) {
  const roomContext = use(RoomContext);
  const [_, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const [isAvatarFullscreen, setIsAvatarFullscreen] = useState(Boolean(defaultFullscreen));
  const isAvatarSamplerActive = useRoomUiStore(state => state.isAvatarSamplerActive);
  const setAvatarSamplerActive = useRoomUiStore(state => state.setAvatarSamplerActive);
  const [manageRoleId, setManageRoleId] = useState<number | null>(null);
  const isMobile = getScreenSize() === "sm";
  const isMobileFullscreen = isMobile && isAvatarFullscreen;
  // 移动端全屏下默认折叠角色列表，优先展示立绘差分。
  const [isRoleListExpanded, setIsRoleListExpanded] = useState(!isMobileFullscreen);
  const [collapsedAvatarCategoryKeys, setCollapsedAvatarCategoryKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setIsAvatarFullscreen(Boolean(defaultFullscreen));
  }, [defaultFullscreen]);

  useEffect(() => {
    setIsRoleListExpanded(!isMobileFullscreen);
  }, [isMobileFullscreen]);

  const currentMemberType = roomContext.curMember?.memberType;
  const hasHostAccess = hasHostPrivileges(currentMemberType);
  const canAddRole = canManageRoomRoles(currentMemberType);

  const selectedRoleId = roleId;
  const roleAvatarsQuery = useGetRoleAvatarsQuery(selectedRoleId);
  const roleAvatars = useMemo(() => roleAvatarsQuery.data?.data ?? [], [roleAvatarsQuery.data]);
  const storedAvatarVariantId = useRoomRoleSelectionStore(state => state.curAvatarVariantIdMap[selectedRoleId]);
  const setCurAvatarVariantIdForRole = useRoomRoleSelectionStore(state => state.setCurAvatarVariantIdForRole);
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

  const availableRoles = roomContext.roomRolesThatUserOwn;
  const selectedRole = useMemo(
    () => availableRoles.find(role => role.roleId === selectedRoleId),
    [availableRoles, selectedRoleId],
  );
  const manageRole = useMemo(
    () => availableRoles.find(role => role.roleId === manageRoleId),
    [availableRoles, manageRoleId],
  );

  // 判断当前是否为旁白模式
  const isNarratorMode = selectedRoleId < 0;
  // 判断是否未选择角色
  const isNoRoleMode = selectedRoleId === 0;

  let narratorTitle = selectedRole?.roleName ?? "未知角色";
  if (isNarratorMode) {
    narratorTitle = "旁白模式";
  }
  else if (isNoRoleMode) {
    narratorTitle = "未选择角色";
  }

  const narratorDescription = showNarratorOption
    ? "旁白也可以选择“旁白用头像”（如果已配置），用于统一交互"
    : "请选择你的角色后再发送消息";

  const containerSizeClassName = isAvatarFullscreen
    ? (fullscreenLayoutMode === "fill"
        ? "w-full max-w-full min-w-0 h-full max-h-full min-h-0"
        : "w-full max-w-full min-w-0 h-[80vh] max-h-[80vh]")
    : (fitContainer
        ? "w-full min-w-0 h-full min-h-0"
        : "w-[96vw] md:w-[840px] h-[78vh] md:h-[430px] max-h-[82vh]");
  const containerLayoutClassName = isAvatarFullscreen
    ? (isMobileFullscreen ? "gap-2" : "gap-3 md:gap-4")
    : "";
  const roleListClassName = isAvatarFullscreen
    ? (isMobile
        ? "space-y-2 max-h-[42vh] overflow-y-auto px-1 -mx-1"
        : "space-y-2 flex-1 min-h-0 overflow-y-auto px-1 -mx-1")
    : (isMobile
        ? "space-y-2 max-h-[32vh] overflow-y-auto px-1 -mx-1"
        : "space-y-2 flex-1 min-h-0 overflow-y-auto px-1 -mx-1");
  const avatarListClassName = isAvatarFullscreen
    ? "flex-1 min-h-0"
    : "flex-1 min-h-0";
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
  const avatarSize = isMobileFullscreen ? 18 : 21;
  const leftPanelClassName = isAvatarFullscreen
    ? (isMobile
        ? "w-full shrink-0 border border-base-200/80 rounded-xl bg-base-100/90 shadow-sm p-2"
        : "w-full md:w-[240px] lg:w-[260px] shrink-0 h-full min-h-0 flex flex-col border border-base-200/80 rounded-xl bg-base-100/90 shadow-sm p-2 md:pb-0 md:pr-3 overflow-hidden")
    : "w-full md:w-[320px] md:min-w-[320px] md:max-w-[320px] md:h-full md:min-h-0 shrink-0 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-base-300 p-2 md:pb-0 md:pr-3";
  const rightPanelClassName = isAvatarFullscreen
    ? (isMobileFullscreen
        ? "w-full min-w-0 h-full min-h-0 overflow-hidden flex flex-col rounded-xl border border-base-200/80 bg-base-100/90 shadow-sm px-1.5 pt-1.5"
        : "w-full md:flex-1 min-w-0 h-full min-h-0 overflow-hidden flex flex-col rounded-xl border border-base-200/80 bg-base-100/90 shadow-sm px-3 pt-2")
    : "w-full flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col md:pl-3";
  const leftPanelOrderClassName = isMobileFullscreen ? "order-2 mt-2" : "order-1";
  const rightPanelOrderClassName = isMobileFullscreen ? "order-1" : "order-2";
  const toolbarClassName = isAvatarFullscreen
    ? (isMobileFullscreen
        ? "sticky top-0 z-10 -mx-1.5 px-1.5 py-1 bg-base-100/95 backdrop-blur border-b border-base-200/70 rounded-t-xl"
        : "sticky top-0 z-10 -mx-3 px-3 py-2 bg-base-100/95 backdrop-blur border-b border-base-200/70 rounded-t-xl")
    : "";
  const shouldShowAvatarPanelTitle = isAvatarFullscreen || isAvatarVariantGroupView;
  const avatarPanelTitle = isAvatarVariantGroupView
    ? `${narratorTitle}【${activeAvatarVariantGroup?.label ?? "立绘组"}】`
    : "头像列表";
  const avatarPanelCount = isAvatarVariantGroupView
    ? (activeAvatarVariantGroup?.avatars.length ?? 0)
    : roleAvatars.length;
  const avatarItemClassName = isAvatarFullscreen
    ? (isMobileFullscreen
        ? "w-18 h-18 overflow-hidden cursor-pointer leading-none"
        : "size-[5.75rem] rounded-lg bg-base-100/90 ring-1 ring-base-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center p-1")
    : "size-[5.75rem] rounded-lg transition-all hover:bg-base-200 cursor-pointer flex items-center justify-center p-1";

  const handleRoleSelect = (role: UserRole) => {
    handleRoleChange(role.roleId);
    if (isMobileFullscreen) {
      setIsRoleListExpanded(false);
    }
  };

  // 切换到旁白模式
  const handleNarratorSelect = () => {
    if (!hasHostAccess) {
      toast.error("只有主持人可以使用旁白");
      return;
    }
    handleRoleChange(-1); // roleId <= 0 表示旁白
    if (isMobileFullscreen) {
      setIsRoleListExpanded(false);
    }
  };

  const handleSamplerToggle = (event?: MouseEvent<HTMLButtonElement>) => {
    if (isAvatarSamplerActive) {
      setAvatarSamplerActive(false);
      return;
    }
    setAvatarSamplerActive(true);
    onRequestClose?.();
    if (typeof document !== "undefined") {
      const activeElement = document.activeElement as HTMLElement | null;
      activeElement?.blur();
    }
    event?.currentTarget.blur();
  };

  const handleFullscreenToggle = () => {
    const next = !isAvatarFullscreen;
    setIsAvatarFullscreen(next);
    onRequestFullscreen?.(next);
  };

  const handleAvatarVariantGroupSelect = (variantId: number) => {
    setCurAvatarVariantIdForRole(selectedRoleId, variantId);
  };

  const handleReturnToUngroupedAvatars = () => {
    setCurAvatarVariantIdForRole(selectedRoleId, EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID);
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
    <div className={`
      flex flex-col
      md:flex-row
      w-full min-w-0 overflow-hidden
      ${containerSizeClassName}
      ${containerLayoutClassName}
      ${isAvatarFullscreen ? `items-stretch` : ""}
    `}>
      {/* 左侧：角色列表 */}
      <div className={`
        ${leftPanelClassName}
        ${leftPanelOrderClassName}
      `}>
        {isMobileFullscreen && (
          <button
            type="button"
            className="
              w-full flex items-center justify-between gap-2 rounded-lg border
              border-base-300 p-2
              hover:bg-base-200
              transition-colors
            "
            onClick={() => setIsRoleListExpanded(prev => !prev)}
            aria-expanded={isRoleListExpanded}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isNarratorMode
                ? (
                    <div className="
                      size-8 rounded-full bg-transparent flex items-center
                      justify-center shrink-0
                    ">
                      <NarratorIcon className="size-5 text-base-content/60" />
                    </div>
                  )
                : isNoRoleMode
                  ? (
                      <div className="
                        size-8 rounded-full bg-base-200/50 flex items-center
                        justify-center shrink-0
                      ">
                        <AddRoleIcon className="size-5 text-base-content/60" />
                      </div>
                    )
                  : (
                      <RoleAvatarByRole
                        role={selectedRole}
                        width={8}
                        isRounded={true}
                        withTitle={false}
                        stopToastWindow={true}
                      />
                    )}
              <div className="min-w-0 text-left">
                <div className="text-xs text-base-content/50">当前身份</div>
                <div className="text-sm font-medium truncate">
                  {isNarratorMode ? "旁白" : (selectedRole?.roleName ?? "未选择角色")}
                </div>
              </div>
            </div>
            <span className="text-xs text-base-content/70">{isRoleListExpanded ? "收起角色列表" : "切换角色"}</span>
          </button>
        )}
        {(!isMobileFullscreen || isRoleListExpanded) && (
          <div className={`
            ${roleListClassName}
            ${isMobileFullscreen ? "mt-2" : ""}
          `}>
            {/* 旁白选项（WebGAL 联动模式） */}
            {showNarratorOption && hasHostAccess && (
              <div
                onClick={handleNarratorSelect}
                className={`
                  flex items-center gap-3
                  ${isMobile ? "p-2" : "p-3"}
                  rounded-lg transition-colors
                  ${
                  hasHostAccess ? `
                    cursor-pointer
                    hover:bg-base-200
                  ` : `cursor-not-allowed opacity-60`
                }
                  ${
                  isNarratorMode ? `
                    bg-base-200 ring-2 ring-inset ring-secondary/30
                  ` : ""
                }
                `}
              >
                <div className="
                  size-10 rounded-full bg-transparent flex items-center
                  justify-center shrink-0
                ">
                  <NarratorIcon className="size-6 text-base-content/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium truncate">旁白</div>
                  </div>
                  <div className="text-xs text-base-content/50">{hasHostAccess ? "无角色叙述" : "仅主持可用"}</div>
                </div>
              </div>
            )}
            {
              availableRoles.length === 0 && (!showNarratorOption || !hasHostAccess) && (
                <div className="text-center text-sm text-gray-500 py-4">无可用角色</div>
              )
            }
            {
              availableRoles.map(role => (
                <div
                  key={role.roleId}
                  onClick={() => handleRoleSelect(role)}
                  className={`
                    flex items-center gap-3
                    ${isMobile ? "p-2" : "p-3"}
                    rounded-lg cursor-pointer
                    hover:bg-base-200
                    transition-colors
                    ${
                    selectedRoleId === role.roleId ? `
                      bg-base-200 ring-2 ring-inset ring-primary/30
                    ` : ""
                  }
                  `}
                >
                  <RoleAvatarByRole
                    role={role}
                    width={10}
                    isRounded={true}
                    withTitle={false}
                    stopToastWindow={true}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{role.roleName}</div>
                      <RoleTypeBadge role={role} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs shrink-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      setManageRoleId(role.roleId);
                    }}
                    aria-label={`查看角色详情：${role.roleName}`}
                    title="查看角色详情"
                  >
                    <IdentificationCardIcon className="size-4" />
                  </button>
                </div>
              ))
            }
            {
              canAddRole && (
                <div
                  className={`
                    flex items-center gap-3
                    ${isMobile ? "p-2.5" : `p-3`}
                    rounded-lg cursor-pointer
                    hover:bg-base-200
                    transition-colors group border-2 border-dashed
                    border-base-300
                  `}
                  onClick={() => setIsRoleAddWindowOpen(true)}
                >
                  <AddRingLight className="
                    size-10
                    group-hover:text-info
                  " />
                  <div className="
                    text-sm text-base-content/70
                    group-hover:text-info
                  ">添加新角色</div>
                </div>
              )
            }
          </div>
        )}
      </div>

      <ToastWindow
        isOpen={manageRoleId !== null}
        onClose={() => setManageRoleId(null)}
        fullScreen={getScreenSize() === "sm"}
      >
        {manageRoleId !== null && (
          <div className="justify-center w-full">
            <RoleDetailPagePopup
              roleId={manageRoleId}
              roleTypeHint={manageRole?.type}
              roleOwnerUserIdHint={manageRole?.userId}
              roleStateHint={manageRole?.state}
              allowKickOut={true}
              kickOutByManagerOnly={Boolean(manageRole?.type === 2)}
              onClose={() => setManageRoleId(null)}
            />
          </div>
        )}
      </ToastWindow>

      {/* 右侧：表情列表 */}
      <div className={`
        ${rightPanelClassName}
        ${rightPanelOrderClassName}
      `}>
        {/* 旁白模式也可选择头像（若已配置） */}
        {roleAvatars && roleAvatars.length > 0
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
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square shrink-0"
                          onClick={handleReturnToUngroupedAvatars}
                          title="返回默认"
                          aria-label="返回默认头像"
                        >
                          <ArrowLeftIcon className="size-4" aria-hidden="true" />
                        </button>
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
                      className={`
                        btn btn-xs gap-1
                        ${isAvatarSamplerActive ? `btn-info text-info-content` : `
                          btn-ghost
                        `}
                      `}
                      onClick={handleSamplerToggle}
                      title={isAvatarSamplerActive ? "退出取样" : "墨水取样：点击消息头像"}
                      aria-label={isAvatarSamplerActive ? "退出取样" : "墨水取样：点击消息头像"}
                    >
                      <EyedropperIcon className="size-4" />
                      <span className="text-xs">{isAvatarSamplerActive ? "取样中" : "取样"}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs gap-1"
                      onClick={handleFullscreenToggle}
                      title={isAvatarFullscreen ? "退出全屏" : "全屏"}
                      aria-label={isAvatarFullscreen ? "退出全屏" : "全屏"}
                    >
                      <ExpandCornersIcon className="size-4" />
                      <span className="text-xs">{isAvatarFullscreen ? "退出全屏" : "全屏"}</span>
                    </button>
                  </div>
                </div>
                <div className={`
                  ${avatarListClassName}
                  w-full overflow-y-auto overflow-x-hidden
                  ${isAvatarFullscreen ? `pb-4` : ""}
                `}>
                  {showAvatarVariantGroups && !isAvatarVariantGroupView && (
                    <div className={isMobileFullscreen ? `
                      mb-2
                    ` : `
                      mb-3
                    `}>
                      <div className={avatarVariantFolderGridClassName}>
                        {avatarVariantFolders.map((group) => {
                          const coverUrl = group.coverAvatar ? getEffectiveAvatarUrl(group.coverAvatar) : "";
                          return (
                            <div key={group.variantId} className="min-w-0">
                              <button
                                type="button"
                                className={`
                                  relative aspect-square w-full overflow-hidden rounded-lg border-2
                                  bg-base-200 transition-[border-color,box-shadow,background-color]
                                  border-base-300 hover:border-primary/50 hover:bg-base-300
                                `}
                                onClick={() => handleAvatarVariantGroupSelect(group.variantId)}
                                title={`${group.label} · ${group.avatars.length}`}
                                aria-label={`选择立绘组 ${group.label}`}
                              >
                                {coverUrl
                                  ? (
                                      <MediaImage
                                        src={coverUrl}
                                        alt={group.label}
                                        className="size-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                        draggable={false}
                                      />
                                    )
                                  : (
                                      <div className="
                                        flex size-full items-center justify-center
                                        text-base-content/45
                                      ">
                                        <FolderOpenIcon className="size-8" weight="duotone" aria-hidden="true" />
                                      </div>
                                    )}
                                <span className="
                                  absolute right-1 top-1 rounded-md bg-base-100/90 p-1
                                  text-base-content shadow-sm
                                ">
                                  <FolderOpenIcon className="size-3.5" weight="fill" aria-hidden="true" />
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
                                <span className="text-base-content/45">
                                  {" "}
                                  ·
                                  {" "}
                                  {group.avatars.length}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                              <span className="badge badge-ghost badge-xs shrink-0">{avatars.length}</span>
                            </button>
                            {!isCollapsed && (
                              <div className={avatarGridClassName}>
                                {avatars.map((avatar, avatarIndex) => {
                                  const avatarId = avatar.avatarId ?? -1;
                                  const isSelectedAvatar = selectedAvatarId === avatarId;
                                  return (
                                    <div
                                      onClick={() => {
                                        setCurAvatarVariantIdForRole(selectedRoleId, section.variantId);
                                        handleExpressionChange(avatarId);
                                        onRequestClose?.();
                                      }}
                                      className={`
                                        ${avatarItemClassName}
                                        ${isSelectedAvatar ? "bg-primary/10 ring-2 ring-primary/45" : ""}
                                      `}
                                      key={avatar.avatarId ?? `${section.variantId}-${group.category}-${avatarIndex}`}
                                      title="点击选择头像"
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
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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
                  flex flex-col items-center justify-center h-full text-gray-500
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
                    text-gray-500 py-12
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
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-sm mb-2">暂无可用头像</div>
                    <div className="text-xs text-base-content/50">请先为角色添加头像差分</div>
                  </div>
                )}
      </div>
    </div>
  );
}
