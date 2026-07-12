import type { ChatStatusType } from "../../../api/wsModels";

export const CHAT_STATUS_LABEL_MAX_LENGTH = 15;
export const CHAT_STATUS_LABEL_STORAGE_KEY = "tuanchat.chatStatusLabels";

export const DEFAULT_CHAT_STATUS_LABELS: Record<ChatStatusType, string> = {
  idle: "空闲",
  input: "正在输入",
  wait: "等待扮演",
  leave: "暂时离开",
};

const LEGACY_DEFAULT_CHAT_STATUS_LABELS: Partial<Record<ChatStatusType, string>> = {
  input: "输入中",
  leave: "暂离",
};

export function normalizeChatStatusLabel(value: string, fallback: string): string {
  return value.trim().slice(0, CHAT_STATUS_LABEL_MAX_LENGTH) || fallback;
}

export function normalizeChatStatusDescription(status: ChatStatusType, value: string): string {
  const normalizedValue = normalizeChatStatusLabel(value, DEFAULT_CHAT_STATUS_LABELS[status]);
  return normalizedValue === LEGACY_DEFAULT_CHAT_STATUS_LABELS[status]
    ? DEFAULT_CHAT_STATUS_LABELS[status]
    : normalizedValue;
}

export function readChatStatusLabelsFromLocalStorage(): Record<ChatStatusType, string> {
  if (typeof window === "undefined") {
    return DEFAULT_CHAT_STATUS_LABELS;
  }
  try {
    const raw = window.localStorage.getItem(CHAT_STATUS_LABEL_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CHAT_STATUS_LABELS;
    }
    const parsed = JSON.parse(raw) as Partial<Record<ChatStatusType, unknown>>;
    return (Object.keys(DEFAULT_CHAT_STATUS_LABELS) as ChatStatusType[]).reduce((labels, status) => {
      const value = parsed[status];
      labels[status] = typeof value === "string"
        ? normalizeChatStatusDescription(status, value)
        : DEFAULT_CHAT_STATUS_LABELS[status];
      return labels;
    }, {} as Record<ChatStatusType, string>);
  }
  catch {
    return DEFAULT_CHAT_STATUS_LABELS;
  }
}

export function writeChatStatusLabelsToLocalStorage(labels: Record<ChatStatusType, string>): void {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = (Object.keys(DEFAULT_CHAT_STATUS_LABELS) as ChatStatusType[]).reduce((next, status) => {
    next[status] = normalizeChatStatusDescription(status, labels[status]);
    return next;
  }, {} as Record<ChatStatusType, string>);
  window.localStorage.setItem(CHAT_STATUS_LABEL_STORAGE_KEY, JSON.stringify(normalized));
}
