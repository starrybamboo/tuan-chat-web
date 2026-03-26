import type { RefObject } from "react";

import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import type { loadBlocksuiteRuntime } from "@/components/chat/infra/blocksuite/runtime/runtimeLoader.browser";

export type BlocksuiteTcHeaderState = {
  docId: string;
  header: BlocksuiteDocHeader;
} | null;

export type BlocksuiteEditorHandle = {
  hostContainerRef: RefObject<HTMLDivElement | null>;
  fullscreenRootRef: RefObject<HTMLDivElement | null>;
  editorRef: RefObject<HTMLElement | null>;
  storeRef: RefObject<any>;
  runtimeRef: RefObject<Awaited<ReturnType<typeof loadBlocksuiteRuntime>> | null>;
  triggerReload: () => void;
};
