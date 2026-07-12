import { AddressBookIcon, ArchiveIcon, ArrowCounterClockwise, SignOutIcon, TrashIcon, UserPlusIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import React from "react";
import { appToast } from "@/components/common/appToast/appToast";

import type { OpenSpaceDetailPanelOptions, SpaceDetailTab } from "@/components/chat/chatPage.types";

import { SpaceContext } from "@/components/chat/core/spaceContext";
import { prepareSpaceDocsForArchive } from "@/components/chat/infra/doc/space/prepareSpaceDocsForArchive";
import { getSpaceArchiveActionDisabledReason } from "@/components/chat/space/spaceArchiveActionPolicy";
import { canInviteSpectators } from "@/components/chat/utils/memberPermissions";
import { canViewSpaceDetailTab } from "@/components/chat/utils/spaceDetailPermissions";
import { buttonClassName } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DropdownMenu, MenuItem } from "@/components/common/MenuPopover";
import PortalTooltip from "@/components/common/portalTooltip";
import { Badge } from "@/components/common/StatusPrimitives";
import { ChevronDown, DiceD6Icon, MemberIcon, Setting, WebgalIcon } from "@/icons";

import { useDissolveSpaceMutation, useExitSpaceMutation, useRecoverSpaceMutation, useUpdateSpaceArchiveStatusMutation } from "../../../../api/hooks/chatQueryHooks";

type SpaceHeaderBarProps = {
  spaceName?: string;
  isArchived?: boolean;
  isSpaceOwner: boolean;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab, options?: OpenSpaceDetailPanelOptions) => void;
  onCloseLeftDrawer?: () => void;
  onAddCategory?: () => void;
  onResetSidebarTreeToDefault?: () => void | Promise<void>;
  onInviteMember: () => void;
}

type SpaceHeaderIconButtonProps = {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  ariaPressed?: boolean;
  title?: string;
};

type SpaceMenuActionTone = "default" | "danger" | "warning";

type SpaceMenuActionProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: React.ReactNode;
  icon: React.ReactNode;
  tone?: SpaceMenuActionTone;
};

const spaceHeaderIconButtonClassName = buttonClassName({
  variant: "ghost",
  size: "sm",
  shape: "square",
  className: "text-base-content/70 hover:text-info",
});
const spaceHeaderIconClassName = "size-4 shrink-0";

function SpaceHeaderIconButton({
  label,
  onClick,
  children,
  ariaPressed,
  title,
}: SpaceHeaderIconButtonProps) {
  return (
    <PortalTooltip label={label} placement="bottom">
      <button
        type="button"
        className={spaceHeaderIconButtonClassName}
        onClick={onClick}
        aria-label={label}
        aria-pressed={ariaPressed}
        title={title ?? label}
      >
        {children}
      </button>
    </PortalTooltip>
  );
}

