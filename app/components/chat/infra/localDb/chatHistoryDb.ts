import type { Database, SqlValue } from "sql.js";
import type { ChatMessageResponse } from "../../../../../api";

import {
  createRoomMessageRepository,
  type RoomMessageRepository,
  type SqliteValue,
} from "@tuanchat/local-db";
import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

const SQLITE_STORAGE_DB_NAME = "tuanchatRoomMessageSqlite";
const SQLITE_STORAGE_DB_VERSION = 1;
const SQLITE_STORAGE_STORE_NAME = "entries";
const SQLITE_FILE_KEY = "room-message.sqlite";
const WEB_META_TABLE_NAME = "local_db_meta";
const LEGACY_MIGRATION_KEY = "web.indexeddb.chatHistoryDB.migrated";

const LEGACY_DB_NAME = "chatHistoryDB";
const LEGACY_STORE_NAME = "messages";

type StoredEntry<T> = {
  key: string;
  value: T;
};

let repositoryPromise: Promise<RoomMessageRepository> | null = null;

function getIndexedDB(): IDBFactory | null {
  return typeof indexedDB === "undefined" ? null : indexedDB;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function openSqliteStorageDb(): Promise<IDBDatabase | null> {
  const idb = getIndexedDB();
  if (!idb) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const request = idb.open(SQLITE_STORAGE_DB_NAME, SQLITE_STORAGE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SQLITE_STORAGE_STORE_NAME)) {
        db.createObjectStore(SQLITE_STORAGE_STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStoredValue<T>(key: string): Promise<T | null> {
  const db = await openSqliteStorageDb();
  if (!db) {
    return null;
  }

  try {
    const transaction = db.transaction(SQLITE_STORAGE_STORE_NAME, "readonly");
    const request = transaction.objectStore(SQLITE_STORAGE_STORE_NAME).get(key);
    const entry = await requestToPromise<StoredEntry<T> | undefined>(request);
    await transactionDone(transaction);
    return entry?.value ?? null;
  }
  finally {
    db.close();
  }
}

async function writeStoredValue<T>(key: string, value: T): Promise<void> {
  const db = await openSqliteStorageDb();
  if (!db) {
    return;
  }

  try {
    const transaction = db.transaction(SQLITE_STORAGE_STORE_NAME, "readwrite");
    transaction.objectStore(SQLITE_STORAGE_STORE_NAME).put({ key, value } satisfies StoredEntry<T>);
    await transactionDone(transaction);
  }
  finally {
    db.close();
  }
}

function isChatMessageResponse(value: unknown): value is ChatMessageResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = (value as { message?: unknown }).message;
  return Boolean(message && typeof message === "object");
}

async function hasLegacyChatDb(): Promise<boolean> {
  const idb = getIndexedDB();
  if (!idb) {
    return false;
  }

  const listDatabases = (idb as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>;
  }).databases;
  if (!listDatabases) {
    return true;
  }

  try {
    const databases = await listDatabases.call(idb);
    return databases.some(db => db.name === LEGACY_DB_NAME);
  }
  catch {
    return true;
  }
}

async function openLegacyChatDb(): Promise<IDBDatabase | null> {
  const idb = getIndexedDB();
  if (!idb || !(await hasLegacyChatDb())) {
    return null;
  }

  return new Promise((resolve) => {
    const request = idb.open(LEGACY_DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function readLegacyIndexedDbMessages(): Promise<ChatMessageResponse[]> {
  const db = await openLegacyChatDb();
  if (!db) {
    return [];
  }

  try {
    if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
      return [];
    }

    const transaction = db.transaction(LEGACY_STORE_NAME, "readonly");
    const request = transaction.objectStore(LEGACY_STORE_NAME).getAll();
    const rows = await requestToPromise<unknown[]>(request);
    await transactionDone(transaction);
    return rows.filter(isChatMessageResponse);
  }
  catch (error) {
    console.warn("[ChatHistory] Failed to migrate legacy IndexedDB messages:", error);
    return [];
  }
  finally {
    db.close();
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
        await writeStoredValue(SQLITE_FILE_KEY, exported);
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

function ensureWebMetaSchema(database: Database, markDirty: () => void): void {
  database.run(`CREATE TABLE IF NOT EXISTS ${WEB_META_TABLE_NAME} (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`);
  markDirty();
}

function getWebMeta(database: Database, key: string): string | null {
  const result = database.exec(
    `SELECT value FROM ${WEB_META_TABLE_NAME} WHERE key = ? LIMIT 1`,
    [key],
  );
  const value = result[0]?.values[0]?.[0];
  return typeof value === "string" ? value : null;
}

function setWebMeta(database: Database, key: string, value: string, markDirty: () => void): void {
  database.run(
    `INSERT OR REPLACE INTO ${WEB_META_TABLE_NAME} (key, value) VALUES (?, ?)`,
    [key, value],
  );
  markDirty();
}

async function migrateLegacyIndexedDbMessages(
  database: Database,
  repository: RoomMessageRepository,
  markDirty: () => void,
  flush: () => Promise<void>,
): Promise<void> {
  ensureWebMetaSchema(database, markDirty);
  if (getWebMeta(database, LEGACY_MIGRATION_KEY) === "1") {
    return;
  }

  const legacyMessages = await readLegacyIndexedDbMessages();
  if (legacyMessages.length > 0) {
    await repository.upsertMessages(legacyMessages);
  }
  setWebMeta(database, LEGACY_MIGRATION_KEY, "1", markDirty);
  await flush();
}

async function getRoomMessageRepository(): Promise<RoomMessageRepository> {
  repositoryPromise ??= (async () => {
    const SQL = await initSqlJs({
      locateFile: file => (file.endsWith(".wasm") ? sqlWasmUrl : file),
    });
    const sqliteFile = await readStoredValue<Uint8Array>(SQLITE_FILE_KEY);
    const database = sqliteFile ? new SQL.Database(sqliteFile) : new SQL.Database();
    const { driver, flush, markDirty } = createWebSqliteDriver(database);
    const repository = createRoomMessageRepository(driver);
    await migrateLegacyIndexedDbMessages(database, repository, markDirty, flush);
    return repository;
  })();
  return repositoryPromise;
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
