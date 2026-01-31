import type { UserRole } from "../../../../api";
import React from "react";

import RoomPopWindows from "@/components/chat/room/roomPopWindows";
import ImportChatMessagesWindow from "@/components/chat/window/importChatMessagesWindow";
import { PopWindow } from "@/components/common/popWindow";

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
    onProgress: (progress: number) => void,
  ) => Promise<void> | void;
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
      <PopWindow
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
      </PopWindow>

      <RoomPopWindows
        isRoleHandleOpen={isRoleHandleOpen}
        setIsRoleAddWindowOpen={setIsRoleAddWindowOpen}
        handleAddRole={handleAddRole}
        isRenderWindowOpen={isRenderWindowOpen}
        setIsRenderWindowOpen={setIsRenderWindowOpen}
      />
    </>
  );
}