function SpaceMenuAction({
  children,
  icon,
  tone = "default",
  className = "",
  ...rest
}: SpaceMenuActionProps) {
  const iconToneClassName = tone === "danger"
    ? "bg-error/10 text-error"
    : tone === "warning"
      ? "bg-warning/10 text-warning"
      : "bg-base-200 text-base-content/65 group-hover:bg-base-300 group-hover:text-base-content";

  return (
    <MenuItem
      {...rest}
      tone={tone === "danger" ? "danger" : "default"}
      className={`group min-h-10 gap-3 px-2 font-medium ${tone === "warning" ? "text-warning hover:bg-warning/10" : ""} ${className}`}
      icon={(
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150 ${iconToneClassName}`}>
          {icon}
        </span>
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </MenuItem>
  );
}

export default function SpaceHeaderBar({
  spaceName,
  isArchived,
  isSpaceOwner,
  onOpenSpaceDetailPanel,
  onCloseLeftDrawer,
  onResetSidebarTreeToDefault,
  onInviteMember,
}: SpaceHeaderBarProps) {
  const router = useRouter();
  const spaceContext = React.use(SpaceContext);
  const spaceId = Number(spaceContext.spaceId ?? -1);
  const dissolveSpace = useDissolveSpaceMutation();
  const exitSpace = useExitSpaceMutation();
  const updateArchiveStatus = useUpdateSpaceArchiveStatusMutation();
  const recoverSpace = useRecoverSpaceMutation();
  const archived = Boolean(isArchived);
  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = React.useState(false);
  const [dissolveTargetSpaceId, setDissolveTargetSpaceId] = React.useState<number | null>(null);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = React.useState(false);
  const [exitTargetSpaceId, setExitTargetSpaceId] = React.useState<number | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = React.useState(false);
  const [archiveTargetSpaceId, setArchiveTargetSpaceId] = React.useState<number | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [isResettingSidebarTree, setIsResettingSidebarTree] = React.useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = React.useState(false);
  const isDevOrTest = Boolean(import.meta.env?.DEV) || import.meta.env.MODE === "test";
  const archiveActionPending = updateArchiveStatus.isPending || recoverSpace.isPending;
  const archiveActionLabel = archived
    ? (recoverSpace.isPending ? "恢复中..." : "恢复编辑")
    : (updateArchiveStatus.isPending ? "归档中..." : "归档空间");
  const archiveActionDisabledReason = getSpaceArchiveActionDisabledReason({
    spaceId,
    isArchived: archived,
    isPending: archiveActionPending,
  });
  const archiveActionDisabled = archiveActionDisabledReason != null;
  const canResetSidebarTree = isDevOrTest && isSpaceOwner && Boolean(onResetSidebarTreeToDefault);
  const canViewMembersDetail = canViewSpaceDetailTab("members", spaceContext.memberType);
  const canViewRolesDetail = canViewSpaceDetailTab("roles", spaceContext.memberType);
  const canViewTrpgDetail = canViewSpaceDetailTab("trpg", spaceContext.memberType);
  const canViewWebgalDetail = canViewSpaceDetailTab("webgal", spaceContext.memberType);
  const canInviteMembers = canInviteSpectators(spaceContext.memberType);
  const leaveActionLabel = exitSpace.isPending ? "退出中..." : "退出空间";
  const dissolveActionLabel = dissolveSpace.isPending ? "解散中..." : "解散空间";

  const clearCurrentSpaceSelection = React.useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("storedChatIds");
    }
    spaceContext.setActiveSpaceId?.(null);
    spaceContext.setActiveRoomId?.(null);
    router.history.replace("/chat/discover/material");
  }, [router, spaceContext]);

  const handleToggleArchive = async (targetSpaceId: number, nextArchived: boolean) => {
    if (getSpaceArchiveActionDisabledReason({
      spaceId: targetSpaceId,
      isArchived: !nextArchived,
      isPending: archiveActionPending,
    }) != null) {
      return;
    }
    const toastId = `space-archive-${targetSpaceId}`;
    appToast.loading(nextArchived ? "正在归档空间..." : "正在恢复编辑...", { id: toastId });
    try {
      if (nextArchived) {
        await prepareSpaceDocsForArchive(targetSpaceId);
        await updateArchiveStatus.mutateAsync({ spaceId: targetSpaceId, archived: true });
      }
      else {
        await recoverSpace.mutateAsync({ spaceId: targetSpaceId });
      }
      appToast.success(nextArchived ? "归档完成" : "已恢复编辑", { id: toastId });
    }
    catch {
      appToast.error(nextArchived ? "归档失败，请重试" : "恢复编辑失败，请重试", { id: toastId });
    }
  };

  const handleArchiveAction = () => {
    if (archiveActionDisabled) {
      return;
    }
    const nextArchived = !archived;
    if (nextArchived) {
      setArchiveTargetSpaceId(spaceId);
      setIsArchiveConfirmOpen(true);
      return;
    }
    void handleToggleArchive(spaceId, nextArchived);
  };

  const handleRequestDissolveSpace = () => {
    if (spaceId <= 0 || dissolveSpace.isPending) {
      return;
    }
    setDissolveTargetSpaceId(spaceId);
    setIsDissolveConfirmOpen(true);
  };

  const handleConfirmDissolveSpace = async () => {
    if (dissolveTargetSpaceId == null || dissolveSpace.isPending) {
      return;
    }
    const targetSpaceId = dissolveTargetSpaceId;
    setIsDissolveConfirmOpen(false);
    setDissolveTargetSpaceId(null);

    const toastId = `space-dissolve-${targetSpaceId}`;
    appToast.loading("正在解散空间...", { id: toastId });
    try {
      await dissolveSpace.mutateAsync(targetSpaceId);
      clearCurrentSpaceSelection();
      appToast.success("空间已解散", { id: toastId });
    }
    catch {
      appToast.error("解散空间失败，请重试", { id: toastId });
    }
  };

  const handleRequestExitSpace = () => {
    if (spaceId <= 0 || exitSpace.isPending) {
      return;
    }
    setExitTargetSpaceId(spaceId);
    setIsExitConfirmOpen(true);
  };

  const handleConfirmExitSpace = async () => {
    if (exitTargetSpaceId == null || exitSpace.isPending) {
      return;
    }
    const targetSpaceId = exitTargetSpaceId;
    setIsExitConfirmOpen(false);
    setExitTargetSpaceId(null);

    const toastId = `space-exit-${targetSpaceId}`;
    appToast.loading("正在退出空间...", { id: toastId });
    try {
      await exitSpace.mutateAsync(targetSpaceId);
      clearCurrentSpaceSelection();
      appToast.success("已退出空间", { id: toastId });
    }
    catch {
      appToast.error("退出空间失败，请重试", { id: toastId });
    }
  };

  const handleOpenSpaceDetail = (tab: SpaceDetailTab) => {
    setIsOptionsMenuOpen(false);
    onOpenSpaceDetailPanel(tab);
    onCloseLeftDrawer?.();
  };

  const handleRequestResetSidebarTree = () => {
    if (!onResetSidebarTreeToDefault || isResettingSidebarTree) {
      return;
    }
    setIsOptionsMenuOpen(false);
    setIsResetConfirmOpen(true);
  };

  const handleConfirmResetSidebarTree = async () => {
    if (!onResetSidebarTreeToDefault || isResettingSidebarTree) {
      return;
    }
    setIsResetConfirmOpen(false);
    setIsResettingSidebarTree(true);
    const toastId = "space-sidebar-tree-reset";
    appToast.loading("正在重置侧边树...", { id: toastId });
    try {
      await onResetSidebarTreeToDefault();
      appToast.success("侧边树已重置为默认结构", { id: toastId });
    }
    catch (error) {
      console.error("[SidebarTree] reset to default failed", error);
      appToast.error("重置侧边树失败，请重试", { id: toastId });
    }
    finally {
      setIsResettingSidebarTree(false);
    }
  };

  return (
    <>
      <div className="
        flex items-center justify-between h-10 gap-2 min-w-0 border-b
        border-base-300
        dark:border-base-300
        rounded-tl-xl px-2
      ">
        <DropdownMenu
          open={isOptionsMenuOpen}
          onOpenChange={setIsOptionsMenuOpen}
          ariaLabel="空间操作"
          className="min-w-0 flex-1"
          menuClassName="max-h-[min(32rem,calc(100dvh-1rem))] w-56 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain p-1.5 shadow-2xl"
          trigger={(
            <button
              type="button"
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: `w-full min-w-0 justify-start gap-2 rounded-lg px-2 ${isOptionsMenuOpen ? "bg-base-200" : ""}`,
              })}
              aria-label={`空间选项：${spaceName}`}
              title={`${spaceName}，打开空间菜单`}
            >
              <span className="min-w-0 flex-1 truncate text-left text-base font-bold leading-none" title={spaceName}>
                {spaceName}
              </span>
              {archived ? <Badge density="default">已归档</Badge> : null}
              <ChevronDown className={`size-4 shrink-0 opacity-60 transition-transform duration-150 ${isOptionsMenuOpen ? "rotate-180" : ""}`} />
            </button>
          )}
        >
                {canViewMembersDetail && (
                  <li role="none">
                    <SpaceMenuAction
                      icon={<MemberIcon className="size-4" />}
                      onClick={() => {
                        handleOpenSpaceDetail("members");
                      }}
                    >
                      空间成员
                    </SpaceMenuAction>
                  </li>
                )}
                {canViewRolesDetail && (
                  <li role="none">
                    <SpaceMenuAction
                      icon={<AddressBookIcon className="size-4" />}
                      onClick={() => {
                        handleOpenSpaceDetail("roles");
                      }}
                    >
                      空间角色
                    </SpaceMenuAction>
                  </li>
                )}
                {canViewTrpgDetail && (
                  <li role="none">
                    <SpaceMenuAction
                      icon={<DiceD6Icon className="size-4" />}
                      onClick={() => {
                        handleOpenSpaceDetail("trpg");
                      }}
                    >
                      跑团设置
                    </SpaceMenuAction>
                  </li>
                )}
                {canViewWebgalDetail && (
                  <li role="none">
                    <SpaceMenuAction
                      icon={<WebgalIcon className="size-4" />}
                      onClick={() => {
                        handleOpenSpaceDetail("webgal");
                      }}
                    >
                      WebGAL 渲染
                    </SpaceMenuAction>
                  </li>
                )}
                {isSpaceOwner && (
                  <li role="none">
                    <SpaceMenuAction
                      icon={<Setting className="size-4" />}
                      onClick={() => {
                        handleOpenSpaceDetail("setting");
                      }}
                    >
                      空间资料
                    </SpaceMenuAction>
                  </li>
                )}
                <li role="separator" aria-hidden="true" className="my-1 h-px bg-base-300/80" />
                {isSpaceOwner && (
                  <li role="none">
                    <SpaceMenuAction
                      icon={<ArchiveIcon className="size-4" />}
                      disabled={archiveActionDisabled}
                      title={archiveActionDisabledReason ?? archiveActionLabel}
                      onClick={() => {
                        setIsOptionsMenuOpen(false);
                        handleArchiveAction();
                      }}
                    >
                      {archiveActionLabel}
                    </SpaceMenuAction>
                  </li>
                )}
                <li role="none">
                  <SpaceMenuAction
                    tone="danger"
                    icon={isSpaceOwner
                      ? <TrashIcon className="size-4" />
                      : <SignOutIcon className="size-4" />}
                    disabled={isSpaceOwner ? dissolveSpace.isPending || spaceId <= 0 : exitSpace.isPending || spaceId <= 0}
                    onClick={() => {
                      setIsOptionsMenuOpen(false);
                      if (isSpaceOwner) {
                        handleRequestDissolveSpace();
                        return;
                      }
                      handleRequestExitSpace();
                    }}
                  >
                    {isSpaceOwner ? dissolveActionLabel : leaveActionLabel}
                  </SpaceMenuAction>
                </li>
                {canResetSidebarTree && (
                  <>
                    <li role="separator" aria-hidden="true" className="my-1 h-px bg-base-300/80" />
                    <li role="none">
                      <SpaceMenuAction
                        tone="warning"
                        icon={<ArrowCounterClockwise className="size-4" />}
                        disabled={isResettingSidebarTree}
                        title="将空间侧边树恢复为默认结构"
                        onClick={handleRequestResetSidebarTree}
                      >
                        重置侧边树（开发）
                      </SpaceMenuAction>
                    </li>
                  </>
                )}
        </DropdownMenu>
        <div className="flex gap-2 shrink-0 mr-2">
          {canInviteMembers && (
            <SpaceHeaderIconButton label="邀请成员" onClick={onInviteMember}>
              <UserPlusIcon className={spaceHeaderIconClassName} weight="bold" />
            </SpaceHeaderIconButton>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={isDissolveConfirmOpen}
        onOpenChange={() => {
          if (dissolveSpace.isPending) {
            return;
          }
          setIsDissolveConfirmOpen(false);
          setDissolveTargetSpaceId(null);
        }}
        title="确认解散空间"
        description="是否确定要解散当前空间？此操作不可逆。"
        confirmLabel="确认解散"
        variant="danger"
        onConfirm={() => {
          void handleConfirmDissolveSpace();
        }}
      />
      <ConfirmDialog
        open={isExitConfirmOpen}
        onOpenChange={() => {
          if (exitSpace.isPending) {
            return;
          }
          setIsExitConfirmOpen(false);
          setExitTargetSpaceId(null);
        }}
        title="确认退出空间"
        description="退出后你将离开当前空间，需要重新加入后才能继续访问。是否继续？"
        confirmLabel="确认退出"
        variant="danger"
        onConfirm={() => {
          void handleConfirmExitSpace();
        }}
      />
      <ConfirmDialog
        open={isArchiveConfirmOpen}
        onOpenChange={() => {
          setIsArchiveConfirmOpen(false);
          setArchiveTargetSpaceId(null);
        }}
        title="确认归档空间"
        description="归档后空间将进入只读状态，可在之后恢复编辑。是否继续？"
        confirmLabel="确认归档"
        variant="warning"
        onConfirm={() => {
          if (archiveTargetSpaceId == null) {
            return;
          }
          const targetSpaceId = archiveTargetSpaceId;
          setIsArchiveConfirmOpen(false);
          setArchiveTargetSpaceId(null);
          void handleToggleArchive(targetSpaceId, true);
        }}
      />
      <ConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={() => {
          if (isResettingSidebarTree) {
            return;
          }
          setIsResetConfirmOpen(false);
        }}
        title="确认重置侧边树"
        description="开发者操作：将左侧分类树重置为默认结构。是否继续？"
        confirmLabel="确认重置"
        variant="warning"
        onConfirm={() => {
          void handleConfirmResetSidebarTree();
        }}
      />
    </>
  );
}
