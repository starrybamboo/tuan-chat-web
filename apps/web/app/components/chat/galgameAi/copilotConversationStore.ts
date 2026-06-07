import type { GalPatchProposal } from "./authoringTypes";
import type { CopilotContextRef } from "./copilotContextRefs";

import { normalizeCopilotContextRefs } from "./copilotContextRefs";

const STORAGE_KEY_PREFIX = "tc:gal-copilot-conversation:";
export const MAX_ROOM_COPILOT_MESSAGES = 80;

type RoomCopilotMessageRole = "assistant" | "user";
type RoomCopilotMessageStatus = "pending" | "success" | "error";

export type PersistedRoomCopilotMessage = {
  id: string;
  role: RoomCopilotMessageRole;
  content: string;
  status?: RoomCopilotMessageStatus;
  repairMessage?: string | null;
  error?: string | null;
  proposalId?: string | null;
  contextRefs?: CopilotContextRef[];
};

export type RoomCopilotConversationMessageInput = PersistedRoomCopilotMessage & {
  progressMessage?: string | null;
  proposal?: Pick<GalPatchProposal, "proposalId"> | null;
};

export type RoomCopilotConversationStore = {
  get: (roomId: string) => Promise<PersistedRoomCopilotMessage[]>;
  save: (roomId: string, messages: readonly RoomCopilotConversationMessageInput[]) => Promise<void>;
  getContextRefs: (roomId: string) => Promise<CopilotContextRef[]>;
  saveContextRefs: (roomId: string, refs: readonly CopilotContextRef[]) => Promise<void>;
  clear: (roomId: string) => Promise<void>;
};

type StoredRoomCopilotConversationV1 = {
  version: 1;
  roomId: string;
  updateTime: string;
  messages: PersistedRoomCopilotMessage[];
};

type StoredRoomCopilotConversationV2 = {
  version: 2;
  roomId: string;
  updateTime: string;
  messages: PersistedRoomCopilotMessage[];
  contextRefs: CopilotContextRef[];
};

type StoredRoomCopilotConversation = StoredRoomCopilotConversationV1 | StoredRoomCopilotConversationV2;

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  }
  catch {
    return null;
  }
}

