import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { markRoomMessagesDeleted, mergeRoomMessages } from "@tuanchat/query/room-message";
import {
  collectPersistedOptimisticDuplicateIds,
  mergeRoomMessagesForLocalState,
} from "@tuanchat/query/room-message-lifecycle";

export * from "./direct-messages";

export const ROOM_MESSAGES_TABLE_NAME = "room_messages";

export const ROOM_MESSAGE_SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS ${ROOM_MESSAGES_TABLE_NAME} (
    message_id INTEGER PRIMARY KEY NOT NULL,
    room_id INTEGER NOT NULL,
    sync_id INTEGER,
    position REAL,
    status INTEGER,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS room_messages_room_order_idx
    ON ${ROOM_MESSAGES_TABLE_NAME} (room_id, position, sync_id, message_id)`,
  `CREATE INDEX IF NOT EXISTS room_messages_room_sync_idx
    ON ${ROOM_MESSAGES_TABLE_NAME} (room_id, sync_id)`,
] as const;

export const MOBILE_QUERY_SNAPSHOTS_TABLE_NAME = "mobile_query_snapshots";

export const MOBILE_QUERY_SNAPSHOT_SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS ${MOBILE_QUERY_SNAPSHOTS_TABLE_NAME} (
    "key" TEXT NOT NULL,
    user_id INTEGER NOT NULL DEFAULT 0,
    scope TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER,
    PRIMARY KEY ("key", user_id, scope)
  )`,
  `CREATE INDEX IF NOT EXISTS mobile_query_snapshots_scope_idx
    ON ${MOBILE_QUERY_SNAPSHOTS_TABLE_NAME} (user_id, scope, expires_at)`,
  `CREATE INDEX IF NOT EXISTS mobile_query_snapshots_key_idx
    ON ${MOBILE_QUERY_SNAPSHOTS_TABLE_NAME} ("key")`,
] as const;

export const MOBILE_KV_TABLE_NAME = "mobile_kv_store";

