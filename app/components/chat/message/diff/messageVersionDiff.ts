import { buildMessageTextDiff } from "@/components/chat/message/diff/messageTextDiff";

import type { ChatMessageResponse } from "../../../../../api";

export const VERSION_STATE_MODIFIED = 1;

export type BaseArchiveMessageIndex = Map<number, ChatMessageResponse>;
export type FullMessageVersionDiffKind = "added" | "modified" | "unchanged" | "deleted";

export type FullMessageVersionDiffItem = {
  key: string;
  kind: FullMessageVersionDiffKind;
  currentMessage: ChatMessageResponse | null;
  baseMessage: ChatMessageResponse | null;
  diff: ReturnType<typeof buildMessageTextDiff>;
};

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function resolveMessageDiffBaseCommitId({
  parentCommitId,
  repositoryCommitId,
}: {
  parentCommitId?: number | null;
  repositoryCommitId?: number | null;
}): number | undefined {
  if (isPositiveFiniteNumber(parentCommitId)) {
    return parentCommitId;
  }
  return isPositiveFiniteNumber(repositoryCommitId) ? repositoryCommitId : undefined;
}

function getArchiveMessageIndexKey(response: ChatMessageResponse): number | null {
  const message = response.message;
  const archiveMessageId = message.inheritedArchiveMessageId ?? message.messageId;
  return isPositiveFiniteNumber(archiveMessageId)
    ? archiveMessageId
    : null;
}

export function buildBaseArchiveMessageIndex(messages: ChatMessageResponse[]): BaseArchiveMessageIndex {
  const index: BaseArchiveMessageIndex = new Map();
  for (const response of messages) {
    if (!response?.message) {
      continue;
    }
    const key = getArchiveMessageIndexKey(response);
    if (key == null) {
      continue;
    }
    index.set(key, response);
  }
  return index;
}

export function getBaseMessageForVersionDiff(
  currentMessage: ChatMessageResponse,
  baseMessageByArchiveId: BaseArchiveMessageIndex,
): ChatMessageResponse | null {
  const message = currentMessage.message;
  if (message.versionState !== VERSION_STATE_MODIFIED) {
    return null;
  }
  const inheritedArchiveMessageId = message.inheritedArchiveMessageId;
  if (typeof inheritedArchiveMessageId !== "number" || !Number.isFinite(inheritedArchiveMessageId)) {
    return null;
  }
  const baseMessage = baseMessageByArchiveId.get(inheritedArchiveMessageId) ?? null;
  if (!baseMessage) {
    return null;
  }
  if ((baseMessage.message.content ?? "") === (message.content ?? "")) {
    return null;
  }
  return baseMessage;
}

function getInheritedArchiveMessageId(response: ChatMessageResponse): number | null {
  const inheritedArchiveMessageId = response.message.inheritedArchiveMessageId;
  return isPositiveFiniteNumber(inheritedArchiveMessageId)
    ? inheritedArchiveMessageId
    : null;
}

function getMessageSortValue(response: ChatMessageResponse, fallback: number): number {
  const position = response.message.position;
  if (typeof position === "number" && Number.isFinite(position)) {
    return position;
  }
  const syncId = response.message.syncId;
  if (typeof syncId === "number" && Number.isFinite(syncId)) {
    return syncId;
  }
  return fallback;
}

function createAddedItem(response: ChatMessageResponse, index: number): FullMessageVersionDiffItem {
  return {
    key: `current:${response.message.messageId}:${index}`,
    kind: "added",
    currentMessage: response,
    baseMessage: null,
    diff: buildMessageTextDiff("", response.message.content ?? ""),
  };
}

function createDeletedItem(response: ChatMessageResponse, archiveMessageId: number): FullMessageVersionDiffItem {
  return {
    key: `base:${archiveMessageId}`,
    kind: "deleted",
    currentMessage: null,
    baseMessage: response,
    diff: buildMessageTextDiff(response.message.content ?? "", ""),
  };
}

export function buildFullMessageVersionDiffItems(
  currentMessages: ChatMessageResponse[],
  baseMessageByArchiveId: BaseArchiveMessageIndex,
): FullMessageVersionDiffItem[] {
  const matchedBaseArchiveIds = new Set<number>();
  const currentItems = currentMessages.map<FullMessageVersionDiffItem>((currentMessage, index) => {
    const inheritedArchiveMessageId = getInheritedArchiveMessageId(currentMessage);
    if (inheritedArchiveMessageId == null) {
      return createAddedItem(currentMessage, index);
    }

    const baseMessage = baseMessageByArchiveId.get(inheritedArchiveMessageId) ?? null;
    if (!baseMessage) {
      return createAddedItem(currentMessage, index);
    }

    matchedBaseArchiveIds.add(inheritedArchiveMessageId);
    const diff = buildMessageTextDiff(baseMessage.message.content ?? "", currentMessage.message.content ?? "");
    return {
      key: `current:${currentMessage.message.messageId}:${inheritedArchiveMessageId}`,
      kind: diff.hasChanges ? "modified" : "unchanged",
      currentMessage,
      baseMessage,
      diff,
    };
  });

  const deletedItems = Array.from(baseMessageByArchiveId.entries())
    .filter(([archiveMessageId]) => !matchedBaseArchiveIds.has(archiveMessageId))
    .sort(([, left], [, right]) => getMessageSortValue(left, 0) - getMessageSortValue(right, 0))
    .map(([archiveMessageId, baseMessage]) => createDeletedItem(baseMessage, archiveMessageId));

  return [...currentItems, ...deletedItems];
}
