import type { DocModeProvider } from "@blocksuite/affine/shared/services";

// SSR-safe wrapper: do not import `lit` / `@blocksuite/*` at module scope.
// Those packages may access DOM globals (e.g. `document`) during evaluation.

type WorkspaceLike = {
  getDoc: (docId: string) => { getStore: () => unknown; loaded?: boolean; load?: () => void } | null;
  meta?: unknown;
};

export async function createEmbeddedAffineEditor(params: {
  store: unknown;
  workspace: WorkspaceLike;
  docModeProvider: DocModeProvider;
  spaceId?: number;
  autofocus?: boolean;
  onNavigateToDoc?: (params: { spaceId: number; docId: string }) => void;
}): Promise<HTMLElement> {
  if (typeof document === "undefined") {
    throw new TypeError("createEmbeddedAffineEditor must be called in a browser environment");
  }

  const mod = await import("./createEmbeddedAffineEditor.client");
  return mod.createEmbeddedAffineEditor(params);
}
