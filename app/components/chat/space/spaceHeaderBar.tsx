import type { OpenSpaceDetailPanelOptions, SpaceDetailTab } from "@/components/chat/chatPage.types";
import { AddressBookIcon, ArchiveIcon, ArrowCounterClockwise, HouseIcon, PlusIcon, SignOutIcon, TrashIcon } from "@phosphor-icons/react";
import React from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { prepareSpaceDocsForArchive } from "@/components/chat/infra/blocksuite/space/prepareSpaceDocsForArchive";
import { canInviteSpectators } from "@/components/chat/utils/memberPermissions";
import { canViewSpaceDetailTab } from "@/components/chat/utils/spaceDetailPermissions";
import ConfirmModal from "@/components/common/comfirmModel";
import { AddIcon, ChevronDown, DiceD6Icon, MemberIcon, Setting, SidebarSimpleIcon, WebgalIcon } from "@/icons";
import { useDissolveSpaceMutation, useExitSpaceMutation, useRecoverSpaceMutation, useUpdateSpaceArchiveStatusMutation } from "../../../../api/hooks/chatQueryHooks";

interface SpaceHeaderBarProps {
  spaceName?: string;
  isArchived?: boolean;
  isSpaceOwner: boolean;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab, options?: OpenSpaceDetailPanelOptions) => void;
  onCloseLeftDrawer?: () => void;
  onAddCategory?: () => void;
  onResetSidebarTreeToDefault?: () => void | Promise<void>;
  onInviteMember: () => void;
  onToggleLeftDrawer?: () => void;
  isLeftDrawerOpen?: boolean;
}

