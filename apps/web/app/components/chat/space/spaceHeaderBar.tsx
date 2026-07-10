import { AddressBookIcon, ArchiveIcon, ArrowCounterClockwise, SignOutIcon, TrashIcon, UserPlusIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import React from "react";
import { appToast } from "@/components/common/appToast/appToast";

import type { OpenSpaceDetailPanelOptions, SpaceDetailTab } from "@/components/chat/chatPage.types";

import { SpaceContext } from "@/components/chat/core/spaceContext";
import { prepareSpaceDocsForArchive } from "@/components/chat/infra/doc/space/prepareSpaceDocsForArchive";
import { getSpaceArchiveActionDisabledReason } from "@/components/chat/space/spaceArchiveActionPolicy";
import { canInviteSpectators } from "@/components/chat/utils/memberPermissions";
import { canViewSpaceDetailTab } from "@/components/chat/utils/spaceDetailPermissions";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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

const spaceHeaderIconButtonClassName = `
  btn btn-ghost btn-sm btn-square
  text-base-content/70 hover:text-info
`;
const spaceHeaderIconClassName = "size-4 shrink-0";

function SpaceHeaderIconButton({
  label,
  onClick,
  children,
  ariaPressed,
  title,
}: SpaceHeaderIconButtonProps) {
  return (
    <div className="tooltip tooltip-bottom" data-tip={label}>
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
    </div>
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
  const optionsMenuRef = React.useRef<HTMLDivElement | null>(null);
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

  React.useEffect(() => {
    if (!isOptionsMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (optionsMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsOptionsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOptionsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOptionsMenuOpen]);

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
        <div ref={optionsMenuRef} className="dropdown dropdown-bottom min-w-0">
          <button
            type="button"
            className="
              btn btn-ghost btn-sm px-0 min-w-0 gap-2 justify-start rounded-lg
              w-full
            "
            aria-label={`空间选项：${spaceName}`}
            aria-expanded={isOptionsMenuOpen}
            aria-haspopup="menu"
            title={`${spaceName}，打开空间菜单`}
            onClick={() => setIsOptionsMenuOpen(current => !current)}
          >
            <span className="
              text-base font-bold truncate leading-none min-w-0 flex-1 text-left
            " title={spaceName}>
              {spaceName}
            </span>
            {archived && (
              <span className="badge badge-sm">已归档</span>
            )}
            <ChevronDown className="size-4 opacity-60 shrink-0" />
          </button>
          <AnimatePresence initial={false}>
            {isOptionsMenuOpen && (
              <motion.ul
                tabIndex={0}
                className="
                  dropdown-content menu bg-base-100 rounded-box shadow-xl border
                  border-base-300 z-40 w-56 p-2
                "
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.55 }}
                style={{ transformOrigin: "top left" }}
              >
                {canViewMembersDetail && (
                  <li>
                    <button
                      type="button"
                      className="gap-3"
                      onClick={() => {
                        handleOpenSpaceDetail("members");
                      }}
                    >
                      <MemberIcon className="size-4 opacity-70" />
                      <span className="flex-1 text-left">空间成员</span>
                    </button>
                  </li>
                )}
                {canViewRolesDetail && (
                  <li>
                    <button
                      type="button"
                      className="gap-3"
                      onClick={() => {
                        handleOpenSpaceDetail("roles");
                      }}
                    >
                      <AddressBookIcon className="size-4 opacity-70" />
                      <span className="flex-1 text-left">空间角色</span>
                    </button>
                  </li>
                )}
                {canViewTrpgDetail && (
                  <li>
                    <button
                      type="button"
                      className="gap-3"
                      onClick={() => {
                        handleOpenSpaceDetail("trpg");
                      }}
                    >
                      <DiceD6Icon className="size-4 opacity-70" />
                      <span className="flex-1 text-left">跑团设置</span>
                    </button>
                  </li>
                )}
                {canViewWebgalDetail && (
                  <li>
                    <button
                      type="button"
                      className="gap-3"
                      onClick={() => {
                        handleOpenSpaceDetail("webgal");
                      }}
                    >
                      <WebgalIcon className="size-4 opacity-70" />
                      <span className="flex-1 text-left">WebGAL 渲染</span>
                    </button>
                  </li>
                )}
                {isSpaceOwner && (
                  <li>
                    <button
                      type="button"
                      className="gap-3"
                      onClick={() => {
                        handleOpenSpaceDetail("setting");
                      }}
                    >
                      <Setting className="size-4 opacity-70" />
                      <span className="flex-1 text-left">空间资料</span>
                    </button>
                  </li>
                )}
                {isSpaceOwner && (
                  <li>
                    <button
                      type="button"
                      className="gap-3"
                      disabled={archiveActionDisabled}
                      title={archiveActionDisabledReason ?? archiveActionLabel}
                      onClick={() => {
                        setIsOptionsMenuOpen(false);
                        handleArchiveAction();
                      }}
                    >
                      <ArchiveIcon className="size-4 opacity-70" />
                      <span className="flex-1 text-left">{archiveActionLabel}</span>
                    </button>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    className="gap-3 text-error"
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
                    {isSpaceOwner
                      ? <TrashIcon className="size-4 opacity-80" />
                      : <SignOutIcon className="size-4 opacity-80" />}
                    <span className="flex-1 text-left">
                      {isSpaceOwner ? dissolveActionLabel : leaveActionLabel}
                    </span>
                  </button>
                </li>
                {canResetSidebarTree && (
                  <li>
                    <button
                      type="button"
                      className="gap-3 text-warning"
                      disabled={isResettingSidebarTree}
                      onClick={handleRequestResetSidebarTree}
                    >
                      <ArrowCounterClockwise className="size-4 opacity-80" />
                      <span className="flex-1 text-left">重置侧边树（开发）</span>
                    </button>
                  </li>
                )}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <div className="flex gap-2 shrink-0 mr-2">
          {canInviteMembers && (
            <SpaceHeaderIconButton label="邀请成员" onClick={onInviteMember}>
              <UserPlusIcon className={spaceHeaderIconClassName} weight="regular" />
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
