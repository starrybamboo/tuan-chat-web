import type {
  DirectMessageRepository,
  LocalDbSqliteDriver,
  MobileKeyValueRepository,
  QuerySnapshotRepository,
  RoomMessageRepository,
  SqliteValue,
} from "@tuanchat/local-db";

import {
  createDirectMessageRepository,
  createMobileKeyValueRepository,
  createQuerySnapshotRepository,
  createRoomMessageRepository,
} from "@tuanchat/local-db";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

export const MOBILE_LOCAL_DB_NAME = "tuanchat-local.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let driverPromise: Promise<LocalDbSqliteDriver> | null = null;
let operationQueue: Promise<unknown> = Promise.resolve();
let roomMessageRepositoryPromise: Promise<RoomMessageRepository> | null = null;
let querySnapshotRepositoryPromise: Promise<QuerySnapshotRepository> | null = null;
let keyValueRepositoryPromise: Promise<MobileKeyValueRepository> | null = null;
let directMessageRepositoryPromise: Promise<DirectMessageRepository> | null = null;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(task, task);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function createUnqueuedDriver(db: SQLite.SQLiteDatabase): LocalDbSqliteDriver {
  return {
    all: <T>(sql: string, params: SqliteValue[] = []) => db.getAllAsync<T>(sql, params),
    exec: sql => db.execAsync(sql),
    run: (sql, params: SqliteValue[] = []) => db.runAsync(sql, params).then(() => undefined),
  };
}

export async function openMobileLocalDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= SQLite.openDatabaseAsync(MOBILE_LOCAL_DB_NAME);
  return dbPromise;
}

export async function getMobileLocalDbDriver(): Promise<LocalDbSqliteDriver> {
  driverPromise ??= (async () => {
    const db = await openMobileLocalDb();
    const unqueuedDriver = createUnqueuedDriver(db);
    const driver: LocalDbSqliteDriver = {
      all: <T>(sql: string, params: SqliteValue[] = []) => enqueue(() => unqueuedDriver.all<T>(sql, params)),
      exec: sql => enqueue(() => unqueuedDriver.exec(sql)),
      run: (sql, params: SqliteValue[] = []) => enqueue(() => unqueuedDriver.run(sql, params)),
      transaction: task => enqueue(async () => {
        let result: Awaited<ReturnType<typeof task>>;
        const runTask = async (transactionDb: SQLite.SQLiteDatabase) => {
          result = await task(createUnqueuedDriver(transactionDb));
        };

        if (Platform.OS !== "web") {
          await db.withExclusiveTransactionAsync(runTask);
        }
        else {
          await db.withTransactionAsync(() => runTask(db));
        }
        return result!;
      }),
    };
    return driver;
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
  roomMessageRepositoryPromise = null;
  querySnapshotRepositoryPromise = null;
  keyValueRepositoryPromise = null;
  directMessageRepositoryPromise = null;
}
