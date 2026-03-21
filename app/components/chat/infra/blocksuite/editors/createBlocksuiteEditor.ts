import type { DocModeProvider } from "@blocksuite/affine/shared/services";

type WorkspaceLike = {
  getDoc: (docId: string) => { getStore: () => unknown; loaded?: boolean; load?: () => void } | null;
  meta?: unknown;
};

export async function loadBlocksuiteEditorClient(): Promise<void> {
  if (typeof window === "undefined")
    return;

  await import("../embedded/createEmbeddedAffineEditor.client");
}

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

  const mod = await import("../embedded/createEmbeddedAffineEditor.client");
  return mod.createEmbeddedAffineEditor(params);
}
