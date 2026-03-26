import type { LinkedMenuGroup } from "@blocksuite/affine/widgets/linked-doc";

import { UserServiceExtension } from "@blocksuite/affine/shared/services";
import { ZERO_WIDTH_FOR_EMBED_NODE } from "@blocksuite/std/inline";
import { html } from "lit";

import type { BlocksuiteEditorAssemblyContext } from "../blocksuiteEditorAssemblyContext";
import type { BlocksuiteExtensionBundle } from "./types";

import { listBlocksuiteSpaceMemberIds } from "../../services/blocksuiteSpaceMemberService";

const MENTION_MENU_LOCK_MS = 400;
const MENTION_COMMIT_DEDUP_MS = 600;

type MentionMenuParams = {
  query: string;
  abort: () => void;
  inlineEditor: any;
  signal: AbortSignal;
};

type BlocksuiteMentionExtensionApi = {
  getMentionMenuGroup: (params: MentionMenuParams) => Promise<LinkedMenuGroup | null>;
};

function forwardMentionMenu(message: string, payload?: Record<string, unknown>) {
  try {
    const fn = (globalThis as any).__tcBlocksuiteDebugLog as undefined | ((entry: any) => void);
    fn?.({ source: "BlocksuiteMentionMenu", message, payload });
  }
  catch {
    // ignore
  }
}

function logMentionMenu(
  context: BlocksuiteEditorAssemblyContext,
  message: string,
  payload?: Record<string, unknown>,
) {
  if (!context.debugEnabled)
    return;

  if (payload) {
    console.warn("[BlocksuiteMentionMenu]", message, payload);
  }
  else {
    console.warn("[BlocksuiteMentionMenu]", message);
  }

  forwardMentionMenu(message, payload);
}

export function isBlocksuiteMentionCommitDeduped(context: BlocksuiteEditorAssemblyContext) {
  return Date.now() < context.mentionCommitDedupUntil;
}

export function lockBlocksuiteMentionCommitDedup(context: BlocksuiteEditorAssemblyContext) {
  context.mentionCommitDedupUntil = Date.now() + MENTION_COMMIT_DEDUP_MS;
}

export function isBlocksuiteMentionMenuLocked(context: BlocksuiteEditorAssemblyContext) {
  return Date.now() < context.mentionMenuLockUntil;
}

export function lockBlocksuiteMentionMenu(context: BlocksuiteEditorAssemblyContext) {
  context.mentionMenuLockUntil = Date.now() + MENTION_MENU_LOCK_MS;
}

export function insertBlocksuiteMentionViaInlineEditor(params: {
  inlineEditor: any;
  query: string;
  triggerKey: string;
  memberId: string;
  abort: () => void;
  logger?: (message: string, payload?: Record<string, unknown>) => void;
}) {
  const { inlineEditor, query, triggerKey, memberId, abort, logger } = params;

  const current = inlineEditor?.getInlineRange?.();
  if (!current) {
    logger?.("insert: inline range missing", { memberId });
    return false;
  }

  const deleteLen = String(triggerKey).length + String(query ?? "").length;
  const insertIndex = Math.max(0, Number(current.index ?? 0) - deleteLen);

  try {
    abort();
  }
  catch {
    // ignore
  }

  try {
    inlineEditor.setInlineRange?.({ index: insertIndex, length: 0 });
    inlineEditor.insertText?.({ index: insertIndex, length: 0 }, ZERO_WIDTH_FOR_EMBED_NODE, {
      mention: { member: String(memberId) },
    });
    inlineEditor.insertText?.({ index: insertIndex + 1, length: 0 }, " ");
    inlineEditor.setInlineRange?.({ index: insertIndex + 2, length: 0 });
    return true;
  }
  catch (error) {
    logger?.("insert: failed", { memberId, error: String(error) });
    return false;
  }
}

