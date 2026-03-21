import { createBlocksuiteEditor } from "../editors/createBlocksuiteEditor.browser";
import {
  ensureDocMeta,
  getOrCreateDoc,
  getOrCreateWorkspace,
  releaseWorkspace,
  retainWorkspace,
} from "../spaceWorkspaceRegistry";

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
