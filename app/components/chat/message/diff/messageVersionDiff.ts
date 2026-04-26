import type { ChatMessageResponse } from "../../../../../api";

export const VERSION_STATE_MODIFIED = 1;

export type BaseArchiveMessageIndex = Map<number, ChatMessageResponse>;

function getArchiveMessageIndexKey(response: ChatMessageResponse): number | null {
  const message = response.message;
  const archiveMessageId = message.inheritedArchiveMessageId ?? message.messageId;
  return typeof archiveMessageId === "number" && Number.isFinite(archiveMessageId)
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
