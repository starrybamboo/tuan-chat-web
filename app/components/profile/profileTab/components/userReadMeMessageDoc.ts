import type { StoredSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import type { BlockNoteDocBlock } from "@/components/chat/infra/blocksuite/document/blockNoteSnapshot";

import { decodeBlockNoteBlocks, isStoredBlockNoteSnapshot } from "@/components/chat/infra/blocksuite/document/blockNoteSnapshot";
import { base64ToString, stringToBase64 } from "@/components/chat/infra/blocksuite/shared/base64";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

/**
 * 个人主页 ReadMe 当前支持的消息节点类型。
 * 先只开放与连续写作最接近的纯文本节点和黑屏文本节点。
 */
export type UserReadMeNodeMessageType = typeof MESSAGE_TYPE.TEXT | typeof MESSAGE_TYPE.INTRO_TEXT;

/**
 * ReadMe 线性节点当前允许的行内样式集合。
 * 保持能力边界足够小，避免向完整富文本 schema 演化。
 */
export const USER_README_INLINE_MARK_TYPES = ["bold", "italic", "code", "highlight"] as const;

/**
 * 单个行内样式的类型标识。
 */
export type UserReadMeInlineMarkType = (typeof USER_README_INLINE_MARK_TYPES)[number];

/**
 * 线性节点上的行内样式区间。
 * 使用字符区间而不是嵌套 inline tree，保持 message-stream 模型简单可控。
 */
export type UserReadMeInlineMark = {
  markId: string;
  type: UserReadMeInlineMarkType;
  start: number;
  end: number;
};

/**
 * ReadMe 在线性文档视图中的单个节点。
 * 它保留 message 的核心形状，但只使用极小字段子集。
 */
export type UserReadMeMessageNode = {
  nodeId: string;
  messageType: UserReadMeNodeMessageType;
  content: string;
  annotations?: string[];
  extra?: Record<string, unknown>;
};

/**
 * 个人主页 ReadMe 的 message-stream 快照格式。
 */
export type UserReadMeMessageSnapshot = {
  v: 4;
  format: "message-stream";
  updateB64: string;
  updatedAt: number;
};

type NodeFocusTarget = {
  nodeId: string;
  caret: number;
};

/**
 * 节点拆分后的结果。
 */
export type UserReadMeNodeSplitResult = {
  nodes: UserReadMeMessageNode[];
  focus: NodeFocusTarget;
};

/**
 * 节点合并后的结果。
 */
export type UserReadMeNodeMergeResult = {
  nodes: UserReadMeMessageNode[];
  focus: NodeFocusTarget;
};

function buildStableNodeExtra(node: Pick<UserReadMeMessageNode, "content" | "extra">) {
  if (!isRecord(node.extra)) {
    return undefined;
  }

  const nextExtra: Record<string, unknown> = { ...node.extra };
  const inlineMarks = getUserReadMeInlineMarks(node);
  if (inlineMarks.length > 0) {
    nextExtra.inlineMarks = inlineMarks;
  }
  else {
    delete nextExtra.inlineMarks;
  }

  return Object.keys(nextExtra).length > 0 ? nextExtra : undefined;
}

function isInlineMarkType(value: unknown): value is UserReadMeInlineMarkType {
  return typeof value === "string" && USER_README_INLINE_MARK_TYPES.includes(value as UserReadMeInlineMarkType);
}

function normalizeInlineMark(value: unknown, contentLength: number): UserReadMeInlineMark | null {
  if (!isRecord(value) || !isInlineMarkType(value.type)) {
    return null;
  }

  const rawStart = typeof value.start === "number" ? value.start : Number.NaN;
  const rawEnd = typeof value.end === "number" ? value.end : Number.NaN;
  if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) {
    return null;
  }

  const start = Math.max(0, Math.min(Math.floor(rawStart), contentLength));
  const end = Math.max(start, Math.min(Math.floor(rawEnd), contentLength));
  if (end <= start) {
    return null;
  }

  return {
    markId: typeof value.markId === "string" && value.markId.trim() ? value.markId : createUserReadMeNodeId(),
    type: value.type,
    start,
    end,
  };
}

/**
 * 规范化行内样式区间，移除非法范围并合并同类型重叠区间。
 */
export function normalizeUserReadMeInlineMarks(
  marks: UserReadMeInlineMark[] | undefined,
  contentLength: number,
): UserReadMeInlineMark[] {
  const normalized = (marks ?? [])
    .map(mark => normalizeInlineMark(mark, contentLength))
    .filter((mark): mark is UserReadMeInlineMark => mark !== null)
    .sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }
      if (left.end !== right.end) {
        return left.end - right.end;
      }
      return left.type.localeCompare(right.type);
    });

  const merged: UserReadMeInlineMark[] = [];
  for (const mark of normalized) {
    const previous = merged[merged.length - 1];
    if (!previous || previous.type !== mark.type || previous.end < mark.start) {
      merged.push(mark);
      continue;
    }
    previous.end = Math.max(previous.end, mark.end);
  }
  return merged;
}

