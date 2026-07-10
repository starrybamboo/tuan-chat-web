export const CHAT_LOCAL_DB_UNAVAILABLE_EVENT = "tuanchat:chat-local-db-unavailable";

export type ChatLocalDbUnavailableReason =
  | "insecure-context"
  | "missing-opfs-api"
  | "missing-worker-api"
  | "sqlite-wasm-worker-failed";

export type ChatLocalDbUnavailableEventDetail = {
  reason: ChatLocalDbUnavailableReason;
  message: string;
  suggestion?: string;
};

let pendingUnavailableEventDetail: ChatLocalDbUnavailableEventDetail | null = null;

export function logChatLocalDbUnavailable(detail: ChatLocalDbUnavailableEventDetail): void {
  console.warn("[ChatHistory] Local message cache unavailable.", detail);
}

export function dispatchChatLocalDbUnavailableEvent(detail: ChatLocalDbUnavailableEventDetail): void {
  pendingUnavailableEventDetail = detail;

  if (typeof window === "undefined") {
    logChatLocalDbUnavailable(detail);
    return;
  }

  window.dispatchEvent(new CustomEvent<ChatLocalDbUnavailableEventDetail>(CHAT_LOCAL_DB_UNAVAILABLE_EVENT, {
    detail,
  }));
}

export function consumeChatLocalDbUnavailableEvent(): ChatLocalDbUnavailableEventDetail | null {
  const detail = pendingUnavailableEventDetail;
  pendingUnavailableEventDetail = null;
  return detail;
}
