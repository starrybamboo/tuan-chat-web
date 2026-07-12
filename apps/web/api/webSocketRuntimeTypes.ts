import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";
import type { ChatStatusPayload } from "./wsModels";

export interface ChatStatus {
  userId: number;
  status: ChatStatusPayload;
}

export interface WsMessage<T> {
  type: number;
  data?: T;
}

export type OptimisticDirectMessagePending = {
  channelId: number;
  cleanupTimer: ReturnType<typeof setTimeout>;
  request: MessageDirectSendRequest;
  createdAt: number;
};
