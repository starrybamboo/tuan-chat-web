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
import { OpenAbleDrawer } from "@/components/common/openableDrawer";

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

  const userDrawerWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);
  const setUserDrawerWidth = useDrawerPreferenceStore(state => state.setUserDrawerWidth);
  const roleDrawerWidth = useDrawerPreferenceStore(state => state.roleDrawerWidth);
  const setRoleDrawerWidth = useDrawerPreferenceStore(state => state.setRoleDrawerWidth);
  const threadDrawerWidth = useDrawerPreferenceStore(state => state.threadDrawerWidth);
  const setThreadDrawerWidth = useDrawerPreferenceStore(state => state.setThreadDrawerWidth);
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

  const initiativeMaxWidth = 420;
  const initiativeMinWidth = 280;
  const safeInitiativeWidth = clamp(initiativeDrawerWidth, initiativeMinWidth, initiativeMaxWidth);

  // Thread 宽度：允许拖拽调整，并随窗口变化放宽最大宽度
  const threadMinWidth = 360;
  const threadMaxWidth = typeof window === "undefined"
    ? 900
    : Math.max(threadMinWidth, window.innerWidth - 360);
  const safeThreadWidth = clamp(threadDrawerWidth, threadMinWidth, threadMaxWidth);

  // 给地图留出主聊天区空间：最大宽度随窗口变化，但不小于最小宽度
  const mapMinWidth = 560;
  const mapMaxWidth = typeof window === "undefined"
    ? 1100
    : Math.max(mapMinWidth, window.innerWidth - 360);
  const safeMapWidth = clamp(mapDrawerWidth, Math.min(720, mapMaxWidth), mapMaxWidth);

  const webgalMaxWidth = typeof window === "undefined"
    ? 900
    : Math.max(360, window.innerWidth - 500);

  const rightDrawerBaseClass = "h-full bg-base-100 z-20 flex-shrink-0";
  const rightDrawerOverlayAnchorClass = "top-0 right-0";
  const rightDrawerHandlePosition = "left" as const;

  return (
    <>
      <div className="w-px bg-base-300 flex-shrink-0"></div>
      <OpenAbleDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "user"}
        className={`${rightDrawerBaseClass} overflow-auto ${rightDrawerOverlayAnchorClass}`}
        initialWidth={userDrawerWidth}
        onWidthChange={setUserDrawerWidth}
        handlePosition={rightDrawerHandlePosition}
      >
        <RoomUserList></RoomUserList>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "role"}
        className={`${rightDrawerBaseClass} overflow-auto ${rightDrawerOverlayAnchorClass}`}
        initialWidth={roleDrawerWidth}
        onWidthChange={setRoleDrawerWidth}
        handlePosition={rightDrawerHandlePosition}
      >
        <RoomRoleList></RoomRoleList>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={isThreadPaneOpen}
        className={`${rightDrawerBaseClass} overflow-hidden ${rightDrawerOverlayAnchorClass} ${composerTarget === "thread" ? "ring-2 ring-info/40 ring-inset" : ""}`}
        initialWidth={safeThreadWidth}
        minWidth={threadMinWidth}
        maxWidth={threadMaxWidth}
        minRemainingWidth={360}
        onWidthChange={setThreadDrawerWidth}
        handlePosition={rightDrawerHandlePosition}
      >
        <MessageThreadDrawer />
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "initiative"}
        className={`${rightDrawerBaseClass} overflow-auto ${rightDrawerOverlayAnchorClass}`}
        initialWidth={safeInitiativeWidth}
        minWidth={initiativeMinWidth}
        maxWidth={initiativeMaxWidth}
        minRemainingWidth={360}
        onWidthChange={setInitiativeDrawerWidth}
        handlePosition={rightDrawerHandlePosition}
      >
        <InitiativeList></InitiativeList>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "map"}
        className={`${rightDrawerBaseClass} overflow-auto ${rightDrawerOverlayAnchorClass}`}
        initialWidth={safeMapWidth}
        minWidth={mapMinWidth}
        minRemainingWidth={360}
        onWidthChange={setMapDrawerWidth}
        maxWidth={mapMaxWidth}
        handlePosition={rightDrawerHandlePosition}
      >
        <DNDMap></DNDMap>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "clue"}
        className={`${rightDrawerBaseClass} overflow-auto ${rightDrawerOverlayAnchorClass}`}
        initialWidth={clueDrawerWidth}
        onWidthChange={setClueDrawerWidth}
        handlePosition={rightDrawerHandlePosition}
      >
        <ClueListForPL onSend={onClueSend}></ClueListForPL>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "export"}
        className={`${rightDrawerBaseClass} overflow-auto ${rightDrawerOverlayAnchorClass}`}
        initialWidth={exportDrawerWidth}
        onWidthChange={setExportDrawerWidth}
        handlePosition={rightDrawerHandlePosition}
      >
        <ExportChatDrawer></ExportChatDrawer>
      </OpenAbleDrawer>
      <OpenAbleDrawer
        isOpen={!isThreadPaneOpen && sideDrawerState === "webgal"}
        className={`${rightDrawerBaseClass} overflow-hidden ${rightDrawerOverlayAnchorClass}`}
        initialWidth={webgalDrawerWidth}
        onWidthChange={setWebgalDrawerWidth}
        maxWidth={webgalMaxWidth}
        handlePosition={rightDrawerHandlePosition}
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
