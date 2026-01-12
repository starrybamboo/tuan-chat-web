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
  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const composerTarget = useRoomUiStore(state => state.composerTarget);
  const isThreadPaneOpen = !!threadRootMessageId;

  const realtimePreviewUrl = useRealtimeRenderStore(state => state.previewUrl);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const setIsRealtimeRenderEnabled = useRealtimeRenderStore(state => state.setEnabled);
  const [isWebgalResizing, setIsWebgalResizing] = React.useState(false);

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
  const setMapDrawerWidth = useDrawerPreferenceStore(state => state.setMapDrawerWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const webgalDrawerWidth = useDrawerPreferenceStore(state => state.webgalDrawerWidth);
  const setWebgalDrawerWidth = useDrawerPreferenceStore(state => state.setWebgalDrawerWidth);

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
  const drawerCloseDragThreshold = 80;

  const handleCloseSideDrawer = React.useCallback(() => {
    setSideDrawerState("none");
  }, [setSideDrawerState]);

  const handleCloseThread = React.useCallback(() => {
    setThreadRootMessageId(undefined);
    setComposerTarget("main");
  }, [setComposerTarget, setThreadRootMessageId]);

  const handleCloseWebgal = React.useCallback(() => {
    stopRealtimeRender();
    setIsRealtimeRenderEnabled(false);
    setSideDrawerState("none");
    setIsWebgalResizing(false);
  }, [setIsRealtimeRenderEnabled, setSideDrawerState, stopRealtimeRender]);

  const handleMapResizeStart = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = mapDrawerWidth;
    const minWidth = mapMinWidth;
    const maxWidth = mapMaxWidth;
    let closed = false;
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    target.setPointerCapture(pointerId);

    function handleUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    }

    function handleMove(moveEvent: PointerEvent) {
      if (closed) {
        return;
      }
      const deltaX = moveEvent.clientX - startX;
      if (deltaX > startWidth - minWidth + drawerCloseDragThreshold) {
        closed = true;
        handleCloseSideDrawer();
        handleUp();
        return;
      }
      const nextWidth = clamp(startWidth - deltaX, minWidth, maxWidth);
      setMapDrawerWidth(nextWidth);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }, [clamp, drawerCloseDragThreshold, handleCloseSideDrawer, mapDrawerWidth, mapMaxWidth, mapMinWidth, setMapDrawerWidth]);

  const handleWebgalResizeStart = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = webgalDrawerWidth;
    const minWidth = webgalMinWidth;
    const maxWidth = webgalMaxWidth;
    let closed = false;
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    target.setPointerCapture(pointerId);
    setIsWebgalResizing(true);

    function handleUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
      setIsWebgalResizing(false);
    }

    function handleMove(moveEvent: PointerEvent) {
      if (closed) {
        return;
      }
      const deltaX = moveEvent.clientX - startX;
      if (deltaX > startWidth - minWidth + drawerCloseDragThreshold) {
        closed = true;
        handleCloseWebgal();
        handleUp();
        return;
      }
      const nextWidth = clamp(startWidth - deltaX, minWidth, maxWidth);
      setWebgalDrawerWidth(nextWidth);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }, [clamp, drawerCloseDragThreshold, handleCloseWebgal, setWebgalDrawerWidth, webgalDrawerWidth, webgalMaxWidth, webgalMinWidth]);

  return (
    <>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "user"}
        width={userDrawerWidth}
        direction="right"
        onClose={handleCloseSideDrawer}
      >
        <div className="overflow-auto flex-1">
          <RoomUserList />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "role"}
        width={roleDrawerWidth}
        direction="right"
        onClose={handleCloseSideDrawer}
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
        onClose={handleCloseThread}
      >
        <MessageThreadDrawer />
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "initiative"}
        width={safeInitiativeWidth}
        direction="right"
        onClose={handleCloseSideDrawer}
      >
        <div className="overflow-auto flex-1">
          <InitiativeList />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "map"}
        width={safeMapWidth}
        direction="right"
        showResizeHandle
        onResizeHandleMouseDown={handleMapResizeStart}
        onClose={handleCloseSideDrawer}
      >
        <div className="overflow-auto h-full">
          <DNDMap />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "clue"}
        width={clueDrawerWidth}
        direction="right"
        onClose={handleCloseSideDrawer}
      >
        <div className="overflow-auto flex-1">
          <ClueListForPL onSend={onClueSend} />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "export"}
        width={exportDrawerWidth}
        direction="right"
        onClose={handleCloseSideDrawer}
      >
        <div className="overflow-auto flex-1">
          <ExportChatDrawer />
        </div>
      </VaulSideDrawer>
      <VaulSideDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "webgal"}
        width={safeWebgalWidth}
        direction="right"
        showResizeHandle
        onResizeHandleMouseDown={handleWebgalResizeStart}
        onClose={handleCloseWebgal}
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
