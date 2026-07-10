import type {
  RoomMessageRepository,
  RoomMessageSqliteDriver,
  SqliteValue,
} from "@tuanchat/local-db";

import { createRoomMessageRepository } from "@tuanchat/local-db";

import type { ChatMessageResponse } from "../../../../../api";

import { dispatchChatLocalDbUnavailableEvent } from "./localDbStatusEvents";

const WEB_COLLECTION_TABLE_NAME = "web_local_collection";
const WEB_KEY_VALUE_TABLE_NAME = "web_local_kv";
const SQLITE_WASM_WORKER_TIMEOUT_MS = 30_000;

type NavigatorWithOpfs = Navigator & {
  storage?: StorageManager & {
    getDirectory?: () => Promise<unknown>;
  };
};

type SqliteWasmOpfsSupportCheck =
  | { ok: true }
  | {
      message: string;
      ok: false;
      reason: "insecure-context" | "missing-opfs-api" | "missing-worker-api";
      suggestion: string;
    };

type LocalDbContext = {
  collectionRepository: WebCollectionRepository;
  keyValueRepository: WebKeyValueRepository;
  roomMessageRepository: RoomMessageRepository;
};

let contextPromise: Promise<LocalDbContext> | null = null;

type WebCollectionEntry<T> = {
  id: number;
  payload: T;
  sortAt: number;
  updatedAt: number;
};

type WebCollectionRecord = {
  item_id: number;
  payload_json: string;
  sort_at: number;
  updated_at: number;
};

type WebCollectionRepository = {
  clear: (collection: string) => Promise<void>;
  insert: <T>(collection: string, payload: T, options?: { id?: number; sortAt?: number }) => Promise<WebCollectionEntry<T>>;
  list: <T>(collection: string, options?: { limit?: number }) => Promise<Array<WebCollectionEntry<T>>>;
  remove: (collection: string, id: number) => Promise<void>;
  trim: (collection: string, maxItems: number) => Promise<void>;
};

type LocalValueScopeOptions = {
  scope?: string | null;
  userId?: number | null;
};

type WebKeyValueRecord = {
  key: string;
  scope: string;
  updated_at: number;
  user_id: number;
  value_json: string;
};

type WebKeyValueEntry<T> = {
  key: string;
  scope: string;
  updatedAt: number;
  userId: number | null;
  value: T;
};

type WebKeyValueRepository = {
  readValue: <T>(key: string, options?: LocalValueScopeOptions) => Promise<WebKeyValueEntry<T> | null>;
  removeValue: (key: string, options?: LocalValueScopeOptions) => Promise<void>;
  removeValuesByPrefix: (prefix: string, options?: LocalValueScopeOptions) => Promise<void>;
  writeValue: <T>(key: string, value: T, options?: LocalValueScopeOptions & { now?: number }) => Promise<void>;
};

type SqliteWorkerRequestBody =
  | { type: "all"; sql: string; params?: SqliteValue[] }
  | { type: "exec"; sql: string }
  | { type: "run"; sql: string; params?: SqliteValue[] };

type SqliteWorkerRequest = SqliteWorkerRequestBody & { id: number };

type SqliteWorkerResponse =
  | { id: number; ok: true; result?: unknown }
  | { id: number; ok: false; error: string };

type DisposableRoomMessageSqliteDriver = RoomMessageSqliteDriver & {
  dispose: () => void;
};

function getOpfsStorage(): NavigatorWithOpfs["storage"] | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  return (navigator as NavigatorWithOpfs).storage ?? null;
}

