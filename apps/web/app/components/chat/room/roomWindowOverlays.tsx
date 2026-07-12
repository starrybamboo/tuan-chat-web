import type { ImportChatRequestMessage } from "@/components/chat/utils/importChatMessageRequestBuilder";
import type { RglImportSourcesLoader, RglLocalAssetsImporter, RglMaterialAssetsImporter, RglRoleAssetsImporter } from "@/components/chat/window/importChatMessagesWindow";

import RoomToastWindows from "@/components/chat/room/roomToastWindows";
import ImportChatMessagesWindow from "@/components/chat/window/importChatMessagesWindow";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

import type { UserRole } from "../../../../api";

type RoomWindowOverlaysProps = {
  isImportChatTextOpen: boolean;
  setIsImportChatTextOpen: (isOpen: boolean) => void;
  availableRoles: UserRole[];
  importInitialRawText?: string;
  loadRglImportSources?: RglImportSourcesLoader;
  onImportRglLocalAssets?: RglLocalAssetsImporter;
  onImportRglMaterialAssets?: RglMaterialAssetsImporter;
  onImportRglRoleAssets?: RglRoleAssetsImporter;
  onImportChatText: (items: ImportChatRequestMessage[], onProgress?: (sent: number, total: number) => void) => Promise<void>;
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
  loadRglImportSources,
  onImportRglLocalAssets,
  onImportRglMaterialAssets,
  onImportRglRoleAssets,
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
        disableScroll
        panelClassName="overflow-hidden rounded-2xl border border-base-300 p-0 shadow-2xl"
        bodyClassName="overflow-hidden"
      >
        <ImportChatMessagesWindow
          availableRoles={availableRoles}
          initialRawText={importInitialRawText}
          loadRglImportSources={loadRglImportSources}
          onImportRglLocalAssets={onImportRglLocalAssets}
          onImportRglMaterialAssets={onImportRglMaterialAssets}
          onImportRglRoleAssets={onImportRglRoleAssets}
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
