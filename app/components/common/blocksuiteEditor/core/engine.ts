import type { BlocksuiteEditorHandles, BlocksuiteEditorOptions } from "../types";

type InnerEditorContainer = {
  mode?: "page" | "edgeless";
  autofocus?: boolean;
  edgelessPreset?: unknown[];
};

async function optionalImport(moduleName: string) {
  return import(
    /* @vite-ignore */
    moduleName
  );
}

function applyInnerEditorConfig(root: HTMLElement, options: BlocksuiteEditorOptions) {
  const { autofocus = true, mode = "page", disableEdgeless = true } = options;

  const apply = () => {
    const inner = root.querySelector("editor-container") as unknown as InnerEditorContainer | null;
    if (!inner)
      return false;

    inner.mode = mode;
    inner.autofocus = autofocus;

    if (disableEdgeless) {
      inner.edgelessPreset = [];
      if (inner.mode === "edgeless")
        inner.mode = "page";
    }

    return true;
  };

  // simple-affine-editor 的 editor-container 是在 connectedCallback 里 append 的
  // 这里做一个轻量轮询，增强健壮性。
  let attempts = 0;
  const maxAttempts = 10;

  const tick = () => {
    if (apply())
      return;

    attempts += 1;
    if (attempts >= maxAttempts)
      return;

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

async function mountSimpleAffine(host: HTMLElement, options: BlocksuiteEditorOptions): Promise<BlocksuiteEditorHandles> {
  let editorMod: any;
  try {
    editorMod = await optionalImport("@blocksuite/editor");
  }
  catch {
    throw new Error("BlocksuiteEditor engine 'simple' requires optional dependency '@blocksuite/editor' (not installed in this project)");
  }
  // 确保 customElement('simple-affine-editor') 已注册
  void editorMod.SimpleAffineEditor;

  const editorEl = document.createElement("simple-affine-editor") as HTMLElement & {
    workspace?: unknown;
    page?: unknown;
  };
  editorEl.style.height = "100%";

  host.innerHTML = "";
  host.append(editorEl);

  applyInnerEditorConfig(editorEl, options);

  return {
    workspace: editorEl.workspace ?? null,
    page: editorEl.page ?? null,
    editor: editorEl,
  };
}

async function mountWorkspacePage(host: HTMLElement, options: BlocksuiteEditorOptions): Promise<BlocksuiteEditorHandles> {
  const { docId = "doc:default" } = options;

  const storeMod = await import("@blocksuite/store");

  let editorMod: any;
  let modelsMod: any;
  try {
    [editorMod, modelsMod] = await Promise.all([
      optionalImport("@blocksuite/editor"),
      optionalImport("@blocksuite/blocks/models"),
    ]);
  }
  catch {
    throw new Error("BlocksuiteEditor engine 'workspace' requires optional dependencies '@blocksuite/editor' and '@blocksuite/blocks/models' (not installed in this project)");
  }

  const { EditorContainer } = editorMod;
  const { AffineSchemas, __unstableSchemas } = modelsMod;
  const { Schema, Workspace } = storeMod as unknown as {
    Schema: new () => { register: (...args: unknown[]) => any };
    Workspace: new (options: any) => any;
  };

  const schema = new Schema();
  schema.register(AffineSchemas).register(__unstableSchemas);

  const workspace = new Workspace({
    id: "workspace:local",
    schema,
  });

  const existingPage = typeof workspace.getPage === "function" ? workspace.getPage(docId) : null;
  const page = existingPage ?? workspace.createPage(docId);

  page.load(() => {
    const pageBlockId = page.addBlock("affine:page", {
      title: new page.Text(""),
    });
    page.addBlock("affine:surface", {}, pageBlockId);
    const noteId = page.addBlock("affine:note", {}, pageBlockId);
    page.addBlock("affine:paragraph", {}, noteId);
    page.resetHistory();
  });

  const editor = new EditorContainer() as unknown as HTMLElement & { page?: unknown };
  editor.page = page;
  editor.style.height = "100%";

  host.innerHTML = "";
  host.append(editor);

  applyInnerEditorConfig(host, options);

  return {
    workspace,
    page,
    editor,
  };
}

export async function mountBlocksuiteEditor(host: HTMLElement, options: BlocksuiteEditorOptions): Promise<BlocksuiteEditorHandles> {
  const { engine = "simple" } = options;

  if (engine === "workspace") {
    return mountWorkspacePage(host, options);
  }

  return mountSimpleAffine(host, options);
}

export function disposeBlocksuiteEditor(handles: BlocksuiteEditorHandles) {
  try {
    handles.editor.remove();
  }
  catch (err) {
    console.warn("Blocksuite editor remove failed", err);
  }

  const maybeDisposable = handles.editor as unknown as { dispose?: () => void };
  maybeDisposable.dispose?.();

  const maybeWorkspace = handles.workspace as unknown as { dispose?: () => void };
  maybeWorkspace.dispose?.();
}