async function resolveBlocksuiteMentionCandidateIds(
  context: BlocksuiteEditorAssemblyContext,
  params: {
    query: string;
    signal: AbortSignal;
  },
) {
  const { query, signal } = params;

  if (!context.spaceId || context.spaceId <= 0)
    return [];

  const memberIds = await listBlocksuiteSpaceMemberIds(context.spaceId);
  if (signal.aborted)
    return [];

  const q = String(query ?? "").trim().toLowerCase();
  const MAX_MEMBERS = 20;
  const MAX_SCAN_MEMBERS = 200;
  const SCAN_BATCH_SIZE = 30;
  const isNumericQuery = q.length > 0 && /^\d+$/.test(q);

  if (!q)
    return memberIds.slice(0, MAX_MEMBERS);

  if (isNumericQuery) {
    return memberIds.filter(id => String(id).includes(q)).slice(0, MAX_MEMBERS);
  }

  const matched: number[] = [];
  const limit = Math.min(memberIds.length, MAX_SCAN_MEMBERS);
  for (let offset = 0; offset < limit && matched.length < MAX_MEMBERS; offset += SCAN_BATCH_SIZE) {
    const batch = memberIds.slice(offset, offset + SCAN_BATCH_SIZE);
    if (batch.length === 0)
      break;

    await context.userService.prefetch(batch.map(String));

    for (const id of batch) {
      const cached = context.userService.getCachedUserInfo(String(id));
      const nameLower = cached && "removed" in cached && cached.removed
        ? ""
        : String(cached?.name ?? "").toLowerCase();
      if (nameLower.includes(q)) {
        matched.push(id);
        if (matched.length >= MAX_MEMBERS)
          break;
      }
    }
  }

  return matched;
}

export async function buildBlocksuiteMentionMenuGroup(
  context: BlocksuiteEditorAssemblyContext,
  params: MentionMenuParams,
): Promise<LinkedMenuGroup | null> {
  const { query, abort, inlineEditor, signal } = params;

  if (!context.spaceId || context.spaceId <= 0)
    return null;

  const filteredIds = await resolveBlocksuiteMentionCandidateIds(context, { query, signal });
  if (filteredIds.length <= 0)
    return null;

  await context.userService.prefetch(filteredIds.map(String));

  let mentionActionLocked = false;

  logMentionMenu(context, "menu request", {
    query,
    locked: isBlocksuiteMentionMenuLocked(context),
    memberCount: filteredIds.length,
  });

  return {
    name: "用户",
    items: filteredIds.map((idNum) => {
      const id = String(idNum);
      const cached = context.userService.getCachedUserInfo(id);
      const name = cached && "removed" in cached && cached.removed ? id : (cached?.name || id);
      const avatar = cached && "removed" in cached && cached.removed ? null : (cached?.avatar ?? null);

      return {
        key: `member:${id}`,
        name,
        icon: avatar
          ? html`<img src="${avatar}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" />`
          : html`<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:#eee;border-radius:50%;font-size:12px;">@</div>`,
        action: () => {
          if (mentionActionLocked || isBlocksuiteMentionMenuLocked(context))
            return;

          if (isBlocksuiteMentionCommitDeduped(context)) {
            logMentionMenu(context, "mention action deduped", { memberId: id, name });
            return;
          }

          lockBlocksuiteMentionCommitDedup(context);
          logMentionMenu(context, "action picked", { memberId: id, name });

          const inserted = insertBlocksuiteMentionViaInlineEditor({
            inlineEditor,
            query,
            triggerKey: "@",
            abort,
            memberId: id,
            logger: (message, payload) => logMentionMenu(context, message, payload),
          });

          if (inserted) {
            mentionActionLocked = true;
            lockBlocksuiteMentionMenu(context);
            logMentionMenu(context, "action applied", { memberId: id, name, inserted });
          }
          else {
            logMentionMenu(context, "action blocked", { memberId: id, name, inserted });
          }
        },
      };
    }),
    maxDisplay: 0.0001,
    overflowText: "展开用户列表",
  };
}

export function buildBlocksuiteMentionExtensions(
  context: BlocksuiteEditorAssemblyContext,
): BlocksuiteExtensionBundle<BlocksuiteMentionExtensionApi> {
  return {
    sharedExtensions: [
      UserServiceExtension(context.userService),
    ],
    api: {
      getMentionMenuGroup: (params: MentionMenuParams) => buildBlocksuiteMentionMenuGroup(context, params),
    },
  };
}
