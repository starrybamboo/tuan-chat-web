import { useRouter } from "@tanstack/react-router";
import React, { useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import { SpaceContext } from "@/components/chat/core/spaceContext";
import { getSpaceArchiveActionDisabledReason } from "@/components/chat/space/spaceArchiveActionPolicy";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

import { useDissolveSpaceMutation, useExitSpaceMutation, useGetSpaceInfoQuery, useRecoverSpaceMutation, useUpdateSpaceArchiveStatusMutation } from "../../../../../api/hooks/chatQueryHooks";

export type SpaceContextMenuProps = {
  contextMenu: { x: number; y: number; spaceId: number } | null;
  isSpaceOwner: boolean;
  isArchived: boolean;
  onClose: () => void;
}

export default function SpaceContextMenu({ contextMenu, isSpaceOwner, isArchived, onClose }: SpaceContextMenuProps) {
  const router = useRouter();
  const spaceContext = React.use(SpaceContext);

  const dissolveSpace = useDissolveSpaceMutation();
  const exitSpace = useExitSpaceMutation();
  const updateArchiveStatus = useUpdateSpaceArchiveStatusMutation();
  const recoverSpace = useRecoverSpaceMutation();
  const archiveActionPending = updateArchiveStatus.isPending || recoverSpace.isPending;
  const archiveActionLabel = isArchived
    ? (recoverSpace.isPending ? "恢复中..." : "恢复编辑")
    : (updateArchiveStatus.isPending ? "归档中..." : "归档空间");
  const archiveActionDisabledReason = getSpaceArchiveActionDisabledReason({
    spaceId: contextMenu?.spaceId ?? -1,
    isArchived,
    isPending: archiveActionPending,
  });
  const archiveActionDisabled = archiveActionDisabledReason != null;

  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = useState(false);
  const [dissolveTargetSpaceId, setDissolveTargetSpaceId] = useState<number | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [archiveTargetSpaceId, setArchiveTargetSpaceId] = useState<number | null>(null);

  // 取目标空间名称，用于解散/退出菜单项与确认弹窗的文案（菜单打开时用 contextMenu，确认弹窗打开时用暂存的目标 ID）
  const displaySpaceId = contextMenu?.spaceId ?? dissolveTargetSpaceId ?? -1;
  const displaySpaceInfoQuery = useGetSpaceInfoQuery(displaySpaceId);
  const displaySpaceName = displaySpaceInfoQuery.data?.data?.name;
  const displaySpaceLabel = displaySpaceName
    ? `「${displaySpaceName}」（空间 ID ${displaySpaceId}）`
    : `空间 ID ${displaySpaceId}`;

  if (!contextMenu && !isDissolveConfirmOpen && !isArchiveConfirmOpen)
    return null;

  const handleDissolve = () => {
    if (!contextMenu)
      return;
    setDissolveTargetSpaceId(contextMenu.spaceId);
    setIsDissolveConfirmOpen(true);
    onClose();
  };

  const handleExit = (spaceId: number) => {
    exitSpace.mutate(spaceId, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleToggleArchive = async (spaceId: number, nextArchived: boolean) => {
    if (getSpaceArchiveActionDisabledReason({
      spaceId,
      isArchived: !nextArchived,
      isPending: archiveActionPending,
    }) != null) {
      return;
    }
    const toastId = `space-archive-${spaceId}`;
    appToast.loading(nextArchived ? "正在归档空间..." : "正在恢复编辑...", { id: toastId });
    try {
      if (nextArchived) {
        const { prepareSpaceDocsForArchive } = await import("@/components/chat/infra/doc/space/prepareSpaceDocsForArchive");
        await prepareSpaceDocsForArchive(spaceId);
        await updateArchiveStatus.mutateAsync({ spaceId, archived: true });
      }
      else {
        await recoverSpace.mutateAsync({ spaceId });
      }
      appToast.success(nextArchived ? "归档完成" : "已恢复编辑", { id: toastId });
      onClose();
    }
    catch {
      appToast.error(nextArchived ? "归档失败，请重试" : "恢复编辑失败，请重试", { id: toastId });
    }
  };

  const handleArchiveAction = (spaceId: number) => {
    if (getSpaceArchiveActionDisabledReason({
      spaceId,
      isArchived,
      isPending: archiveActionPending,
    }) != null) {
      return;
    }
    const nextArchived = !isArchived;
    if (nextArchived) {
      setArchiveTargetSpaceId(spaceId);
      setIsArchiveConfirmOpen(true);
      onClose();
      return;
    }
    void handleToggleArchive(spaceId, nextArchived);
  };

  return (
    <>
      {contextMenu && (
        <div
          className="
            fixed bg-base-100 shadow-lg rounded-md z-40 border border-base-300
          "
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <ul className="menu p-2 w-50">
            {isSpaceOwner
              ? (
                  <>
                    <li
                      className={`
                        relative group
                        ${archiveActionDisabled ? `
                          opacity-60 cursor-not-allowed
                        ` : ""}
                      `}
                      aria-disabled={archiveActionDisabled}
                      title={archiveActionDisabledReason ?? archiveActionLabel}
                      onClick={() => {
                        handleArchiveAction(contextMenu.spaceId);
                      }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span>{archiveActionLabel}</span>
                      </div>
                    </li>
                    <li className="relative group text-error">
                      <button
                        type="button"
                        className="flex justify-between items-center w-full text-error"
                        aria-label={`解散空间 ${displaySpaceLabel}`}
                        onClick={() => {
                          handleDissolve();
                        }}
                      >
                        <span>解散空间</span>
                      </button>
                    </li>
                  </>
                )
              : (
                  <li className="relative group">
                    <button
                      type="button"
                      className="flex justify-between items-center w-full"
                      aria-label={`退出空间 ${displaySpaceLabel}`}
                      onClick={() => {
                        handleExit(contextMenu.spaceId);
                      }}
                    >
                      <span>退出空间</span>
                    </button>
                  </li>
                )}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={isDissolveConfirmOpen}
        onOpenChange={() => {
          setIsDissolveConfirmOpen(false);
          setDissolveTargetSpaceId(null);
        }}
        title="确认解散空间"
        description={`是否确定要解散${displaySpaceLabel}？此操作不可逆，空间内的所有房间、成员与内容将无法恢复。`}
        onConfirm={() => {
          if (dissolveTargetSpaceId == null)
            return;

          dissolveSpace.mutate(dissolveTargetSpaceId, {
            onSuccess: () => {
              setIsDissolveConfirmOpen(false);
              setDissolveTargetSpaceId(null);

              if (typeof window !== "undefined") {
                localStorage.removeItem("storedChatIds");
              }

              // 如果解散的是当前空间，主动清空 activeSpace 并回到发现页默认入口。
              if (spaceContext?.spaceId && Number(spaceContext.spaceId) === dissolveTargetSpaceId) {
                spaceContext.setActiveSpaceId?.(null);
                spaceContext.setActiveRoomId?.(null);
              }

              router.history.replace("/chat/discover/material");
            },
          });
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
    </>
  );
}
