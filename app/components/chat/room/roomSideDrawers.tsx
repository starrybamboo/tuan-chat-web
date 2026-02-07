import React from "react";
import DocFolderForUser from "@/components/chat/room/drawers/docFolderForUser";
import ExportChatDrawer from "@/components/chat/room/drawers/exportChatDrawer";
import InitiativeList from "@/components/chat/room/drawers/initiativeList";
import RoomUserList from "@/components/chat/room/drawers/roomUserList";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { VaulSideDrawer } from "@/components/common/vaulSideDrawer";

function RoomSideDrawersImpl() {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const userDrawerWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);
  const roleDrawerWidth = useDrawerPreferenceStore(state => state.roleDrawerWidth);
  const docFolderDrawerWidth = useDrawerPreferenceStore(state => state.docFolderDrawerWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const initiativeDrawerWidth = useDrawerPreferenceStore(state => state.initiativeDrawerWidth);
  const setUserDrawerWidth = useDrawerPreferenceStore(state => state.setUserDrawerWidth);
  const setRoleDrawerWidth = useDrawerPreferenceStore(state => state.setRoleDrawerWidth);
  const setDocFolderDrawerWidth = useDrawerPreferenceStore(state => state.setDocFolderDrawerWidth);
  const setExportDrawerWidth = useDrawerPreferenceStore(state => state.setExportDrawerWidth);
  const setInitiativeDrawerWidth = useDrawerPreferenceStore(state => state.setInitiativeDrawerWidth);

  const sidebarPanelClassName = "shadow-none border-l border-base-300";

  return (
    <>
      <VaulSideDrawer
        isOpen={sideDrawerState === "user"}
        width={userDrawerWidth}
        minWidth={240}
        maxWidth={620}
        onWidthChange={setUserDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="User" />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "role"}
        width={roleDrawerWidth}
        minWidth={240}
        maxWidth={620}
        onWidthChange={setRoleDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="Role" />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "export"}
        width={exportDrawerWidth}
        minWidth={280}
        maxWidth={760}
        onWidthChange={setExportDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1">
          <ExportChatDrawer />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "initiative"}
        width={initiativeDrawerWidth}
        minWidth={320}
        maxWidth={760}
        onWidthChange={setInitiativeDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1">
          <InitiativeList />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "docFolder"}
        width={docFolderDrawerWidth}
        minWidth={280}
        maxWidth={760}
        onWidthChange={setDocFolderDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          <DocFolderForUser />
        </div>
      </VaulSideDrawer>

    </>
  );
}

const RoomSideDrawers = React.memo(RoomSideDrawersImpl);
export default RoomSideDrawers;
