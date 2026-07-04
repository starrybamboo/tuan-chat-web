import type {
  RoomMessageRepository,
  RoomMessageSqliteDriver,
  SqliteValue,
} from "@tuanchat/local-db";
import type { Database, SqlValue } from "sql.js";

import { createRoomMessageRepository } from "@tuanchat/local-db";
import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

import type { ChatMessageResponse } from "../../../../../api";

const SQLITE_FILE_NAME = "tuanchat-web-local.sqlite";
const WEB_COLLECTION_TABLE_NAME = "web_local_collection";
const WEB_DOC_SNAPSHOT_TABLE_NAME = "doc_snapshots";
const WEB_KEY_VALUE_TABLE_NAME = "web_local_kv";

type WebFileSystemWritableFileStream = {
  close: () => Promise<void>;
  write: (data: BufferSource | Blob | string) => Promise<void>;
};

type WebFileSystemFileHandle = {
  createWritable: () => Promise<WebFileSystemWritableFileStream>;
  getFile: () => Promise<Blob>;
};

type WebFileSystemDirectoryHandle = {
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<WebFileSystemFileHandle>;
};

type NavigatorWithOpfs = Navigator & {
  storage?: StorageManager & {
    getDirectory?: () => Promise<WebFileSystemDirectoryHandle>;
  };
};

type LocalDbContext = {
  collectionRepository: WebCollectionRepository;
  docSnapshotRepository: WebDocSnapshotRepository;
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

type WebDocSnapshotRecord = {
  doc_id: string;
  snapshot_json: string;
  updated_at: number;
};

type WebDocSnapshotEntry<T> = {
  docId: string;
  snapshot: T;
  updatedAt: number;
};

type WebDocSnapshotRepository = {
  readSnapshot: <T>(docId: string) => Promise<WebDocSnapshotEntry<T> | null>;
  removeSnapshot: (docId: string) => Promise<void>;
  writeSnapshot: <T>(docId: string, snapshot: T, options?: { now?: number }) => Promise<void>;
};

function getOpfsStorage(): NavigatorWithOpfs["storage"] | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  return (navigator as NavigatorWithOpfs).storage ?? null;
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotFoundError";
}

