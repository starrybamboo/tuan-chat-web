import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";
import type { Database, SqlValue } from "sql.js";

import initSqlJs from "sql.js";
import { describe, expect, it, vi } from "vitest";

import type { LocalDbSqliteDriver } from "./index";

import {
  createDirectMessageRepository,
  DIRECT_MESSAGE_SCHEMA_SQL,
  fromDirectMessageRecords,
  normalizeDirectMessagesForStorage,
  toDirectMessageRecord,
} from "./direct-messages";
import { locateSqlJsFile } from "./testSqlJs";

function createDirectMessage(
  messageId: number,
  overrides: Partial<MessageDirectResponse> = {},
): MessageDirectResponse {
  return {
    content: `direct-${messageId}`,
    createTime: `2026-05-17T00:00:${String(Math.abs(messageId)).padStart(2, "0")}.000Z`,
    messageId,
    messageType: 1,
    receiverId: 7,
    receiverUsername: "me",
    senderId: 42,
    senderUsername: "contact",
    status: 0,
    syncId: Math.abs(messageId),
    userId: 7,
    ...overrides,
  };
}

async function createMemoryDriver(): Promise<LocalDbSqliteDriver> {
  const SQL = await initSqlJs({
    locateFile: locateSqlJsFile,
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

  const driver: LocalDbSqliteDriver = {
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
        const result = await task(driver);
        db.run("COMMIT");
        return result;
      }
      catch (error) {
        db.run("ROLLBACK");
        throw error;
      }
    },
  };
  return driver;
}

