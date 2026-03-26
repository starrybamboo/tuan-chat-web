import type { LinkedMenuGroup } from "@blocksuite/affine/widgets/linked-doc";

import { LinkedDocIcon, LinkedEdgelessIcon } from "@blocksuite/affine-components/icons";
import { REFERENCE_NODE } from "@blocksuite/affine-shared/consts";
import { TelemetryProvider } from "@blocksuite/affine-shared/services";
import { isFuzzyMatch } from "@blocksuite/affine-shared/utils";
import { LinkedWidgetConfigExtension } from "@blocksuite/affine/widgets/linked-doc";

import type { BlocksuiteEditorAssemblyContext } from "./blocksuiteEditorAssemblyContext";

import { listBlocksuiteRoomIdsForSpace } from "../services/blocksuiteRoomService";
import { parseSpaceDocId } from "../space/spaceDocId";
import {
  ensureBlocksuiteDocExistsInWorkspace,
  readBlocksuiteCachedDocTitle,
  syncBlocksuiteMetaTitle,
} from "./blocksuiteEditorTitle";
import {
  isBlocksuiteMentionCommitDeduped,
  lockBlocksuiteMentionCommitDedup,
} from "./buildBlocksuiteMentionExtensions";

type MentionMenuProvider = (params: {
  query: string;
  abort: () => void;
  inlineEditor: any;
  signal: AbortSignal;
}) => Promise<LinkedMenuGroup | null>;

type DocEntry = {
  docId: string;
  title: string;
};

const ROOM_LIST_CACHE_TTL_MS = 10_000;

function insertBlocksuiteLinkedNodeWithTitle(params: { inlineEditor: any; docId: string; title?: string }) {
  const { inlineEditor, docId, title } = params;
  if (!inlineEditor)
    return;

  const inlineRange = inlineEditor.getInlineRange?.();
  if (!inlineRange)
    return;

  const reference: { type: "LinkedPage"; pageId: string; title?: string } = { type: "LinkedPage", pageId: docId };
  if (title)
    reference.title = title;

  inlineEditor.insertText(inlineRange, REFERENCE_NODE, { reference });
  inlineEditor.setInlineRange({
    index: inlineRange.index + 1,
    length: 0,
  });
}

export function parseBlocksuiteRoomIdFromDocKey(key: string): number | null {
  const parsed = parseSpaceDocId(key);
  if (parsed?.kind !== "room_description")
    return null;
  return parsed.roomId;
}

async function getBlocksuiteRoomIdsForSpace(
  context: BlocksuiteEditorAssemblyContext,
  signal: AbortSignal,
): Promise<Set<number> | null> {
  const spaceId = context.spaceId;
  if (!Number.isFinite(spaceId) || !spaceId || spaceId <= 0)
    return null;

  const cached = context.roomIdsCache.get(spaceId);
  if (cached && Date.now() - cached.at <= ROOM_LIST_CACHE_TTL_MS)
    return cached.ids;

  const inflight = context.roomIdsInflight.get(spaceId);
  if (inflight)
    return inflight;

  const task = (async () => {
    if (signal.aborted)
      return null;

    try {
      const ids = await listBlocksuiteRoomIdsForSpace(spaceId);
      context.roomIdsCache.set(spaceId, { at: Date.now(), ids });
      return ids;
    }
    catch {
      return null;
    }
  })();

  context.roomIdsInflight.set(spaceId, task);
  try {
    return await task;
  }
  finally {
    context.roomIdsInflight.delete(spaceId);
  }
}

function createBlocksuiteDocAction(params: {
  context: BlocksuiteEditorAssemblyContext;
  docId: string;
  title: string;
  inlineEditor: any;
  editorHost: any;
}) {
  const { context, docId, title, inlineEditor, editorHost } = params;

  return () => {
    if (isBlocksuiteMentionCommitDeduped(context))
      return;

    lockBlocksuiteMentionCommitDedup(context);

    const safeTitle = typeof title === "string" ? title : "";
    const workspace = ((editorHost as any)?.std?.workspace ?? context.workspace) as any;
    ensureBlocksuiteDocExistsInWorkspace(workspace, docId);
    syncBlocksuiteMetaTitle({ workspace, docId, title: safeTitle });

    insertBlocksuiteLinkedNodeWithTitle({
      inlineEditor,
      docId,
      title: safeTitle,
    });

    editorHost?.std
      ?.getOptional?.(TelemetryProvider)
      ?.track?.("LinkedDocCreated", {
        control: "linked doc",
        module: "inline @",
        type: "doc",
        other: "existing doc",
      });
  };
}

