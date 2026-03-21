import type { DocModeProvider } from "@blocksuite/affine/shared/services";

import { createEmbeddedAffineEditor } from "../embedded/createEmbeddedAffineEditor.client";

/**
 * 浏览器侧 editor 创建入口。
 *
 * 真正的 BlockSuite/AFFiNE editor 装配仍在 createEmbeddedAffineEditor.client 中，
 * 这里的作用是给 runtime 提供一个明确的浏览器边界。
 */
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
