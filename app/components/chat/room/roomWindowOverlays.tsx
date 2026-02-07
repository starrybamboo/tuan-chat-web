import type { UserRole } from "../../../../api";
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
      figurePosition?: string;
    }>,
    onProgress?: (sent: number, total: number) => void,
  ) => Promise<void>;
  onOpenRoleAddWindow: () => void;

  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (isOpen: boolean) => void;
  handleAddRole: (roleId: number) => Promise<void> | void;
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
  isRoleHandleOpen,
  setIsRoleAddWindowOpen,
  handleAddRole,
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
        />
      </ToastWindow>

      <RoomToastWindows
        isRoleHandleOpen={isRoleHandleOpen}
        setIsRoleAddWindowOpen={setIsRoleAddWindowOpen}
        handleAddRole={handleAddRole}
        isRenderWindowOpen={isRenderWindowOpen}
        setIsRenderWindowOpen={setIsRenderWindowOpen}
      />
    </>
  );
}
