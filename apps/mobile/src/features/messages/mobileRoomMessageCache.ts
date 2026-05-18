import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import {
  createRoomMessageRepository,
  type RoomMessageRepository,
} from "@tuanchat/local-db";
import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let repositoryPromise: Promise<RoomMessageRepository> | null = null;

function isPositiveRoomId(roomId: number): boolean {
  return Number.isInteger(roomId) && roomId > 0;
}

async function openRoomMessageDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= SQLite.openDatabaseAsync("tuanchat-local.db");
  return dbPromise;
}

let operationQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(task, task);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function getRoomMessageRepository(): Promise<RoomMessageRepository> {
  repositoryPromise ??= (async () => {
    const db = await openRoomMessageDb();
    return createRoomMessageRepository({
      all: (sql, params = []) => enqueue(() => db.getAllAsync(sql, ...params)),
      exec: sql => enqueue(() => db.execAsync(sql)),
      run: (sql, params = []) => enqueue(() => db.runAsync(sql, ...params).then(() => undefined)),
    });
  })();
  return repositoryPromise;
}

export async function readCachedRoomMessages(roomId: number): Promise<ChatMessageResponse[]> {
  if (!isPositiveRoomId(roomId)) {
    return [];
  }

  const repository = await getRoomMessageRepository();
  return repository.getMessagesByRoomId(roomId);
}

export async function writeCachedRoomMessages(roomId: number, messages: ChatMessageResponse[]) {
  if (!isPositiveRoomId(roomId)) {
    return;
  }

  const repository = await getRoomMessageRepository();
  await repository.upsertMessages(messages.filter(message => message.message?.roomId === roomId));
}

export async function markCachedRoomMessagesDeleted(roomId: number, messageIds: number[]) {
  if (!isPositiveRoomId(roomId)) {
    return;
  }

  const repository = await getRoomMessageRepository();
  await repository.markMessagesDeleted(messageIds);
}

export async function clearCachedRoomMessages(roomId: number) {
  if (!isPositiveRoomId(roomId)) {
    return;
  }

  const repository = await getRoomMessageRepository();
  await repository.clearRoomMessages(roomId);
}