function checkSqliteWasmOpfsSupport(): SqliteWasmOpfsSupportCheck {
  if (typeof Worker === "undefined") {
    return {
      message: "当前浏览器上下文缺少 Web Worker，已禁用本地消息缓存。",
      ok: false,
      reason: "missing-worker-api",
      suggestion: "请使用现代 Chrome、Edge 或 Safari 打开页面。",
    };
  }

  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return {
      message: "当前页面不是安全上下文，浏览器不会开放 OPFS SQLite 能力。",
      ok: false,
      reason: "insecure-context",
      suggestion: "请通过 HTTPS、localhost 或 127.0.0.1 打开；局域网 http://IP 通常会触发此限制。",
    };
  }

  // opfs-sahpool 在 worker 内检测 sync access handle，主线程只做基础入口检查，避免误判可用浏览器。
  if (!getOpfsStorage()?.getDirectory) {
    return {
      message: "当前浏览器上下文缺少 OPFS 文件系统 API，已禁用本地消息缓存。",
      ok: false,
      reason: "missing-opfs-api",
      suggestion: "请使用支持 OPFS 的现代浏览器，并通过 HTTPS、localhost 或 127.0.0.1 打开。",
    };
  }

  return { ok: true };
}

function createDisabledSqliteDriver(): RoomMessageSqliteDriver {
  return {
    all: async () => [],
    exec: async () => undefined,
    run: async () => undefined,
    transaction: async task => task(),
  };
}

function createSqliteWasmWorkerDriver(): DisposableRoomMessageSqliteDriver {
  const worker = new Worker(new URL("./sqliteWasmWorker.ts", import.meta.url), { type: "module" });
  let nextId = 1;
  let queue = Promise.resolve();
  let transactionDepth = 0;
  const pending = new Map<number, {
    reject: (reason?: unknown) => void;
    resolve: (value: unknown) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }>();

  function request<T>(message: SqliteWorkerRequestBody): Promise<T> {
    const id = nextId++;
    const payload = { ...message, id } as SqliteWorkerRequest;
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`SQLite worker request timed out: ${message.type}`));
      }, SQLITE_WASM_WORKER_TIMEOUT_MS);
      pending.set(id, {
        reject,
        resolve: value => resolve(value as T),
        timeoutId,
      });
      worker.postMessage(payload);
    });
  }

  worker.addEventListener("message", (event: MessageEvent<SqliteWorkerResponse>) => {
    const response = event.data;
    const entry = pending.get(response.id);
    if (!entry) {
      return;
    }
    pending.delete(response.id);
    clearTimeout(entry.timeoutId);
    if (response.ok) {
      entry.resolve(response.result);
      return;
    }
    entry.reject(new Error(response.error));
  });

  worker.addEventListener("error", (event) => {
    const error = new Error(event.message || "SQLite worker failed.");
    for (const entry of pending.values()) {
      clearTimeout(entry.timeoutId);
      entry.reject(error);
    }
    pending.clear();
  });

  worker.addEventListener("messageerror", () => {
    const error = new Error("SQLite worker failed to deserialize a message.");
    for (const entry of pending.values()) {
      clearTimeout(entry.timeoutId);
      entry.reject(error);
    }
    pending.clear();
  });

  function dispose(): void {
    for (const entry of pending.values()) {
      clearTimeout(entry.timeoutId);
      entry.reject(new Error("SQLite worker was disposed."));
    }
    pending.clear();
    worker.terminate();
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task, task);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }

  function enqueueOrRun<T>(task: () => Promise<T>): Promise<T> {
    if (transactionDepth > 0) {
      return task();
    }
    return enqueue(task);
  }

  return {
    all<T>(sql: string, params: SqliteValue[] = []): Promise<T[]> {
      return enqueueOrRun(() => request<T[]>({ params, sql, type: "all" }));
    },
    exec(sql: string): Promise<void> {
      return enqueueOrRun(() => request<void>({ sql, type: "exec" }));
    },
    run(sql: string, params: SqliteValue[] = []): Promise<void> {
      return enqueueOrRun(() => request<void>({ params, sql, type: "run" }));
    },
    transaction<T>(task: () => Promise<T>): Promise<T> {
      return enqueue(async () => {
        if (transactionDepth > 0) {
          return task();
        }
        await request<void>({ sql: "BEGIN TRANSACTION", type: "exec" });
        transactionDepth += 1;
        try {
          const result = await task();
          transactionDepth -= 1;
          await request<void>({ sql: "COMMIT", type: "exec" });
          return result;
        }
        catch (error) {
          transactionDepth -= 1;
          await request<void>({ sql: "ROLLBACK", type: "exec" }).catch(() => undefined);
          throw error;
        }
      });
    },
    dispose,
  };
}

