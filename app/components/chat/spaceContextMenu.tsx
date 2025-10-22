import { useDissolveSpaceMutation, useExitSpaceMutation } from "api/hooks/chatQueryHooks";
import React from "react";

interface SpaceContextMenuProps {
  contextMenu: { x: number; y: number; spaceId: number } | null;
  isSpaceOwner: boolean;
  onClose: () => void;
}

export default function SpaceContextMenu({ contextMenu, isSpaceOwner, onClose }: SpaceContextMenuProps) {
  const dissolveSpace = useDissolveSpaceMutation();
  const exitSpace = useExitSpaceMutation();

  if (!contextMenu)
    return null;

  const handleDissolve = () => {
    dissolveSpace.mutate(contextMenu.spaceId, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleExit = () => {
    exitSpace.mutate(contextMenu.spaceId, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <div
      className="fixed bg-base-100 shadow-lg rounded-md z-40"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={e => e.stopPropagation()}
    >
      <ul className="menu p-2 w-40">
        {isSpaceOwner
          ? (
              <li className="text-error" onClick={() => { handleDissolve(); }}>
                解散空间
              </li>
            )
          : (
              <li onClick={() => { handleExit(); }}>
                退出空间
              </li>
            )}
      </ul>
    </div>
  );
}
