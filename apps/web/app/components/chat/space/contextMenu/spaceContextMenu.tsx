import { useRouter } from "@tanstack/react-router";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { SpaceContext } from "@/components/chat/core/spaceContext";
import { getSpaceArchiveActionDisabledReason } from "@/components/chat/space/spaceArchiveActionPolicy";
import ConfirmModal from "@/components/common/comfirmModel";

import { useDissolveSpaceMutation, useExitSpaceMutation, useRecoverSpaceMutation, useUpdateSpaceArchiveStatusMutation } from "../../../../../api/hooks/chatQueryHooks";

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
    toast.loading(nextArchived ? "正在归档空间..." : "正在恢复编辑...", { id: toastId });
    try {
      if (nextArchived) {
        const { prepareSpaceDocsForArchive } = await import("@/components/chat/infra/doc/space/prepareSpaceDocsForArchive");
        await prepareSpaceDocsForArchive(spaceId);
        await updateArchiveStatus.mutateAsync({ spaceId, archived: true });
      }
      else {
        await recoverSpace.mutateAsync({ spaceId });
      }
      toast.success(nextArchived ? "归档完成" : "已恢复编辑", { id: toastId });
      onClose();
    }
    catch {
      toast.error(nextArchived ? "归档失败，请重试" : "恢复编辑失败，请重试", { id: toastId });
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
                    <li
                      className="relative group text-error"
                      onClick={() => {
                        handleDissolve();
                      }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span>解散空间</span>
                      </div>
                    </li>
                  </>
                )
              : (
                  <li
                    className="relative group"
                    onClick={() => {
                      handleExit(contextMenu.spaceId);
                    }}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span>退出空间</span>
                    </div>
                  </li>
                )}
          </ul>
        </div>
      )}

      <ConfirmModal
        isOpen={isDissolveConfirmOpen}
        onClose={() => {
          setIsDissolveConfirmOpen(false);
          setDissolveTargetSpaceId(null);
        }}
        title="确认解散空间"
        message="是否确定要解散该空间？此操作不可逆。"
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
    </>
  );
}
