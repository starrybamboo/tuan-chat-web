import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";

import { mergeDirectMessages } from "@tuanchat/domain/direct-message";

const OPTIMISTIC_DIRECT_SYNC_STATE = "optimistic";
const FAILED_DIRECT_SYNC_STATE = "failed";

export type MobileOptimisticDirectMessage = MessageDirectResponse & {
  tcLocalSyncState: typeof OPTIMISTIC_DIRECT_SYNC_STATE;
};

export type MobileFailedDirectMessage = MessageDirectResponse & {
  tcLocalSyncState: typeof FAILED_DIRECT_SYNC_STATE;
};

export type MobileLocalDirectMessage = MobileOptimisticDirectMessage | MobileFailedDirectMessage;

type CreateMobileOptimisticDirectMessageParams = {
  currentUserId: number | null | undefined;
  optimisticMessageId: number;
  optimisticSyncId: number;
  request: MessageDirectSendRequest;
  now?: Date;
};

function isPositiveUserId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isMobileOptimisticDirectMessage(message: MessageDirectResponse): boolean {
  return (message as Partial<MobileOptimisticDirectMessage>).tcLocalSyncState === OPTIMISTIC_DIRECT_SYNC_STATE;
}

export function isMobileFailedDirectMessage(message: MessageDirectResponse): boolean {
  return (message as Partial<MobileFailedDirectMessage>).tcLocalSyncState === FAILED_DIRECT_SYNC_STATE;
}

export function isMobileLocalDirectMessage(message: MessageDirectResponse): boolean {
  return isMobileOptimisticDirectMessage(message) || isMobileFailedDirectMessage(message);
}

export function filterPersistableDirectMessages(messages: readonly MessageDirectResponse[]): MessageDirectResponse[] {
  return messages.filter(message => !isMobileLocalDirectMessage(message));
}

export function createMobileOptimisticDirectMessage({
  currentUserId,
  optimisticMessageId,
  optimisticSyncId,
  request,
  now = new Date(),
}: CreateMobileOptimisticDirectMessageParams): MobileOptimisticDirectMessage | null {
  if (!isPositiveUserId(currentUserId) || !isPositiveUserId(request.receiverId)) {
    return null;
  }

  return {
    content: request.content ?? "",
    createTime: now.toISOString(),
    extra: request.extra ?? {},
    messageId: optimisticMessageId,
    messageType: request.messageType,
    receiverId: request.receiverId,
    replyMessageId: request.replyMessageId,
    senderId: currentUserId,
    status: 0,
    syncId: optimisticSyncId,
    tcLocalSyncState: OPTIMISTIC_DIRECT_SYNC_STATE,
    userId: currentUserId,
  } satisfies MobileOptimisticDirectMessage;
}

export function removeMobileOptimisticDirectMessageData(
  currentMessages: MessageDirectResponse[] | undefined,
  optimisticMessageId: number | null | undefined,
): MessageDirectResponse[] | undefined {
  if (typeof optimisticMessageId !== "number" || !currentMessages) {
    return currentMessages;
  }

  return currentMessages.filter(message => message.messageId !== optimisticMessageId);
}

export function markMobileOptimisticDirectMessageFailedData(
  currentMessages: MessageDirectResponse[] | undefined,
  optimisticMessageId: number | null | undefined,
): MessageDirectResponse[] | undefined {
  if (typeof optimisticMessageId !== "number" || !currentMessages) {
    return currentMessages;
  }

  return currentMessages.map((message) => {
    if (message.messageId !== optimisticMessageId) {
      return message;
    }
    return {
      ...message,
      tcLocalSyncState: FAILED_DIRECT_SYNC_STATE,
    } satisfies MobileFailedDirectMessage;
  });
}

export function removeMobileLocalDirectMessageData(
  currentMessages: MessageDirectResponse[] | undefined,
  localMessageId: number | null | undefined,
): MessageDirectResponse[] | undefined {
  if (typeof localMessageId !== "number" || !currentMessages) {
    return currentMessages;
  }

  return currentMessages.filter((message) => {
    return message.messageId !== localMessageId || !isMobileLocalDirectMessage(message);
  });
}

export function replaceMobileOptimisticDirectMessageData(
  currentMessages: MessageDirectResponse[] | undefined,
  optimisticMessageId: number | null | undefined,
  committedMessage: MessageDirectResponse | undefined,
): MessageDirectResponse[] | undefined {
  const withoutOptimistic = removeMobileOptimisticDirectMessageData(currentMessages, optimisticMessageId);
  if (!committedMessage) {
    return withoutOptimistic;
  }

  return mergeDirectMessages(withoutOptimistic, [committedMessage]);
}