/**
 * 从节点 extra 中读取并规范化行内样式区间。
 */
export function getUserReadMeInlineMarks(node: Pick<UserReadMeMessageNode, "content" | "extra">): UserReadMeInlineMark[] {
  const rawMarks = Array.isArray(node.extra?.inlineMarks) ? node.extra.inlineMarks : undefined;
  return normalizeUserReadMeInlineMarks(rawMarks as UserReadMeInlineMark[] | undefined, node.content.length);
}

/**
 * 写回节点行内样式区间，并在空集合时清理冗余 extra 字段。
 */
export function setUserReadMeInlineMarks(
  node: UserReadMeMessageNode,
  marks: UserReadMeInlineMark[],
): UserReadMeMessageNode {
  const nextMarks = normalizeUserReadMeInlineMarks(marks, node.content.length);
  const nextExtra = isRecord(node.extra) ? { ...node.extra } : {};

  if (nextMarks.length > 0) {
    nextExtra.inlineMarks = nextMarks;
  }
  else {
    delete nextExtra.inlineMarks;
  }

  return Object.keys(nextExtra).length > 0
    ? { ...node, extra: nextExtra }
    : { ...node, extra: undefined };
}

/**
 * 在指定文本范围内切换单种行内样式。
 * 已完全覆盖则移除，否则新增并交由规范化逻辑合并。
 */
