import type { ChatMessageResponse } from "../../../../api";

type PendingOptimisticReplyMessage = {
  optimisticMessageId: number;
} | null | undefined;

type ChatHistoryLike = {
  messages?: ChatMessageResponse[];
  replaceMessageById?: (fromMessageId: number, message: ChatMessageResponse) => Promise<void>;
};

type ReplyMessageReplacement = {
  fromMessageId: number;
  nextMessage: ChatMessageResponse;
};

export function collectOptimisticReplyMessageReplacements({
  messages,
  pendingMessages,
  fromReplyMessageId,
  toReplyMessageId,
}: {
  messages?: ChatMessageResponse[];
  pendingMessages: PendingOptimisticReplyMessage[];
  fromReplyMessageId: number;
  toReplyMessageId: number;
}): ReplyMessageReplacement[] {
  if (
    !Array.isArray(messages)
    || !Number.isFinite(fromReplyMessageId)
    || !Number.isFinite(toReplyMessageId)
    || fromReplyMessageId === toReplyMessageId
  ) {
    return [];
  }

  const messageMap = new Map<number, ChatMessageResponse>(
    messages.flatMap((item) => {
      const messageId = item.message.messageId;
      return typeof messageId === "number" ? [[messageId, item] as const] : [];
    }),
  );
  const replacements: ReplyMessageReplacement[] = [];

  for (const pending of pendingMessages) {
    const optimisticMessageId = pending?.optimisticMessageId;
    if (typeof optimisticMessageId !== "number") {
      continue;
    }
    const currentMessage = messageMap.get(optimisticMessageId);
    if (!currentMessage || currentMessage.message.replyMessageId !== fromReplyMessageId) {
      continue;
    }
    replacements.push({
      fromMessageId: optimisticMessageId,
      nextMessage: {
        ...currentMessage,
        message: {
          ...currentMessage.message,
          replyMessageId: toReplyMessageId,
        },
      },
    });
  }

  return replacements;
}

export async function syncOptimisticReplyMessageIds({
  chatHistory,
  pendingMessages,
  fromReplyMessageId,
  toReplyMessageId,
}: {
  chatHistory?: ChatHistoryLike | null;
  pendingMessages: PendingOptimisticReplyMessage[];
  fromReplyMessageId: number;
  toReplyMessageId: number;
}): Promise<void> {
  const replaceMessageById = chatHistory?.replaceMessageById;
  if (!replaceMessageById) {
    return;
  }

  const replacements = collectOptimisticReplyMessageReplacements({
    messages: chatHistory?.messages,
    pendingMessages,
    fromReplyMessageId,
    toReplyMessageId,
  });
  if (replacements.length === 0) {
    return;
  }

  await Promise.all(replacements.map(item => replaceMessageById(item.fromMessageId, item.nextMessage)));
}
