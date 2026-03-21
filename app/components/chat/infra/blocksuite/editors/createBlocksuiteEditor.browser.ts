import type { DocModeProvider } from "@blocksuite/affine/shared/services";

import { createEmbeddedAffineEditor } from "../embedded/createEmbeddedAffineEditor.client";

type WorkspaceLike = {
  getDoc: (docId: string) => { getStore: () => unknown; loaded?: boolean; load?: () => void } | null;
  meta?: unknown;
};

export async function createBlocksuiteEditor(params: {
  store: unknown;
  workspace: WorkspaceLike;
  docModeProvider: DocModeProvider;
  spaceId?: number;
  autofocus?: boolean;
  disableDocTitle?: boolean;
  onNavigateToDoc?: (params: { spaceId: number; docId: string }) => void;
}): Promise<HTMLElement> {
  if (typeof document === "undefined") {
    throw new TypeError("createBlocksuiteEditor must be called in a browser environment");
  }

  return createEmbeddedAffineEditor(params);
}
