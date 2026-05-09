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
  const extra = isRecord(value.extra) ? value.extra : undefined;

  return {
    nodeId: rawNodeId || createUserReadMeNodeId(),
    messageType: normalizeNodeMessageType(value.messageType),
    content,
    ...(annotations && annotations.length > 0 ? { annotations } : {}),
    ...(extra ? { extra } : {}),
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
  return {
    nodeId: typeof overrides.nodeId === "string" && overrides.nodeId.trim() ? overrides.nodeId : createUserReadMeNodeId(),
    messageType: normalizeNodeMessageType(overrides.messageType),
    content: typeof overrides.content === "string" ? overrides.content : "",
    ...(Array.isArray(overrides.annotations) && overrides.annotations.length > 0 ? { annotations: overrides.annotations } : {}),
    ...(isRecord(overrides.extra) ? { extra: overrides.extra } : {}),
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
    ...(isRecord(node.extra) ? { extra: node.extra } : {}),
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
    extra: node.extra ?? null,
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
  const nextNode = createUserReadMeNode({
    messageType: current.messageType,
    annotations: current.annotations,
    extra: current.extra,
    content: after,
  });
  const nextNodes = [...nodes];
  nextNodes.splice(index, 1, { ...current, content: before }, nextNode);

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
  const nextNodes = [...nodes];
  nextNodes.splice(index - 1, 2, {
    ...previous,
    content: mergedContent,
  });

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
  const nextNodes = [...nodes];
  nextNodes.splice(index, 2, {
    ...current,
    content: mergedContent,
  });

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
