import type { ChatMessageResponse } from "../../../../api";

type CommitBatchOptimisticMessagesParams = {
  optimisticMessages: ChatMessageResponse[];
  createdMessages: ChatMessageResponse["message"][];
  addOrUpdateMessage?: (message: ChatMessageResponse) => Promise<void> | void;
  addOrUpdateMessages?: (messages: ChatMessageResponse[]) => Promise<void> | void;
  replaceMessageById?: (fromMessageId: number, message: ChatMessageResponse) => Promise<void>;
};

export function buildCommittedBatchResponses(
  optimisticMessages: ChatMessageResponse[],
  createdMessages: ChatMessageResponse["message"][],
): ChatMessageResponse[] {
  return createdMessages.map((createdMessage, index) => ({
    message: {
      ...createdMessage,
      position: typeof createdMessage.position === "number"
        ? createdMessage.position
        : optimisticMessages[index]?.message.position,
    },
  }));
}

export async function commitBatchOptimisticMessages({
  optimisticMessages,
  createdMessages,
  addOrUpdateMessage,
  addOrUpdateMessages,
  replaceMessageById,
}: CommitBatchOptimisticMessagesParams): Promise<ChatMessageResponse[]> {
  const committedResponses = buildCommittedBatchResponses(optimisticMessages, createdMessages);

  if (replaceMessageById) {
    for (let index = 0; index < committedResponses.length; index += 1) {
      const optimisticMessage = optimisticMessages[index];
      const committedResponse = committedResponses[index];
      if (!optimisticMessage || !committedResponse) {
        continue;
      }
      await replaceMessageById(optimisticMessage.message.messageId, committedResponse);
    }
    return committedResponses;
  }

  if (addOrUpdateMessages) {
    await addOrUpdateMessages(committedResponses);
    return committedResponses;
  }

  if (addOrUpdateMessage) {
    for (const response of committedResponses) {
      await addOrUpdateMessage(response);
    }
  }

  return committedResponses;
}
