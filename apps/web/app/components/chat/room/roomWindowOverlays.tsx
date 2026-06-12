import type { UserRole } from "../../../../api";
import type { FigurePosition } from "@/types/voiceRenderTypes";

import RoomToastWindows from "@/components/chat/room/roomToastWindows";
import ImportChatMessagesWindow from "@/components/chat/window/importChatMessagesWindow";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

interface RoomWindowOverlaysProps {
  isImportChatTextOpen: boolean;
  setIsImportChatTextOpen: (isOpen: boolean) => void;
  availableRoles: UserRole[];
  importInitialRawText?: string;
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
}

export default function RoomWindowOverlays({
  isImportChatTextOpen,
  setIsImportChatTextOpen,
  availableRoles,
  importInitialRawText,
  onImportChatText,
  onOpenRoleAddWindow,
  onOpenNpcAddWindow,
  isRoleHandleOpen,
  setIsRoleAddWindowOpen,
  handleAddRole,
  isNpcRoleHandleOpen,
  setIsNpcRoleAddWindowOpen,
  handleAddNpcRole,
}: RoomWindowOverlaysProps) {
  return (
    <>
      <ToastWindow
        isOpen={isImportChatTextOpen}
        onClose={() => setIsImportChatTextOpen(false)}
        showCloseButton={false}
        disableScroll
        panelClassName="overflow-hidden rounded-2xl border border-base-300 p-0 shadow-2xl"
        bodyClassName="overflow-hidden"
      >
        <ImportChatMessagesWindow
          availableRoles={availableRoles}
          initialRawText={importInitialRawText}
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
      />
    </>
  );
}