export const MOBILE_KV_SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS ${MOBILE_KV_TABLE_NAME} (
    "key" TEXT NOT NULL,
    user_id INTEGER NOT NULL DEFAULT 0,
    scope TEXT NOT NULL DEFAULT '',
    value_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY ("key", user_id, scope)
  )`,
  `CREATE INDEX IF NOT EXISTS mobile_kv_store_scope_idx
    ON ${MOBILE_KV_TABLE_NAME} (user_id, scope)`,
] as const;

export type RoomMessageRecord = {
  message_id: number;
  room_id: number;
  sync_id: number | null;
  position: number | null;
  status: number | null;
  payload_json: string;
  updated_at: string;
};

export type RoomMessageRepository = {
  clearRoomMessages: (roomId: number) => Promise<void>;
  deleteMessagesByIds: (messageIds: number[]) => Promise<void>;
  getMaxSyncId: (roomId: number) => Promise<number>;
  getMessageById: (messageId: number) => Promise<ChatMessageResponse | null>;
  getMessagesByRoomId: (roomId: number) => Promise<ChatMessageResponse[]>;
  getMessagesSinceSyncId: (roomId: number, syncId: number) => Promise<ChatMessageResponse[]>;
  markMessagesDeleted: (messageIds: number[]) => Promise<void>;
  upsertMessages: (messages: ChatMessageResponse[]) => Promise<void>;
};

export type SqliteValue = number | string | Uint8Array | null;

export type LocalDbSqliteDriver = {
  all: <T>(sql: string, params?: SqliteValue[]) => Promise<T[]>;
  exec: (sql: string) => Promise<void>;
  run: (sql: string, params?: SqliteValue[]) => Promise<void>;
  transaction?: <T>(task: () => Promise<T>) => Promise<T>;
};

export type RoomMessageSqliteDriver = LocalDbSqliteDriver;

export type MobileCacheScopeOptions = {
  scope?: string | null;
  userId?: number | null;
};

export type QuerySnapshotRecord = {
  expires_at: number | null;
  key: string;
  payload_json: string;
  scope: string;
  updated_at: number;
  user_id: number;
};

export type QuerySnapshotEntry<T> = {
  expiresAt: number | null;
  key: string;
  payload: T;
  scope: string;
  updatedAt: number;
  userId: number | null;
};

export type QuerySnapshotWriteInput<T> = MobileCacheScopeOptions & {
  expiresAt?: number | null;
  key: string;
  now?: number;
  payload: T;
  ttlMs?: number | null;
};

export type QuerySnapshotReadOptions = MobileCacheScopeOptions & {
  now?: number;
};

export type QuerySnapshotRepository = {
  clearUserSnapshots: (userId: number) => Promise<void>;
  readSnapshot: <T>(key: string, options?: QuerySnapshotReadOptions) => Promise<QuerySnapshotEntry<T> | null>;
  removeExpiredSnapshots: (now?: number) => Promise<void>;
  removeSnapshot: (key: string, options?: MobileCacheScopeOptions) => Promise<void>;
  removeSnapshotsByPrefix: (prefix: string, options?: MobileCacheScopeOptions) => Promise<void>;
  writeSnapshot: <T>(input: QuerySnapshotWriteInput<T>) => Promise<void>;
};

export type MobileKeyValueRecord = {
  key: string;
  scope: string;
  updated_at: number;
  user_id: number;
  value_json: string;
};

export type MobileKeyValueEntry<T> = {
  key: string;
  scope: string;
  updatedAt: number;
  userId: number | null;
  value: T;
};

export type MobileKeyValueRepository = {
  clearUserValues: (userId: number) => Promise<void>;
  readValue: <T>(key: string, options?: MobileCacheScopeOptions) => Promise<MobileKeyValueEntry<T> | null>;
  removeValue: (key: string, options?: MobileCacheScopeOptions) => Promise<void>;
  removeValuesByPrefix: (prefix: string, options?: MobileCacheScopeOptions) => Promise<void>;
  writeValue: <T>(key: string, value: T, options?: MobileCacheScopeOptions & { now?: number }) => Promise<void>;
};

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function requireMessageId(message: ChatMessageResponse): number | null {
  const messageId = toFiniteNumber(message.message?.messageId);
  return messageId === null ? null : messageId;
}

function requireRoomId(message: ChatMessageResponse): number | null {
  const roomId = toFiniteNumber(message.message?.roomId);
  return roomId === null || roomId <= 0 ? null : roomId;
}

export function normalizeRoomMessagesForStorage(messages: ChatMessageResponse[]): ChatMessageResponse[] {
  return removePersistedOptimisticDuplicates(mergeRoomMessages(messages)).filter((message) => {
    return requireMessageId(message) !== null && requireRoomId(message) !== null;
  });
}

export function toRoomMessageRecord(message: ChatMessageResponse): RoomMessageRecord | null {
  const messageId = requireMessageId(message);
  const roomId = requireRoomId(message);
  if (messageId === null || roomId === null) {
    return null;
  }

  return {
    message_id: messageId,
    room_id: roomId,
    sync_id: toFiniteNumber(message.message.syncId),
    position: toFiniteNumber(message.message.position),
    status: toFiniteNumber(message.message.status),
    payload_json: JSON.stringify(message),
    updated_at: new Date().toISOString(),
  };
}

export function fromRoomMessageRecord(record: Pick<RoomMessageRecord, "payload_json">): ChatMessageResponse | null {
  try {
    const parsed = JSON.parse(record.payload_json) as ChatMessageResponse;
    return parsed?.message ? parsed : null;
  }
  catch {
    return null;
  }
}

export function fromRoomMessageRecords(records: Array<Pick<RoomMessageRecord, "payload_json">>): ChatMessageResponse[] {
  return removePersistedOptimisticDuplicates(mergeRoomMessages(records
    .map(record => fromRoomMessageRecord(record))
    .filter((message): message is ChatMessageResponse => message !== null)));
}

function removePersistedOptimisticDuplicates(messages: ChatMessageResponse[]): ChatMessageResponse[] {
  const duplicateIds = new Set(collectPersistedOptimisticDuplicateIds(messages));
  if (duplicateIds.size === 0) {
    return messages;
  }
  return messages.filter(message => !duplicateIds.has(message.message.messageId));
}

function isPositiveRoomId(roomId: number): boolean {
  return Number.isInteger(roomId) && roomId > 0;
}

function normalizeMessageIds(messageIds: number[]): number[] {
  return Array.from(new Set((messageIds ?? []).filter(id => Number.isInteger(id))));
}

function createPlaceholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

function normalizeCacheKey(key: string): string | null {
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCacheScope(scope: string | null | undefined): string {
  return scope?.trim() ?? "";
}

function normalizeCacheUserId(userId: number | null | undefined): number {
  return Number.isInteger(userId) && Number(userId) > 0 ? Number(userId) : 0;
}

function denormalizeCacheUserId(userId: number): number | null {
  return userId > 0 ? userId : null;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, match => `\\${match}`);
}

function toJsonString(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string") {
    throw new TypeError("缓存值必须是可 JSON 序列化的数据。");
  }
  return serialized;
}

function isExpired(expiresAt: number | null | undefined, now: number): boolean {
  return typeof expiresAt === "number" && Number.isFinite(expiresAt) && expiresAt <= now;
}

export function createRoomMessageRepository(driver: LocalDbSqliteDriver): RoomMessageRepository {
  let schemaReadyPromise: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    schemaReadyPromise ??= (async () => {
      for (const statement of ROOM_MESSAGE_SCHEMA_SQL) {
        await driver.exec(statement);
      }
    })();
    await schemaReadyPromise;
  }

  async function inTransaction<T>(task: () => Promise<T>): Promise<T> {
    if (driver.transaction) {
      return driver.transaction(task);
    }
    return task();
  }

  async function upsertPreparedMessages(messages: ChatMessageResponse[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    await ensureSchema();
    await inTransaction(async () => {
      const messageIds = normalizeMessageIds(messages
        .map(message => requireMessageId(message))
        .filter((messageId): messageId is number => messageId !== null));
      const existingRows = messageIds.length > 0
        ? await driver.all<Pick<RoomMessageRecord, "payload_json">>(
            `SELECT payload_json
              FROM ${ROOM_MESSAGES_TABLE_NAME}
              WHERE message_id IN (${createPlaceholders(messageIds.length)})`,
            messageIds,
          )
        : [];
      // Merge before writing so stale WS/history snapshots cannot revive local tombstones.
      const mergedMessages = normalizeRoomMessagesForStorage(mergeRoomMessagesForLocalState(
        fromRoomMessageRecords(existingRows),
        messages,
      ));

      for (const message of mergedMessages) {
        const record = toRoomMessageRecord(message);
        if (!record) {
          continue;
        }

        await driver.run(
          `INSERT OR REPLACE INTO ${ROOM_MESSAGES_TABLE_NAME}
            (message_id, room_id, sync_id, position, status, payload_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            record.message_id,
            record.room_id,
            record.sync_id,
            record.position,
            record.status,
            record.payload_json,
            record.updated_at,
          ],
        );
      }
    });
  }

  return {
    async clearRoomMessages(roomId) {
      if (!isPositiveRoomId(roomId)) {
        return;
      }

      await ensureSchema();
      await driver.run(`DELETE FROM ${ROOM_MESSAGES_TABLE_NAME} WHERE room_id = ?`, [roomId]);
    },

    async deleteMessagesByIds(messageIds) {
      const ids = normalizeMessageIds(messageIds);
      if (ids.length === 0) {
        return;
      }

      await ensureSchema();
      await driver.run(
        `DELETE FROM ${ROOM_MESSAGES_TABLE_NAME}
          WHERE message_id IN (${createPlaceholders(ids.length)})`,
        ids,
      );
    },

    async getMaxSyncId(roomId) {
      if (!isPositiveRoomId(roomId)) {
        return -1;
      }

      await ensureSchema();
      const rows = await driver.all<{ max_sync_id: number | null }>(
        `SELECT MAX(sync_id) AS max_sync_id
          FROM ${ROOM_MESSAGES_TABLE_NAME}
          WHERE room_id = ?`,
        [roomId],
      );
      const maxSyncId = rows[0]?.max_sync_id;
      return typeof maxSyncId === "number" && Number.isFinite(maxSyncId) ? maxSyncId : -1;
    },

    async getMessageById(messageId) {
      const ids = normalizeMessageIds([messageId]);
      if (ids.length === 0) {
        return null;
      }

      await ensureSchema();
      const rows = await driver.all<Pick<RoomMessageRecord, "payload_json">>(
        `SELECT payload_json
          FROM ${ROOM_MESSAGES_TABLE_NAME}
          WHERE message_id = ?
          LIMIT 1`,
        [ids[0]],
      );
      return fromRoomMessageRecords(rows)[0] ?? null;
    },

    async getMessagesByRoomId(roomId) {
      if (!isPositiveRoomId(roomId)) {
        return [];
      }

      await ensureSchema();
      const rows = await driver.all<Pick<RoomMessageRecord, "payload_json">>(
        `SELECT payload_json
          FROM ${ROOM_MESSAGES_TABLE_NAME}
          WHERE room_id = ?
          ORDER BY position ASC, sync_id ASC, message_id ASC`,
        [roomId],
      );
      return fromRoomMessageRecords(rows);
    },

    async getMessagesSinceSyncId(roomId, syncId) {
      if (!isPositiveRoomId(roomId)) {
        return [];
      }

      await ensureSchema();
      const rows = await driver.all<Pick<RoomMessageRecord, "payload_json">>(
        `SELECT payload_json
          FROM ${ROOM_MESSAGES_TABLE_NAME}
          WHERE room_id = ? AND sync_id >= ?
          ORDER BY position ASC, sync_id ASC, message_id ASC`,
        [roomId, syncId],
      );
      return fromRoomMessageRecords(rows);
    },

    async markMessagesDeleted(messageIds) {
      const ids = normalizeMessageIds(messageIds);
      if (ids.length === 0) {
        return;
      }

      await ensureSchema();
      const rows = await driver.all<Pick<RoomMessageRecord, "payload_json">>(
        `SELECT payload_json
          FROM ${ROOM_MESSAGES_TABLE_NAME}
          WHERE message_id IN (${createPlaceholders(ids.length)})`,
        ids,
      );
      await upsertPreparedMessages(markRoomMessagesDeleted(fromRoomMessageRecords(rows), ids));
    },

    async upsertMessages(messages) {
      await upsertPreparedMessages(normalizeRoomMessagesForStorage(messages));
    },
  };
}

