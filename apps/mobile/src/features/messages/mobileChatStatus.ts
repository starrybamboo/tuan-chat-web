import { useSyncExternalStore } from "react";

export type MobileChatStatusType = "idle" | "input" | "wait" | "leave";

export const DEFAULT_MOBILE_CHAT_STATUS_LABELS: Record<MobileChatStatusType, string> = {
  idle: "空闲",
  input: "正在输入",
  leave: "暂离",
  wait: "等待扮演",
};

export type MobileChatStatusPayload = {
  description: string;
  type: MobileChatStatusType;
};

export type MobileChatStatusEvent = {
  roomId: number;
  status: MobileChatStatusPayload;
  userId: number;
};

export type MobileChatStatusEntry = {
  status: MobileChatStatusPayload;
  userId: number;
};

type MobileChatStatusSnapshot = Record<number, MobileChatStatusEntry[]>;

type MobileChatStatusSender = (event: MobileChatStatusEvent) => boolean;

const EMPTY_SNAPSHOT: MobileChatStatusSnapshot = {};
const EMPTY_ENTRIES: MobileChatStatusEntry[] = [];
let chatStatusSnapshot: MobileChatStatusSnapshot = EMPTY_SNAPSHOT;
let statusSender: MobileChatStatusSender | null = null;

const listeners = new Set<() => void>();

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeMobileChatStatusDescription(value: unknown, type: MobileChatStatusType): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 15)
    : DEFAULT_MOBILE_CHAT_STATUS_LABELS[type];
}

export function isMobileChatStatusType(value: unknown): value is MobileChatStatusType {
  return value === "idle" || value === "input" || value === "wait" || value === "leave";
}

export function subscribeMobileChatStatus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitMobileChatStatusChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getMobileChatStatusSnapshot() {
  return chatStatusSnapshot;
}

function upsertMobileChatStatusSnapshot(event: MobileChatStatusEvent): MobileChatStatusSnapshot {
  const currentEntries = chatStatusSnapshot[event.roomId] ?? [];
  const nextEntries = event.status.type === "idle"
    ? currentEntries.filter(entry => entry.userId !== event.userId)
    : (() => {
        const existingIndex = currentEntries.findIndex(entry => entry.userId === event.userId);
        if (existingIndex < 0) {
          return [...currentEntries, { userId: event.userId, status: event.status }];
        }
        return currentEntries.map((entry, index) => (
          index === existingIndex ? { ...entry, status: event.status } : entry
        ));
      })();

  if (nextEntries.length === currentEntries.length && nextEntries.every((entry, index) => (
    entry.userId === currentEntries[index]?.userId
    && entry.status.type === currentEntries[index]?.status.type
    && entry.status.description === currentEntries[index]?.status.description
  ))) {
    return chatStatusSnapshot;
  }

  const nextSnapshot = { ...chatStatusSnapshot };
  if (nextEntries.length > 0) {
    nextSnapshot[event.roomId] = nextEntries;
  }
  else {
    delete nextSnapshot[event.roomId];
  }
  return nextSnapshot;
}

export function applyMobileChatStatusEvent(event: MobileChatStatusEvent) {
  if (!isPositiveInteger(event.roomId) || !isPositiveInteger(event.userId) || !isMobileChatStatusType(event.status.type)) {
    return;
  }

  const nextSnapshot = upsertMobileChatStatusSnapshot(event);
  if (nextSnapshot === chatStatusSnapshot) {
    return;
  }

  chatStatusSnapshot = nextSnapshot;
  emitMobileChatStatusChange();
}

export function parseMobileChatStatusEvent(input: unknown): MobileChatStatusEvent | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Partial<MobileChatStatusEvent> & { status?: unknown };
  const rawStatus = raw.status as Partial<MobileChatStatusPayload> | undefined;
  if (
    !isPositiveInteger(raw.roomId)
    || !isPositiveInteger(raw.userId)
    || !rawStatus
    || typeof rawStatus !== "object"
    || !isMobileChatStatusType(rawStatus.type)
  ) {
    return null;
  }

  return {
    roomId: raw.roomId,
    status: {
      description: normalizeMobileChatStatusDescription(rawStatus.description, rawStatus.type),
      type: rawStatus.type,
    },
    userId: raw.userId,
  };
}

export function registerMobileChatStatusSender(sender: MobileChatStatusSender | null) {
  statusSender = sender;
  return () => {
    if (statusSender === sender) {
      statusSender = null;
    }
  };
}

export function sendMobileChatStatus(event: MobileChatStatusEvent) {
  applyMobileChatStatusEvent(event);
  return statusSender?.(event) ?? false;
}

export function useMobileChatStatus(roomId: number | null | undefined, userId: number | null | undefined) {
  const snapshot = useSyncExternalStore(
    subscribeMobileChatStatus,
    getMobileChatStatusSnapshot,
    getMobileChatStatusSnapshot,
  );

  if (!isPositiveInteger(roomId) || !isPositiveInteger(userId)) {
    return "idle";
  }

  return snapshot[roomId]?.find(entry => entry.userId === userId)?.status.type ?? "idle";
}

export function useMobileChatStatusEntries(roomId: number | null | undefined) {
  const snapshot = useSyncExternalStore(
    subscribeMobileChatStatus,
    getMobileChatStatusSnapshot,
    getMobileChatStatusSnapshot,
  );

  if (!isPositiveInteger(roomId)) {
    return EMPTY_ENTRIES;
  }

  return snapshot[roomId] ?? EMPTY_ENTRIES;
}
