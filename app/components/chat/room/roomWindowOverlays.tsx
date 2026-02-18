import type { UserRole } from "../../../../api";
import type { FigurePosition } from "@/types/voiceRenderTypes";
import React from "react";

import RoomToastWindows from "@/components/chat/room/roomToastWindows";
import ImportChatMessagesWindow from "@/components/chat/window/importChatMessagesWindow";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

interface RoomWindowOverlaysProps {
  isImportChatTextOpen: boolean;
  setIsImportChatTextOpen: (isOpen: boolean) => void;
  isKP: boolean;
  availableRoles: UserRole[];
  onImportChatText: (
    items: Array<{
      roleId: number;
      content: string;
      speakerName?: string;
      figurePosition?: Exclude<FigurePosition, undefined>;
    }>,
    onProgress?: (sent: number, total: number) => void,
  ) => Promise<void>;
  onOpenRoleAddWindow: () => void;
  onOpenNpcAddWindow?: () => void;

  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (isOpen: boolean) => void;
  handleAddRole: (roleId: number) => Promise<void> | void;
  isNpcRoleHandleOpen: boolean;
  setIsNpcRoleAddWindowOpen: (isOpen: boolean) => void;
  handleAddNpcRole: (roleId: number) => Promise<void> | void;
  isRenderWindowOpen: boolean;
  setIsRenderWindowOpen: (isOpen: boolean) => void;
}

export default function RoomWindowOverlays({
  isImportChatTextOpen,
  setIsImportChatTextOpen,
  isKP,
  availableRoles,
  onImportChatText,
  onOpenRoleAddWindow,
  onOpenNpcAddWindow,
  isRoleHandleOpen,
  setIsRoleAddWindowOpen,
  handleAddRole,
  isNpcRoleHandleOpen,
  setIsNpcRoleAddWindowOpen,
  handleAddNpcRole,
  isRenderWindowOpen,
  setIsRenderWindowOpen,
}: RoomWindowOverlaysProps) {
  return (
    <>
      <ToastWindow
        isOpen={isImportChatTextOpen}
        onClose={() => setIsImportChatTextOpen(false)}
      >
        <ImportChatMessagesWindow
          isKP={isKP}
          availableRoles={availableRoles}
          onImport={onImportChatText}
          onClose={() => setIsImportChatTextOpen(false)}
          onOpenRoleAddWindow={onOpenRoleAddWindow}
          onOpenNpcAddWindow={onOpenNpcAddWindow}
        />
      </ToastWindow>

      <RoomToastWindows
        isRoleHandleOpen={isRoleHandleOpen}
        setIsRoleAddWindowOpen={setIsRoleAddWindowOpen}
        handleAddRole={handleAddRole}
        isNpcRoleHandleOpen={isNpcRoleHandleOpen}
        setIsNpcRoleAddWindowOpen={setIsNpcRoleAddWindowOpen}
        handleAddNpcRole={handleAddNpcRole}
        isRenderWindowOpen={isRenderWindowOpen}
        setIsRenderWindowOpen={setIsRenderWindowOpen}
      />
    </>
  );
}
