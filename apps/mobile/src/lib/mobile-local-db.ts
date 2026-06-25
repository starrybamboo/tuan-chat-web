import type {
  DirectMessageRepository,
  LocalDbSqliteDriver,
  MobileKeyValueRepository,
  QuerySnapshotRepository,
  RoomMessageRepository,
} from "@tuanchat/local-db";

import {
  createDirectMessageRepository,
  createMobileKeyValueRepository,
  createQuerySnapshotRepository,
  createRoomMessageRepository,
} from "@tuanchat/local-db";
import * as SQLite from "expo-sqlite";

export const MOBILE_LOCAL_DB_NAME = "tuanchat-local.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let driverPromise: Promise<LocalDbSqliteDriver> | null = null;
let operationQueue: Promise<unknown> = Promise.resolve();
let transactionDepth = 0;
let roomMessageRepositoryPromise: Promise<RoomMessageRepository> | null = null;
let querySnapshotRepositoryPromise: Promise<QuerySnapshotRepository> | null = null;
let keyValueRepositoryPromise: Promise<MobileKeyValueRepository> | null = null;
let directMessageRepositoryPromise: Promise<DirectMessageRepository> | null = null;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(task, task);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function enqueueOrRun<T>(task: () => Promise<T>): Promise<T> {
  return transactionDepth > 0 ? task() : enqueue(task);
}

export async function openMobileLocalDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= SQLite.openDatabaseAsync(MOBILE_LOCAL_DB_NAME);
  return dbPromise;
}

export async function getMobileLocalDbDriver(): Promise<LocalDbSqliteDriver> {
  driverPromise ??= (async () => {
    const db = await openMobileLocalDb();
    return {
      all: (sql, params = []) => enqueueOrRun(() => db.getAllAsync(sql, ...params)),
      exec: sql => enqueueOrRun(() => db.execAsync(sql)),
      run: (sql, params = []) => enqueueOrRun(() => db.runAsync(sql, ...params).then(() => undefined)),
      transaction: task => enqueue(async () => {
        let result: Awaited<ReturnType<typeof task>>;
        const runTask = async () => {
          transactionDepth += 1;
          try {
            result = await task();
          }
          finally {
            transactionDepth -= 1;
          }
        };

        if (db.withTransactionAsync) {
          await db.withTransactionAsync(runTask);
        }
        else {
          await runTask();
        }
        return result!;
      }),
    };
  })();
  return driverPromise;
}

export async function getMobileRoomMessageRepository(): Promise<RoomMessageRepository> {
  roomMessageRepositoryPromise ??= getMobileLocalDbDriver().then(driver => createRoomMessageRepository(driver));
  return roomMessageRepositoryPromise;
}

export async function getMobileQuerySnapshotRepository(): Promise<QuerySnapshotRepository> {
  querySnapshotRepositoryPromise ??= getMobileLocalDbDriver().then(driver => createQuerySnapshotRepository(driver));
  return querySnapshotRepositoryPromise;
}

export async function getMobileKeyValueRepository(): Promise<MobileKeyValueRepository> {
  keyValueRepositoryPromise ??= getMobileLocalDbDriver().then(driver => createMobileKeyValueRepository(driver));
  return keyValueRepositoryPromise;
}

export async function getMobileDirectMessageRepository(): Promise<DirectMessageRepository> {
  directMessageRepositoryPromise ??= getMobileLocalDbDriver().then(driver => createDirectMessageRepository(driver));
  return directMessageRepositoryPromise;
}

export function resetMobileLocalDbForTests() {
  dbPromise = null;
  driverPromise = null;
  operationQueue = Promise.resolve();
  transactionDepth = 0;
  roomMessageRepositoryPromise = null;
  querySnapshotRepositoryPromise = null;
  keyValueRepositoryPromise = null;
  directMessageRepositoryPromise = null;
}
