import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Database, SqlValue } from "sql.js";

import path from "node:path";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";

import {
  createRoomMessageRepository,
  fromRoomMessageRecord,
  fromRoomMessageRecords,
  normalizeRoomMessagesForStorage,
  ROOM_MESSAGE_SCHEMA_SQL,
  toRoomMessageRecord,
} from "./index";

function createMessage(messageId: number, overrides: Partial<ChatMessageResponse["message"]> = {}): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      messageId,
      messageType: 1,
      position: messageId,
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
      ...overrides,
    },
  };
}

async function createMemoryRepository() {
  const SQL = await initSqlJs({
    locateFile: file => path.resolve(process.cwd(), "node_modules/sql.js/dist", file),
  });
  const db = new SQL.Database();

  function mapRows<T extends Record<string, unknown>>(database: Database, sql: string, params: SqlValue[]): T[] {
    const result = database.exec(sql, params);
    const first = result[0];
    if (!first) {
      return [];
    }
    return first.values.map((values) => {
      const row: Record<string, unknown> = {};
      first.columns.forEach((column, index) => {
        row[column] = values[index];
      });
      return row as T;
    });
  }

  return createRoomMessageRepository({
    all: async (sql, params = []) => mapRows(db, sql, params as SqlValue[]),
    exec: async (sql) => {
      db.run(sql);
    },
    run: async (sql, params = []) => {
      db.run(sql, params as SqlValue[]);
    },
    transaction: async (task) => {
      db.run("BEGIN TRANSACTION");
      try {
        const result = await task();
        db.run("COMMIT");
        return result;
      }
      catch (error) {
        db.run("ROLLBACK");
        throw error;
      }
    },
  });
}

describe("tuanchat local db room message helpers", () => {
  it("暴露可复用的房间消息 schema", () => {
    expect(ROOM_MESSAGE_SCHEMA_SQL.join("\n")).toContain("CREATE TABLE IF NOT EXISTS room_messages");
    expect(ROOM_MESSAGE_SCHEMA_SQL.join("\n")).toContain("room_messages_room_sync_idx");
  });

  it("会把消息序列化为 SQLite 记录并从记录恢复", () => {
    const message = createMessage(3, {
      position: 12.5,
      status: 1,
      syncId: 99,
    });

    const record = toRoomMessageRecord(message);

    expect(record).toEqual(expect.objectContaining({
      message_id: 3,
      position: 12.5,
      room_id: 9,
      status: 1,
      sync_id: 99,
    }));
    expect(fromRoomMessageRecord(record!)).toEqual(message);
  });

  it("存储前会去重排序并丢弃无效消息", () => {
    const messages = normalizeRoomMessagesForStorage([
      createMessage(2),
      createMessage(1, { roomId: undefined }),
      createMessage(2, { content: "updated" }),
      createMessage(Number.NaN),
      createMessage(3),
    ]);

    expect(messages.map(item => [item.message.messageId, item.message.content])).toEqual([
      [2, "updated"],
      [3, "message-3"],
    ]);
  });

  it("批量读取记录时会忽略坏 JSON", () => {
    const messages = fromRoomMessageRecords([
      { payload_json: JSON.stringify(createMessage(2)) },
      { payload_json: "not-json" },
      { payload_json: JSON.stringify(createMessage(1)) },
    ]);

    expect(messages.map(item => item.message.messageId)).toEqual([1, 2]);
  });

  it("repository 统一执行 SQLite 消息读写和 tombstone 删除", async () => {
    const repository = await createMemoryRepository();

    await repository.upsertMessages([
      createMessage(1, { syncId: 1 }),
      createMessage(2, { syncId: 2 }),
    ]);
    await repository.markMessagesDeleted([2]);

    const messages = await repository.getMessagesByRoomId(9);
    expect(messages.map(item => [item.message.messageId, item.message.status])).toEqual([
      [1, 0],
      [2, 1],
    ]);
    expect(await repository.getMaxSyncId(9)).toBe(2);

    await repository.deleteMessagesByIds([1]);
    expect((await repository.getMessagesByRoomId(9)).map(item => item.message.messageId)).toEqual([2]);
  });
});
