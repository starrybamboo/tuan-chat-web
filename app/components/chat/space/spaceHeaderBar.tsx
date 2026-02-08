import { ArchiveIcon, HouseIcon } from "@phosphor-icons/react";
import React from "react";
import toast from "react-hot-toast";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { AddIcon, ChevronDown, DiceD6Icon, MapPlaceHolderIcon, MemberIcon, Setting, SidebarSimpleIcon } from "@/icons";
import { useUpdateSpaceArchiveStatusMutation } from "../../../../api/hooks/chatQueryHooks";

export type SpaceDetailTab = "members" | "workflow" | "trpg" | "setting";

interface SpaceHeaderBarProps {
  spaceName?: string;
  isArchived?: boolean;
  isSpaceOwner: boolean;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab) => void;
  onInviteMember: () => void;
  onToggleLeftDrawer?: () => void;
  isLeftDrawerOpen?: boolean;
}

export default function SpaceHeaderBar({ spaceName, isArchived, isSpaceOwner, onOpenSpaceDetailPanel, onInviteMember, onToggleLeftDrawer, isLeftDrawerOpen }: SpaceHeaderBarProps) {
  const spaceContext = React.use(SpaceContext);
  const spaceId = Number(spaceContext.spaceId ?? -1);
  const updateArchiveStatus = useUpdateSpaceArchiveStatusMutation();
  const archived = Boolean(isArchived);
  const archiveActionLabel = updateArchiveStatus.isPending
    ? (archived ? "取消归档中..." : "归档中...")
    : (archived ? "取消归档" : "归档空间");
  const leftDrawerLabel = isLeftDrawerOpen ? "收起侧边栏" : "展开侧边栏";

  return (
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
                onOpenSpaceDetailPanel("members");
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
                onOpenSpaceDetailPanel("workflow");
              }}
            >
              <MapPlaceHolderIcon className="size-4 opacity-70" />
              <span className="flex-1 text-left">流程图</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="gap-3"
              onClick={() => {
                onOpenSpaceDetailPanel("trpg");
              }}
            >
              <DiceD6Icon className="size-4 opacity-70" />
              <span className="flex-1 text-left">跑团设置</span>
            </button>
          </li>
          {isSpaceOwner && (
            <li>
              <button
                type="button"
                className="gap-3"
                onClick={() => {
                  onOpenSpaceDetailPanel("setting");
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
                onClick={() => {
                  if (spaceId > 0) {
                    const nextArchived = !archived;
                    const toastId = `space-archive-${spaceId}`;
                    toast.loading(nextArchived ? "正在归档空间..." : "正在取消归档...", { id: toastId });
                    updateArchiveStatus.mutate(
                      { spaceId, archived: nextArchived },
                      {
                        onSuccess: () => {
                          toast.success(nextArchived ? "归档完成" : "已取消归档", { id: toastId });
                        },
                        onError: () => {
                          toast.error(nextArchived ? "归档失败，请重试" : "取消归档失败，请重试", { id: toastId });
                        },
                      },
                    );
                  }
                }}
              >
                <ArchiveIcon className="size-4 opacity-70" />
                <span className="flex-1 text-left">{archiveActionLabel}</span>
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
  );
}
