import type { ClueMessage } from "api/models/ClueMessage";

import DNDMap from "@/components/chat/map/DNDMap";
import ClueListForPL from "@/components/chat/sideDrawer/clueListForPL";
import ExportChatDrawer from "@/components/chat/sideDrawer/exportChatDrawer";
import InitiativeList from "@/components/chat/sideDrawer/initiativeList";
import RoomRoleList from "@/components/chat/sideDrawer/roomRoleList";
import RoomUserList from "@/components/chat/sideDrawer/roomUserList";
import WebGALPreview from "@/components/chat/sideDrawer/webGALPreview";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import React from "react";

export interface RoomSideDrawersProps {
  onClueSend: (clue: ClueMessage) => void;
  stopRealtimeRender: () => void;
}

function RoomSideDrawersImpl({
  onClueSend,
  stopRealtimeRender,
}: RoomSideDrawersProps) {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const realtimePreviewUrl = useRealtimeRenderStore(state => state.previewUrl);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const setIsRealtimeRenderEnabled = useRealtimeRenderStore(state => state.setEnabled);

  const userDrawerWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);
  const setUserDrawerWidth = useDrawerPreferenceStore(state => state.setUserDrawerWidth);
  const roleDrawerWidth = useDrawerPreferenceStore(state => state.roleDrawerWidth);
  const setRoleDrawerWidth = useDrawerPreferenceStore(state => state.setRoleDrawerWidth);
  const initiativeDrawerWidth = useDrawerPreferenceStore(state => state.initiativeDrawerWidth);
  const setInitiativeDrawerWidth = useDrawerPreferenceStore(state => state.setInitiativeDrawerWidth);
  const clueDrawerWidth = useDrawerPreferenceStore(state => state.clueDrawerWidth);
  const setClueDrawerWidth = useDrawerPreferenceStore(state => state.setClueDrawerWidth);
  const mapDrawerWidth = useDrawerPreferenceStore(state => state.mapDrawerWidth);
  const setMapDrawerWidth = useDrawerPreferenceStore(state => state.setMapDrawerWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const setExportDrawerWidth = useDrawerPreferenceStore(state => state.setExportDrawerWidth);
  const webgalDrawerWidth = useDrawerPreferenceStore(state => state.webgalDrawerWidth);
  const setWebgalDrawerWidth = useDrawerPreferenceStore(state => state.setWebgalDrawerWidth);

  const clamp = React.useCallback((value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
  }, []);

  const initiativeMaxWidth = 520;
  const initiativeMinWidth = 280;
  const safeInitiativeWidth = clamp(initiativeDrawerWidth, initiativeMinWidth, initiativeMaxWidth);

  // 给地图留出主聊天区空间：最大宽度随窗口变化，但不小于最小宽度
  const mapMinWidth = 560;
  const mapMaxWidth = typeof window === "undefined"
    ? 1100
    : Math.max(mapMinWidth, window.innerWidth - 360);
  const safeMapWidth = clamp(mapDrawerWidth, Math.min(720, mapMaxWidth), mapMaxWidth);

  return (
    <>
      <div className="w-px bg-base-300 flex-shrink-0"></div>
      <OpenAbleDrawer
        isOpen={sideDrawerState === "user"}
        className="h-full bg-base-100 overflow-auto z-20 flex-shrink-0"
        initialWidth={userDrawerWidth}
        onWidthChange={setUserDrawerWidth}
      >
        <RoomUserList></RoomUserList>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={sideDrawerState === "role"}
        className="h-full bg-base-100 overflow-auto z-20 flex-shrink-0"
        initialWidth={roleDrawerWidth}
        onWidthChange={setRoleDrawerWidth}
      >
        <RoomRoleList></RoomRoleList>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={sideDrawerState === "initiative"}
        className="h-full bg-base-100 overflow-auto z-20 flex-shrink-0"
        initialWidth={safeInitiativeWidth}
        minWidth={initiativeMinWidth}
        maxWidth={initiativeMaxWidth}
        onWidthChange={setInitiativeDrawerWidth}
      >
        <InitiativeList></InitiativeList>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={sideDrawerState === "map"}
        className="h-full bg-base-100 overflow-auto z-20 flex-shrink-0"
        initialWidth={safeMapWidth}
        minWidth={mapMinWidth}
        onWidthChange={setMapDrawerWidth}
        maxWidth={mapMaxWidth}
      >
        <DNDMap></DNDMap>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={sideDrawerState === "clue"}
        className="h-full bg-base-100 overflow-auto z-20"
        initialWidth={clueDrawerWidth}
        onWidthChange={setClueDrawerWidth}
      >
        <ClueListForPL onSend={onClueSend}></ClueListForPL>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={sideDrawerState === "export"}
        className="h-full bg-base-100 overflow-auto z-20"
        initialWidth={exportDrawerWidth}
        onWidthChange={setExportDrawerWidth}
      >
        <ExportChatDrawer></ExportChatDrawer>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={sideDrawerState === "webgal"}
        className="h-full bg-base-100 overflow-hidden z-20"
        initialWidth={webgalDrawerWidth}
        onWidthChange={setWebgalDrawerWidth}
        maxWidth={window.innerWidth - 500}
      >
        <WebGALPreview
          previewUrl={realtimePreviewUrl}
          isActive={isRealtimeRenderActive}
          onClose={() => {
            stopRealtimeRender();
            setIsRealtimeRenderEnabled(false);
            setSideDrawerState("none");
          }}
        />
      </OpenAbleDrawer>
    </>
  );
}

const RoomSideDrawers = React.memo(RoomSideDrawersImpl);
export default RoomSideDrawers;
