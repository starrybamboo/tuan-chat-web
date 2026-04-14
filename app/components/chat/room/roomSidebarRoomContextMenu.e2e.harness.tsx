/* eslint-disable react-refresh/only-export-components */

import type { Room } from "../../../../api";

import React from "react";
import { createRoot } from "react-dom/client";

import useChatPageContextMenus from "@/components/chat/hooks/useChatPageContextMenus";
import RoomSidebarRoomItem from "@/components/chat/room/roomSidebarRoomItem";
import SidebarSection from "@/components/chat/room/sidebarSection";

const SPACE_ID = 1;
const ROOM_ID = 1001;

const room: Room = {
  roomId: ROOM_ID,
  spaceId: SPACE_ID,
  name: "灵感",
  avatar: "",
} as Room;

function SidebarRoomContextMenuHarness() {
  const { contextMenu, handleContextMenu } = useChatPageContextMenus();
  const [selectedRoomId, setSelectedRoomId] = React.useState<number | null>(null);

  return (
    <main className="p-4">
      <div data-testid="harness-ready">ready</div>
      <div data-testid="selected-room-id">{selectedRoomId ?? "null"}</div>
      <div data-testid="context-room-id">{contextMenu?.roomId ?? "null"}</div>

      <div data-testid="section-shell" className="max-w-sm rounded-xl border border-base-300 p-2">
        <SidebarSection
          title="频道与文档"
          isExpanded
          onToggleExpanded={() => {}}
          className="flex min-h-0 flex-col"
          contentClassName="mt-0.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        >
          <div data-testid="extra-wrapper" className="rounded-lg border border-base-300 p-2">
            <div data-testid="extra-wrapper-inner" className="space-y-1 rounded-md bg-base-200/40 p-1">
              <RoomSidebarRoomItem
                room={room}
                roomId={ROOM_ID}
                activeSpaceId={SPACE_ID}
                nodeId="node-room-1001"
                categoryId="category-1"
                categoryName="草稿"
                index={0}
                canEdit
                dragging={null}
                resetDropHandled={() => {}}
                setDragging={() => {}}
                setDropTarget={() => {}}
                handleDrop={() => {}}
                onContextMenu={handleContextMenu}
                unreadMessageNumber={3}
                activeRoomId={null}
                onSelectRoom={setSelectedRoomId}
                onCloseLeftDrawer={() => {}}
              />
            </div>
          </div>
        </SidebarSection>
      </div>

      {contextMenu && (
        <div
          data-testid="room-context-menu"
          className="fixed left-4 top-4 rounded-md border border-base-300 bg-base-100 p-2 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ul className="menu w-48 p-0">
            <li><span>房间资料</span></li>
            <li><span>邀请玩家</span></li>
            <li><span>关闭消息提醒</span></li>
            <li><span>解散房间</span></li>
          </ul>
        </div>
      )}
    </main>
  );
}

const container = document.getElementById("app");
if (!container) {
  throw new Error("sidebar room context menu e2e harness mount point not found");
}

createRoot(container).render(
  <React.StrictMode>
    <SidebarRoomContextMenuHarness />
  </React.StrictMode>,
);