export function toggleUserReadMeInlineMark(
  node: UserReadMeMessageNode,
  params: {
    type: UserReadMeInlineMarkType;
    start: number;
    end: number;
  },
): UserReadMeMessageNode {
  const start = Math.max(0, Math.min(params.start, node.content.length));
  const end = Math.max(start, Math.min(params.end, node.content.length));
  if (end <= start) {
    return node;
  }

  const marks = getUserReadMeInlineMarks(node);
  const sameTypeMarks = marks.filter(mark => mark.type === params.type);
  const selectionFullyCovered = sameTypeMarks.some(mark => mark.start <= start && mark.end >= end);

  if (selectionFullyCovered) {
    const nextMarks = marks.flatMap((mark) => {
      if (mark.type !== params.type || mark.end <= start || mark.start >= end) {
        return [mark];
      }

      const fragments: UserReadMeInlineMark[] = [];
      if (mark.start < start) {
        fragments.push({
          ...mark,
          end: start,
        });
      }
      if (mark.end > end) {
        fragments.push({
          ...mark,
          start: end,
        });
      }
      return fragments;
    });
    return setUserReadMeInlineMarks(node, nextMarks);
  }

  return setUserReadMeInlineMarks(node, [
    ...marks,
    {
      markId: createUserReadMeNodeId(),
      type: params.type,
      start,
      end,
    },
  ]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeNodeMessageType(value: unknown): UserReadMeNodeMessageType {
  return value === MESSAGE_TYPE.INTRO_TEXT ? MESSAGE_TYPE.INTRO_TEXT : MESSAGE_TYPE.TEXT;
}

function normalizeNode(value: unknown): UserReadMeMessageNode | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawNodeId = typeof value.nodeId === "string" ? value.nodeId.trim() : "";
  const content = typeof value.content === "string" ? value.content : "";
  const annotations = Array.isArray(value.annotations)
    ? value.annotations.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;
  const extra = isRecord(value.extra) ? { ...value.extra } : undefined;
  const inlineMarks = normalizeUserReadMeInlineMarks(
    Array.isArray(extra?.inlineMarks) ? extra.inlineMarks as UserReadMeInlineMark[] : undefined,
    content.length,
  );
  if (extra) {
    if (inlineMarks.length > 0) {
      extra.inlineMarks = inlineMarks;
    }
    else {
      delete extra.inlineMarks;
    }
  }

  return {
    nodeId: rawNodeId || createUserReadMeNodeId(),
    messageType: normalizeNodeMessageType(value.messageType),
    content,
    ...(annotations && annotations.length > 0 ? { annotations } : {}),
    ...(extra && Object.keys(extra).length > 0 ? { extra } : {}),
  };
}

function collectInlineText(content: unknown, parts: string[]) {
  if (!content) {
    return;
  }
  if (typeof content === "string") {
    const normalized = content.replace(/\s+/g, " ").trim();
    if (normalized) {
      parts.push(normalized);
    }
    return;
  }
  if (Array.isArray(content)) {
    for (const item of content) {
      collectInlineText(item, parts);
    }
    return;
  }
  if (!isRecord(content)) {
    return;
  }

  const text = typeof content.text === "string" ? content.text.replace(/\s+/g, " ").trim() : "";
  if (text) {
    parts.push(text);
  }
  collectInlineText(content.content, parts);
}

function flattenBlockNoteBlocks(blocks: BlockNoteDocBlock[], nodes: UserReadMeMessageNode[]) {
  for (const block of blocks) {
    const parts: string[] = [];
    collectInlineText(block.content, parts);
    const text = parts.join(" ").replace(/\s+/g, " ").trim();

    if (text) {
      nodes.push(createUserReadMeNode({ content: text }));
    }

    if (Array.isArray(block.children) && block.children.length > 0) {
      flattenBlockNoteBlocks(block.children as BlockNoteDocBlock[], nodes);
    }
  }
}

function decodeMessageNodes(updateB64: string): UserReadMeMessageNode[] {
  try {
    const parsed = JSON.parse(base64ToString(updateB64));
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(item => normalizeNode(item))
      .filter((item): item is UserReadMeMessageNode => item !== null);
  }
  catch {
    return [];
  }
}

/**
 * 生成一个新的 ReadMe 节点。
 */
export function createUserReadMeNode(overrides: Partial<UserReadMeMessageNode> = {}): UserReadMeMessageNode {
  const extra = isRecord(overrides.extra) ? { ...overrides.extra } : undefined;
  const content = typeof overrides.content === "string" ? overrides.content : "";
  const inlineMarks = normalizeUserReadMeInlineMarks(
    Array.isArray(extra?.inlineMarks) ? extra.inlineMarks as UserReadMeInlineMark[] : undefined,
    content.length,
  );
  if (extra) {
    if (inlineMarks.length > 0) {
      extra.inlineMarks = inlineMarks;
    }
    else {
      delete extra.inlineMarks;
    }
  }

  return {
    nodeId: typeof overrides.nodeId === "string" && overrides.nodeId.trim() ? overrides.nodeId : createUserReadMeNodeId(),
    messageType: normalizeNodeMessageType(overrides.messageType),
    content,
    ...(Array.isArray(overrides.annotations) && overrides.annotations.length > 0 ? { annotations: overrides.annotations } : {}),
    ...(extra && Object.keys(extra).length > 0 ? { extra } : {}),
  };
}

/**
 * 创建一个可持久化的 message-stream 快照。
 */
export function createUserReadMeSnapshot(
  nodes: UserReadMeMessageNode[],
  updatedAt = Date.now(),
): UserReadMeMessageSnapshot {
  const normalizedNodes = ensureUserReadMeNodes(nodes).map(node => ({
    nodeId: node.nodeId,
    messageType: normalizeNodeMessageType(node.messageType),
    content: node.content,
    ...(Array.isArray(node.annotations) && node.annotations.length > 0 ? { annotations: node.annotations } : {}),
    ...(buildStableNodeExtra(node) ? { extra: buildStableNodeExtra(node) } : {}),
  }));

  return {
    v: 4,
    format: "message-stream",
    updateB64: stringToBase64(JSON.stringify(normalizedNodes)),
    updatedAt,
  };
}

/**
 * 将任意远端 snapshot 解析成个人主页可编辑的线性节点。
 * 当前会兼容旧的 BlockNote snapshot，把可见文本摊平成段落节点。
 */
export function decodeUserReadMeNodes(snapshot: StoredSnapshot | null | undefined): UserReadMeMessageNode[] {
  if (!snapshot) {
    return [];
  }

  if (isUserReadMeMessageSnapshot(snapshot)) {
    return decodeMessageNodes(snapshot.updateB64);
  }

  if (isStoredBlockNoteSnapshot(snapshot)) {
    const blocks = decodeBlockNoteBlocks(snapshot);
    const nodes: UserReadMeMessageNode[] = [];
    flattenBlockNoteBlocks(blocks, nodes);
    return nodes;
  }

  return [];
}

/**
 * 保证编辑器至少持有一个节点，避免空 surface 无法聚焦。
 */
export function ensureUserReadMeNodes(nodes: UserReadMeMessageNode[]): UserReadMeMessageNode[] {
  return nodes.length > 0 ? nodes : [createUserReadMeNode()];
}

/**
 * 判断 snapshot 是否为 ReadMe 的 message-stream 快照。
 */
export function isUserReadMeMessageSnapshot(snapshot: StoredSnapshot | null | undefined): snapshot is UserReadMeMessageSnapshot {
  const candidate = snapshot as UserReadMeMessageSnapshot | null | undefined;
  if (!candidate) {
    return false;
  }
  return candidate.v === 4
    && candidate.format === "message-stream"
    && typeof candidate.updateB64 === "string"
    && typeof candidate.updatedAt === "number";
}

/**
 * 以稳定字符串形式序列化节点，用于本地脏检查和保存去重。
 */
export function serializeUserReadMeNodes(nodes: UserReadMeMessageNode[]): string {
  return JSON.stringify(ensureUserReadMeNodes(nodes).map(node => ({
    nodeId: node.nodeId,
    messageType: normalizeNodeMessageType(node.messageType),
    content: node.content,
    annotations: node.annotations ?? [],
    extra: buildStableNodeExtra(node) ?? null,
  })));
}

/**
 * 在指定节点和选区位置执行 split。
 */
export function splitUserReadMeNode(
  nodes: UserReadMeMessageNode[],
  params: {
    nodeId: string;
    selectionStart: number;
    selectionEnd: number;
  },
): UserReadMeNodeSplitResult {
  const index = nodes.findIndex(node => node.nodeId === params.nodeId);
  if (index < 0) {
    const fallbackNode = createUserReadMeNode();
    return {
      nodes: [...nodes, fallbackNode],
      focus: { nodeId: fallbackNode.nodeId, caret: 0 },
    };
  }

  const current = nodes[index];
  const selectionStart = Math.max(0, Math.min(params.selectionStart, current.content.length));
  const selectionEnd = Math.max(selectionStart, Math.min(params.selectionEnd, current.content.length));
  const before = current.content.slice(0, selectionStart);
  const after = current.content.slice(selectionEnd);
  const currentMarks = getUserReadMeInlineMarks(current);
  const beforeMarks = currentMarks.flatMap((mark) => {
    if (mark.start >= selectionStart) {
      return [];
    }
    return [{
      ...mark,
      end: Math.min(mark.end, selectionStart),
    }];
  });
  const afterMarks = currentMarks.flatMap((mark) => {
    if (mark.end <= selectionEnd) {
      return [];
    }
    return [{
      ...mark,
      start: Math.max(0, mark.start - selectionEnd),
      end: mark.end - selectionEnd,
    }];
  });
  const currentNode = setUserReadMeInlineMarks({ ...current, content: before }, beforeMarks);
  const nextNode = createUserReadMeNode({
    messageType: current.messageType,
    annotations: current.annotations,
    content: after,
    extra: {
      ...(isRecord(current.extra) ? current.extra : {}),
      inlineMarks: afterMarks,
    },
  });
  const nextNodes = [...nodes];
  nextNodes.splice(index, 1, currentNode, nextNode);

  return {
    nodes: nextNodes,
    focus: {
      nodeId: nextNode.nodeId,
      caret: 0,
    },
  };
}

/**
 * 在节点开头执行 Backspace 合并。
 */
export function mergeUserReadMeNodeBackward(
  nodes: UserReadMeMessageNode[],
  nodeId: string,
): UserReadMeNodeMergeResult | null {
  const index = nodes.findIndex(node => node.nodeId === nodeId);
  if (index <= 0) {
    return null;
  }

  const previous = nodes[index - 1];
  const current = nodes[index];
  const mergedContent = previous.content + current.content;
  const mergedMarks = [
    ...getUserReadMeInlineMarks(previous),
    ...getUserReadMeInlineMarks(current).map(mark => ({
      ...mark,
      start: mark.start + previous.content.length,
      end: mark.end + previous.content.length,
    })),
  ];
  const nextNodes = [...nodes];
  nextNodes.splice(index - 1, 2, setUserReadMeInlineMarks({
    ...previous,
    content: mergedContent,
  }, mergedMarks));

  return {
    nodes: nextNodes,
    focus: {
      nodeId: previous.nodeId,
      caret: previous.content.length,
    },
  };
}

/**
 * 在节点结尾执行 Delete 合并。
 */
export function mergeUserReadMeNodeForward(
  nodes: UserReadMeMessageNode[],
  nodeId: string,
): UserReadMeNodeMergeResult | null {
  const index = nodes.findIndex(node => node.nodeId === nodeId);
  if (index < 0 || index >= nodes.length - 1) {
    return null;
  }

  const current = nodes[index];
  const next = nodes[index + 1];
  const mergedContent = current.content + next.content;
  const mergedMarks = [
    ...getUserReadMeInlineMarks(current),
    ...getUserReadMeInlineMarks(next).map(mark => ({
      ...mark,
      start: mark.start + current.content.length,
      end: mark.end + current.content.length,
    })),
  ];
  const nextNodes = [...nodes];
  nextNodes.splice(index, 2, setUserReadMeInlineMarks({
    ...current,
    content: mergedContent,
  }, mergedMarks));

  return {
    nodes: nextNodes,
    focus: {
      nodeId: current.nodeId,
      caret: current.content.length,
    },
  };
}

/**
 * 生成节点 ID。优先使用浏览器原生 uuid。
 */
export function createUserReadMeNodeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `readme-node-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
