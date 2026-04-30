import type { QueryClient } from "@tanstack/react-query";

import type { BlocksuiteMentionRoleEntry } from "../services/blocksuiteRoleService";

import { createBlocksuiteQuickSearchService } from "../services/quickSearchService";
import { createTuanChatRoleService } from "../services/tuanChatRoleService";
import { createTuanChatUserService } from "../services/tuanChatUserService";
import { isBlocksuiteDebugEnabled } from "../shared/debugFlags";
import { createBlocksuiteQuickSearchPicker } from "./extensions/blocksuiteQuickSearchPicker";

export type WorkspaceLike = {
  getDoc: (docId: string) => { getStore: (options?: { readonly?: boolean }) => unknown; loaded?: boolean; load?: () => void } | null;
  createDoc?: (docId: string) => { getStore: (options?: { readonly?: boolean }) => unknown; loaded?: boolean; load?: () => void } | null;
  meta?: unknown;
  slots?: unknown;
};

export type CreateBlocksuiteEditorParams = {
  store: unknown;
  workspace: WorkspaceLike;
  docModeProvider: import("@blocksuite/affine/shared/services").DocModeProvider;
  spaceId?: number;
  autofocus?: boolean;
  disableDocTitle?: boolean;
  onNavigateToDoc?: (params: { spaceId: number; docId: string }) => void;
  queryClient?: QueryClient;
};

export type EditorDisposer = () => void;

export type BlocksuiteEditorAssemblyContext = {
  store: unknown;
  storeAny: any;
  currentDocId?: string;
  workspace: WorkspaceLike;
  docModeProvider: CreateBlocksuiteEditorParams["docModeProvider"];
  spaceId?: number;
  onNavigateToDoc?: CreateBlocksuiteEditorParams["onNavigateToDoc"];
  queryClient?: QueryClient;
  userService: ReturnType<typeof createTuanChatUserService>;
  roleService: ReturnType<typeof createTuanChatRoleService>;
  quickSearchService: ReturnType<typeof createBlocksuiteQuickSearchService>;
  disposers: EditorDisposer[];
  titleCache: Map<string, { at: number; title: string }>;
  titleInflight: Map<string, Promise<string>>;
  roomIdsCache: Map<number, { at: number; ids: Set<number> }>;
  roomIdsInflight: Map<number, Promise<Set<number> | null>>;
  roleEntriesCache: Map<string, { at: number; roles: BlocksuiteMentionRoleEntry[] }>;
  roleEntriesInflight: Map<string, Promise<BlocksuiteMentionRoleEntry[]>>;
  mentionMenuLockUntil: number;
  mentionCommitDedupUntil: number;
  debugEnabled: boolean;
};

export function createBlocksuiteEditorAssemblyContext(params: CreateBlocksuiteEditorParams): BlocksuiteEditorAssemblyContext {
  const storeAny = params.store as any;
  const quickSearchPicker = createBlocksuiteQuickSearchPicker({
    meta: ((params.workspace as any)?.meta ?? storeAny?.doc?.workspace?.meta) as any,
  });

  return {
    store: params.store,
    storeAny,
    currentDocId: typeof storeAny?.id === "string" ? storeAny.id : undefined,
    workspace: params.workspace,
    docModeProvider: params.docModeProvider,
    spaceId: params.spaceId,
    onNavigateToDoc: params.onNavigateToDoc,
    queryClient: params.queryClient,
    userService: createTuanChatUserService({ queryClient: params.queryClient }),
    roleService: createTuanChatRoleService({ queryClient: params.queryClient }),
    quickSearchService: createBlocksuiteQuickSearchService({
      searchDoc: quickSearchPicker.searchDoc,
      dispose: quickSearchPicker.dispose,
    }),
    disposers: [],
    titleCache: new Map(),
    titleInflight: new Map(),
    roomIdsCache: new Map(),
    roomIdsInflight: new Map(),
    roleEntriesCache: new Map(),
    roleEntriesInflight: new Map(),
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
  context.quickSearchService.dispose();

  for (let i = context.disposers.length - 1; i >= 0; i -= 1) {
    try {
      context.disposers[i]?.();
    }
    catch {
      // ignore
    }
  }
}
