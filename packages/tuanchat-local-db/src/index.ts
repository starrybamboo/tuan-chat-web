import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { markRoomMessagesDeleted, mergeRoomMessages } from "@tuanchat/query/room-message";

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
  getMessagesByRoomId: (roomId: number) => Promise<ChatMessageResponse[]>;
  getMessagesSinceSyncId: (roomId: number, syncId: number) => Promise<ChatMessageResponse[]>;
  markMessagesDeleted: (messageIds: number[]) => Promise<void>;
  upsertMessages: (messages: ChatMessageResponse[]) => Promise<void>;
};

export type SqliteValue = number | string | Uint8Array | null;

export type RoomMessageSqliteDriver = {
  all: <T>(sql: string, params?: SqliteValue[]) => Promise<T[]>;
  exec: (sql: string) => Promise<void>;
  run: (sql: string, params?: SqliteValue[]) => Promise<void>;
  transaction?: <T>(task: () => Promise<T>) => Promise<T>;
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
  return mergeRoomMessages(messages).filter((message) => {
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
  return mergeRoomMessages(records
    .map(record => fromRoomMessageRecord(record))
    .filter((message): message is ChatMessageResponse => message !== null));
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

export function createRoomMessageRepository(driver: RoomMessageSqliteDriver): RoomMessageRepository {
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
      for (const message of messages) {
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
