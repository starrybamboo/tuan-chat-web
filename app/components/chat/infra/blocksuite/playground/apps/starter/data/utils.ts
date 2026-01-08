import type { Workspace } from "@blocksuite/affine/store";

export type InitFn = {
  (collection: Workspace, docId: string): Promise<void> | void;
  id: string;
  displayName: string;
  description: string;
};
