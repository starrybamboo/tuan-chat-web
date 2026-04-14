/* eslint-disable react-refresh/only-export-components */

import React from "react";
import { createRoot } from "react-dom/client";

import SidebarSection from "@/components/chat/room/sidebarSection";

function SidebarSectionHarness() {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [toggleCount, setToggleCount] = React.useState(0);
  const [actionCount, setActionCount] = React.useState(0);

  return (
    <main className="p-4">
      <div data-testid="harness-ready">ready</div>
      <div data-testid="expanded-state">{isExpanded ? "expanded" : "collapsed"}</div>
      <div data-testid="toggle-count">{toggleCount}</div>
      <div data-testid="action-count">{actionCount}</div>

      <div data-testid="section-shell" className="max-w-sm rounded-xl border border-base-300 p-2">
        <SidebarSection
          title="频道与文档"
          isExpanded={isExpanded}
          onToggleExpanded={() => {
            setIsExpanded(prev => !prev);
            setToggleCount(prev => prev + 1);
          }}
          actionTitle="导入素材包"
          onAction={() => {
            setActionCount(prev => prev + 1);
          }}
        >
          <div data-testid="section-content">content</div>
        </SidebarSection>
      </div>
    </main>
  );
}

const container = document.getElementById("app");
if (!container) {
  throw new Error("sidebar section harness mount point not found");
}

createRoot(container).render(
  <React.StrictMode>
    <SidebarSectionHarness />
  </React.StrictMode>,
);
