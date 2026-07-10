import type { WsMessage } from "./webSocketRuntimeTypes";

/**
 * 后端 WSBaseReq.data 是 String，业务 payload 需要先序列化后再上行。
 */
export function normalizeWebSocketRequestForSend<T>(request: WsMessage<T>): WsMessage<T | string> {
  if (request.data == null || typeof request.data === "string") {
    return request;
  }

  return {
    ...request,
    data: JSON.stringify(request.data),
  };
}