export default function SpaceHeaderBar({
  spaceName,
  isArchived,
  isSpaceOwner,
  onOpenSpaceDetailPanel,
  onCloseLeftDrawer,
  onAddCategory,
  onResetSidebarTreeToDefault,
  onInviteMember,
  onToggleLeftDrawer,
  isLeftDrawerOpen,
}: SpaceHeaderBarProps) {
  const navigate = useNavigate();
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
  const isDevOrTest = Boolean(import.meta.env?.DEV) || import.meta.env.MODE === "test";
  const archiveActionPending = updateArchiveStatus.isPending || recoverSpace.isPending;
  const archiveActionLabel = archived
    ? (recoverSpace.isPending ? "恢复中..." : "恢复编辑")
    : (updateArchiveStatus.isPending ? "归档中..." : "归档空间");
  const leftDrawerLabel = isLeftDrawerOpen ? "收起侧边栏" : "展开侧边栏";
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
    navigate("/chat/discover/material", { replace: true });
  }, [navigate, spaceContext]);

  const cleanupDissolvedSpaceDoc = React.useCallback(async (targetSpaceId: number) => {
    // 解散空间会级联解散房间；这里额外清理空间描述文档，避免本地残留引用。
    if (typeof window === "undefined") {
      return;
    }
    try {
      const [{ deleteSpaceDoc }, { buildSpaceDocId }] = await Promise.all([
        import("@/components/chat/infra/blocksuite/space/deleteSpaceDoc"),
        import("@/components/chat/infra/blocksuite/space/spaceDocId"),
      ]);
      await deleteSpaceDoc({
        spaceId: targetSpaceId,
        docId: buildSpaceDocId({ kind: "space_description", spaceId: targetSpaceId }),
      });
    }
    catch {
      // ignore
    }
  }, []);

  const handleToggleArchive = async (targetSpaceId: number, nextArchived: boolean) => {
    if (archiveActionPending) {
      return;
    }
    const toastId = `space-archive-${targetSpaceId}`;
    toast.loading(nextArchived ? "正在归档空间..." : "正在恢复编辑...", { id: toastId });
    try {
      if (nextArchived) {
        await prepareSpaceDocsForArchive(targetSpaceId);
        await updateArchiveStatus.mutateAsync({ spaceId: targetSpaceId, archived: true });
      }
      else {
        await recoverSpace.mutateAsync({ spaceId: targetSpaceId });
      }
      toast.success(nextArchived ? "归档完成" : "已恢复编辑", { id: toastId });
    }
    catch {
      toast.error(nextArchived ? "归档失败，请重试" : "恢复编辑失败，请重试", { id: toastId });
    }
  };

  const handleArchiveAction = () => {
    if (spaceId <= 0 || archiveActionPending) {
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
    toast.loading("正在解散空间...", { id: toastId });
    try {
      await dissolveSpace.mutateAsync(targetSpaceId);
      await cleanupDissolvedSpaceDoc(targetSpaceId);
      clearCurrentSpaceSelection();
      toast.success("空间已解散", { id: toastId });
    }
    catch {
      toast.error("解散空间失败，请重试", { id: toastId });
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
    toast.loading("正在退出空间...", { id: toastId });
    try {
      await exitSpace.mutateAsync(targetSpaceId);
      clearCurrentSpaceSelection();
      toast.success("已退出空间", { id: toastId });
    }
    catch {
      toast.error("退出空间失败，请重试", { id: toastId });
    }
  };

  const handleOpenSpaceDetail = (tab: SpaceDetailTab) => {
    onOpenSpaceDetailPanel(tab);
    onCloseLeftDrawer?.();
  };

  const handleRequestResetSidebarTree = () => {
    if (!onResetSidebarTreeToDefault || isResettingSidebarTree) {
      return;
    }
    setIsResetConfirmOpen(true);
  };

  const handleConfirmResetSidebarTree = async () => {
    if (!onResetSidebarTreeToDefault || isResettingSidebarTree) {
      return;
    }
    setIsResetConfirmOpen(false);
    setIsResettingSidebarTree(true);
    const toastId = "space-sidebar-tree-reset";
    toast.loading("正在重置侧边树...", { id: toastId });
    try {
      await onResetSidebarTreeToDefault();
      toast.success("侧边树已重置为默认结构", { id: toastId });
    }
    catch (error) {
      console.error("[SidebarTree] reset to default failed", error);
      toast.error("重置侧边树失败，请重试", { id: toastId });
    }
    finally {
      setIsResettingSidebarTree(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between h-10 gap-2 min-w-0 border-b border-gray-300 dark:border-gray-700 rounded-tl-xl px-2">
        <div className="dropdown dropdown-bottom min-w-0">
          <button
            type="button"
            tabIndex={0}
            className="btn btn-ghost btn-sm px-0 min-w-0 gap-2 justify-start rounded-lg w-full"
            aria-label="空间选项"
          >
            <HouseIcon className="size-4 opacity-70 inline-block" weight="fill" />
            <span className="text-base font-bold truncate leading-none min-w-0 flex-1 text-left">
              {spaceName}
            </span>
            {archived && (
              <span className="badge badge-sm">已归档</span>
            )}
            <ChevronDown className="size-4 opacity-60 shrink-0" />
          </button>
          <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box shadow-xl border border-base-300 z-40 w-56 p-2">
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
            {isSpaceOwner && onAddCategory && (
              <li>
                <button
                  type="button"
                  className="gap-3"
                  onClick={onAddCategory}
                >
                  <PlusIcon className="size-4 opacity-70" weight="bold" />
                  <span className="flex-1 text-left">新增分类</span>
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
                  disabled={spaceId <= 0 || archiveActionPending}
                  onClick={handleArchiveAction}
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
                onClick={isSpaceOwner ? handleRequestDissolveSpace : handleRequestExitSpace}
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
          </ul>
        </div>
        <div className="flex gap-2 shrink-0 mr-2">
          {onToggleLeftDrawer && (
            <div className="tooltip tooltip-bottom" data-tip={leftDrawerLabel}>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square hover:text-info"
                onClick={onToggleLeftDrawer}
                aria-label={leftDrawerLabel}
                aria-pressed={Boolean(isLeftDrawerOpen)}
              >
                <SidebarSimpleIcon />
              </button>
            </div>
          )}
          {canInviteMembers && (
            <div className="tooltip tooltip-bottom" data-tip="邀请成员">
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square hover:text-info"
                onClick={onInviteMember}
                aria-label="邀请成员"
              >
                <AddIcon />
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={isDissolveConfirmOpen}
        onClose={() => {
          if (dissolveSpace.isPending) {
            return;
          }
          setIsDissolveConfirmOpen(false);
          setDissolveTargetSpaceId(null);
        }}
        title="确认解散空间"
        message="是否确定要解散当前空间？此操作不可逆。"
        confirmText="确认解散"
        variant="danger"
        onConfirm={() => {
          void handleConfirmDissolveSpace();
        }}
      />
      <ConfirmModal
        isOpen={isExitConfirmOpen}
        onClose={() => {
          if (exitSpace.isPending) {
            return;
          }
          setIsExitConfirmOpen(false);
          setExitTargetSpaceId(null);
        }}
        title="确认退出空间"
        message="退出后你将离开当前空间，需要重新加入后才能继续访问。是否继续？"
        confirmText="确认退出"
        variant="danger"
        onConfirm={() => {
          void handleConfirmExitSpace();
        }}
      />
      <ConfirmModal
        isOpen={isArchiveConfirmOpen}
        onClose={() => {
          setIsArchiveConfirmOpen(false);
          setArchiveTargetSpaceId(null);
        }}
        title="确认归档空间"
        message="归档后空间将进入只读状态，可在之后恢复编辑。是否继续？"
        confirmText="确认归档"
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
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => {
          if (isResettingSidebarTree) {
            return;
          }
          setIsResetConfirmOpen(false);
        }}
        title="确认重置侧边树"
        message="开发者操作：将左侧分类树重置为默认结构。是否继续？"
        confirmText="确认重置"
        variant="warning"
        onConfirm={() => {
          void handleConfirmResetSidebarTree();
        }}
      />
    </>
  );
}
