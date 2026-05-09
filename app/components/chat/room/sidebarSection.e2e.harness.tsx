import React from "react";
import { createRoot } from "react-dom/client";

import SidebarSection from "@/components/chat/room/sidebarSection";

function SidebarSectionHarness() {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [toggleCount, setToggleCount] = React.useState(0);
  const [actionCount, setActionCount] = React.useState(0);
  const items = React.useMemo(() => {
    return Array.from({ length: 24 }, (_, index) => `条目 ${index + 1}`);
  }, []);

  return (
    <main className="p-4">
      <style>{`
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-1 { flex: 1 1 0%; }
        .h-full { height: 100%; }
        .min-h-0 { min-height: 0; }
        .overflow-hidden { overflow: hidden; }
        .overflow-x-hidden { overflow-x: hidden; }
        .overflow-y-auto { overflow-y: auto; }
      `}</style>
      <div data-testid="harness-ready">ready</div>
      <div data-testid="expanded-state">{isExpanded ? "expanded" : "collapsed"}</div>
      <div data-testid="toggle-count">{toggleCount}</div>
      <div data-testid="action-count">{actionCount}</div>

      <div
        data-testid="section-shell"
        className="max-w-sm rounded-xl border border-base-300 p-2"
        style={{ height: 240 }}
      >
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
          className="flex h-full min-h-0 flex-col"
          contentClassName="sidebar-section-scroll-region min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          fillContent
        >
          {items.map(item => (
            <div
              key={item}
              data-testid="section-content-item"
              style={{
                borderRadius: 8,
                border: "1px solid rgba(148, 163, 184, 0.35)",
                minHeight: 36,
                padding: "8px 10px",
              }}
            >
              {item}
            </div>
          ))}
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