describe("tuanchat local db direct messages", () => {
  it("事务写入只使用 transaction-scoped driver", async () => {
    const scopedRun = vi.fn<LocalDbSqliteDriver["run"]>(async () => undefined);
    const transactionDriver: LocalDbSqliteDriver = {
      all: async () => [],
      exec: async () => undefined,
      run: scopedRun,
    };
    const rootDriver: LocalDbSqliteDriver = {
      all: async () => {
        throw new Error("事务内不应使用根 driver");
      },
      exec: async () => undefined,
      run: async () => {
        throw new Error("事务内不应使用根 driver");
      },
      transaction: task => task(transactionDriver),
    };
    const repository = createDirectMessageRepository(rootDriver);

    await repository.upsertMessages(7, [createDirectMessage(1)]);

    expect(scopedRun).toHaveBeenCalledTimes(1);
  });

  it("暴露 direct message schema", () => {
    const schema = DIRECT_MESSAGE_SCHEMA_SQL.join("\n");

    expect(schema).toContain("CREATE TABLE IF NOT EXISTS direct_messages");
    expect(schema).toContain("PRIMARY KEY (current_user_id, message_id)");
    expect(schema).toContain("direct_messages_user_contact_sync_idx");
  });

  it("存储前会去重、排序并丢弃无效私聊消息", () => {
    const messages = normalizeDirectMessagesForStorage(7, [
      createDirectMessage(2),
      createDirectMessage(1, { receiverId: 7, senderId: 7 }),
      createDirectMessage(2, { content: "updated" }),
      createDirectMessage(Number.NaN),
      createDirectMessage(3, { receiverId: 42, senderId: 7 }),
    ]);

    expect(messages.map(item => [item.messageId, item.content])).toEqual([
      [2, "updated"],
      [3, "direct-3"],
    ]);
  });

  it("会把私聊消息序列化为 SQLite 记录并从坏 JSON 中恢复可用消息", () => {
    const message = createDirectMessage(3, { status: 1, syncId: 99 });
    const record = toDirectMessageRecord(7, message);

    expect(record).toEqual(expect.objectContaining({
      contact_id: 42,
      current_user_id: 7,
      message_id: 3,
      status: 1,
      sync_id: 99,
    }));
    expect(fromDirectMessageRecords([
      { payload_json: JSON.stringify(createDirectMessage(2)) },
      { payload_json: "not-json" },
      { payload_json: JSON.stringify(createDirectMessage(1)) },
    ]).map(item => item.messageId)).toEqual([1, 2]);
  });

  it("repository 支持联系人切片、重复消息合并和多用户隔离", async () => {
    const repository = createDirectMessageRepository(await createMemoryDriver());

    await repository.upsertMessages(7, [
      createDirectMessage(1),
      createDirectMessage(2),
      createDirectMessage(2, { content: "updated" }),
      createDirectMessage(3, { receiverId: 99, senderId: 7 }),
    ]);
    await repository.upsertMessages(8, [
      createDirectMessage(1, { receiverId: 8, senderId: 42, userId: 8 }),
    ]);

    expect((await repository.getMessagesByContact(7, 42)).map(item => [item.messageId, item.content])).toEqual([
      [1, "direct-1"],
      [2, "updated"],
    ]);
    expect((await repository.getMessagesByContact(7, 99)).map(item => item.messageId)).toEqual([3]);
    expect((await repository.getMessagesByUser(8)).map(item => [item.messageId, item.receiverId])).toEqual([[1, 8]]);
  });

  it("repository 支持按最近消息窗口读取私聊缓存", async () => {
    const repository = createDirectMessageRepository(await createMemoryDriver());

    await repository.upsertMessages(7, [
      createDirectMessage(1, { syncId: 1 }),
      createDirectMessage(2, { syncId: 2 }),
      createDirectMessage(3, { syncId: 3 }),
      createDirectMessage(4, { receiverId: 99, senderId: 7, syncId: 4 }),
    ]);

    expect((await repository.getMessagesByContact(7, 42, { limit: 2 })).map(item => item.messageId)).toEqual([2, 3]);
    expect((await repository.getMessagesByUser(7, { limit: 2 })).map(item => item.messageId)).toEqual([3, 4]);
    expect(await repository.getMaxSyncIdByContact(7, 42)).toBe(3);
    expect(await repository.getMaxSyncIdByContact(7, 99)).toBe(4);
  });

  it("repository 会保留撤回和已读这两类确认事件", async () => {
    const repository = createDirectMessageRepository(await createMemoryDriver());

    await repository.upsertMessages(7, [
      createDirectMessage(1),
      createDirectMessage(2),
      createDirectMessage(3, { messageType: 10001, replyMessageId: 2, syncId: 3 }),
      createDirectMessage(4, { messageType: 10000, receiverId: 42, replyMessageId: 1, senderId: 7, syncId: 4 }),
    ]);

    const messages = await repository.getMessagesByContact(7, 42);

    expect(messages.map(item => [item.messageId, item.status, item.messageType, item.syncId])).toEqual([
      [1, 0, 1, 1],
      [2, 0, 1, 2],
      [3, 0, 10001, 3],
      [4, 0, 10000, 4],
    ]);

    await repository.clearUserMessages(7);
    expect(await repository.getMessagesByUser(7)).toEqual([]);
  });

  it("pending overlay 在确认前覆盖读取视图，确认或回滚时不会污染 confirmed projection", async () => {
    const repository = createDirectMessageRepository(await createMemoryDriver());
    const pending = createDirectMessage(-1, { syncId: 9001 });
    const confirmed = createDirectMessage(9, { syncId: 9 });

    await repository.upsertMessages(7, [createDirectMessage(1)]);
    await repository.addPendingMessage(7, pending);
    expect((await repository.getMessagesByContact(7, 42)).map(item => item.messageId)).toEqual([1, -1]);

    await repository.addPendingMessage(7, { ...pending, tcLocalSyncState: "failed" } as MessageDirectResponse);
    expect((await repository.getMessagesByContact(7, 42)).find(item => item.messageId === -1))
      .toMatchObject({ tcLocalSyncState: "failed" });

    await repository.promotePendingMessage(7, -1, confirmed);
    expect((await repository.getMessagesByContact(7, 42)).map(item => item.messageId)).toEqual([1, 9]);

    await repository.addPendingMessage(7, pending);
    await repository.rollbackPendingMessage(7, -1);
    expect((await repository.getMessagesByContact(7, 42)).map(item => item.messageId)).toEqual([1, 9]);
  });
});
