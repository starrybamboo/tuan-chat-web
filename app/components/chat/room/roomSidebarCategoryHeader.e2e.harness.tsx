/* eslint-disable react-refresh/only-export-components */

import React from "react";
import { createRoot } from "react-dom/client";

import RoomSidebarCategoryHeader from "@/components/chat/room/roomSidebarCategoryHeader";

function RoomSidebarCategoryHeaderHarness() {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [toggleCount, setToggleCount] = React.useState(0);
  const [addCount, setAddCount] = React.useState(0);

  return (
    <main className="p-4">
      <div data-testid="harness-ready">ready</div>
      <div data-testid="collapsed-state">{isCollapsed ? "collapsed" : "expanded"}</div>
      <div data-testid="toggle-count">{toggleCount}</div>
      <div data-testid="add-count">{addCount}</div>

      <div data-testid="header-shell" className="max-w-sm rounded-xl border border-base-300 p-2">
        <RoomSidebarCategoryHeader
          categoryId="category-1"
          categoryName="频道"
          categoryIndex={0}
          canEdit
          isCollapsed={isCollapsed}
          itemsLength={2}
          dragging={null}
          resetDropHandled={() => {}}
          setDragging={() => {}}
          setDropTarget={() => {}}
          handleDrop={() => {}}
          toggleCategoryExpanded={() => {
            setIsCollapsed(prev => !prev);
            setToggleCount(prev => prev + 1);
          }}
          onTriggerCategoryAdd={() => {
            setAddCount(prev => prev + 1);
          }}
          setContextMenu={() => {}}
          toggleTitle={isCollapsed ? "展开" : "折叠"}
          addTitle="添加"
        />
      </div>
    </main>
  );
}

const container = document.getElementById("app");
if (!container) {
  throw new Error("room sidebar category header harness mount point not found");
}

createRoot(container).render(
  <React.StrictMode>
    <RoomSidebarCategoryHeaderHarness />
  </React.StrictMode>,
);
