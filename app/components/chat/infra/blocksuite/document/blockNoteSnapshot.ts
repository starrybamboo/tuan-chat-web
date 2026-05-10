import type { StoredSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";

import { normalizeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import { base64ToString, stringToBase64 } from "@/components/chat/infra/blocksuite/shared/base64";

type BlockNoteBlockProps = Record<string, unknown>;

/**
 * 为兼容旧 blocknote 快照保留的最小结构类型。
 */
export type BlockNoteDocBlock = {
  children?: BlockNoteDocBlock[];
  content?: unknown;
  id?: string;
  props?: BlockNoteBlockProps;
  type?: string;
};

export type StoredBlockNoteSnapshot = {
  v: 3;
  format: "blocknote";
  updateB64: string;
  updatedAt: number;
  header?: Partial<BlocksuiteDocHeader>;
  excerpt?: string;
};

const EMPTY_BLOCKS: BlockNoteDocBlock[] = [];

function isBlockArray(value: unknown): value is BlockNoteDocBlock[] {
  return Array.isArray(value);
}

export function isStoredBlockNoteSnapshot(snapshot: StoredSnapshot | null | undefined): snapshot is StoredBlockNoteSnapshot {
  return !!snapshot
    && snapshot.v === 3
    && (snapshot as StoredBlockNoteSnapshot).format === "blocknote"
    && typeof snapshot.updateB64 === "string"
    && typeof snapshot.updatedAt === "number";
}

export function decodeBlockNoteBlocks(snapshot: StoredSnapshot | null | undefined): BlockNoteDocBlock[] {
  if (!isStoredBlockNoteSnapshot(snapshot) || !snapshot.updateB64) {
    return EMPTY_BLOCKS;
  }

  try {
    const parsed = JSON.parse(base64ToString(snapshot.updateB64));
    return isBlockArray(parsed) ? parsed : EMPTY_BLOCKS;
  }
  catch {
    return EMPTY_BLOCKS;
  }
}

export function readBlockNoteHeader(snapshot: StoredSnapshot | null | undefined): BlocksuiteDocHeader | null {
  if (!isStoredBlockNoteSnapshot(snapshot)) {
    return null;
  }
  return normalizeBlocksuiteDocHeader(snapshot.header);
}

export function readBlockNoteExcerpt(snapshot: StoredSnapshot | null | undefined): string {
  if (!isStoredBlockNoteSnapshot(snapshot)) {
    return "";
  }
  return String(snapshot.excerpt ?? "").trim();
}

function collectInlineText(content: unknown, parts: string[]) {
  if (!content) {
    return;
  }
  if (typeof content === "string") {
    const trimmed = content.replace(/\s+/g, " ").trim();
    if (trimmed) {
      parts.push(trimmed);
    }
    return;
  }
  if (Array.isArray(content)) {
    for (const item of content) {
      collectInlineText(item, parts);
    }
    return;
  }
  if (typeof content === "object") {
    const text = typeof (content as { text?: unknown }).text === "string" ? (content as { text: string }).text : "";
    if (text) {
      const trimmed = text.replace(/\s+/g, " ").trim();
      if (trimmed) {
        parts.push(trimmed);
      }
    }
    const nested = (content as { content?: unknown }).content;
    if (nested) {
      collectInlineText(nested, parts);
    }
  }
}

function collectBlockText(blocks: BlockNoteDocBlock[], parts: string[]) {
  for (const block of blocks) {
    collectInlineText(block.content, parts);
    if (Array.isArray(block.children) && block.children.length > 0) {
      collectBlockText(block.children as BlockNoteDocBlock[], parts);
    }
  }
}

export function extractBlockNoteExcerpt(blocks: BlockNoteDocBlock[], maxChars = 220): string {
  const normalizedMaxChars = Number.isFinite(maxChars) && maxChars > 0 ? Math.floor(maxChars) : 220;
  const parts: string[] = [];
  collectBlockText(blocks, parts);
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  if (!joined) {
    return "";
  }
  return joined.length > normalizedMaxChars ? `${joined.slice(0, normalizedMaxChars)}…` : joined;
}

export function createBlockNoteSnapshot(params: {
  blocks: BlockNoteDocBlock[];
  header?: Partial<BlocksuiteDocHeader> | null;
  excerpt?: string;
  updatedAt?: number;
}): StoredBlockNoteSnapshot {
  const blocks = Array.isArray(params.blocks) ? params.blocks : EMPTY_BLOCKS;
  const excerpt = String(params.excerpt ?? "").trim() || extractBlockNoteExcerpt(blocks);

  return {
    v: 3,
    format: "blocknote",
    updateB64: stringToBase64(JSON.stringify(blocks)),
    updatedAt: typeof params.updatedAt === "number" && Number.isFinite(params.updatedAt) ? params.updatedAt : Date.now(),
    header: normalizeBlocksuiteDocHeader(params.header),
    excerpt,
  };
}

export function cloneBlockNoteSnapshotWithHeader(
  snapshot: StoredSnapshot | null | undefined,
  header: Partial<BlocksuiteDocHeader>,
): StoredBlockNoteSnapshot | null {
  if (!isStoredBlockNoteSnapshot(snapshot)) {
    return null;
  }

  return {
    ...snapshot,
    updatedAt: Date.now(),
    header: normalizeBlocksuiteDocHeader({
      ...readBlockNoteHeader(snapshot),
      ...header,
    }),
  };
}
