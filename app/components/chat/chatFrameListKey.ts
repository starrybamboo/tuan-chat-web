import type { ChatMessageResponse } from "../../../api";

const STABLE_MESSAGE_KEY_FIELD = "__tcStableKey";

export function getChatFrameItemKey(index: number, item: ChatMessageResponse): string {
  const message = item?.message as (ChatMessageResponse["message"] & { [STABLE_MESSAGE_KEY_FIELD]?: unknown }) | undefined;
  const stableKey = message?.[STABLE_MESSAGE_KEY_FIELD];
  if ((typeof stableKey === "string" && stableKey.length > 0) || typeof stableKey === "number") {
    return `stable:${stableKey}`;
  }
  const messageId = message?.messageId;
  if (typeof messageId === "number" && Number.isFinite(messageId)) {
    return `id:${messageId}`;
  }
  const position = message?.position;
  if (typeof position === "number" && Number.isFinite(position)) {
    return `pos:${position.toFixed(6)}`;
  }
  return `idx:${index}`;
}
