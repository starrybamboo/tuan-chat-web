import { QuickSearchExtension } from "@blocksuite/affine/shared/services";

import type { BlocksuiteEditorAssemblyContext } from "../blocksuiteEditorAssemblyContext";
import type { BlocksuiteExtensionBundle } from "./types";

export function buildBlocksuiteQuickSearchExtension(
  context: BlocksuiteEditorAssemblyContext,
): BlocksuiteExtensionBundle {
  return {
    sharedExtensions: [
      QuickSearchExtension({
        openQuickSearch: async () => {
          const picked = await context.quickSearchService.searchDoc({ action: "insert" });
          if (!picked)
            return null;

          if ("docId" in picked) {
            return { docId: picked.docId };
          }

          return { externalUrl: picked.userInput };
        },
      }),
    ],
  };
}
