import type { EditorHost } from "@blocksuite/affine/block-std";
import type { Blocks, BlockSchema, Transformer, Workspace } from "@blocksuite/affine/store";
import type { TestAffineEditorContainer } from "@blocksuite/integration-test";
import type * as Y from "yjs";
import type { z } from "zod";

declare global {
  type HTMLTemplate = [
    string,
    Record<string, unknown>,
    ...(HTMLTemplate | string)[],
  ];

  interface Window {
    editor: TestAffineEditorContainer;
    doc: Blocks;
    collection: Workspace;
    blockSchemas: z.infer<typeof BlockSchema>[];
    job: Transformer;
    Y: typeof Y;
    std: typeof std;
    host: EditorHost;
    testWorker: Worker;

    wsProvider: ReturnType<typeof setupBroadcastProvider>;
    bcProvider: ReturnType<typeof setupBroadcastProvider>;
  }
}
