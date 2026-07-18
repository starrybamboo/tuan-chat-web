import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";

import type { ChatStatusPayload } from "./wsModels";

export type ChatStatus = {
  userId: number;
  status: ChatStatusPayload;
};

export type WsMessage<T> = {
  type: number;
  data?: T;
};

export type OptimisticDirectMessagePending = {
  channelId: number;
  cleanupTimer: ReturnType<typeof setTimeout>;
  pendingWritePromise: Promise<void>;
  request: MessageDirectSendRequest;
  createdAt: number;
};