async function readOpfsSqliteFile(): Promise<Uint8Array | null> {
  const storage = getOpfsStorage();
  if (!storage?.getDirectory) {
    return null;
  }

  try {
    const root = await storage.getDirectory();
    const fileHandle = await root.getFileHandle(SQLITE_FILE_NAME);
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }
  catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

async function writeOpfsSqliteFile(value: Uint8Array): Promise<void> {
  const storage = getOpfsStorage();
  if (!storage?.getDirectory) {
    return;
  }
  const root = await storage.getDirectory();
  const fileHandle = await root.getFileHandle(SQLITE_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    const bytes = value.slice();
    await writable.write(bytes.buffer);
  }
  finally {
    await writable.close();
  }
}

function createWebSqliteDriver(database: Database): {
  flush: () => Promise<void>;
  driver: Parameters<typeof createRoomMessageRepository>[0];
  markDirty: () => void;
} {
  let dirty = false;
  let transactionDepth = 0;
  let flushQueue = Promise.resolve();

  function scheduleFlush(): Promise<void> {
    if (!dirty || transactionDepth > 0) {
      return flushQueue;
    }

    dirty = false;
    const exported = database.export();
    flushQueue = flushQueue.catch(() => undefined).then(async () => {
      try {
        await writeOpfsSqliteFile(exported);
      }
      catch (error) {
        dirty = true;
        console.error("[ChatHistory] Failed to persist SQLite room message cache:", error);
      }
    });
    return flushQueue;
  }

  function markDirty(): void {
    dirty = true;
    void scheduleFlush();
  }

  function mapRows<T>(result: ReturnType<Database["exec"]>): T[] {
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

  const driver = {
    async all<T>(sql: string, params: SqliteValue[] = []): Promise<T[]> {
      return mapRows<T>(database.exec(sql, params as SqlValue[]));
    },
    async exec(sql: string): Promise<void> {
      database.run(sql);
      markDirty();
    },
    async run(sql: string, params: SqliteValue[] = []): Promise<void> {
      database.run(sql, params as SqlValue[]);
      markDirty();
    },
    async transaction<T>(task: () => Promise<T>): Promise<T> {
      if (transactionDepth > 0) {
        return task();
      }

      const wasDirty = dirty;
      database.run("BEGIN TRANSACTION");
      transactionDepth += 1;
      try {
        const result = await task();
        transactionDepth -= 1;
        database.run("COMMIT");
        markDirty();
        await scheduleFlush();
        return result;
      }
      catch (error) {
        transactionDepth -= 1;
        database.run("ROLLBACK");
        dirty = wasDirty;
        throw error;
      }
    },
  };

  return {
    driver,
    flush: scheduleFlush,
    markDirty,
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

function createWebDocSnapshotRepository(driver: RoomMessageSqliteDriver): WebDocSnapshotRepository {
  let schemaReadyPromise: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    schemaReadyPromise ??= (async () => {
      await driver.exec(`CREATE TABLE IF NOT EXISTS ${WEB_DOC_SNAPSHOT_TABLE_NAME} (
        doc_id TEXT PRIMARY KEY NOT NULL,
        snapshot_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`);
    })();
    await schemaReadyPromise;
  }

  return {
    async readSnapshot<T>(docId: string): Promise<WebDocSnapshotEntry<T> | null> {
      const normalizedDocId = normalizeCacheKey(docId);
      if (!normalizedDocId) {
        return null;
      }

      await ensureSchema();
      const rows = await driver.all<WebDocSnapshotRecord>(
        `SELECT doc_id, snapshot_json, updated_at
          FROM ${WEB_DOC_SNAPSHOT_TABLE_NAME}
          WHERE doc_id = ?
          LIMIT 1`,
        [normalizedDocId],
      );
      const record = rows[0];
      if (!record) {
        return null;
      }

      try {
        return {
          docId: record.doc_id,
          snapshot: JSON.parse(record.snapshot_json) as T,
          updatedAt: record.updated_at,
        };
      }
      catch {
        await driver.run(`DELETE FROM ${WEB_DOC_SNAPSHOT_TABLE_NAME} WHERE doc_id = ?`, [normalizedDocId]);
        return null;
      }
    },

    async removeSnapshot(docId) {
      const normalizedDocId = normalizeCacheKey(docId);
      if (!normalizedDocId) {
        return;
      }

      await ensureSchema();
      await driver.run(`DELETE FROM ${WEB_DOC_SNAPSHOT_TABLE_NAME} WHERE doc_id = ?`, [normalizedDocId]);
    },

    async writeSnapshot<T>(docId: string, snapshot: T, options: { now?: number } = {}): Promise<void> {
      const normalizedDocId = normalizeCacheKey(docId);
      if (!normalizedDocId) {
        return;
      }

      await ensureSchema();
      await driver.run(
        `INSERT OR REPLACE INTO ${WEB_DOC_SNAPSHOT_TABLE_NAME}
          (doc_id, snapshot_json, updated_at)
          VALUES (?, ?, ?)`,
        [
          normalizedDocId,
          serializeJsonPayload(snapshot),
          options.now ?? Date.now(),
        ],
      );
    },
  };
}

async function getLocalDbContext(): Promise<LocalDbContext> {
  contextPromise ??= (async () => {
    const SQL = await initSqlJs({
      locateFile: file => (file.endsWith(".wasm") ? sqlWasmUrl : file),
    });
    const opfsSqliteFile = await readOpfsSqliteFile();
    const database = opfsSqliteFile
      ? new SQL.Database(opfsSqliteFile)
      : new SQL.Database();
    const { driver, flush, markDirty } = createWebSqliteDriver(database);
    const roomMessageRepository = createRoomMessageRepository(driver);
    const docSnapshotRepository = createWebDocSnapshotRepository(driver);
    const keyValueRepository = createWebKeyValueRepository(driver);
    const collectionRepository = createWebCollectionRepository(driver);
    return {
      collectionRepository,
      docSnapshotRepository,
      keyValueRepository,
      roomMessageRepository,
    };
  })();
  return contextPromise;
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

export async function clearMessagesByRoomId(roomId: number): Promise<void> {
  const repository = await getRoomMessageRepository();
  await repository.clearRoomMessages(roomId);
}

export async function getDocSnapshot<T>(docId: string): Promise<T | null> {
  const repository = (await getLocalDbContext()).docSnapshotRepository;
  const entry = await repository.readSnapshot<T>(docId);
  return entry?.snapshot ?? null;
}

export async function setDocSnapshot<T>(docId: string, snapshot: T): Promise<void> {
  const repository = (await getLocalDbContext()).docSnapshotRepository;
  await repository.writeSnapshot(docId, snapshot);
}

export async function removeDocSnapshot(docId: string): Promise<void> {
  const repository = (await getLocalDbContext()).docSnapshotRepository;
  await repository.removeSnapshot(docId);
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
