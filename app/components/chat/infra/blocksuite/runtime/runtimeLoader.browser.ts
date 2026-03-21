import { createBlocksuiteEditor } from "../editors/createBlocksuiteEditor.browser";
import {
  ensureDocMeta,
  getOrCreateDoc,
  getOrCreateWorkspace,
  releaseWorkspace,
  retainWorkspace,
} from "../spaceWorkspaceRegistry";

/**
 * 把 route client 需要的浏览器 runtime 能力组合成一个单例对象。
 *
 * 现在它不再承担“再去动态 import 下一段 runtime”的职责，
 * 只负责把已经静态进入 chunk 的能力收口为统一接口。
 */
type BlocksuiteRuntime = {
  createBlocksuiteEditor: typeof createBlocksuiteEditor;
  ensureDocMeta: typeof ensureDocMeta;
  getOrCreateDoc: typeof getOrCreateDoc;
  getOrCreateWorkspace: typeof getOrCreateWorkspace;
  releaseWorkspace: typeof releaseWorkspace;
  retainWorkspace: typeof retainWorkspace;
};

let runtimePromise: Promise<BlocksuiteRuntime> | null = null;

export async function loadBlocksuiteRuntime(): Promise<BlocksuiteRuntime> {
  if (runtimePromise)
    return runtimePromise;

  // Promise.resolve 保持调用约定不变：上层仍然统一使用 await。
  runtimePromise = Promise.resolve({
    createBlocksuiteEditor,
    ensureDocMeta,
    getOrCreateDoc,
    getOrCreateWorkspace,
    releaseWorkspace,
    retainWorkspace,
  });

  return runtimePromise;
}
