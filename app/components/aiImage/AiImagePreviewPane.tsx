import type {
  AiImagePreviewPaneProps,
} from "@/components/aiImage/preview/types";
import { DirectorWorkspace } from "@/components/aiImage/preview/DirectorWorkspace";
import { StandardPreviewWorkspace } from "@/components/aiImage/preview/StandardPreviewWorkspace";

export function AiImagePreviewPane(props: AiImagePreviewPaneProps) {
  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto ${props.isDirectorToolsOpen ? "bg-base-200 p-4" : "bg-base-200 py-3"}`}>
      {props.isDirectorToolsOpen
        ? <DirectorWorkspace {...props} />
        : <StandardPreviewWorkspace {...props} />}
    </div>
  );
}