export function createQuerySnapshotRepository(driver: LocalDbSqliteDriver): QuerySnapshotRepository {
  let schemaReadyPromise: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    schemaReadyPromise ??= (async () => {
      for (const statement of MOBILE_QUERY_SNAPSHOT_SCHEMA_SQL) {
        await driver.exec(statement);
      }
    })();
    await schemaReadyPromise;
  }

  async function removeSnapshotRecord(key: string, userId: number, scope: string): Promise<void> {
    await driver.run(
      `DELETE FROM ${MOBILE_QUERY_SNAPSHOTS_TABLE_NAME}
        WHERE "key" = ? AND user_id = ? AND scope = ?`,
      [key, userId, scope],
    );
  }

  return {
    async clearUserSnapshots(userId) {
      const normalizedUserId = normalizeCacheUserId(userId);
      if (normalizedUserId <= 0) {
        return;
      }

      await ensureSchema();
      await driver.run(`DELETE FROM ${MOBILE_QUERY_SNAPSHOTS_TABLE_NAME} WHERE user_id = ?`, [normalizedUserId]);
    },

    async readSnapshot<T>(key: string, options: QuerySnapshotReadOptions = {}): Promise<QuerySnapshotEntry<T> | null> {
      const normalizedKey = normalizeCacheKey(key);
      if (!normalizedKey) {
        return null;
      }

      const userId = normalizeCacheUserId(options.userId);
      const scope = normalizeCacheScope(options.scope);
      const now = options.now ?? Date.now();

      await ensureSchema();
      const rows = await driver.all<QuerySnapshotRecord>(
        `SELECT "key" AS key, user_id, scope, payload_json, updated_at, expires_at
          FROM ${MOBILE_QUERY_SNAPSHOTS_TABLE_NAME}
          WHERE "key" = ? AND user_id = ? AND scope = ?
          LIMIT 1`,
        [normalizedKey, userId, scope],
      );
      const record = rows[0];
      if (!record) {
        return null;
      }

      if (isExpired(record.expires_at, now)) {
        await removeSnapshotRecord(normalizedKey, userId, scope);
        return null;
      }

      try {
        return {
          expiresAt: record.expires_at,
          key: record.key,
          payload: JSON.parse(record.payload_json) as T,
          scope: record.scope,
          updatedAt: record.updated_at,
          userId: denormalizeCacheUserId(record.user_id),
        };
      }
      catch {
        await removeSnapshotRecord(normalizedKey, userId, scope);
        return null;
      }
    },

    async removeExpiredSnapshots(now = Date.now()) {
      await ensureSchema();
      await driver.run(
        `DELETE FROM ${MOBILE_QUERY_SNAPSHOTS_TABLE_NAME}
          WHERE expires_at IS NOT NULL AND expires_at <= ?`,
        [now],
      );
    },

    async removeSnapshot(key, options = {}) {
      const normalizedKey = normalizeCacheKey(key);
      if (!normalizedKey) {
        return;
      }

      await ensureSchema();
      await removeSnapshotRecord(
        normalizedKey,
        normalizeCacheUserId(options.userId),
        normalizeCacheScope(options.scope),
      );
    },

    async removeSnapshotsByPrefix(prefix, options = {}) {
      const normalizedPrefix = normalizeCacheKey(prefix);
      if (!normalizedPrefix) {
        return;
      }

      await ensureSchema();
      await driver.run(
        `DELETE FROM ${MOBILE_QUERY_SNAPSHOTS_TABLE_NAME}
          WHERE "key" LIKE ? ESCAPE '\\' AND user_id = ? AND scope = ?`,
        [
          `${escapeLikePattern(normalizedPrefix)}%`,
          normalizeCacheUserId(options.userId),
          normalizeCacheScope(options.scope),
        ],
      );
    },

    async writeSnapshot(input) {
      const normalizedKey = normalizeCacheKey(input.key);
      if (!normalizedKey) {
        return;
      }

      const now = input.now ?? Date.now();
      const expiresAt = input.expiresAt === undefined
        ? typeof input.ttlMs === "number" ? now + input.ttlMs : null
        : input.expiresAt;

      await ensureSchema();
      await driver.run(
        `INSERT OR REPLACE INTO ${MOBILE_QUERY_SNAPSHOTS_TABLE_NAME}
          ("key", user_id, scope, payload_json, updated_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [
          normalizedKey,
          normalizeCacheUserId(input.userId),
          normalizeCacheScope(input.scope),
          toJsonString(input.payload),
          now,
          typeof expiresAt === "number" && Number.isFinite(expiresAt) ? expiresAt : null,
        ],
      );
    },
  };
}

export function createMobileKeyValueRepository(driver: LocalDbSqliteDriver): MobileKeyValueRepository {
  let schemaReadyPromise: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    schemaReadyPromise ??= (async () => {
      for (const statement of MOBILE_KV_SCHEMA_SQL) {
        await driver.exec(statement);
      }
    })();
    await schemaReadyPromise;
  }

  async function removeValueRecord(key: string, userId: number, scope: string): Promise<void> {
    await driver.run(
      `DELETE FROM ${MOBILE_KV_TABLE_NAME}
        WHERE "key" = ? AND user_id = ? AND scope = ?`,
      [key, userId, scope],
    );
  }

  return {
    async clearUserValues(userId) {
      const normalizedUserId = normalizeCacheUserId(userId);
      if (normalizedUserId <= 0) {
        return;
      }

      await ensureSchema();
      await driver.run(`DELETE FROM ${MOBILE_KV_TABLE_NAME} WHERE user_id = ?`, [normalizedUserId]);
    },

    async readValue<T>(key: string, options: MobileCacheScopeOptions = {}): Promise<MobileKeyValueEntry<T> | null> {
      const normalizedKey = normalizeCacheKey(key);
      if (!normalizedKey) {
        return null;
      }

      const userId = normalizeCacheUserId(options.userId);
      const scope = normalizeCacheScope(options.scope);

      await ensureSchema();
      const rows = await driver.all<MobileKeyValueRecord>(
        `SELECT "key" AS key, user_id, scope, value_json, updated_at
          FROM ${MOBILE_KV_TABLE_NAME}
          WHERE "key" = ? AND user_id = ? AND scope = ?
          LIMIT 1`,
        [normalizedKey, userId, scope],
      );
      const record = rows[0];
      if (!record) {
        return null;
      }

      try {
        return {
          key: record.key,
          scope: record.scope,
          updatedAt: record.updated_at,
          userId: denormalizeCacheUserId(record.user_id),
          value: JSON.parse(record.value_json) as T,
        };
      }
      catch {
        await removeValueRecord(normalizedKey, userId, scope);
        return null;
      }
    },

    async removeValue(key, options = {}) {
      const normalizedKey = normalizeCacheKey(key);
      if (!normalizedKey) {
        return;
      }

      await ensureSchema();
      await removeValueRecord(
        normalizedKey,
        normalizeCacheUserId(options.userId),
        normalizeCacheScope(options.scope),
      );
    },

    async removeValuesByPrefix(prefix, options = {}) {
      const normalizedPrefix = normalizeCacheKey(prefix);
      if (!normalizedPrefix) {
        return;
      }

      await ensureSchema();
      await driver.run(
        `DELETE FROM ${MOBILE_KV_TABLE_NAME}
          WHERE "key" LIKE ? ESCAPE '\\' AND user_id = ? AND scope = ?`,
        [
          `${escapeLikePattern(normalizedPrefix)}%`,
          normalizeCacheUserId(options.userId),
          normalizeCacheScope(options.scope),
        ],
      );
    },

    async writeValue(key, value, options = {}) {
      const normalizedKey = normalizeCacheKey(key);
      if (!normalizedKey) {
        return;
      }

      await ensureSchema();
      await driver.run(
        `INSERT OR REPLACE INTO ${MOBILE_KV_TABLE_NAME}
          ("key", user_id, scope, value_json, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
        [
          normalizedKey,
          normalizeCacheUserId(options.userId),
          normalizeCacheScope(options.scope),
          toJsonString(value),
          options.now ?? Date.now(),
        ],
      );
    },
  };
}
