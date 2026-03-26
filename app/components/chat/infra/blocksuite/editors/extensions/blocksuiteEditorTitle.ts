import type {
  BlocksuiteEditorAssemblyContext,
  WorkspaceLike,
} from "../blocksuiteEditorAssemblyContext";

import { readBlocksuiteDocHeader } from "../../document/docHeader";

const TC_HEADER_TITLE_TTL_MS = 10_000;

export function normalizeBlocksuiteDocTitle(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getBlocksuiteMetaTitle(workspace: WorkspaceLike, docId: string): string {
  try {
    return normalizeBlocksuiteDocTitle((workspace as any)?.meta?.getDocMeta?.(docId)?.title);
  }
  catch {
    return "";
  }
}

export function readBlocksuiteStableDocTitle(store: any): string {
  const tcHeaderTitle = normalizeBlocksuiteDocTitle(readBlocksuiteDocHeader(store)?.title);
  if (tcHeaderTitle)
    return tcHeaderTitle;

  try {
    const pages = store?.getModelsByFlavour?.("affine:page");
    const page = Array.isArray(pages) ? pages[0] : null;
    const rawTitle = page?.props?.title;
    const text = typeof rawTitle?.toString === "function" ? rawTitle.toString() : rawTitle;
    return normalizeBlocksuiteDocTitle(text);
  }
  catch {
    return "";
  }
}

export function syncBlocksuiteMetaTitle(params: {
  workspace: WorkspaceLike;
  docId: string;
  title: string;
}) {
  const { workspace, docId, title } = params;

  try {
    const safeTitle = normalizeBlocksuiteDocTitle(title);
    if (!safeTitle)
      return;

    const metaAny = (workspace as any)?.meta;
    if (!metaAny)
      return;

    const current = metaAny.getDocMeta?.(docId);
    if (!current) {
      metaAny.addDocMeta?.({ id: docId, title: safeTitle, tags: [], createDate: Date.now() });
      (workspace as any)?.slots?.docListUpdated?.next?.();
      return;
    }

    if (current.title !== safeTitle) {
      metaAny.setDocMeta?.(docId, { title: safeTitle });
      (workspace as any)?.slots?.docListUpdated?.next?.();
    }
  }
  catch {
    // ignore
  }
}

export function ensureBlocksuiteDocExistsInWorkspace(workspace: WorkspaceLike, docId: string) {
  try {
    const wsAny = workspace as any;
    const doc = wsAny?.getDoc?.(docId) ?? wsAny?.createDoc?.(docId);
    doc?.load?.();
  }
  catch {
    // ignore
  }
}

function getCachedBlocksuiteDocTitle(context: BlocksuiteEditorAssemblyContext, docId: string): string | null {
  const cached = context.titleCache.get(docId);
  if (!cached)
    return null;

  if (Date.now() - cached.at > TC_HEADER_TITLE_TTL_MS) {
    context.titleCache.delete(docId);
    return null;
  }

  return cached.title;
}

function cacheBlocksuiteDocTitle(
  context: BlocksuiteEditorAssemblyContext,
  docId: string,
  title: string,
) {
  context.titleCache.set(docId, { at: Date.now(), title });
}

export async function readBlocksuiteCachedDocTitle(
  context: BlocksuiteEditorAssemblyContext,
  params: {
    docId: string;
    signal: AbortSignal;
    workspace?: WorkspaceLike;
  },
): Promise<string> {
  const { docId, signal } = params;
  const workspace = params.workspace ?? context.workspace;

  if (signal.aborted)
    return "";

  const cached = getCachedBlocksuiteDocTitle(context, docId);
  if (cached !== null)
    return cached;

  const inflight = context.titleInflight.get(docId);
  if (inflight)
    return inflight;

  const task = (async () => {
    if (signal.aborted)
      return "";

    let title = "";

    try {
      const wsAny = workspace as any;
      const doc = wsAny?.getDoc?.(docId) ?? wsAny?.createDoc?.(docId);
      doc?.load?.();
      const store = doc?.getStore?.({ readonly: true }) ?? doc?.getStore?.();
      title = readBlocksuiteStableDocTitle(store);
    }
    catch {
      // ignore
    }

    if (!title) {
      title = getBlocksuiteMetaTitle(workspace, docId);
    }

    if (title) {
      cacheBlocksuiteDocTitle(context, docId, title);
      syncBlocksuiteMetaTitle({ workspace, docId, title });
    }

    return title;
  })();

  context.titleInflight.set(docId, task);
  try {
    return await task;
  }
  finally {
    context.titleInflight.delete(docId);
  }
}
