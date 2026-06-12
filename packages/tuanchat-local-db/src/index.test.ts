import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Database, SqlValue } from "sql.js";

import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";

import {
  createDocSnapshotRepository,
  createMobileKeyValueRepository,
  createQuerySnapshotRepository,
  createRoomMessageRepository,
  DOC_SNAPSHOT_SCHEMA_SQL,
  fromRoomMessageRecord,
  fromRoomMessageRecords,
  MOBILE_KV_SCHEMA_SQL,
  MOBILE_QUERY_SNAPSHOT_SCHEMA_SQL,
  normalizeRoomMessagesForStorage,
  ROOM_MESSAGE_SCHEMA_SQL,
  toRoomMessageRecord,
} from "./index";
import { locateSqlJsFile } from "./testSqlJs";

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

async function createMemoryDriver() {
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

  return {
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
  };
}

async function createMemoryRepository() {
  return createRoomMessageRepository(await createMemoryDriver());
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

  it("存储前会清理已被正式消息替换的乐观消息", () => {
    const messages = normalizeRoomMessagesForStorage([
      createMessage(100, {
        content: "hello",
        roleId: 3,
        userId: 7,
      }),
      createMessage(-1, {
        content: "hello",
        roleId: 3,
        tcLocalSyncState: "optimistic",
        userId: 7,
      } as Partial<ChatMessageResponse["message"]>),
    ]);

    expect(messages.map(item => item.message.messageId)).toEqual([100]);
  });

  it("批量读取记录时会忽略坏 JSON", () => {
    const messages = fromRoomMessageRecords([
      { payload_json: JSON.stringify(createMessage(2)) },
      { payload_json: "not-json" },
      { payload_json: JSON.stringify(createMessage(1)) },
    ]);

    expect(messages.map(item => item.message.messageId)).toEqual([1, 2]);
  });

  it("批量读取记录时会清理持久化乐观重复消息", () => {
    const messages = fromRoomMessageRecords([
      { payload_json: JSON.stringify(createMessage(100, { content: "hello", roleId: 3, userId: 7 })) },
      { payload_json: JSON.stringify(createMessage(-1, { content: "hello", roleId: 3, tcLocalSyncState: "optimistic", userId: 7 } as Partial<ChatMessageResponse["message"]>)) },
    ]);

    expect(messages.map(item => item.message.messageId)).toEqual([100]);
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

describe("tuanchat local db mobile query snapshots", () => {
  it("暴露 query snapshot schema", () => {
    const schema = MOBILE_QUERY_SNAPSHOT_SCHEMA_SQL.join("\n");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS mobile_query_snapshots");
    expect(schema).toContain("mobile_query_snapshots_scope_idx");
  });

  it("按 key、用户和 scope 写入并读取快照", async () => {
    const repository = createQuerySnapshotRepository(await createMemoryDriver());

    await repository.writeSnapshot({
      key: "spaces:active",
      now: 1000,
      payload: [{ id: 1, name: "Space" }],
      scope: "workspace",
      ttlMs: 5000,
      userId: 7,
    });

    await repository.writeSnapshot({
      key: "spaces:active",
      now: 1000,
      payload: [{ id: 2, name: "Other" }],
      scope: "workspace",
      ttlMs: 5000,
      userId: 8,
    });

    const snapshot = await repository.readSnapshot<Array<{ id: number; name: string }>>("spaces:active", {
      now: 2000,
      scope: "workspace",
      userId: 7,
    });

    expect(snapshot).toEqual(expect.objectContaining({
      expiresAt: 6000,
      payload: [{ id: 1, name: "Space" }],
      scope: "workspace",
      updatedAt: 1000,
      userId: 7,
    }));
  });

  it("过期快照会返回空并从本地删除", async () => {
    const repository = createQuerySnapshotRepository(await createMemoryDriver());

    await repository.writeSnapshot({
      key: "rooms:1",
      now: 1000,
      payload: ["room-a"],
      ttlMs: 100,
      userId: 7,
    });

    expect(await repository.readSnapshot("rooms:1", { now: 1100, userId: 7 })).toBeNull();
    expect(await repository.readSnapshot("rooms:1", { now: 1001, userId: 7 })).toBeNull();
  });

  it("坏 JSON 会被忽略并清理", async () => {
    const driver = await createMemoryDriver();
    const repository = createQuerySnapshotRepository(driver);

    await repository.writeSnapshot({ key: "roles", payload: ["ok"], userId: 7 });
    await driver.run(
      `UPDATE mobile_query_snapshots SET payload_json = ? WHERE "key" = ? AND user_id = ?`,
      ["not-json", "roles", 7],
    );

    expect(await repository.readSnapshot("roles", { userId: 7 })).toBeNull();
    const rows = await driver.all<{ count: number }>(
      `SELECT COUNT(*) AS count FROM mobile_query_snapshots WHERE "key" = ? AND user_id = ?`,
      ["roles", 7],
    );
    expect(rows[0]?.count).toBe(0);
  });

  it("支持按前缀和用户清理快照", async () => {
    const repository = createQuerySnapshotRepository(await createMemoryDriver());

    await repository.writeSnapshot({ key: "rooms:1", payload: [1], userId: 7 });
    await repository.writeSnapshot({ key: "rooms:2", payload: [2], userId: 7 });
    await repository.writeSnapshot({ key: "roles:1", payload: [3], userId: 7 });
    await repository.writeSnapshot({ key: "rooms:1", payload: [4], userId: 8 });

    await repository.removeSnapshotsByPrefix("rooms:", { userId: 7 });

    expect(await repository.readSnapshot("rooms:1", { userId: 7 })).toBeNull();
    expect(await repository.readSnapshot("rooms:2", { userId: 7 })).toBeNull();
    expect((await repository.readSnapshot<number[]>("roles:1", { userId: 7 }))?.payload).toEqual([3]);
    expect((await repository.readSnapshot<number[]>("rooms:1", { userId: 8 }))?.payload).toEqual([4]);

    await repository.clearUserSnapshots(8);
    expect(await repository.readSnapshot("rooms:1", { userId: 8 })).toBeNull();
  });
});

describe("tuanchat local db mobile key value store", () => {
  it("暴露 mobile KV schema", () => {
    const schema = MOBILE_KV_SCHEMA_SQL.join("\n");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS mobile_kv_store");
    expect(schema).toContain("mobile_kv_store_scope_idx");
  });

  it("按用户隔离读写普通 KV", async () => {
    const repository = createMobileKeyValueRepository(await createMemoryDriver());

    await repository.writeValue("workspace-selection", { selectedSpaceId: 1 }, { now: 100, userId: 7 });
    await repository.writeValue("workspace-selection", { selectedSpaceId: 2 }, { now: 200, userId: 8 });

    expect(await repository.readValue("workspace-selection", { userId: 7 })).toEqual(expect.objectContaining({
      updatedAt: 100,
      userId: 7,
      value: { selectedSpaceId: 1 },
    }));
    expect(await repository.readValue("workspace-selection", { userId: 8 })).toEqual(expect.objectContaining({
      updatedAt: 200,
      userId: 8,
      value: { selectedSpaceId: 2 },
    }));
  });

  it("坏 KV JSON 会被忽略并清理", async () => {
    const driver = await createMemoryDriver();
    const repository = createMobileKeyValueRepository(driver);

    await repository.writeValue("workspace-selection", { selectedSpaceId: 1 }, { userId: 7 });
    await driver.run(
      `UPDATE mobile_kv_store SET value_json = ? WHERE "key" = ? AND user_id = ?`,
      ["not-json", "workspace-selection", 7],
    );

    expect(await repository.readValue("workspace-selection", { userId: 7 })).toBeNull();
    const rows = await driver.all<{ count: number }>(
      `SELECT COUNT(*) AS count FROM mobile_kv_store WHERE "key" = ? AND user_id = ?`,
      ["workspace-selection", 7],
    );
    expect(rows[0]?.count).toBe(0);
  });
});

describe("tuanchat local db doc snapshots", () => {
  it("暴露文档快照 schema", () => {
    const schema = DOC_SNAPSHOT_SCHEMA_SQL.join("\n");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS doc_snapshots");
    expect(schema).toContain("snapshot_json");
  });

  it("按文档房间 id 写入、读取和删除快照", async () => {
    const repository = createDocSnapshotRepository(await createMemoryDriver());
    const snapshot = {
      format: "message-stream",
      updateB64: "abc",
      updatedAt: 123,
      v: 4,
    };

    await repository.writeSnapshot(" 123 ", snapshot, { now: 1000 });

    await expect(repository.readSnapshot<typeof snapshot>("123")).resolves.toEqual(expect.objectContaining({
      docId: "123",
      snapshot,
      updatedAt: 1000,
    }));

    await repository.removeSnapshot("123");
    await expect(repository.readSnapshot("123")).resolves.toBeNull();
  });

  it("坏文档快照 JSON 会被忽略并清理", async () => {
    const driver = await createMemoryDriver();
    const repository = createDocSnapshotRepository(driver);

    await repository.writeSnapshot("456", { ok: true });
    await driver.run(
      `UPDATE doc_snapshots SET snapshot_json = ? WHERE doc_id = ?`,
      ["not-json", "456"],
    );

    await expect(repository.readSnapshot("456")).resolves.toBeNull();
    const rows = await driver.all<{ count: number }>(
      `SELECT COUNT(*) AS count FROM doc_snapshots WHERE doc_id = ?`,
      ["456"],
    );
    expect(rows[0]?.count).toBe(0);
  });
});
