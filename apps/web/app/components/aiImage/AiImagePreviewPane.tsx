import { memo } from "react";

import type {
  AiImagePreviewPaneProps,
} from "@/components/aiImage/preview/types";

import { DirectorWorkspace } from "@/components/aiImage/preview/DirectorWorkspace";
import { StandardPreviewWorkspace } from "@/components/aiImage/preview/StandardPreviewWorkspace";

export const AiImagePreviewPane = memo((props: AiImagePreviewPaneProps) => {
  return (
    <div className={`
      ai-image-workbench-surface flex min-h-0 min-w-0 flex-1 flex-col gap-3
      overflow-auto p-2
      ${props.isDirectorToolsOpen ? `md:p-4` : `md:py-2 md:pl-2`}
    `}>
      {props.isDirectorToolsOpen
        ? <DirectorWorkspace {...props} />
        : <StandardPreviewWorkspace {...props} />}
    </div>
  );
});
