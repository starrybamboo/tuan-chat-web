import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";
import type { ChatStatusType } from "./wsModels";

export interface ChatStatus {
  userId: number;
  status: ChatStatusType;
}

export interface WsMessage<T> {
  type: number;
  data?: T;
}

export type OptimisticDirectMessagePending = {
  channelId: number;
  request: MessageDirectSendRequest;
  createdAt: number;
};
