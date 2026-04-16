import type { ComponentProps } from "react";
import { useState } from "react";

import { AiImageHistoryPane } from "@/components/aiImage/AiImageHistoryPane";
import { AiImagePreviewPane } from "@/components/aiImage/AiImagePreviewPane";
import { HistoryIcon } from "@/icons";

interface AiImageWorkspaceProps {
  isDirectorToolsOpen: boolean;
  previewPaneProps: ComponentProps<typeof AiImagePreviewPane>;
  historyPaneProps: Omit<ComponentProps<typeof AiImageHistoryPane>, "isDirectorToolsOpen" | "onCollapse">;
}

export function AiImageWorkspace({
  isDirectorToolsOpen,
  previewPaneProps,
  historyPaneProps,
}: AiImageWorkspaceProps) {
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-base-200">
      <AiImagePreviewPane {...previewPaneProps} />

      {isHistoryCollapsed
        ? (
            <div className="absolute right-3 top-3 z-20">
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-lg border border-base-300 bg-base-100/95 text-base-content/72 shadow-md backdrop-blur transition hover:bg-base-200 hover:text-base-content"
                aria-label="展开历史记录侧边栏"
                title="展开历史记录侧边栏"
                onClick={() => setIsHistoryCollapsed(false)}
              >
                <HistoryIcon className="size-5" />
              </button>
            </div>
          )
        : null}

      {!isHistoryCollapsed
        ? (
            <AiImageHistoryPane
              {...historyPaneProps}
              isDirectorToolsOpen={isDirectorToolsOpen}
              onCollapse={() => setIsHistoryCollapsed(true)}
            />
          )
        : null}
    </div>
  );
}