function storageKey(roomId: string) {
  return `${STORAGE_KEY_PREFIX}${roomId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRoomCopilotRole(value: unknown): value is RoomCopilotMessageRole {
  return value === "assistant" || value === "user";
}

function isRoomCopilotStatus(value: unknown): value is RoomCopilotMessageStatus {
  return value === "pending" || value === "success" || value === "error";
}

function readOptionalString(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (value === null) {
    return null;
  }
  return undefined;
}

export function normalizePersistedRoomCopilotMessage(value: unknown): PersistedRoomCopilotMessage | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.id !== "string" || !isRoomCopilotRole(value.role) || typeof value.content !== "string") {
    return null;
  }

  const message: PersistedRoomCopilotMessage = {
    id: value.id,
    role: value.role,
    content: value.content,
  };
  const status = isRoomCopilotStatus(value.status) ? value.status : undefined;
  if (status === "pending" && value.role === "assistant") {
    message.status = "error";
    message.error = "上次生成被中断，已经停止在这里。";
  }
  else if (status) {
    message.status = status;
  }

  const repairMessage = readOptionalString(value.repairMessage);
  if (repairMessage !== undefined) {
    message.repairMessage = repairMessage;
  }

  const error = readOptionalString(value.error);
  if (error !== undefined && message.error === undefined) {
    message.error = error;
  }

  const proposalId = readOptionalString(value.proposalId);
  if (proposalId !== undefined) {
    message.proposalId = proposalId;
  }

  if (Array.isArray(value.contextRefs)) {
    const contextRefs = normalizeCopilotContextRefs(value.contextRefs);
    if (contextRefs.length > 0) {
      message.contextRefs = contextRefs;
    }
  }

  return message;
}

export function normalizeRoomCopilotConversationMessages(messages: readonly unknown[]): PersistedRoomCopilotMessage[] {
  return messages
    .map(normalizePersistedRoomCopilotMessage)
    .filter((message): message is PersistedRoomCopilotMessage => message !== null)
    .slice(-MAX_ROOM_COPILOT_MESSAGES);
}

export function toPersistedRoomCopilotMessages(
  messages: readonly RoomCopilotConversationMessageInput[],
): PersistedRoomCopilotMessage[] {
  return normalizeRoomCopilotConversationMessages(
    messages
      .filter(message => message.id !== "assistant:intro" && message.content.trim().length > 0)
      .map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        status: message.status,
        repairMessage: message.repairMessage,
        error: message.error,
        proposalId: message.proposal?.proposalId ?? message.proposalId ?? null,
        contextRefs: message.contextRefs,
      })),
  );
}

function readStoredConversation(rawValue: string | null): {
  messages: PersistedRoomCopilotMessage[];
  contextRefs: CopilotContextRef[];
} {
  if (!rawValue) {
    return { messages: [], contextRefs: [] };
  }
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (Array.isArray(parsed)) {
      return {
        messages: normalizeRoomCopilotConversationMessages(parsed),
        contextRefs: [],
      };
    }
    if (isRecord(parsed) && Array.isArray(parsed.messages)) {
      return {
        messages: normalizeRoomCopilotConversationMessages(parsed.messages),
        contextRefs: Array.isArray(parsed.contextRefs) ? normalizeCopilotContextRefs(parsed.contextRefs) : [],
      };
    }
    return { messages: [], contextRefs: [] };
  }
  catch {
    return { messages: [], contextRefs: [] };
  }
}

export class LocalStorageRoomCopilotConversationStore implements RoomCopilotConversationStore {
  async get(roomId: string): Promise<PersistedRoomCopilotMessage[]> {
    const storage = getLocalStorage();
    if (!storage) {
      return [];
    }
    return readStoredConversation(storage.getItem(storageKey(roomId))).messages;
  }

  async save(roomId: string, messages: readonly RoomCopilotConversationMessageInput[]): Promise<void> {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }
    const persistedMessages = toPersistedRoomCopilotMessages(messages);
    const existingConversation = readStoredConversation(storage.getItem(storageKey(roomId)));
    const key = storageKey(roomId);
    if (persistedMessages.length === 0 && existingConversation.contextRefs.length === 0) {
      storage.removeItem(key);
      return;
    }
    const payload: StoredRoomCopilotConversation = {
      version: 2,
      roomId,
      updateTime: new Date().toISOString(),
      messages: persistedMessages,
      contextRefs: existingConversation.contextRefs,
    };
    storage.setItem(key, JSON.stringify(payload));
  }

  async getContextRefs(roomId: string): Promise<CopilotContextRef[]> {
    const storage = getLocalStorage();
    if (!storage) {
      return [];
    }
    return readStoredConversation(storage.getItem(storageKey(roomId))).contextRefs;
  }

  async saveContextRefs(roomId: string, refs: readonly CopilotContextRef[]): Promise<void> {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }
    const existingConversation = readStoredConversation(storage.getItem(storageKey(roomId)));
    const contextRefs = normalizeCopilotContextRefs(refs);
    const key = storageKey(roomId);
    if (existingConversation.messages.length === 0 && contextRefs.length === 0) {
      storage.removeItem(key);
      return;
    }
    const payload: StoredRoomCopilotConversation = {
      version: 2,
      roomId,
      updateTime: new Date().toISOString(),
      messages: existingConversation.messages,
      contextRefs,
    };
    storage.setItem(key, JSON.stringify(payload));
  }

  async clear(roomId: string): Promise<void> {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }
    storage.removeItem(storageKey(roomId));
  }
}

export class MemoryRoomCopilotConversationStore implements RoomCopilotConversationStore {
  private readonly messagesByRoom = new Map<string, PersistedRoomCopilotMessage[]>();
  private readonly contextRefsByRoom = new Map<string, CopilotContextRef[]>();

  async get(roomId: string): Promise<PersistedRoomCopilotMessage[]> {
    return normalizeRoomCopilotConversationMessages(this.messagesByRoom.get(roomId) ?? []);
  }

  async save(roomId: string, messages: readonly RoomCopilotConversationMessageInput[]): Promise<void> {
    const persistedMessages = toPersistedRoomCopilotMessages(messages);
    if (persistedMessages.length === 0) {
      this.messagesByRoom.delete(roomId);
      return;
    }
    this.messagesByRoom.set(roomId, persistedMessages);
  }

  async getContextRefs(roomId: string): Promise<CopilotContextRef[]> {
    return normalizeCopilotContextRefs(this.contextRefsByRoom.get(roomId) ?? []);
  }

  async saveContextRefs(roomId: string, refs: readonly CopilotContextRef[]): Promise<void> {
    const contextRefs = normalizeCopilotContextRefs(refs);
    if (contextRefs.length === 0) {
      this.contextRefsByRoom.delete(roomId);
      return;
    }
    this.contextRefsByRoom.set(roomId, contextRefs);
  }

  async clear(roomId: string): Promise<void> {
    this.messagesByRoom.delete(roomId);
    this.contextRefsByRoom.delete(roomId);
  }
}

export const roomCopilotConversationStore: RoomCopilotConversationStore = new LocalStorageRoomCopilotConversationStore();
