// 提及插入工具：在 Blocksuite 当前选区插入成员提及，并做最小防重入保护。
import type { TextSelection } from "@blocksuite/std";

import { getTextSelectionCommand } from "@blocksuite/affine/shared/commands";

import { isBlocksuiteDebugEnabled } from "../debugFlags";

const mentionInsertDedupWindowMs = 500;
const recentMentionInsertions = new Map<string, number>();
const mentionDebugEnabled = isBlocksuiteDebugEnabled();

function forwardMentionDebug(message: string, payload?: Record<string, unknown>) {
  try {
    const fn = (globalThis as any).__tcBlocksuiteDebugLog as undefined | ((entry: any) => void);
    fn?.({ source: "BlocksuiteMention", message, payload });
  }
  catch {
    // ignore
  }
}

function logMentionDebug(message: string, payload?: Record<string, unknown>) {
  if (!mentionDebugEnabled)
    return;
  if (payload) {
    console.debug("[BlocksuiteMention]", message, payload);
  }
  else {
    console.debug("[BlocksuiteMention]", message);
  }
  forwardMentionDebug(message, payload);
}

function isDuplicateMentionInsert(key: string): boolean {
  const now = Date.now();
  const last = recentMentionInsertions.get(key);
  if (last !== undefined && now - last < mentionInsertDedupWindowMs)
    return true;

  recentMentionInsertions.set(key, now);

  if (recentMentionInsertions.size > 50) {
    for (const [k, ts] of recentMentionInsertions.entries()) {
      if (now - ts > mentionInsertDedupWindowMs)
        recentMentionInsertions.delete(k);
      if (recentMentionInsertions.size <= 25)
        break;
    }
  }

  return false;
}

export function insertMentionAtCurrentSelection(params: {
  std: any;
  store: any;
  memberId: string;
  displayName: string;
}): boolean {
  const { std, store, memberId, displayName } = params;

  const [ok, data] = std.command.exec(getTextSelectionCommand);
  if (!ok || !data.currentTextSelection) {
    logMentionDebug("selection missing", { ok, memberId, displayName });
    return false;
  }

  const selection = data.currentTextSelection as TextSelection;
  if (selection.to) {
    // minimal: only support single-block selection for now
    if (selection.to.blockId !== selection.from.blockId) {
      logMentionDebug("multi-block selection", {
        memberId,
        displayName,
        from: selection.from?.blockId,
        to: selection.to?.blockId,
      });
      return false;
    }
  }

  const block = store.getBlock(selection.from.blockId);
  const model = block?.model as any;
  const text = model?.text;
  if (!text) {
    logMentionDebug("text model missing", { memberId, displayName, blockId: selection.from?.blockId });
    return false;
  }

  const insertAt = selection.from.index;
  const deleteLen = selection.to ? 0 : selection.from.length;
  const dedupeKey = `${selection.from.blockId}:${insertAt}:${memberId}:${displayName}`;
  if (isDuplicateMentionInsert(dedupeKey)) {
    logMentionDebug("duplicate insert blocked", { memberId, displayName, insertAt, blockId: selection.from?.blockId });
    return false;
  }

  logMentionDebug("insert start", { memberId, displayName, insertAt, deleteLen });

  store.transact(() => {
    if (deleteLen > 0) {
      text.delete(insertAt, deleteLen);
    }

    const insertText = `@${displayName || "Unknown"}`;
    text.insert(insertText, insertAt, {
      mention: {
        member: String(memberId),
      },
    });

    // add a trailing space for easier typing
    text.insert(" ", insertAt + insertText.length);
  });

  logMentionDebug("insert done", { memberId, displayName, insertAt });

  return true;
}
