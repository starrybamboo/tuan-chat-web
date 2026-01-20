import type { ClueMessage } from "../../../../api/models/ClueMessage";
import React from "react";
import ClueListForPL from "@/components/chat/room/drawers/clueListForPL";
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

  // user / role drawer 固定宽度（与用户偏好宽度解耦）
  const fixedMemberDrawerWidth = 270;
  const sidebarPanelClassName = "shadow-none border-l border-base-300";

  return (
    <>
      <VaulSideDrawer
        isOpen={sideDrawerState === "user"}
        width={fixedMemberDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="User" />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "role"}
        width={fixedMemberDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="Role" />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "export"}
        width={exportDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1">
          <ExportChatDrawer />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "initiative"}
        width={fixedMemberDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1">
          <InitiativeList />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "clue"}
        width={fixedMemberDrawerWidth}
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
