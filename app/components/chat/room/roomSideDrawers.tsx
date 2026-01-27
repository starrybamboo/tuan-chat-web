import type { ClueMessage } from "../../../../api/models/ClueMessage";
import React from "react";
import ClueListForPL from "@/components/chat/room/drawers/clueListForPL";
import DocFolderForUser from "@/components/chat/room/drawers/docFolderForUser";
import ExportChatDrawer from "@/components/chat/room/drawers/exportChatDrawer";
import InitiativeList from "@/components/chat/room/drawers/initiativeList";
import RoomUserList from "@/components/chat/room/drawers/roomUserList";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { VaulSideDrawer } from "@/components/common/vaulSideDrawer";

interface RoomSideDrawersProps {
  onClueSend: (clue: ClueMessage) => void;
}

function RoomSideDrawersImpl({ onClueSend }: RoomSideDrawersProps) {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const setExportDrawerWidth = useDrawerPreferenceStore(state => state.setExportDrawerWidth);
  const roomSidebarWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);
  const setRoomSidebarWidth = useDrawerPreferenceStore(state => state.setUserDrawerWidth);

  const defaultDrawerMinWidth = 240;
  const defaultDrawerMaxWidth = 480;
  const docFolderDrawerWidth = 320;
  const sidebarPanelClassName = "shadow-none border-l border-base-300";

  return (
    <>
      <VaulSideDrawer
        isOpen={sideDrawerState === "user"}
        width={roomSidebarWidth}
        minWidth={defaultDrawerMinWidth}
        maxWidth={defaultDrawerMaxWidth}
        onWidthChange={setRoomSidebarWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="User" />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "role"}
        width={roomSidebarWidth}
        minWidth={defaultDrawerMinWidth}
        maxWidth={defaultDrawerMaxWidth}
        onWidthChange={setRoomSidebarWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="Role" />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "export"}
        width={exportDrawerWidth}
        minWidth={300}
        maxWidth={640}
        onWidthChange={setExportDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1">
          <ExportChatDrawer />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "initiative"}
        width={roomSidebarWidth}
        minWidth={defaultDrawerMinWidth}
        maxWidth={defaultDrawerMaxWidth}
        onWidthChange={setRoomSidebarWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1">
          <InitiativeList />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "docFolder"}
        width={docFolderDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          <DocFolderForUser />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "clue"}
        width={roomSidebarWidth}
        minWidth={defaultDrawerMinWidth}
        maxWidth={defaultDrawerMaxWidth}
        onWidthChange={setRoomSidebarWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1 min-h-0">
          <ClueListForPL onSend={onClueSend} />
        </div>
      </VaulSideDrawer>
    </>
  );
}

const RoomSideDrawers = React.memo(RoomSideDrawersImpl);
export default RoomSideDrawers;
