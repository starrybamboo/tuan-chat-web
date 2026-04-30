import type { LinkedMenuGroup } from "@blocksuite/affine/widgets/linked-doc";

import { UserServiceExtension } from "@blocksuite/affine/shared/services";
import { ZERO_WIDTH_FOR_EMBED_NODE } from "@blocksuite/std/inline";
import { html } from "lit";

import type { BlocksuiteEditorAssemblyContext } from "../blocksuiteEditorAssemblyContext";
import type { BlocksuiteExtensionBundle } from "./types";

import { listBlocksuiteMentionRoles } from "../../services/blocksuiteRoleService";
import { listBlocksuiteSpaceMemberIds } from "../../services/blocksuiteSpaceMemberService";
import { BlocksuiteRoleServiceExtension } from "../../services/tuanChatRoleService";
import { buildBlocksuiteRoleMentionKey } from "../../shared/mentionKey";

const MENTION_MENU_LOCK_MS = 400;
const MENTION_COMMIT_DEDUP_MS = 600;
const ROLE_LIST_CACHE_TTL_MS = 10_000;

type MentionMenuParams = {
  query: string;
  abort: () => void;
  inlineEditor: any;
  signal: AbortSignal;
};

type BlocksuiteMentionExtensionApi = {
  getMentionMenuGroups: (params: MentionMenuParams) => Promise<LinkedMenuGroup[]>;
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
  mentionKey: string;
  abort: () => void;
  logger?: (message: string, payload?: Record<string, unknown>) => void;
}) {
  const { inlineEditor, query, triggerKey, mentionKey, abort, logger } = params;

  const current = inlineEditor?.getInlineRange?.();
  if (!current) {
    logger?.("insert: inline range missing", { mentionKey });
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
      mention: { member: String(mentionKey) },
    });
    inlineEditor.insertText?.({ index: insertIndex + 1, length: 0 }, " ");
    inlineEditor.setInlineRange?.({ index: insertIndex + 2, length: 0 });
    return true;
  }
  catch (error) {
    logger?.("insert: failed", { mentionKey, error: String(error) });
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

  const memberIds = await listBlocksuiteSpaceMemberIds(context.spaceId, context.queryClient);
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
            mentionKey: id,
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

function getBlocksuiteRoleCacheKey(context: BlocksuiteEditorAssemblyContext) {
  const currentDocId = String(context.currentDocId ?? "").trim();
  if (currentDocId) {
    return currentDocId;
  }

  const spaceId = Number(context.spaceId);
  if (Number.isFinite(spaceId) && spaceId > 0) {
    return `space:${spaceId}`;
  }

  return "global";
}

async function loadBlocksuiteMentionRoleEntries(
  context: BlocksuiteEditorAssemblyContext,
  signal: AbortSignal,
) {
  const cacheKey = getBlocksuiteRoleCacheKey(context);
  const cached = context.roleEntriesCache.get(cacheKey);
  if (cached && Date.now() - cached.at <= ROLE_LIST_CACHE_TTL_MS) {
    return cached.roles;
  }

  const inflight = context.roleEntriesInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const task = (async () => {
    if (signal.aborted) {
      return [];
    }

    try {
      const roles = await listBlocksuiteMentionRoles({
        spaceId: context.spaceId,
        currentDocId: context.currentDocId,
        queryClient: context.queryClient,
      });
      context.roleService.seedRoles(roles);
      context.roleEntriesCache.set(cacheKey, { at: Date.now(), roles });
      return roles;
    }
    catch {
      return [];
    }
  })();

  context.roleEntriesInflight.set(cacheKey, task);
  try {
    return await task;
  }
  finally {
    context.roleEntriesInflight.delete(cacheKey);
  }
}

async function resolveBlocksuiteMentionRoleCandidates(
  context: BlocksuiteEditorAssemblyContext,
  params: {
    query: string;
    signal: AbortSignal;
  },
) {
  const { query, signal } = params;
  const roles = await loadBlocksuiteMentionRoleEntries(context, signal);
  if (signal.aborted) {
    return [];
  }

  const q = String(query ?? "").trim().toLowerCase();
  const MAX_ROLES = 20;
  const isNumericQuery = q.length > 0 && /^\d+$/.test(q);

  if (!q) {
    return roles.slice(0, MAX_ROLES);
  }

  if (isNumericQuery) {
    return roles
      .filter(role => String(role.roleId).includes(q))
      .slice(0, MAX_ROLES);
  }

  return roles
    .filter((role) => {
      const name = String(role.roleName ?? "").trim().toLowerCase();
      return name.includes(q);
    })
    .slice(0, MAX_ROLES);
}

export async function buildBlocksuiteRoleMentionMenuGroup(
  context: BlocksuiteEditorAssemblyContext,
  params: MentionMenuParams,
): Promise<LinkedMenuGroup | null> {
  const { query, abort, inlineEditor, signal } = params;

  const roles = await resolveBlocksuiteMentionRoleCandidates(context, { query, signal });
  if (roles.length <= 0) {
    return null;
  }

  let mentionActionLocked = false;

  return {
    name: "角色",
    items: roles.map((role) => {
      const roleId = String(role.roleId);
      const name = role.roleName?.trim() || `角色${roleId}`;
      const avatar = role.avatarThumbUrl?.trim() || role.avatarUrl?.trim() || null;

      return {
        key: `role:${roleId}`,
        name,
        icon: avatar
          ? html`<img src="${avatar}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" />`
          : html`<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:#eee;border-radius:50%;font-size:12px;">角</div>`,
        action: () => {
          if (mentionActionLocked || isBlocksuiteMentionMenuLocked(context)) {
            return;
          }

          if (isBlocksuiteMentionCommitDeduped(context)) {
            return;
          }

          lockBlocksuiteMentionCommitDedup(context);

          const inserted = insertBlocksuiteMentionViaInlineEditor({
            inlineEditor,
            query,
            triggerKey: "@",
            abort,
            mentionKey: buildBlocksuiteRoleMentionKey(roleId),
          });

          if (inserted) {
            mentionActionLocked = true;
            lockBlocksuiteMentionMenu(context);
          }
        },
      };
    }),
  };
}

export async function buildBlocksuiteMentionMenuGroups(
  context: BlocksuiteEditorAssemblyContext,
  params: MentionMenuParams,
): Promise<LinkedMenuGroup[]> {
  const [roleGroup, userGroup] = await Promise.all([
    buildBlocksuiteRoleMentionMenuGroup(context, params),
    buildBlocksuiteMentionMenuGroup(context, params),
  ]);

  return [roleGroup, userGroup].filter((group): group is LinkedMenuGroup => Boolean(group));
}

export function buildBlocksuiteMentionExtensions(
  context: BlocksuiteEditorAssemblyContext,
): BlocksuiteExtensionBundle<BlocksuiteMentionExtensionApi> {
  return {
    sharedExtensions: [
      UserServiceExtension(context.userService),
      BlocksuiteRoleServiceExtension(context.roleService),
    ],
    api: {
      getMentionMenuGroups: (params: MentionMenuParams) => buildBlocksuiteMentionMenuGroups(context, params),
    },
  };
}
