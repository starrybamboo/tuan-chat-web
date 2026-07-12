import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";

export const ROOM_MESSAGE_SEND_REQUEST_TYPE = 3;
export const ROOM_MESSAGE_SEND_RESULT_TYPE = 26;

export type MobileRoomMessageSendResult = {
  error?: string | null;
  message?: Message | null;
  requestId: string;
  success: boolean;
};

export type MobileRoomMessageWebSocketSender = (
  requestId: string,
  request: ChatMessageRequest,
) => Promise<MobileRoomMessageSendResult> | null;

export class MobileRoomMessageDeliveryUnknownError extends Error {
  constructor() {
    super("连接中断，正在等待消息同步确认。");
    this.name = "MobileRoomMessageDeliveryUnknownError";
  }
}

let webSocketSender: MobileRoomMessageWebSocketSender | null = null;
let requestSequence = 0;

export function createMobileRoomMessageRequestId(): string {
  requestSequence += 1;
  return `mobile-${Date.now().toString(36)}-${requestSequence.toString(36)}`;
}

export function registerMobileRoomMessageWebSocketSender(sender: MobileRoomMessageWebSocketSender | null) {
  webSocketSender = sender;
  return () => {
    if (webSocketSender === sender) {
      webSocketSender = null;
    }
  };
}

export function trySendMobileRoomMessageByWebSocket(
  requestId: string,
  request: ChatMessageRequest,
): Promise<MobileRoomMessageSendResult> | null {
  return webSocketSender?.(requestId, request) ?? null;
}

export function parseMobileRoomMessageSendResult(input: unknown): MobileRoomMessageSendResult | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const result = input as Partial<MobileRoomMessageSendResult>;
  if (typeof result.requestId !== "string" || !result.requestId.trim() || typeof result.success !== "boolean") {
    return null;
  }

  if (result.success && (!result.message || typeof result.message !== "object")) {
    return null;
  }

  return {
    error: typeof result.error === "string" ? result.error : null,
    message: result.message ?? null,
    requestId: result.requestId,
    success: result.success,
  };
}