export function createBlocksuiteDocMenuGroup(params: {
  context: BlocksuiteEditorAssemblyContext;
  entries: DocEntry[];
  inlineEditor: any;
  editorHost: any;
}) {
  const { context, entries, inlineEditor, editorHost } = params;
  const MAX_DOCS = 6;

  return {
    name: "Link to Doc",
    items: entries.map(({ docId, title }) => {
      const mode = context.docModeProvider?.getPrimaryMode?.(docId);
      return {
        key: docId,
        name: title,
        icon: mode === "edgeless" ? LinkedEdgelessIcon : LinkedDocIcon,
        action: createBlocksuiteDocAction({
          context,
          docId,
          title,
          inlineEditor,
          editorHost,
        }),
      };
    }),
    maxDisplay: MAX_DOCS,
    overflowText: `${Math.max(entries.length - MAX_DOCS, 0)} more docs`,
  };
}

async function collectBlocksuiteDocEntries(
  context: BlocksuiteEditorAssemblyContext,
  params: {
    query: string;
    editorHost: any;
    signal: AbortSignal;
  },
) {
  const { query, editorHost, signal } = params;
  const metaAny = (context.workspace as any)?.meta ?? (editorHost as any)?.store?.workspace?.meta;
  const docMetas = Array.isArray(metaAny?.docMetas) ? metaAny.docMetas : [];
  const currentDocId = (editorHost as any)?.store?.id ?? context.storeAny?.id;
  const docIds = docMetas.map((meta: any) => meta?.id).filter((docId: string) => docId && docId !== currentDocId);
  const filterQuery = String(query ?? "").trim();
  const workspace = ((editorHost as any)?.std?.workspace ?? context.workspace) as any;

  const docEntries = await Promise.all(docIds.map(async (docId: string) => ({
    docId,
    title: await readBlocksuiteCachedDocTitle(context, { docId, signal, workspace }),
  })));

  let filteredEntries = docEntries.filter(({ title }) => {
    if (!filterQuery)
      return true;
    if (!title)
      return false;
    return isFuzzyMatch(title, filterQuery);
  });

  const removedDocIds: string[] = [];
  if (context.spaceId && context.spaceId > 0 && filteredEntries.length > 0) {
    const hasRoomDoc = filteredEntries.some(item => parseBlocksuiteRoomIdFromDocKey(item.docId) !== null);
    if (hasRoomDoc) {
      const roomIds = await getBlocksuiteRoomIdsForSpace(context, signal);
      if (roomIds && !signal.aborted) {
        filteredEntries = filteredEntries.filter((item) => {
          const roomId = parseBlocksuiteRoomIdFromDocKey(item.docId);
          if (roomId === null)
            return true;
          if (roomIds.has(roomId))
            return true;
          removedDocIds.push(item.docId);
          return false;
        });
      }
    }
  }

  if (removedDocIds.length > 0) {
    try {
      if (metaAny?.removeDocMeta) {
        for (const docId of removedDocIds) {
          metaAny.removeDocMeta(docId);
        }
      }
    }
    catch {
      // ignore
    }
  }

  return filteredEntries;
}

export function handleBlocksuiteDocLinkNavigation(params: {
  docId: string;
  editor: any;
  workspace: { getDoc: (docId: string) => { getStore: () => unknown } | null };
  onNavigateToDoc?: (params: { spaceId: number; docId: string }) => void;
  spaceId?: number;
}) {
  const { docId, editor, workspace, onNavigateToDoc, spaceId } = params;

  if (typeof onNavigateToDoc === "function" && spaceId && spaceId > 0) {
    onNavigateToDoc({ spaceId, docId });
    return "host";
  }

  const target = workspace.getDoc(docId)?.getStore();
  if (!target)
    return "missing";

  (target as any).load?.();
  editor.doc = target;
  return "local";
}

export function buildBlocksuiteLinkedDocExtensions(
  context: BlocksuiteEditorAssemblyContext,
  params: {
    getMentionMenuGroup: MentionMenuProvider;
  },
) {
  const { getMentionMenuGroup } = params;

  return {
    sharedExtensions: [
      LinkedWidgetConfigExtension({
        triggerKeys: ["@", "[[", "【【"],
        convertTriggerKey: true,
        getMenus: async (
          query: string,
          abort: () => void,
          editorHost: any,
          inlineEditor: any,
          signal: AbortSignal,
        ): Promise<LinkedMenuGroup[]> => {
          const docEntries = await collectBlocksuiteDocEntries(context, {
            query,
            editorHost,
            signal,
          });

          const groups: LinkedMenuGroup[] = [];
          if (docEntries.length > 0) {
            groups.push(createBlocksuiteDocMenuGroup({
              context,
              entries: docEntries,
              inlineEditor,
              editorHost,
            }));
          }

          const mentionGroup = await getMentionMenuGroup({
            query,
            abort,
            inlineEditor,
            signal,
          });

          if (mentionGroup)
            groups.push(mentionGroup);

          return groups;
        },
      }),
    ],
  };
}
