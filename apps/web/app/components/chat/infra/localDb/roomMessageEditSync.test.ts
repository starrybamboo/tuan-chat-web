import type { LocalDbSqliteDriver, SqliteValue } from "@tuanchat/local-db";

import { createRoomMessageRepository } from "@tuanchat/local-db";
// @ts-expect-error sql.js is a local test dependency without bundled declarations.
import initSqlJs from "sql.js";
import { describe, expect, it, vi } from "vitest";

import type { ChatMessageResponse } from "../../../../../api";

import { locateSqlJsFile } from "../../../../../../../packages/tuanchat-local-db/src/testSqlJs";
import {
  compactRoomMessageEditOperations,
  deriveRoomMessageEditOperations,
  RoomMessageEditSyncCoordinator,
} from "./roomMessageEditSync";

function message(messageId: number, overrides: Partial<ChatMessageResponse["message"]> = {}): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      messageId,
      messageType: 1,
      position: Math.abs(messageId),
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
      ...overrides,
    },
  };
}

async function createMemoryRepository() {
  const SQL = await initSqlJs({ locateFile: locateSqlJsFile });
  const db = new SQL.Database() as {
    exec(sql: string, params?: SqliteValue[]): Array<{ columns: string[]; values: SqliteValue[][] }>;
    run(sql: string, params?: SqliteValue[]): void;
  };
  function all<T>(sql: string, params: SqliteValue[]): T[] {
    const result = db.exec(sql, params)[0];
    if (!result) return [];
    return result.values.map((values) => Object.fromEntries(
      result.columns.map((column, index) => [column, values[index]]),
    ) as T);
  }
  const driver: LocalDbSqliteDriver = {
    all: async <T,>(sql: string, params: SqliteValue[] = []) => all<T>(sql, params),
    exec: async sql => db.run(sql),
    run: async (sql, params = []) => db.run(sql, params),
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
  return createRoomMessageRepository(driver);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function createHarness(initial: ChatMessageResponse[]) {
  const repository = await createMemoryRepository();
  await repository.upsertMessages(initial);
  let query = initial;
  const patch = vi.fn();
  const scheduled: Array<() => void> = [];
  const aliases = new Map<number, number>();
  const coordinator = new RoomMessageEditSyncCoordinator(9, {
    addPendingMessages: messages => repository.addPendingMessages(messages),
    getQueryMessages: () => query,
    onStatus: () => undefined,
    patch,
    promotePendingMessage: (localId, confirmed) => repository.promotePendingMessage(localId, confirmed),
    registerMessageAlias: (localId, confirmedId) => { aliases.set(localId, confirmedId); },
    replaceConfirmedMessages: messages => repository.replaceConfirmedMessages(messages),
    replaceQueryMessages: (updater) => { query = updater(query); },
    rollbackPendingMessages: pendingIds => repository.rollbackPendingMessages(pendingIds),
    scheduler: {
      clear: () => undefined,
      schedule: (callback) => { scheduled.push(callback); return callback; },
    },
    setProtection: () => undefined,
  });
  return {
    aliases,
    coordinator,
    patch,
    query: () => query,
    repository,
    scheduled,
    setQuery: (messages: ChatMessageResponse[]) => { query = messages; },
  };
}

describe("room message editor shared data boundary", () => {
  it("同步 update/move/delete/insert，并在请求前写 pending 后按 operation 原序提升身份", async () => {
    const first = message(1, { content: "first", position: 1, syncId: 11 });
    const second = message(2, { content: "second", position: 2, syncId: 12 });
    const third = message(3, { content: "third", position: 3, syncId: 13 });
    const harness = await createHarness([first, second, third]);
    const response = deferred<ChatMessageResponse["message"][]>();
    harness.patch.mockReturnValueOnce(response.promise);

    harness.coordinator.edit([
      message(2, { content: "second", position: 1, syncId: 12 }),
      message(1, { content: "", position: 2, syncId: 11 }),
      message(-1, {
        content: "inserted",
        position: 3,
        syncId: -1,
        tcLocalRenderKey: "message-editor:block-new",
        tcLocalSyncState: "optimistic",
      } as Partial<ChatMessageResponse["message"]>),
    ]);
    const flushPromise = harness.coordinator.flush();
    await vi.waitFor(() => expect(harness.patch).toHaveBeenCalledTimes(1));

    expect((await harness.repository.getMessagesByRoomId(9)).map(item => item.message.messageId)).toContain(-1);
    expect(harness.patch.mock.calls[0][0]).toMatchObject([
      { messageId: 2, op: "move", position: 1 },
      { messageId: 1, op: "update", position: 2 },
      { clientId: "message-editor:block-new", op: "insert", position: 3 },
      { messageId: 3, op: "delete" },
    ]);

    response.resolve([
      message(2, { content: "second", position: 1, syncId: 20 }).message,
      message(1, { content: "", position: 2, syncId: 21 }).message,
      message(4, { content: "inserted", position: 3, syncId: 22 }).message,
      message(3, { content: "third", position: 3, status: 1, syncId: 23 }).message,
    ]);
    await flushPromise;

    expect(harness.query().filter(item => item.message.status !== 1).map(item => [
      item.message.messageId,
      item.message.content,
    ])).toEqual([[2, "second"], [1, ""], [4, "inserted"]]);
    const persisted = await harness.repository.getMessagesByRoomId(9);
    expect(persisted.find(item => item.message.messageId === -1)).toBeUndefined();
    expect(persisted.find(item => item.message.messageId === 4)?.message.content).toBe("inserted");
    expect(persisted.find(item => item.message.messageId === 3)?.message.status).toBe(1);
    expect(harness.aliases.get(-1)).toBe(4);
  });

  it("晚于新 revision 的响应只回填确认字段，不覆盖最新正文", async () => {
    const baseline = message(1, { content: "baseline", position: 1, syncId: 10 });
    const harness = await createHarness([baseline]);
    const firstResponse = deferred<ChatMessageResponse["message"][]>();
    harness.patch.mockReturnValueOnce(firstResponse.promise);

    harness.coordinator.edit([message(1, { content: "submitted", position: 1, syncId: 10 })]);
    const firstFlush = harness.coordinator.flush();
    await vi.waitFor(() => expect(harness.patch).toHaveBeenCalledTimes(1));
    harness.coordinator.edit([message(1, { content: "latest", position: 1, syncId: 10 })]);

    firstResponse.resolve([message(1, { content: "submitted", position: 1, syncId: 20 }).message]);
    await firstFlush;

    expect(harness.query()[0].message).toMatchObject({ content: "latest", messageId: 1, syncId: 20 });
    expect(harness.coordinator.getPendingOperations()).toMatchObject([
      { message: { content: "latest" }, messageId: 1, op: "update" },
    ]);
  });

  it("更高 revision 即使压缩后无 pending operation 也不被旧响应覆盖", async () => {
    const baseline = message(1, { content: "baseline", position: 1, syncId: 10 });
    const harness = await createHarness([baseline]);
    const firstResponse = deferred<ChatMessageResponse["message"][]>();
    harness.patch.mockReturnValueOnce(firstResponse.promise);

    harness.coordinator.edit([message(1, { content: "submitted", position: 1, syncId: 10 })]);
    const firstFlush = harness.coordinator.flush();
    await vi.waitFor(() => expect(harness.patch).toHaveBeenCalledTimes(1));
    harness.coordinator.edit([message(1, { content: "temporary", position: 1, syncId: 10 })]);
    harness.coordinator.edit([message(1, { content: "submitted", position: 1, syncId: 10 })]);

    expect(harness.coordinator.getPendingOperations()).toEqual([]);
    firstResponse.resolve([message(1, { content: "server-normalized", position: 1, syncId: 20 }).message]);
    await firstFlush;

    expect(harness.query()[0].message).toMatchObject({
      content: "submitted",
      messageId: 1,
      syncId: 20,
    });
  });

  it("在途 insert 后继续编辑会保持负 ID，确认后改写 Query 与后续 operation 身份", async () => {
    const harness = await createHarness([]);
    const insertResponse = deferred<ChatMessageResponse["message"][]>();
    harness.patch.mockReturnValueOnce(insertResponse.promise);
    const draft = message(-1, {
      content: "draft",
      position: 1,
      syncId: -1,
      tcLocalRenderKey: "message-editor:stable",
      tcLocalSyncState: "optimistic",
    } as Partial<ChatMessageResponse["message"]>);

    harness.coordinator.edit([draft]);
    const firstFlush = harness.coordinator.flush();
    await vi.waitFor(() => expect(harness.patch).toHaveBeenCalledTimes(1));
    harness.coordinator.edit([message(-1, {
      ...draft.message,
      content: "latest draft",
    } as Partial<ChatMessageResponse["message"]>)]);

    insertResponse.resolve([message(10, { content: "draft", position: 1, syncId: 30 }).message]);
    await firstFlush;

    expect(harness.query()[0].message).toMatchObject({ content: "latest draft", messageId: 10, syncId: 30 });
    expect(harness.coordinator.getPendingOperations()).toMatchObject([
      { messageId: 10, op: "update" },
    ]);
  });

  it("在途 insert 后删除会保持删除意图并在身份提升后提交 delete", async () => {
    const harness = await createHarness([]);
    const insertResponse = deferred<ChatMessageResponse["message"][]>();
    harness.patch
      .mockReturnValueOnce(insertResponse.promise)
      .mockResolvedValueOnce([message(10, { content: "draft", position: 1, status: 1, syncId: 31 }).message]);
    const draft = message(-1, {
      content: "draft",
      position: 1,
      syncId: -1,
      tcLocalRenderKey: "message-editor:delete-in-flight",
      tcLocalSyncState: "optimistic",
    } as Partial<ChatMessageResponse["message"]>);

    harness.coordinator.edit([draft]);
    const insertFlush = harness.coordinator.flush();
    await vi.waitFor(() => expect(harness.patch).toHaveBeenCalledTimes(1));
    harness.coordinator.edit([]);

    insertResponse.resolve([message(10, { content: "draft", position: 1, syncId: 30 }).message]);
    await insertFlush;

    expect(harness.query()).toEqual([]);
    expect(harness.coordinator.getPendingOperations()).toMatchObject([
      { messageId: 10, op: "delete" },
    ]);

    await harness.coordinator.flush();

    expect(harness.patch.mock.calls[1][0]).toEqual([{ messageId: 10, op: "delete" }]);
    expect((await harness.repository.getMessagesByRoomId(9)).find(item => item.message.messageId === 10)?.message.status).toBe(1);
  });

  it("在途 delete 后撤销会通过后续 update 同时恢复 Query 与 SQLite", async () => {
    const baseline = message(1, { content: "keep me", position: 1, syncId: 10 });
    const harness = await createHarness([baseline]);
    const deleteResponse = deferred<ChatMessageResponse["message"][]>();
    harness.patch
      .mockReturnValueOnce(deleteResponse.promise)
      .mockResolvedValueOnce([message(1, { content: "keep me", position: 1, status: 0, syncId: 12 }).message]);

    harness.coordinator.edit([]);
    const deleteFlush = harness.coordinator.flush();
    await vi.waitFor(() => expect(harness.patch).toHaveBeenCalledTimes(1));
    harness.coordinator.edit([baseline]);

    deleteResponse.resolve([message(1, { content: "keep me", position: 1, status: 1, syncId: 11 }).message]);
    await deleteFlush;

    expect(harness.query()[0].message).toMatchObject({ content: "keep me", status: 0, syncId: 11 });
    expect(harness.coordinator.getPendingOperations()).toMatchObject([{ messageId: 1, op: "update" }]);

    await harness.coordinator.flush();

    expect(harness.patch.mock.calls[1][0]).toMatchObject([{ messageId: 1, op: "update" }]);
    expect(harness.query()[0].message).toMatchObject({ content: "keep me", status: 0, syncId: 12 });
    expect((await harness.repository.getMessagesByRoomId(9))[0].message).toMatchObject({
      content: "keep me",
      status: 0,
      syncId: 12,
    });
  });

  it("失败保留当前 Query 与 operations，只有后续编辑才触发再次保存", async () => {
    const baseline = message(1, { content: "baseline", position: 1, syncId: 10 });
    const harness = await createHarness([baseline]);
    harness.patch.mockRejectedValueOnce(new Error("offline"));

    harness.coordinator.edit([message(1, { content: "offline edit", position: 1, syncId: 10 })]);
    await expect(harness.coordinator.flush()).rejects.toThrow("offline");
    const schedulesAfterFailure = harness.scheduled.length;
    expect(harness.query()[0].message.content).toBe("offline edit");
    expect(harness.coordinator.getPendingOperations()).toHaveLength(1);

    harness.coordinator.edit([message(1, { content: "retry edit", position: 1, syncId: 10 })]);
    expect(harness.scheduled.length).toBeGreaterThan(schedulesAfterFailure);
    expect(harness.coordinator.getPendingOperations()).toMatchObject([
      { message: { content: "retry edit" }, messageId: 1, op: "update" },
    ]);
  });

  it("编辑器旧 render 不会把刚进入 Query 的远端消息误判为 delete", async () => {
    const first = message(1, { content: "first", position: 1 });
    const remote = message(2, { content: "remote", position: 2 });
    const harness = await createHarness([first]);
    harness.setQuery([first, remote]);

    harness.coordinator.edit(
      [message(1, { content: "edited", position: 1 })],
      [first],
    );

    expect(harness.query().map(item => [item.message.messageId, item.message.content])).toEqual([
      [1, "edited"],
      [2, "remote"],
    ]);
    expect(harness.coordinator.getPendingOperations()).toMatchObject([
      { messageId: 1, op: "update" },
    ]);
  });

  it("在途响应不会覆盖其他同步实例已写入 Query 的更新", async () => {
    const baseline = message(1, { content: "baseline", position: 1, syncId: 10 });
    const harness = await createHarness([baseline]);
    const response = deferred<ChatMessageResponse["message"][]>();
    harness.patch.mockReturnValueOnce(response.promise);

    harness.coordinator.edit([message(1, { content: "submitted", position: 1, syncId: 10 })]);
    const flush = harness.coordinator.flush();
    await vi.waitFor(() => expect(harness.patch).toHaveBeenCalledTimes(1));
    harness.setQuery([message(1, { content: "new instance edit", position: 1, syncId: 10 })]);
    response.resolve([message(1, { content: "submitted", position: 1, syncId: 20 }).message]);
    await flush;

    expect(harness.query()[0].message).toMatchObject({ content: "new instance edit", syncId: 20 });
  });

  it("响应校验失败时保留批次供后续编辑重试", async () => {
    const baseline = message(1, { content: "baseline", position: 1 });
    const harness = await createHarness([baseline]);
    harness.patch.mockResolvedValueOnce([message(1, { content: "edited", position: 1, roomId: 10 }).message]);
    harness.coordinator.edit([message(1, { content: "edited", position: 1 })]);

    await expect(harness.coordinator.flush()).rejects.toThrow("房间不匹配");

    expect(harness.coordinator.getPendingOperations()).toMatchObject([
      { messageId: 1, op: "update" },
    ]);
    expect(harness.query()[0].message.content).toBe("edited");
  });

  it("失败 insert 随后被删除时清理已持久化 pending", async () => {
    const harness = await createHarness([]);
    const draft = message(-1, {
      content: "draft",
      position: 1,
      syncId: -1,
      tcLocalRenderKey: "message-editor:failed-insert",
      tcLocalSyncState: "optimistic",
    } as Partial<ChatMessageResponse["message"]>);
    harness.patch.mockRejectedValueOnce(new Error("offline"));
    harness.coordinator.edit([draft]);
    await expect(harness.coordinator.flush()).rejects.toThrow("offline");
    expect((await harness.repository.getMessagesByRoomId(9)).some(item => item.message.messageId === -1)).toBe(true);

    harness.coordinator.edit([]);
    await vi.waitFor(async () => {
      expect((await harness.repository.getMessagesByRoomId(9)).some(item => item.message.messageId === -1)).toBe(false);
    });
    expect(harness.coordinator.getPendingOperations()).toEqual([]);
  });

  it("Query 会话 reset 后忽略旧在途响应且不再发布旧消息", async () => {
    const baseline = message(1, { content: "baseline", position: 1 });
    const harness = await createHarness([baseline]);
    const response = deferred<ChatMessageResponse["message"][]>();
    harness.patch.mockReturnValueOnce(response.promise);
    harness.coordinator.edit([message(1, { content: "submitted", position: 1 })]);
    const flush = harness.coordinator.flush();
    await vi.waitFor(() => expect(harness.patch).toHaveBeenCalledTimes(1));

    harness.coordinator.reset();
    harness.setQuery([]);
    response.resolve([message(1, { content: "submitted", position: 1, syncId: 20 }).message]);
    await flush;

    expect(harness.query()).toEqual([]);
    expect(harness.coordinator.getPendingOperations()).toEqual([]);
  });
});

describe("room message edit operation behavior", () => {
  it("insert 吸收 update/move，未提交 insert 后 delete 会抵消", () => {
    const insert = {
      clientId: "block",
      localMessageId: -1,
      message: message(-1, { content: "a", position: 1 }).message,
      op: "insert" as const,
      position: 1,
    };
    const compacted = compactRoomMessageEditOperations([insert], [
      { localMessageId: -1, message: message(-1, { content: "b", position: 2 }).message, op: "update", position: 2 },
      { localMessageId: -1, op: "move", position: 3 },
    ]);
    expect(compacted).toMatchObject([
      { localMessageId: -1, message: { content: "b" }, op: "insert", position: 3 },
    ]);
    expect(compactRoomMessageEditOperations(compacted, [{ localMessageId: -1, op: "delete" }])).toEqual([]);
  });

  it("空正文 confirmed update 和最后一条 delete 合法，本地空白 draft 不 insert", () => {
    const confirmed = message(1, { content: "text", position: 1 });
    expect(deriveRoomMessageEditOperations([confirmed], [message(1, { content: "", position: 1 })]))
      .toMatchObject([{ messageId: 1, op: "update" }]);
    expect(deriveRoomMessageEditOperations([confirmed], []))
      .toMatchObject([{ messageId: 1, op: "delete" }]);
    expect(deriveRoomMessageEditOperations([], [message(-1, { content: "   ", position: 1 })]))
      .toEqual([]);
  });
});
