import type { ClueMessage } from "../../../../api/models/ClueMessage";

import React from "react";
import ClueListForPL from "@/components/chat/room/drawers/clueListForPL";
import ExportChatDrawer from "@/components/chat/room/drawers/exportChatDrawer";
import InitiativeList from "@/components/chat/room/drawers/initiativeList";
import MessageThreadDrawer from "@/components/chat/room/drawers/messageThreadDrawer";
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
  const isWebgalResizing = false;

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

  const threadDrawerWidth = useDrawerPreferenceStore(state => state.threadDrawerWidth);
  const initiativeDrawerWidth = useDrawerPreferenceStore(state => state.initiativeDrawerWidth);
  const clueDrawerWidth = useDrawerPreferenceStore(state => state.clueDrawerWidth);
  const mapDrawerWidth = useDrawerPreferenceStore(state => state.mapDrawerWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const webgalDrawerWidth = useDrawerPreferenceStore(state => state.webgalDrawerWidth);

  // user / role drawer 固定宽度（与用户偏好宽度解耦）
  const fixedMemberDrawerWidth = 270;

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

  // WebGAL 宽度
  const webgalMinWidth = 520;
  const webgalMaxWidth = typeof window === "undefined"
    ? 1100
    : Math.max(webgalMinWidth, window.innerWidth - 360);
  const safeWebgalWidth = clamp(webgalDrawerWidth, webgalMinWidth, webgalMaxWidth);
  const sidebarPanelClassName = "shadow-none border-l border-base-300";

  const handleCloseWebgal = React.useCallback(() => {
    stopRealtimeRender();
    setIsRealtimeRenderEnabled(false);
    setSideDrawerState("none");
  }, [setIsRealtimeRenderEnabled, setSideDrawerState, stopRealtimeRender]);

  return (
    <>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "user"}
        width={fixedMemberDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="User" />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "role"}
        width={fixedMemberDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="flex-1 min-h-0">
          <RoomUserList type="Role" />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={isThreadPaneOpen}
        width={safeThreadWidth}
        className={composerTarget === "thread" ? "ring-2 ring-info/40 ring-inset" : ""}
        panelClassName={sidebarPanelClassName}
      >
        <MessageThreadDrawer />
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "initiative"}
        width={safeInitiativeWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1">
          <InitiativeList />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "map"}
        width={safeMapWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto h-full">
          <DNDMap />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "clue"}
        width={clueDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1">
          <ClueListForPL onSend={onClueSend} />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "export"}
        width={exportDrawerWidth}
        panelClassName={sidebarPanelClassName}
      >
        <div className="overflow-auto flex-1">
          <ExportChatDrawer />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "webgal"}
        width={safeWebgalWidth}
        panelClassName={sidebarPanelClassName}
      >
        <WebGALPreview
          previewUrl={realtimePreviewUrl}
          isActive={isRealtimeRenderActive}
          isResizing={isWebgalResizing}
          onClose={() => {
            handleCloseWebgal();
          }}
        />
      </VaulSideDrawer>
    </>
  );
}

const RoomSideDrawers = React.memo(RoomSideDrawersImpl);
export default RoomSideDrawers;