function normalizeCollectionName(collection: string): string | null {
  const trimmed = collection.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function serializeJsonPayload(payload: unknown): string {
  const serialized = JSON.stringify(payload);
  if (typeof serialized !== "string") {
    throw new TypeError("SQLite 本地缓存值必须是可 JSON 序列化的数据。");
  }
  return serialized;
}

function createWebCollectionRepository(driver: RoomMessageSqliteDriver): WebCollectionRepository {
  let schemaReadyPromise: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    schemaReadyPromise ??= (async () => {
      await driver.exec(`CREATE TABLE IF NOT EXISTS ${WEB_COLLECTION_TABLE_NAME} (
        collection TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        sort_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (collection, item_id)
      )`);
      await driver.exec(`CREATE INDEX IF NOT EXISTS web_local_collection_sort_idx
        ON ${WEB_COLLECTION_TABLE_NAME} (collection, sort_at DESC, item_id DESC)`);
    })();
    await schemaReadyPromise;
  }

  async function nextItemId(collection: string): Promise<number> {
    const rows = await driver.all<{ next_id: number | null }>(
      `SELECT COALESCE(MAX(item_id), 0) + 1 AS next_id
        FROM ${WEB_COLLECTION_TABLE_NAME}
        WHERE collection = ?`,
      [collection],
    );
    return rows[0]?.next_id ?? 1;
  }

  function mapRecord<T>(record: WebCollectionRecord): WebCollectionEntry<T> | null {
    try {
      return {
        id: record.item_id,
        payload: JSON.parse(record.payload_json) as T,
        sortAt: record.sort_at,
        updatedAt: record.updated_at,
      };
    }
    catch {
      return null;
    }
  }

  return {
    async clear(collection) {
      const normalizedCollection = normalizeCollectionName(collection);
      if (!normalizedCollection) {
        return;
      }

      await ensureSchema();
      await driver.run(`DELETE FROM ${WEB_COLLECTION_TABLE_NAME} WHERE collection = ?`, [normalizedCollection]);
    },

    async insert(collection, payload, options = {}) {
      const normalizedCollection = normalizeCollectionName(collection);
      if (!normalizedCollection) {
        throw new TypeError("collection 不能为空。");
      }

      const now = Date.now();
      const sortAt = options.sortAt ?? now;
      await ensureSchema();
      const id = options.id ?? await nextItemId(normalizedCollection);
      await driver.run(
        `INSERT OR REPLACE INTO ${WEB_COLLECTION_TABLE_NAME}
          (collection, item_id, payload_json, sort_at, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
        [normalizedCollection, id, serializeJsonPayload(payload), sortAt, now],
      );
      return {
        id,
        payload,
        sortAt,
        updatedAt: now,
      };
    },

    async list<T>(collection: string, options: { limit?: number } = {}): Promise<Array<WebCollectionEntry<T>>> {
      const normalizedCollection = normalizeCollectionName(collection);
      if (!normalizedCollection) {
        return [];
      }

      await ensureSchema();
      const limit = typeof options.limit === "number" && Number.isFinite(options.limit) && options.limit > 0
        ? Math.floor(options.limit)
        : null;
      const rows = await driver.all<WebCollectionRecord>(
        `SELECT item_id, payload_json, sort_at, updated_at
          FROM ${WEB_COLLECTION_TABLE_NAME}
          WHERE collection = ?
          ORDER BY sort_at DESC, item_id DESC
          ${limit ? "LIMIT ?" : ""}`,
        limit ? [normalizedCollection, limit] : [normalizedCollection],
      );
      return rows
        .map(row => mapRecord<T>(row))
        .filter((entry): entry is WebCollectionEntry<T> => entry !== null);
    },

    async remove(collection, id) {
      const normalizedCollection = normalizeCollectionName(collection);
      if (!normalizedCollection || !Number.isInteger(id)) {
        return;
      }

      await ensureSchema();
      await driver.run(
        `DELETE FROM ${WEB_COLLECTION_TABLE_NAME}
          WHERE collection = ? AND item_id = ?`,
        [normalizedCollection, id],
      );
    },

    async trim(collection, maxItems) {
      const normalizedCollection = normalizeCollectionName(collection);
      if (!normalizedCollection || !Number.isFinite(maxItems) || maxItems < 0) {
        return;
      }

      await ensureSchema();
      await driver.run(
        `DELETE FROM ${WEB_COLLECTION_TABLE_NAME}
          WHERE collection = ?
            AND item_id NOT IN (
              SELECT item_id FROM ${WEB_COLLECTION_TABLE_NAME}
              WHERE collection = ?
              ORDER BY sort_at DESC, item_id DESC
              LIMIT ?
            )`,
        [normalizedCollection, normalizedCollection, Math.floor(maxItems)],
      );
    },
  };
}

function createWebKeyValueRepository(driver: RoomMessageSqliteDriver): WebKeyValueRepository {
  let schemaReadyPromise: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    schemaReadyPromise ??= (async () => {
      await driver.exec(`CREATE TABLE IF NOT EXISTS ${WEB_KEY_VALUE_TABLE_NAME} (
        "key" TEXT NOT NULL,
        user_id INTEGER NOT NULL DEFAULT 0,
        scope TEXT NOT NULL DEFAULT '',
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY ("key", user_id, scope)
      )`);
      await driver.exec(`CREATE INDEX IF NOT EXISTS web_local_kv_scope_idx
        ON ${WEB_KEY_VALUE_TABLE_NAME} (user_id, scope)`);
    })();
    await schemaReadyPromise;
  }

  async function removeValueRecord(key: string, userId: number, scope: string): Promise<void> {
    await driver.run(
      `DELETE FROM ${WEB_KEY_VALUE_TABLE_NAME}
        WHERE "key" = ? AND user_id = ? AND scope = ?`,
      [key, userId, scope],
    );
  }

  return {
    async readValue<T>(key: string, options: LocalValueScopeOptions = {}): Promise<WebKeyValueEntry<T> | null> {
      const normalizedKey = normalizeCacheKey(key);
      if (!normalizedKey) {
        return null;
      }

      const userId = normalizeCacheUserId(options.userId);
      const scope = normalizeCacheScope(options.scope);

      await ensureSchema();
      const rows = await driver.all<WebKeyValueRecord>(
        `SELECT "key" AS key, user_id, scope, value_json, updated_at
          FROM ${WEB_KEY_VALUE_TABLE_NAME}
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
        `DELETE FROM ${WEB_KEY_VALUE_TABLE_NAME}
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
        `INSERT OR REPLACE INTO ${WEB_KEY_VALUE_TABLE_NAME}
          ("key", user_id, scope, value_json, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
        [
          normalizedKey,
          normalizeCacheUserId(options.userId),
          normalizeCacheScope(options.scope),
          serializeJsonPayload(value),
          options.now ?? Date.now(),
        ],
      );
    },
  };
}

async function getLocalDbContext(): Promise<LocalDbContext> {
  contextPromise ??= (async () => {
    const driver = await createPreferredSqliteDriver();
    const roomMessageRepository = createRoomMessageRepository(driver);
    const keyValueRepository = createWebKeyValueRepository(driver);
    const collectionRepository = createWebCollectionRepository(driver);
    return {
      collectionRepository,
      keyValueRepository,
      roomMessageRepository,
    };
  })();
  return contextPromise;
}

async function createPreferredSqliteDriver(): Promise<RoomMessageSqliteDriver> {
  const support = checkSqliteWasmOpfsSupport();
  if (!support.ok) {
    dispatchChatLocalDbUnavailableEvent({
      message: support.message,
      reason: support.reason,
      suggestion: support.suggestion,
    });
    return createDisabledSqliteDriver();
  }

  const driver = createSqliteWasmWorkerDriver();
  try {
    await driver.all<{ ok: number }>("SELECT 1 AS ok");
    return driver;
  }
  catch (error) {
    driver.dispose();
    console.warn("[ChatHistory] SQLite WASM OPFS SAH pool worker unavailable; disabling local message cache.", error);
    dispatchChatLocalDbUnavailableEvent({
      message: "高性能本地 SQLite 初始化失败，已禁用本地消息缓存。",
      reason: "sqlite-wasm-worker-failed",
      suggestion: "常见原因是其他标签页占用同一个 OPFS SAH pool。请先关闭同站点其他标签页后刷新。",
    });
    return createDisabledSqliteDriver();
  }
}

async function getRoomMessageRepository(): Promise<RoomMessageRepository> {
  return (await getLocalDbContext()).roomMessageRepository;
}

export async function addOrUpdateMessagesBatch(messages: ChatMessageResponse[]): Promise<void> {
  if (!messages || messages.length === 0) {
    return;
  }

  const repository = await getRoomMessageRepository();
  await repository.upsertMessages(messages);
}

export async function deleteMessagesByIds(messageIds: number[]): Promise<void> {
  const repository = await getRoomMessageRepository();
  await repository.deleteMessagesByIds(messageIds);
}

export async function markMessagesDeletedByIds(messageIds: number[]): Promise<void> {
  const repository = await getRoomMessageRepository();
  await repository.markMessagesDeleted(messageIds);
}

export async function getMessagesByRoomId(roomId: number): Promise<ChatMessageResponse[]> {
  const repository = await getRoomMessageRepository();
  return repository.getMessagesByRoomId(roomId);
}

export async function getMessageById(messageId: number): Promise<ChatMessageResponse | null> {
  const repository = await getRoomMessageRepository();
  return repository.getMessageById(messageId);
}

export async function clearMessagesByRoomId(roomId: number): Promise<void> {
  const repository = await getRoomMessageRepository();
  await repository.clearRoomMessages(roomId);
}

export async function getLocalValue<T>(key: string, options?: LocalValueScopeOptions): Promise<T | null> {
  const repository = (await getLocalDbContext()).keyValueRepository;
  const entry = await repository.readValue<T>(key, options);
  return entry?.value ?? null;
}

export async function setLocalValue<T>(
  key: string,
  value: T,
  options?: LocalValueScopeOptions & { now?: number },
): Promise<void> {
  const repository = (await getLocalDbContext()).keyValueRepository;
  await repository.writeValue(key, value, options);
}

export async function removeLocalValue(key: string, options?: LocalValueScopeOptions): Promise<void> {
  const repository = (await getLocalDbContext()).keyValueRepository;
  await repository.removeValue(key, options);
}

export async function removeLocalValuesByPrefix(prefix: string, options?: LocalValueScopeOptions): Promise<void> {
  const repository = (await getLocalDbContext()).keyValueRepository;
  await repository.removeValuesByPrefix(prefix, options);
}

export async function addLocalCollectionItem<T>(
  collection: string,
  payload: T,
  options?: { id?: number; sortAt?: number },
): Promise<WebCollectionEntry<T>> {
  const repository = (await getLocalDbContext()).collectionRepository;
  return repository.insert(collection, payload, options);
}

export async function listLocalCollectionItems<T>(
  collection: string,
  options?: { limit?: number },
): Promise<Array<WebCollectionEntry<T>>> {
  const repository = (await getLocalDbContext()).collectionRepository;
  return repository.list<T>(collection, options);
}

export async function removeLocalCollectionItem(collection: string, id: number): Promise<void> {
  const repository = (await getLocalDbContext()).collectionRepository;
  await repository.remove(collection, id);
}

export async function clearLocalCollection(collection: string): Promise<void> {
  const repository = (await getLocalDbContext()).collectionRepository;
  await repository.clear(collection);
}

export async function trimLocalCollection(collection: string, maxItems: number): Promise<void> {
  const repository = (await getLocalDbContext()).collectionRepository;
  await repository.trim(collection, maxItems);
}
