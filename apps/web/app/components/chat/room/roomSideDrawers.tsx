import type { GalAuthoringLocalSnapshot, GalPatchProposal } from "@/components/chat/galgameAi";
import React from "react";
import ExportChatDrawer from "@/components/chat/room/drawers/exportChatDrawer";
import RoomUserList from "@/components/chat/room/drawers/roomUserList";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { VaulSideDrawer } from "@/components/common/vaulSideDrawer";

interface RoomSideDrawersProps {
  spaceId: number;
  roomId: number;
  galAuthoringLocalSnapshot?: GalAuthoringLocalSnapshot;
  onGalPatchProposalGenerated?: (proposal: GalPatchProposal) => void;
}

const LazyRoomCopilotDrawer = React.lazy(() => import("@/components/chat/room/drawers/roomCopilotDrawer"));

function RoomSideDrawersImpl({
  spaceId,
  roomId,
  galAuthoringLocalSnapshot,
  onGalPatchProposalGenerated,
}: RoomSideDrawersProps) {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const userDrawerWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);
  const roleDrawerWidth = useDrawerPreferenceStore(state => state.roleDrawerWidth);
  const copilotDrawerWidth = useDrawerPreferenceStore(state => state.copilotDrawerWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const setUserDrawerWidth = useDrawerPreferenceStore(state => state.setUserDrawerWidth);
  const setRoleDrawerWidth = useDrawerPreferenceStore(state => state.setRoleDrawerWidth);
  const setCopilotDrawerWidth = useDrawerPreferenceStore(state => state.setCopilotDrawerWidth);
  const setExportDrawerWidth = useDrawerPreferenceStore(state => state.setExportDrawerWidth);

  const sidebarPanelClassName = "shadow-none border-l border-base-300";

  return (
    <>
      <VaulSideDrawer
        isOpen={sideDrawerState === "user"}
        overlayOnMobile
        width={userDrawerWidth}
        minWidth={220}
        maxWidth={520}
        onWidthChange={setUserDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="User" />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "role"}
        overlayOnMobile
        width={roleDrawerWidth}
        minWidth={220}
        maxWidth={520}
        onWidthChange={setRoleDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="Role" />
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "copilot"}
        overlayOnMobile
        width={copilotDrawerWidth}
        minWidth={320}
        maxWidth={620}
        onWidthChange={setCopilotDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          {sideDrawerState === "copilot" && (
            <React.Suspense fallback={<RoomSideDrawerFallback text="正在加载 Copilot..." />}>
              <LazyRoomCopilotDrawer
                spaceId={spaceId}
                roomId={roomId}
                localSnapshot={galAuthoringLocalSnapshot}
                onGalPatchProposalGenerated={onGalPatchProposalGenerated}
              />
            </React.Suspense>
          )}
        </div>
      </VaulSideDrawer>

      <VaulSideDrawer
        isOpen={sideDrawerState === "export"}
        overlayOnMobile
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

    </>
  );
}

const RoomSideDrawers = React.memo(RoomSideDrawersImpl);
export default RoomSideDrawers;

function RoomSideDrawerFallback({ text }: { text: string }) {
  return (
    <div className="
      flex size-full items-center justify-center text-sm text-base-content/60
    ">
      <span className="loading loading-spinner loading-md"></span>
      <span className="ml-2">{text}</span>
    </div>
  );
}
