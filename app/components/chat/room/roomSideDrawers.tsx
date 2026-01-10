import type { ClueMessage } from "../../../../api/models/ClueMessage";

import React from "react";
import ClueListForPL from "@/components/chat/room/drawers/clueListForPL";
import ExportChatDrawer from "@/components/chat/room/drawers/exportChatDrawer";
import InitiativeList from "@/components/chat/room/drawers/initiativeList";
import MessageThreadDrawer from "@/components/chat/room/drawers/messageThreadDrawer";
import RoomRoleList from "@/components/chat/room/drawers/roomRoleList";
import RoomUserList from "@/components/chat/room/drawers/roomUserList";
import DNDMap from "@/components/chat/shared/map/DNDMap";
import WebGALPreview from "@/components/chat/shared/webgal/webGALPreview";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { VaulSideDrawer } from "@/components/common/vaulSideDrawer";

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

  // Discord 风格：Thread 以“右侧固定分栏面板”展示，不作为可滑出的 drawer
  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const isThreadPaneOpen = !!threadRootMessageId;

  const realtimePreviewUrl = useRealtimeRenderStore(state => state.previewUrl);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const setIsRealtimeRenderEnabled = useRealtimeRenderStore(state => state.setEnabled);

  // 从 webgal drawer 切到其它 drawer 时，确保停止实时渲染
  const prevSideDrawerStateRef = React.useRef(sideDrawerState);
  React.useEffect(() => {
    const prev = prevSideDrawerStateRef.current;
    prevSideDrawerStateRef.current = sideDrawerState;
    if (prev === "webgal" && sideDrawerState !== "webgal") {
      stopRealtimeRender();
      setIsRealtimeRenderEnabled(false);
    }
  }, [setIsRealtimeRenderEnabled, sideDrawerState, stopRealtimeRender]);

  const userDrawerWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);
  const roleDrawerWidth = useDrawerPreferenceStore(state => state.roleDrawerWidth);
  const threadDrawerWidth = useDrawerPreferenceStore(state => state.threadDrawerWidth);
  const initiativeDrawerWidth = useDrawerPreferenceStore(state => state.initiativeDrawerWidth);
  const clueDrawerWidth = useDrawerPreferenceStore(state => state.clueDrawerWidth);
  const mapDrawerWidth = useDrawerPreferenceStore(state => state.mapDrawerWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const webgalDrawerWidth = useDrawerPreferenceStore(state => state.webgalDrawerWidth);

  const clamp = React.useCallback((value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
  }, []);

  const initiativeMaxWidth = 420;
  const initiativeMinWidth = 280;
  const safeInitiativeWidth = clamp(initiativeDrawerWidth, initiativeMinWidth, initiativeMaxWidth);

  // Thread 宽度
  const threadMinWidth = 360;
  const threadMaxWidth = typeof window === "undefined"
    ? 900
    : Math.max(threadMinWidth, window.innerWidth - 360);
  const safeThreadWidth = clamp(threadDrawerWidth, threadMinWidth, threadMaxWidth);

  // 地图宽度
  const mapMinWidth = 560;
  const mapMaxWidth = typeof window === "undefined"
    ? 1100
    : Math.max(mapMinWidth, window.innerWidth - 360);
  const safeMapWidth = clamp(mapDrawerWidth, Math.min(720, mapMaxWidth), mapMaxWidth);

  return (
    <>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "user"}
        width={userDrawerWidth}
        direction="right"
      >
        <div className="overflow-auto flex-1">
          <RoomUserList />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "role"}
        width={roleDrawerWidth}
        direction="right"
      >
        <div className="overflow-auto flex-1">
          <RoomRoleList />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={isThreadPaneOpen}
        width={safeThreadWidth}
        direction="right"
        className={composerTarget === "thread" ? "ring-2 ring-info/40 ring-inset" : ""}
      >
        <MessageThreadDrawer />
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "initiative"}
        width={safeInitiativeWidth}
        direction="right"
      >
        <div className="overflow-auto flex-1">
          <InitiativeList />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "map"}
        width={safeMapWidth}
        direction="right"
      >
        <div className="overflow-auto flex-1">
          <DNDMap />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "clue"}
        width={clueDrawerWidth}
        direction="right"
      >
        <div className="overflow-auto flex-1">
          <ClueListForPL onSend={onClueSend} />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "export"}
        width={exportDrawerWidth}
        direction="right"
      >
        <div className="overflow-auto flex-1">
          <ExportChatDrawer />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "webgal"}
        width={webgalDrawerWidth}
        direction="right"
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
      </VaulSideDrawer>
    </>
  );
}

const RoomSideDrawers = React.memo(RoomSideDrawersImpl);
export default RoomSideDrawers;
