import type { ComponentProps } from "react";

import { AiImageHistoryPane } from "@/components/aiImage/AiImageHistoryPane";
import { AiImagePreviewPane } from "@/components/aiImage/AiImagePreviewPane";

interface AiImageWorkspaceProps {
  isDirectorToolsOpen: boolean;
  previewPaneProps: ComponentProps<typeof AiImagePreviewPane>;
  historyPaneProps: Omit<ComponentProps<typeof AiImageHistoryPane>, "isDirectorToolsOpen">;
}

export function AiImageWorkspace({
  isDirectorToolsOpen,
  previewPaneProps,
  historyPaneProps,
}: AiImageWorkspaceProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-base-200">
      <AiImagePreviewPane {...previewPaneProps} />
      <AiImageHistoryPane
        {...historyPaneProps}
        isDirectorToolsOpen={isDirectorToolsOpen}
      />
    </div>
  );
}
