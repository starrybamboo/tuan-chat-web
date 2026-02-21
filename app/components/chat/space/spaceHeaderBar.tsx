import type { SpaceDetailTab } from "@/components/chat/chatPage.types";
import { ArchiveIcon, ArrowCounterClockwise, HouseIcon, PlusIcon } from "@phosphor-icons/react";
import React from "react";
import toast from "react-hot-toast";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import ConfirmModal from "@/components/common/comfirmModel";
import { AddIcon, ChevronDown, DiceD6Icon, MemberIcon, Setting, SidebarSimpleIcon, WebgalIcon } from "@/icons";
import { useUpdateSpaceArchiveStatusMutation } from "../../../../api/hooks/chatQueryHooks";

interface SpaceHeaderBarProps {
  spaceName?: string;
  isArchived?: boolean;
  isSpaceOwner: boolean;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab) => void;
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
  const spaceContext = React.use(SpaceContext);
  const spaceId = Number(spaceContext.spaceId ?? -1);
  const updateArchiveStatus = useUpdateSpaceArchiveStatusMutation();
  const archived = Boolean(isArchived);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = React.useState(false);
  const [archiveTargetSpaceId, setArchiveTargetSpaceId] = React.useState<number | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [isResettingSidebarTree, setIsResettingSidebarTree] = React.useState(false);
  const isDevOrTest = Boolean(import.meta.env?.DEV) || import.meta.env.MODE === "test";
  const archiveActionLabel = updateArchiveStatus.isPending
    ? (archived ? "取消归档中..." : "归档中...")
    : (archived ? "取消归档" : "归档空间");
  const leftDrawerLabel = isLeftDrawerOpen ? "收起侧边栏" : "展开侧边栏";
  const canResetSidebarTree = isDevOrTest && isSpaceOwner && Boolean(onResetSidebarTreeToDefault);

  const handleToggleArchive = (targetSpaceId: number, nextArchived: boolean) => {
    if (updateArchiveStatus.isPending) {
      return;
    }
    const toastId = `space-archive-${targetSpaceId}`;
    toast.loading(nextArchived ? "正在归档空间..." : "正在取消归档...", { id: toastId });
    updateArchiveStatus.mutate(
      { spaceId: targetSpaceId, archived: nextArchived },
      {
        onSuccess: () => {
          toast.success(nextArchived ? "归档完成" : "已取消归档", { id: toastId });
        },
        onError: () => {
          toast.error(nextArchived ? "归档失败，请重试" : "取消归档失败，请重试", { id: toastId });
        },
      },
    );
  };

  const handleArchiveAction = () => {
    if (spaceId <= 0 || updateArchiveStatus.isPending) {
      return;
    }
    const nextArchived = !archived;
    if (nextArchived) {
      setArchiveTargetSpaceId(spaceId);
      setIsArchiveConfirmOpen(true);
      return;
    }
    handleToggleArchive(spaceId, nextArchived);
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
            <li>
              <button
                type="button"
                className="gap-3"
                onClick={() => {
                  handleOpenSpaceDetail("members");
                }}
              >
                <MemberIcon className="size-4 opacity-70" />
                <span className="flex-1 text-left">群成员</span>
              </button>
            </li>
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
                  disabled={spaceId <= 0 || updateArchiveStatus.isPending}
                  onClick={handleArchiveAction}
                >
                  <ArchiveIcon className="size-4 opacity-70" />
                  <span className="flex-1 text-left">{archiveActionLabel}</span>
                </button>
              </li>
            )}
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
        </div>
      </div>
      <ConfirmModal
        isOpen={isArchiveConfirmOpen}
        onClose={() => {
          setIsArchiveConfirmOpen(false);
          setArchiveTargetSpaceId(null);
        }}
        title="确认归档空间"
        message="归档后空间将进入只读状态，可在之后取消归档。是否继续？"
        confirmText="确认归档"
        variant="warning"
        onConfirm={() => {
          if (archiveTargetSpaceId == null) {
            return;
          }
          const targetSpaceId = archiveTargetSpaceId;
          setIsArchiveConfirmOpen(false);
          setArchiveTargetSpaceId(null);
          handleToggleArchive(targetSpaceId, true);
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
