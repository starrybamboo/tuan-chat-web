import type { DocModeProvider } from "@blocksuite/affine/shared/services";

export type WorkspaceLike = {
  getDoc: (docId: string) => { getStore: (options?: { readonly?: boolean }) => unknown; loaded?: boolean; load?: () => void } | null;
  createDoc?: (docId: string) => { getStore: (options?: { readonly?: boolean }) => unknown; loaded?: boolean; load?: () => void } | null;
  meta?: unknown;
  slots?: unknown;
};

export type CreateBlocksuiteEditorParams = {
  store: unknown;
  workspace: WorkspaceLike;
  docModeProvider: DocModeProvider;
  spaceId?: number;
  autofocus?: boolean;
  disableDocTitle?: boolean;
  onNavigateToDoc?: (params: { spaceId: number; docId: string }) => void;
};

export type EditorDisposer = () => void;
