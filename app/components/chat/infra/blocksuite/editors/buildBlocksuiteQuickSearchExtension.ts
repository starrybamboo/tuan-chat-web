import { QuickSearchExtension } from "@blocksuite/affine/shared/services";

import type { BlocksuiteEditorAssemblyContext } from "./blocksuiteEditorAssemblyContext";

export function buildBlocksuiteQuickSearchExtension(context: BlocksuiteEditorAssemblyContext) {
  return {
    sharedExtensions: [
      QuickSearchExtension({
        openQuickSearch: async () => {
          const picked = await context.quickSearchOverlay.searchDoc({ action: "insert" });
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
