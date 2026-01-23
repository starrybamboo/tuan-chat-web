import React, { useState } from "react";
import { useNavigate } from "react-router";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import ConfirmModal from "@/components/common/comfirmModel";
import { useDissolveSpaceMutation, useExitSpaceMutation, useUpdateSpaceArchiveStatusMutation } from "../../../../../api/hooks/chatQueryHooks";

interface SpaceContextMenuProps {
  contextMenu: { x: number; y: number; spaceId: number } | null;
  isSpaceOwner: boolean;
  isArchived: boolean;
  onClose: () => void;
}

export default function SpaceContextMenu({ contextMenu, isSpaceOwner, isArchived, onClose }: SpaceContextMenuProps) {
  const navigate = useNavigate();
  const spaceContext = React.use(SpaceContext);

  const dissolveSpace = useDissolveSpaceMutation();
  const exitSpace = useExitSpaceMutation();
  const updateArchiveStatus = useUpdateSpaceArchiveStatusMutation();

  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = useState(false);
  const [dissolveTargetSpaceId, setDissolveTargetSpaceId] = useState<number | null>(null);

  if (!contextMenu && !isDissolveConfirmOpen)
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

  const handleToggleArchive = (spaceId: number, nextArchived: boolean) => {
    updateArchiveStatus.mutate({ spaceId, archived: nextArchived }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <>
      {contextMenu && (
        <div
          className="fixed bg-base-100 shadow-lg rounded-md z-40 border border-base-300"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <ul className="menu p-2 w-50">
            {isSpaceOwner
              ? (
                  <>
                    <li
                      className="relative group"
                      onClick={() => {
                        handleToggleArchive(contextMenu.spaceId, !isArchived);
                      }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span>{isArchived ? "取消归档" : "归档空间"}</span>
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

              // 解散空间会级联解散房间（房间文档会通过 ROOM_DISSOLVE 推送逐个清理）。
              // 这里额外清理空间自身的描述文档，避免 @ 弹窗仍展示已删除空间的 doc。
              if (typeof window !== "undefined") {
                const target = dissolveTargetSpaceId;
                void (async () => {
                  try {
                    const { deleteSpaceDoc } = await import("@/components/chat/infra/blocksuite/deleteSpaceDoc");
                    await deleteSpaceDoc({
                      spaceId: target,
                      docId: buildSpaceDocId({ kind: "space_description", spaceId: target }),
                    });
                  }
                  catch {
                    // ignore
                  }
                })();
              }

              if (typeof window !== "undefined") {
                localStorage.removeItem("storedChatIds");
              }

              // 如果解散的是当前空间，主动清空 activeSpace 并回到 /chat。
              if (spaceContext?.spaceId && Number(spaceContext.spaceId) === dissolveTargetSpaceId) {
                spaceContext.setActiveSpaceId?.(null);
                spaceContext.setActiveRoomId?.(null);
              }

              navigate("/chat/private", { replace: true });
            },
          });
        }}
      />
    </>
  );
}
