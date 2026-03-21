import { loadBlocksuiteEditorClient } from "../editors/createBlocksuiteEditor";

type BlocksuiteRuntime = {
  createBlocksuiteEditor: typeof import("../editors/createBlocksuiteEditor").createBlocksuiteEditor;
  ensureDocMeta: typeof import("../spaceWorkspaceRegistry").ensureDocMeta;
  getOrCreateDoc: typeof import("../spaceWorkspaceRegistry").getOrCreateDoc;
  getOrCreateWorkspace: typeof import("../spaceWorkspaceRegistry").getOrCreateWorkspace;
  releaseWorkspace: typeof import("../spaceWorkspaceRegistry").releaseWorkspace;
  retainWorkspace: typeof import("../spaceWorkspaceRegistry").retainWorkspace;
};

let runtimeModulesPromise: Promise<{
  editorModule: typeof import("../editors/createBlocksuiteEditor");
  spaceRegistry: typeof import("../spaceWorkspaceRegistry");
}> | null = null;

let runtimePromise: Promise<BlocksuiteRuntime> | null = null;

async function loadBlocksuiteRuntimeModules() {
  if (runtimeModulesPromise)
    return runtimeModulesPromise;

  runtimeModulesPromise = (async () => {
    const [editorModule, spaceRegistry] = await Promise.all([
      import("../editors/createBlocksuiteEditor"),
      import("../spaceWorkspaceRegistry"),
    ]);

    return { editorModule, spaceRegistry };
  })();

  return runtimeModulesPromise;
}

export async function loadBlocksuiteRuntimeClientModules(): Promise<void> {
  const { editorModule } = await loadBlocksuiteRuntimeModules();
  await Promise.all([
    loadBlocksuiteEditorClient(),
    editorModule.loadBlocksuiteEditorClient?.() ?? Promise.resolve(),
  ]);
}

export async function loadBlocksuiteRuntime(): Promise<BlocksuiteRuntime> {
  if (runtimePromise)
    return runtimePromise;

  runtimePromise = (async () => {
    const { editorModule, spaceRegistry } = await loadBlocksuiteRuntimeModules();

    return {
      createBlocksuiteEditor: editorModule.createBlocksuiteEditor,
      ensureDocMeta: spaceRegistry.ensureDocMeta,
      getOrCreateDoc: spaceRegistry.getOrCreateDoc,
      getOrCreateWorkspace: spaceRegistry.getOrCreateWorkspace,
      releaseWorkspace: spaceRegistry.releaseWorkspace,
      retainWorkspace: spaceRegistry.retainWorkspace,
    };
  })();

  return runtimePromise;
}
