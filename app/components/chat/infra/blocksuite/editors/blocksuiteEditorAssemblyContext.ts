import type {
  CreateBlocksuiteEditorParams,
  EditorDisposer,
  WorkspaceLike,
} from "./blocksuiteEditorTypes";

import { isBlocksuiteDebugEnabled } from "../debugFlags";
import { createBlocksuiteQuickSearchService } from "../services/quickSearchService";
import { createTuanChatUserService } from "../services/tuanChatUserService";

export type BlocksuiteEditorAssemblyContext = {
  store: unknown;
  storeAny: any;
  workspace: WorkspaceLike;
  docModeProvider: CreateBlocksuiteEditorParams["docModeProvider"];
  spaceId?: number;
  onNavigateToDoc?: CreateBlocksuiteEditorParams["onNavigateToDoc"];
  userService: ReturnType<typeof createTuanChatUserService>;
  quickSearchOverlay: ReturnType<typeof createBlocksuiteQuickSearchService>;
  disposers: EditorDisposer[];
  titleCache: Map<string, { at: number; title: string }>;
  titleInflight: Map<string, Promise<string>>;
  roomIdsCache: Map<number, { at: number; ids: Set<number> }>;
  roomIdsInflight: Map<number, Promise<Set<number> | null>>;
  mentionMenuLockUntil: number;
  mentionCommitDedupUntil: number;
  debugEnabled: boolean;
};

export function createBlocksuiteEditorAssemblyContext(params: CreateBlocksuiteEditorParams): BlocksuiteEditorAssemblyContext {
  const storeAny = params.store as any;

  return {
    store: params.store,
    storeAny,
    workspace: params.workspace,
    docModeProvider: params.docModeProvider,
    spaceId: params.spaceId,
    onNavigateToDoc: params.onNavigateToDoc,
    userService: createTuanChatUserService(),
    quickSearchOverlay: createBlocksuiteQuickSearchService({
      meta: ((params.workspace as any)?.meta ?? storeAny?.doc?.workspace?.meta) as any,
    }),
    disposers: [],
    titleCache: new Map(),
    titleInflight: new Map(),
    roomIdsCache: new Map(),
    roomIdsInflight: new Map(),
    mentionMenuLockUntil: 0,
    mentionCommitDedupUntil: 0,
    debugEnabled: isBlocksuiteDebugEnabled(),
  };
}

export function addBlocksuiteEditorDisposer(
  context: BlocksuiteEditorAssemblyContext,
  disposer: EditorDisposer | null | undefined,
) {
  if (!disposer)
    return;
  context.disposers.push(disposer);
}

export function disposeBlocksuiteEditorAssemblyContext(context: BlocksuiteEditorAssemblyContext) {
  context.quickSearchOverlay.dispose();

  for (let i = context.disposers.length - 1; i >= 0; i -= 1) {
    try {
      context.disposers[i]?.();
    }
    catch {
      // ignore
    }
  }
}
