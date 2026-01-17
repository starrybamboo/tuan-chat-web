// 提及插入工具：在 Blocksuite 当前选区插入成员提及，并做最小防重入保护。
import type { TextSelection } from "@blocksuite/std";

import { getTextSelectionCommand } from "@blocksuite/affine/shared/commands";

const mentionInsertDedupWindowMs = 500;
const recentMentionInsertions = new Map<string, number>();

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
  if (!ok || !data.currentTextSelection)
    return false;

  const selection = data.currentTextSelection as TextSelection;
  if (selection.to) {
    // minimal: only support single-block selection for now
    if (selection.to.blockId !== selection.from.blockId)
      return false;
  }

  const block = store.getBlock(selection.from.blockId);
  const model = block?.model as any;
  const text = model?.text;
  if (!text)
    return false;

  const insertAt = selection.from.index;
  const deleteLen = selection.to ? 0 : selection.from.length;
  const dedupeKey = `${selection.from.blockId}:${insertAt}:${memberId}:${displayName}`;
  if (isDuplicateMentionInsert(dedupeKey))
    return false;

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

  return true;
}
