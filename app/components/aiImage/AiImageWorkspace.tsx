import type { ComponentProps } from "react";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { AiImageHistoryPane } from "@/components/aiImage/AiImageHistoryPane";
import { AiImagePreviewPane } from "@/components/aiImage/AiImagePreviewPane";

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
            <div className="absolute right-0 top-1/2 z-20 -translate-y-1/2">
              <button
                type="button"
                className="flex h-12 w-7 items-center justify-center rounded-l-full border border-base-300 border-r-0 bg-base-100/95 text-base-content/60 shadow-md backdrop-blur transition hover:bg-base-200 hover:text-base-content"
                aria-label="展开历史记录侧边栏"
                title="展开历史记录侧边栏"
                onClick={() => setIsHistoryCollapsed(false)}
              >
                <CaretLeftIcon className="size-3.5" weight="bold" />
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
