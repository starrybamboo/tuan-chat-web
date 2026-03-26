import type { CreateBlocksuiteEditorParams } from "./blocksuiteEditorTypes";

import { createBlocksuiteEditorClient } from "./createBlocksuiteEditor.client";

/**
 * 浏览器侧 editor 创建入口。
 *
 * 真正的 BlockSuite/AFFiNE editor DOM 装配在 createBlocksuiteEditor.client 中，
 * 这里的作用是给 runtime 提供一个明确的浏览器边界。
 */
export async function createBlocksuiteEditor(params: CreateBlocksuiteEditorParams): Promise<HTMLElement> {
  if (typeof document === "undefined") {
    throw new TypeError("createBlocksuiteEditor must be called in a browser environment");
  }

  return createBlocksuiteEditorClient(params);
}
